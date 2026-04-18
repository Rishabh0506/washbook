import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Home, Calendar, ShieldAlert, Activity, Settings, Wrench, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Guard: Ensure user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (profile?.role !== 'admin') {
     // If a student tries to hack into the admin panel, kick them back to the dashboard
     redirect('/')
  }

  // Fetch all required data for the admin console
  const { data: machinesRaw } = await supabase.from('machines').select('*, floors(label)').order('machine_id')
  const { data: activeSessionsRaw } = await supabase
        .from('sessions')
        .select('*, machines(name, floors(label)), profiles(name, college_id)')
        .eq('status', 'active')
        .order('start_time', { ascending: false })

  const machines = machinesRaw?.map(m => ({
      ...m,
      // @ts-ignore
      floorLabel: m.floors?.label || 'Unknown'
  })) || []

  // Ensure active sessions correctly maps relations
  const activeSessions = activeSessionsRaw?.map(s => ({
    ...s,
    // @ts-ignore
    machineName: s.machines?.name,
    // @ts-ignore
    floorLabel: s.machines?.floors?.label,
    // @ts-ignore
    studentName: s.profiles?.name,
    // @ts-ignore
    collegeId: s.profiles?.college_id
  })) || []

  const metrics = {
      total: machines.length,
      free: machines.filter(m => m.status === 'free').length,
      occupied: machines.filter(m => m.status === 'occupied').length,
      maintenance: machines.filter(m => m.status === 'maintenance').length
  }

  // Fetch floors for the Add Machine dropdown
  const { data: floorsRaw } = await supabase.from('floors').select('*').order('floor_id')
  const floors = floorsRaw || []

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Navbar */}
      <nav className="bg-slate-950 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-6">
              <span className="text-xl font-bold flex items-center gap-2 text-rose-500">
                <ShieldAlert className="h-6 w-6" /> WashBook Admin
               </span>
              <div className="hidden sm:flex space-x-1">
                 <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors">
                    <Home className="h-4 w-4" /> Dashboard
                 </Link>
                 <Link href="/bookings" className="px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors">
                    <Calendar className="h-4 w-4" /> My Bookings
                 </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-rose-400 hidden sm:flex items-center gap-1.5 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20">
                ADMIN SECURE
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className="sm:hidden bg-slate-950 border-b border-slate-800 flex">
        <Link href="/" className="flex-1 py-3 text-center text-sm font-medium text-slate-400 border-b-2 border-transparent">
          Dashboard
        </Link>
        <div className="flex-1 py-3 text-center text-sm font-bold text-rose-500 border-b-2 border-rose-500 flex items-center justify-center gap-2">
           <ShieldAlert className="h-4 w-4" /> Admin
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                <p className="text-slate-400 font-medium text-sm mb-1">Total Machines</p>
                <p className="text-3xl font-bold">{metrics.total}</p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                <p className="text-slate-400 font-medium text-sm mb-1">Available</p>
                <div className="flex items-baseline gap-2">
                     <p className="text-3xl font-bold text-green-400">{metrics.free}</p>
                     <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
            </div>
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
                <p className="text-slate-400 font-medium text-sm mb-1">In Use</p>
                <div className="flex items-baseline gap-2">
                     <p className="text-3xl font-bold text-amber-500">{metrics.occupied}</p>
                     <Activity className="h-4 w-4 text-amber-500 animate-pulse" />
                </div>
            </div>
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-red-500/30 ring-1 ring-inset ring-red-500/20">
                <p className="text-slate-400 font-medium text-sm mb-1">Maintenance</p>
                <div className="flex items-baseline gap-2">
                     <p className="text-3xl font-bold text-rose-500">{metrics.maintenance}</p>
                     <AlertTriangle className="h-4 w-4 text-rose-500" />
                </div>
            </div>
        </div>

        {/* Dynamic Client Shell */}
        <AdminDashboardClient 
            initialMachines={machines}
            initialSessions={activeSessions}
            initialFloors={floors}
        />

      </main>

    </div>
  )
}
