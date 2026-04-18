-- Enable pg_cron for scheduled jobs
create extension if not exists pg_cron;
-- Enable btree_gist for integer equality checks in GiST exclusion constraints
create extension if not exists btree_gist;

-- Clean up existing tables to avoid "relation already exists" errors if re-run
drop table if exists bookings cascade;
drop table if exists sessions cascade;
drop table if exists machines cascade;
drop table if exists floors cascade;
drop table if exists profiles cascade;

drop type if exists user_role cascade;
drop type if exists machine_status cascade;
drop type if exists session_status cascade;
drop type if exists booking_status cascade;

-- Enum types
create type user_role as enum ('student', 'admin');
create type machine_status as enum ('free', 'occupied', 'maintenance');
create type session_status as enum ('active', 'completed', 'ended_early');
create type booking_status as enum ('upcoming', 'completed', 'cancelled', 'no_show');

-- Profiles (extends Supabase Auth users)
-- Auto-created via trigger on auth.users INSERT
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  college_id        varchar(50) unique not null check (college_id ~ '^U20[2-9]\d{5}$'),
  name              varchar(100) not null,
  role              user_role default 'student',
  push_subscription text,         -- JSON string of PushSubscription object
  created_at        timestamptz default now()
);

-- Floors
create table floors (
  floor_id   serial primary key,
  label      varchar(50) not null,    -- e.g. "Floor 1", "Floor 3", etc.
  building   varchar(100),            -- optional, for multi-building support
  created_at timestamptz default now()
);

-- Machines
create table machines (
  machine_id          serial primary key,
  floor_id            int not null references floors(floor_id) on delete restrict,
  name                varchar(50) not null,    -- e.g. "Machine 1"
  status              machine_status default 'free',
  created_at          timestamptz default now()
);

-- Sessions
create table sessions (
  session_id  serial primary key,
  machine_id  int not null references machines(machine_id) on delete restrict,
  user_id     uuid not null references profiles(id) on delete restrict,
  start_time  timestamptz not null default now(),
  end_time    timestamptz not null default now(),
  status      session_status default 'active',
  notified_at timestamptz   -- timestamp when completion notification was sent
);

-- Trigger to auto-calculate end_time based on start_time
create or replace function set_session_end_time()
returns trigger as $$
begin
  new.end_time := new.start_time + interval '45 minutes';
  return new;
end;
$$ language plpgsql;

create trigger set_session_end_time_trigger
  before insert on sessions
  for each row
  execute procedure set_session_end_time();

-- Bookings
create table bookings (
  booking_id  serial primary key,
  machine_id  int not null references machines(machine_id) on delete restrict,
  user_id     uuid not null references profiles(id) on delete restrict,
  slot_start  timestamptz not null,
  slot_end    timestamptz not null,
  status      booking_status default 'upcoming',
  created_at  timestamptz default now(),
  -- Prevent double-booking the same machine at the same time
  constraint no_overlap exclude using gist (
    machine_id with =,
    tstzrange(slot_start, slot_end) with &&
  ) where (status = 'upcoming')
);

-- Note: Enforcing the queue limit of 5 advance bookings per machine:
create or replace function check_max_advance_bookings()
returns trigger as $$
declare
  booking_count int;
begin
  booking_count := (select count(*) from bookings where machine_id = NEW.machine_id and status = 'upcoming');

  if booking_count >= 5 then
    raise exception 'This machine has reached its maximum advance queue limit (5 bookings).';
  end if;

  return NEW;
end;
$$ language plpgsql;

create trigger enforce_max_bookings
  before insert on bookings
  for each row execute procedure check_max_advance_bookings();

