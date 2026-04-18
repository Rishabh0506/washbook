import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Home, Calendar, ShieldAlert } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <span className="text-xl font-bold text-blue-600">WashBook</span>
              <div className="hidden sm:flex space-x-1">
                 <Link href="/" className="px-3 py-2 rounded-md text-sm font-bold text-blue-700 bg-blue-50 flex items-center gap-2">
                    <Home className="h-4 w-4" /> Dashboard
                 </Link>
                 <Link href="/bookings" className="px-3 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors">
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
                {profile?.name || session.user.email}
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

      {/* Main Dashboard Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-600 mt-1">
              Select a floor to see real-time machine availability.
            </p>
          </div>
        </div>

        <DashboardClient 
          initialFloors={floors || []} 
          initialMachines={machines || []} 
          initialSession={activeSession || null}
          initialActiveSessions={allActiveSessions as any || []}
          userId={session.user.id}
        />
      </main>
    </div>
  )
}
