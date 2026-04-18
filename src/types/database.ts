export type UserRole = 'student' | 'admin';
export type MachineStatus = 'free' | 'occupied' | 'maintenance';
export type SessionStatus = 'active' | 'completed' | 'ended_early';

export interface Profile {
  id: string; // UUID from Supabase Auth
  college_id: string;
  name: string;
  role: UserRole;
  push_subscription: string | null;
  created_at: string;
}

export interface Floor {
  floor_id: number;
  label: string;
  building: string | null;
  created_at: string;
}

export interface Machine {
  machine_id: number;
  floor_id: number;
  name: string;
  status: MachineStatus;
  created_at: string;
}

export interface Session {
  session_id: number;
  machine_id: number;
  user_id: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  notified_at: string | null;
}
