'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Machine, Floor, Session } from '@/types/database';
import FloorTabs from './FloorTabs';
import MachineGrid from './MachineGrid';
import MachineSheet from './MachineSheet';
import ActiveSessionBanner from './ActiveSessionBanner';
import BookingSheet from './BookingSheet';
import PushNotificationPrompt from './PushNotificationPrompt';
import { useRouter } from 'next/navigation';

export type GlobalSession = Session & { profiles?: { name: string } | null };

interface DashboardClientProps {
  initialMachines: Machine[];
  initialFloors: Floor[];
  initialSession: Session | null;
  initialActiveSessions: GlobalSession[];
  userId: string;
}

export default function DashboardClient({ initialMachines, initialFloors, initialSession, initialActiveSessions, userId }: DashboardClientProps) {
  const [machines, setMachines] = useState<Machine[]>(initialMachines);
  const [activeSession, setActiveSession] = useState<Session | null>(initialSession);
  const [globalActiveSessions, setGlobalActiveSessions] = useState<GlobalSession[]>(initialActiveSessions);
  
  // Sort floors so they are predictable
  const [floors] = useState<Floor[]>([...initialFloors].sort((a, b) => a.floor_id - b.floor_id));
  const [selectedFloorId, setSelectedFloorId] = useState<number | 'ALL'>('ALL');
  
  // Modal State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedFloorLabel, setSelectedFloorLabel] = useState('');

  const supabase = createClient();
  const router = useRouter();

  // Sync prop changes
  useEffect(() => {
    setActiveSession(initialSession);
    setMachines(initialMachines);
    setGlobalActiveSessions(initialActiveSessions);
  }, [initialSession, initialMachines, initialActiveSessions]);

  useEffect(() => {
    // 1. Subscribe to real-time changes on "machines"
    const machinesChannel = supabase.channel('realtime:machines')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'machines' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setMachines((prev) => 
              prev.map((m) => m.machine_id === payload.new.machine_id ? (payload.new as Machine) : m)
            );
            // If the selected machine changed status, update it in the sheet too
            setSelectedMachine((prev) => 
              prev?.machine_id === payload.new.machine_id ? (payload.new as Machine) : prev
            );
          } else if (payload.eventType === 'INSERT') {
            setMachines((prev) => [...prev, payload.new as Machine]);
          } else if (payload.eventType === 'DELETE') {
            setMachines((prev) => prev.filter((m) => m.machine_id !== payload.old.machine_id));
          }
        }
      )
      .subscribe();

    // 2. Subscribe to real-time changes on ALL "sessions" (global)
    const sessionsChannel = supabase.channel('realtime:sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        async (payload) => {
          const newSession = payload.new as Session;
          const oldSession = payload.old as Session;

          // 1. Maintain local user's specific session banner state
          if (payload.eventType === 'INSERT' && newSession.user_id === userId && newSession.status === 'active') {
            setActiveSession(newSession);
          } else if (payload.eventType === 'UPDATE' && newSession.user_id === userId) {
            setActiveSession(newSession.status === 'active' ? newSession : null);
          }

          // 2. Maintain Global Active Sessions list for everyone's timers
          if (payload.eventType === 'INSERT' && newSession.status === 'active') {
            // Need to fetch their name to display on the public card
            const { data: profile } = await supabase.from('profiles').select('name').eq('id', newSession.user_id).single();
            const globalSess: GlobalSession = { ...newSession, profiles: profile ? { name: profile.name } : null };
            setGlobalActiveSessions((prev) => [...prev, globalSess]);
          } else if (payload.eventType === 'UPDATE') {
            if (newSession.status !== 'active') {
              // Remove them from active global pool
              setGlobalActiveSessions((prev) => prev.filter(s => s.session_id !== newSession.session_id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(machinesChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [supabase, userId]);

  function handleMachineClick(machine: Machine, floorLabel: string) {
    setSelectedMachine(machine);
    setSelectedFloorLabel(floorLabel);
    setIsSheetOpen(true);
  }

  // Derived state
  const displayedMachines = selectedFloorId === 'ALL'
    ? machines
    : machines.filter((m) => m.floor_id === selectedFloorId);

  displayedMachines.sort((a, b) => a.machine_id - b.machine_id);

  // Find the exact machine for the active session (to show in banner)
  const activeMachine = activeSession 
    ? machines.find(m => m.machine_id === activeSession.machine_id) || null
    : null;
    
  const activeFloorLabel = activeMachine 
    ? floors.find(f => f.floor_id === activeMachine.floor_id)?.label || ''
    : '';

  return (
    <div className="space-y-6 relative">
      
      {/* Notification Prompt */}
      {userId && (
        <PushNotificationPrompt userId={userId} />
      )}

      {/* Banner */}
      {activeSession && activeMachine && (
        <ActiveSessionBanner 
          session={activeSession}
          machine={activeMachine}
          floorLabel={activeFloorLabel}
        />
      )}

      {/* Tabs */}
      <FloorTabs 
        floors={floors} 
        selectedFloorId={selectedFloorId} 
        onSelectFloor={setSelectedFloorId} 
      />
      
      {/* Grid */}
      <MachineGrid 
        machines={displayedMachines} 
        floors={floors} 
        onMachineClick={handleMachineClick}
        globalActiveSessions={globalActiveSessions}
      />

      {/* Overlay Sheet */}
      <MachineSheet 
        machine={selectedMachine}
        floorLabel={selectedFloorLabel}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onOpenBooking={() => {
          setIsSheetOpen(false);
          setIsBookingSheetOpen(true);
        }}
        hasActiveSession={!!activeSession}
      />

      {/* Booking Sheet */}
      <BookingSheet 
        machine={selectedMachine}
        activeSession={globalActiveSessions.find(s => s.machine_id === selectedMachine?.machine_id) || null}
        isOpen={isBookingSheetOpen}
        onClose={() => setIsBookingSheetOpen(false)}
      />

    </div>
  );
}
