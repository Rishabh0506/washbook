import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Home, Calendar, Clock, AlertCircle, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import CancelBookingButton from './CancelBookingButton'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // Fetch bookings with machine name
  // To avoid complex nested joins if they are tricky in Supabase, we'll fetch them separately or do a basic join
  const { data: bookingsRaw } = await supabase
    .from('bookings')
    .select(`
      booking_id,
      slot_start,
      slot_end,
      status,
      machines ( name, floor_id )
    `)
    .eq('user_id', session.user.id)
    .order('slot_start', { ascending: false })

  // Also fetch floors to map the floor_id
  const { data: floors } = await supabase.from('floors').select('*')

  const bookings = (bookingsRaw || []).map(b => {
    const machine = (b.machines as any);
    const floor = (floors as any[])?.find((f: any) => f.floor_id === machine?.floor_id);
    return {
      ...b,
      machineName: machine?.name || 'Unknown',
      floorLabel: floor?.label || 'Unknown Floor'
    }
  });
  const upcomingBookings = bookings.filter(b => b.status === 'upcoming' && new Date(b.slot_start).getTime() > new Date().getTime());
  const pastBookings = bookings.filter(b => b.status !== 'upcoming' || new Date(b.slot_start).getTime() <= new Date().getTime());

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <span className="text-xl font-bold text-blue-600">WashBook</span>
              <div className="hidden sm:flex space-x-1">
                <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                  <Home className="h-4 w-4" /> Dashboard
                </Link>
                <Link href="/bookings" className="px-3 py-2 rounded-md text-sm font-bold text-blue-700 bg-blue-50 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> My Bookings
                </Link>
                {profile?.role === 'admin' && (
                  <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border border-transparent hover:border-rose-100">
                    <ShieldAlert className="h-4 w-4" /> Admin Console
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-slate-700 hidden sm:block">
                {profile?.name}
              </span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="p-2 text-slate-500 hover:text-red-600 transition-colors rounded-full hover:bg-slate-100"
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
        <Link href="/" className="flex-1 py-3 text-center text-sm font-medium text-slate-500 border-b-2 border-transparent">
          Dashboard
        </Link>
        <Link href="/bookings" className="flex-1 py-3 text-center text-sm font-bold text-blue-600 border-b-2 border-blue-600">
          My Bookings
        </Link>
        {profile?.role === 'admin' && (
          <Link href="/admin" className="flex-1 py-3 text-center text-sm font-medium text-slate-500 border-b-2 border-transparent">
            Admin
          </Link>
        )}
      </div>

      <main className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Upcoming Bookings</h1>

        {upcomingBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center mb-12">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No upcoming bookings</h3>
            <p className="text-slate-500 max-w-sm mx-auto">You haven't scheduled any laundry sessions for the future. You can book slots from the dashboard.</p>
            <Link href="/" className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4 mb-12">
            {upcomingBookings.map(b => (
              <div key={b.booking_id} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-full hidden sm:block">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{new Date(b.slot_start).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}</h3>
                    <p className="text-blue-600 font-semibold text-lg mt-0.5">
                      {new Date(b.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                      <span className="text-slate-400 text-sm font-normal mx-2">to</span>
                      {new Date(b.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                    </p>
                    <p className="text-slate-500 font-medium mt-2 text-sm flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                      {b.machineName} • {b.floorLabel}
                    </p>
                  </div>
                </div>
                <CancelBookingButton bookingId={b.booking_id} slotStart={b.slot_start} />
              </div>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold text-slate-800 mb-6">Past & Cancelled</h2>
        <div className="space-y-3">
          {pastBookings.length === 0 ? (
            <p className="text-slate-500 italic">No history available.</p>
          ) : pastBookings.slice(0, 10).map(b => (
            <div key={b.booking_id} className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex justify-between items-center opacity-80">
              <div>
                <p className="font-semibold text-slate-700">
                  {new Date(b.slot_start).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} at {new Date(b.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                </p>
                <p className="text-sm text-slate-500">{b.machineName}</p>
              </div>
              <div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-md uppercase tracking-wider ${b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  b.status === 'no_show' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

    </div>
  )
}
