'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Activity, Wrench, WashingMachine, ToggleLeft, ToggleRight, XOctagon, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardClient({ initialMachines, initialSessions, initialFloors }: { initialMachines: any[], initialSessions: any[], initialFloors: any[] }) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [isAddMode, setIsAddMode] = useState(false);
    const [newMachineName, setNewMachineName] = useState('');
    const [newMachineFloor, setNewMachineFloor] = useState<number | ''>('');
    const router = useRouter();
    const supabase = createClient();

    const handleToggleMaintenance = async (machine: any) => {
        setLoadingMap(prev => ({ ...prev, [machine.machine_id]: true }));
        const newStatus = machine.status === 'maintenance' ? 'free' : 'maintenance';
        
        const { error } = await supabase
            .from('machines')
            .update({ status: newStatus })
            .eq('machine_id', machine.machine_id);

        if (error) alert('Failed to update maintenance mode: ' + error.message);
        else router.refresh();
        
        setLoadingMap(prev => ({ ...prev, [machine.machine_id]: false }));
    };

    const handleForceEndSession = async (machineId: number, sessionId: number) => {
        
        setLoadingMap(prev => ({ ...prev, [`session_${sessionId}`]: true }));
        const { error } = await supabase.rpc('admin_force_end_session', { p_machine_id: machineId });
        
        if (error) console.error('Emergency stop failed:', error.message);
        else router.refresh();
        
        setLoadingMap(prev => ({ ...prev, [`session_${sessionId}`]: false }));
    };

    const handleAddMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMachineFloor || !newMachineName) return;
        setLoadingMap(prev => ({ ...prev, 'add': true }));
        const { error } = await supabase.from('machines').insert({ floor_id: newMachineFloor, name: newMachineName });
        
        if (error) {
            alert('Failed to add machine: ' + error.message);
        } else {
            setIsAddMode(false);
            setNewMachineName('');
            setNewMachineFloor('');
            router.refresh();
        }
        setLoadingMap(prev => ({ ...prev, 'add': false }));
    };

    const handleDeleteMachine = async (machineId: number) => {
        
        setLoadingMap(prev => ({ ...prev, [machineId]: true }));
        const { error } = await supabase.rpc('admin_delete_machine', { p_machine_id: machineId });
        
        if (error) console.error('Failed to delete machine:', error.message); // Will display the custom Postgres exception we wrote!
        else router.refresh();
        
        setLoadingMap(prev => ({ ...prev, [machineId]: false }));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start relative">
            
            {/* Active Sessions Feed */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-6">
                    <Activity className="h-6 w-6 text-teal-500" />
                    <h2 className="text-xl font-bold text-slate-800">Live Sessions</h2>
                    <span className="ml-auto bg-teal-50 text-teal-600 py-1 px-3 rounded-full text-xs font-bold tracking-wider">
                        {initialSessions.length} ACTIVE
                    </span>
                </div>

                {initialSessions.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center bg-white/50">
                        <p className="text-slate-400 italic font-medium">No machines are currently running.</p>
                    </div>
                ) : (
                    initialSessions.map(session => (
                        <div key={session.session_id} className="bg-white rounded-2xl p-5 border border-slate-100 relative overflow-hidden group shadow-sm">
                           <div className="absolute top-0 left-0 w-1 h-full bg-[#ff8c61]" />
                           <div className="flex justify-between items-start">
                               <div>
                                   <h3 className="font-bold text-lg text-slate-800 mb-1 flex items-center gap-2">
                                       <WashingMachine className="h-4 w-4 text-slate-400" />
                                       {session.machineName} <span className="text-sm font-normal text-slate-400">({session.floorLabel})</span>
                                   </h3>
                                   <p className="text-sm text-slate-600">
                                       <span className="text-slate-400 font-medium">Student:</span> {session.studentName || 'Unknown'} <span className="text-slate-400 font-medium ml-2">ID:</span> {session.collegeId || 'Unknown'}
                                   </p>
                                   <p className="text-xs text-slate-500 mt-2">
                                       Started at {new Date(session.start_time).toLocaleTimeString()}
                                   </p>
                               </div>
                               <button
                                  onClick={() => handleForceEndSession(session.machine_id, session.session_id)}
                                  disabled={loadingMap[`session_${session.session_id}`]}
                                  className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                               >
                                  {loadingMap[`session_${session.session_id}`] ? 'Killing...' : <><XOctagon className="h-4 w-4"/> FORCE END</>}
                               </button>
                           </div>
                        </div>
                    ))
                )}
            </div>

            {/* Machine Hardware Control */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Wrench className="h-6 w-6 text-slate-400" />
                        <h2 className="text-xl font-bold text-slate-800">Hardware Management</h2>
                    </div>
                    <button 
                        onClick={() => setIsAddMode(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#65b27b] to-[#2e9e9e] text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md"
                    >
                        <Plus className="h-4 w-4" /> Add Machine
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {initialMachines.map((machine) => {
                        const isMaint = machine.status === 'maintenance';
                        const isOccupied = machine.status === 'occupied';
                        const isLoading = loadingMap[machine.machine_id];

                        return (
                            <div key={machine.machine_id} className={`rounded-xl p-4 border transition-colors shadow-sm ${
                                isMaint ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'
                            }`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-bold text-slate-800">{machine.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{machine.floorLabel}</p>
                                    </div>
                                    <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                        isMaint ? 'bg-rose-500/20 text-rose-400' : 
                                        isOccupied ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
                                    }`}>
                                        {machine.status}
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleToggleMaintenance(machine)}
                                        disabled={isLoading || isOccupied}
                                        className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                            isMaint 
                                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>Maintenance</span>
                                        {isMaint ? <ToggleRight className="h-5 w-5 text-rose-500"/> : <ToggleLeft className="h-5 w-5 text-slate-500"/>}
                                    </button>
                                    
                                    <button 
                                        onClick={() => handleDeleteMachine(machine.machine_id)}
                                        disabled={isLoading || isOccupied}
                                        className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                        title="Permanent Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                
                                {isOccupied && <p className="text-[10px] text-amber-500/70 mt-2 text-center">Cannot modify while occupied</p>}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Add Machine Modal Overlay */}
            {isAddMode && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddMachine} className="bg-white border border-slate-100 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="font-bold text-xl text-slate-800">Deploy New Hardware</h3>
                            <button type="button" onClick={() => setIsAddMode(false)} className="text-slate-500 hover:text-slate-300">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Machine Identifier</label>
                                <input
                                    required
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
                                    placeholder="e.g. M4 - L1"
                                    value={newMachineName}
                                    onChange={e => setNewMachineName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Floor Location</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                                    value={newMachineFloor}
                                    onChange={e => setNewMachineFloor(Number(e.target.value))}
                                >
                                    <option value="" disabled>Select a floor...</option>
                                    {initialFloors.map(f => (
                                        <option key={f.floor_id} value={f.floor_id}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button type="button" onClick={() => setIsAddMode(false)} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={loadingMap['add'] || !newMachineName || !newMachineFloor} className="flex-1 px-4 py-3 rounded-xl font-bold bg-gradient-to-r from-[#65b27b] to-[#2e9e9e] text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50">
                                {loadingMap['add'] ? 'Deploying...' : 'Deploy Machine'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

        </div>
    )
}
