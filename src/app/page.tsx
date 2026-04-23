import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Home, Calendar, ShieldAlert, LayoutGrid } from 'lucide-react'
import DashboardClient from '@/components/dashboard/DashboardClient'

export default async function Dashboard() {
  const supabase = await createClient()

  // Guard: if not authenticated, redirect to login
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // Fetch initial floors and machines for hydration
  const { data: floors } = await supabase.from('floors').select('*')
  const { data: machines } = await supabase.from('machines').select('*')

  // Fetch ALL global active sessions along with their standard user profile names
  const { data: allActiveSessions } = await supabase
    .from('sessions')
    .select(`
      *,
      profiles:user_id (
        name
      )
    `)
    .eq('status', 'active')

  // The local user's specific active session (for the banner)
  const activeSession = allActiveSessions?.find(s => s.user_id === session.user.id) || null

  // Fetch earliest upcoming booking for this user
  const { data: upcomingBookingRaw } = await supabase
    .from('bookings')
    .select(`
      booking_id,
      machine_id,
      slot_start,
      slot_end,
      status,
      machines ( name, floor_id )
    `)
    .eq('user_id', session.user.id)
    .eq('status', 'upcoming')
    .order('slot_start', { ascending: true })
    .limit(1)
    .maybeSingle()

  let upcomingBooking = null;
  if (upcomingBookingRaw) {
    const machine = (upcomingBookingRaw.machines as any);
    const floor = floors?.find((f: any) => f.floor_id === machine?.floor_id);
    upcomingBooking = {
      ...upcomingBookingRaw,
      machineName: machine?.name || 'Unknown',
      floorLabel: floor?.label || 'Unknown Floor'
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf7f2]">
      {/* Top Navbar */}
      <nav className="bg-[#005d5d] border-b border-[#004d4d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-white">Laundry</span>
                <span className="text-[#eab308]">Link</span>
              </span>
              <div className="hidden sm:flex space-x-1">
                 <Link href="/" className="px-3 py-2 rounded-md text-sm font-bold text-[#ff8c61] bg-white/10 flex items-center gap-2 border-b-2 border-[#ff8c61]">
                    <LayoutGrid className="h-4 w-4" /> Dashboard
                 </Link>
                 <Link href="/bookings" className="px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2 transition-colors">
                    My Bookings
                 </Link>
                 {profile?.role === 'admin' && (
                    <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-bold text-rose-300 hover:text-rose-100 hover:bg-white/5 flex items-center gap-2 transition-colors border border-transparent">
                      <ShieldAlert className="h-4 w-4" /> Admin Console
                    </Link>
                 )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-white/80 hidden sm:block">
                {profile?.name || session.user.email}
              </span>
              <form action="/auth/signout" method="post">
                <button 
                  type="submit" 
                  className="p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/5"
                  aria-label="Log Out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className="sm:hidden bg-white border-b border-slate-200 flex">
        <Link href="/" className="flex-1 py-3 text-center text-sm font-bold text-[#ff8c61] border-b-2 border-[#ff8c61] flex flex-col items-center gap-1">
          <LayoutGrid className="h-5 w-5" />
          Dashboard
        </Link>
        <Link href="/bookings" className="flex-1 py-3 text-center text-sm font-medium text-slate-500 border-b-2 border-transparent flex flex-col items-center gap-1">
          <Calendar className="h-5 w-5 opacity-40" />
          My Bookings
        </Link>
        {profile?.role === 'admin' && (
          <Link href="/admin" className="flex-1 py-3 text-center text-sm font-medium text-slate-500 border-b-2 border-transparent flex flex-col items-center gap-1">
            <ShieldAlert className="h-5 w-5 opacity-40" />
            Admin
          </Link>
        )}
      </div>

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Hero Banner */}
        <div className="relative h-48 rounded-2xl overflow-hidden shadow-sm mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            className="absolute inset-0 w-full h-full object-cover" 
            alt="interior of a high-end laundry room with sleek metallic washing machines and soft blue atmospheric lighting" 
            src="/laundry-hero.png"
          />
          <div className="relative z-20 h-full flex flex-col justify-center px-8 text-white bg-black/20">
            <h2 className="text-3xl font-black mb-2 drop-shadow-lg tracking-tight uppercase">
              <span className="text-white">TAP. </span>
              <span className="text-[#36b3b3]">BOOK. </span>
              <span className="text-[#ffb700]">DONE.</span>
            </h2>
            <p className="text-base text-slate-100 opacity-90 max-w-xs drop-shadow-md">Real-time laundry tracking for smart living spaces.</p>
          </div>
        </div>



        <DashboardClient 
          initialFloors={floors || []} 
          initialMachines={machines || []} 
          initialSession={activeSession || null}
          initialActiveSessions={allActiveSessions as any || []}
          initialUpcomingBooking={upcomingBooking}
          userId={session.user.id}
        />
      </main>
    </div>
  )
}
