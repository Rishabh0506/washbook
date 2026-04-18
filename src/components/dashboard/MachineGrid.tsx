import { Machine, Floor } from '@/types/database';
import type { GlobalSession } from './DashboardClient';
import MachineCard from './MachineCard';

interface MachineGridProps {
  machines: Machine[];
  floors: Floor[];
  onMachineClick: (machine: Machine, floorLabel: string) => void;
  globalActiveSessions: GlobalSession[];
}

export default function MachineGrid({ machines, floors, onMachineClick, globalActiveSessions }: MachineGridProps) {
  if (machines.length === 0) {
    return (
      <div className="py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed">
        <p className="text-slate-500 font-medium">No machines found for this floor.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {machines.map((machine) => {
        const floor = floors.find((f) => f.floor_id === machine.floor_id);
        const floorLabel = floor ? floor.label : `Floor ${machine.floor_id}`;
        const activeSess = globalActiveSessions.find(s => s.machine_id === machine.machine_id);
        
        return (
          <MachineCard 
            key={machine.machine_id} 
            machine={machine} 
            activeSession={activeSess || null}
            floorLabel={floorLabel}
            onClick={() => onMachineClick(machine, floorLabel)}
          />
        );
      })}
    </div>
  );
}