-- Trigger: auto-create profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, college_id, name)
  values (
    new.id,
    new.raw_user_meta_data->>'college_id',
    new.raw_user_meta_data->>'name'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Seed Data (Floors 1, 3, 5, 7 and the 1 machine on each)
insert into floors (floor_id, label) values 
  (1, 'Floor 1'),
  (2, 'Floor 3'),
  (3, 'Floor 5'),
  (4, 'Floor 7');
  
insert into machines (floor_id, name) values
  (1, 'M1 - F1'),
  (2, 'M1 - F3'),
  (3, 'M1 - F5'),
  (4, 'M1 - F7');

-- RLS Policies (enable on all tables)
alter table profiles  enable row level security;
alter table floors    enable row level security;
alter table machines  enable row level security;
alter table sessions  enable row level security;
alter table bookings  enable row level security;

-- Profiles: users can read all, update only their own
create policy "Public profiles are viewable by all authenticated users"
  on profiles for select using (auth.role() = 'authenticated');
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

-- Floors & Machines: all authenticated users can read; only admin can write
create policy "Authenticated users can view floors"
  on floors for select using (auth.role() = 'authenticated');
create policy "Only admin can manage floors"
  on floors for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Authenticated users can view machines"
  on machines for select using (auth.role() = 'authenticated');
create policy "Only admin can manage machines"
  on machines for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Sessions: users can read all active sessions; create only their own
create policy "Authenticated users can view sessions"
  on sessions for select using (auth.role() = 'authenticated');
create policy "Users can create their own session"
  on sessions for insert with check (auth.uid() = user_id);
create policy "Users can update their own session"
  on sessions for update using (auth.uid() = user_id);

-- Bookings: users can read all bookings; create/cancel only their own
create policy "Authenticated users can view bookings"
  on bookings for select using (auth.role() = 'authenticated');
create policy "Users can create their own booking"
  on bookings for insert with check (auth.uid() = user_id);
create policy "Users can update their own booking"
  on bookings for update using (auth.uid() = user_id);

-- RPC Functions for Milestone 3 (Sessions)
create or replace function public.start_session(p_machine_id int)
returns void as $$
declare
  v_user_id uuid;
  v_machine_status machine_status;
  v_active_count int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Check if user already has an active session
  v_active_count := (select count(*) from public.sessions where user_id = v_user_id and status = 'active');
  if v_active_count > 0 then
    raise exception 'You already have an active laundry session.';
  end if;

  -- 2. Lock the machine row and evaluate its status to prevent race conditions
  v_machine_status := (select status from public.machines where machine_id = p_machine_id for update);
  
  if v_machine_status != 'free' then
    raise exception 'Machine is no longer available.';
  end if;

  -- 3. Update machine
  update public.machines set status = 'occupied' where machine_id = p_machine_id;

  -- 4. Insert session
  insert into public.sessions (machine_id, user_id, status)
  values (p_machine_id, v_user_id, 'active');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.end_session_early(p_machine_id int)
returns void as $$
declare
  v_user_id uuid;
  v_session_id int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Find the active session for this user and machine
  v_session_id := (
    select session_id 
    from public.sessions 
    where machine_id = p_machine_id and user_id = v_user_id and status = 'active'
    for update
  );

  if v_session_id is null then
    raise exception 'No active session found for this machine.';
  end if;

  -- Update session status
  update public.sessions set status = 'ended_early' where session_id = v_session_id;

  -- Update machine status
  update public.machines set status = 'free' where machine_id = p_machine_id;
end;
$$ language plpgsql security definer set search_path = public;

-- RPC Functions for Milestone 4 (Bookings)
create or replace function public.create_booking(p_machine_id int, p_slot_start timestamptz)
returns void as $$
declare
  v_user_id uuid;
  v_active_bookings int;
  v_slot_end timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Check max 5 bookings limit
  v_active_bookings := (select count(*) from public.bookings where user_id = v_user_id and status = 'upcoming');
  if v_active_bookings >= 5 then
    raise exception 'You have reached the maximum of 5 upcoming bookings.';
  end if;

  -- 2. Verify slot is in the future and within 24 hours
  if p_slot_start <= now() then
    raise exception 'Cannot book a slot in the past.';
  end if;
  if p_slot_start > now() + interval '24 hours' then
    raise exception 'Cannot book more than 24 hours in advance.';
  end if;

  -- 3. Calculate slot end time (45 mins)
  v_slot_end := p_slot_start + interval '45 minutes';

  -- 4. Try insert (GiST constraint handles overlap automatically!)
  begin
    insert into public.bookings (machine_id, user_id, slot_start, slot_end, status)
    values (p_machine_id, v_user_id, p_slot_start, v_slot_end, 'upcoming');
  exception when exclusion_violation then
    raise exception 'This machine is already booked for this exact time slot.';
  end;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.cancel_booking(p_booking_id int)
returns void as $$
declare
  v_user_id uuid;
  v_slot_start timestamptz;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Fetch the booking
  v_slot_start := (select slot_start from public.bookings where booking_id = p_booking_id and user_id = v_user_id and status = 'upcoming');
  
  if v_slot_start is null then
    raise exception 'Booking not found or already processed.';
  end if;

  -- 2. Check 15 minute cancellation window
  if v_slot_start - interval '15 minutes' <= now() then
    raise exception 'Cannot cancel a booking within 15 minutes of the start time.';
  end if;

  -- 3. Cancel it
  update public.bookings set status = 'cancelled' where booking_id = p_booking_id;
end;
$$ language plpgsql security definer set search_path = public;

-- RPC Functions for Milestone 6 (Admin)
create or replace function public.admin_force_end_session(p_machine_id int)
returns void as $$
declare
  v_user_id uuid;
  v_role user_role;
  v_session_id int;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Verify admin role securely inside Postgres
  v_role := (select role from public.profiles where id = v_user_id);
  if v_role != 'admin' then
    raise exception 'Unauthorized: Admin privileges required.';
  end if;

  -- 2. Find the active session for this machine
  v_session_id := (
    select session_id 
    from public.sessions 
    where machine_id = p_machine_id and status = 'active'
    for update
  );

  if v_session_id is null then
    raise exception 'No active session found for this machine.';
  end if;

  -- 3. Force end the session
  update public.sessions set status = 'ended_early' where session_id = v_session_id;

  -- 4. Free the machine
  update public.machines set status = 'free' where machine_id = p_machine_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.admin_delete_machine(p_machine_id int)
returns void as $$
declare
  v_user_id uuid;
  v_role user_role;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- 1. Verify admin role
  v_role := (select role from public.profiles where id = v_user_id);
  if v_role != 'admin' then
    raise exception 'Unauthorized: Admin privileges required.';
  end if;

  -- 2. Attempt hard delete
  begin
    delete from public.machines where machine_id = p_machine_id;
  exception when foreign_key_violation then
    raise exception 'Cannot physically delete this machine because it has registered student history in the database. Please set it to "maintenance" mode to hide it from students instead!';
  end;
end;
$$ language plpgsql security definer set search_path = public;

