import { useState, useEffect } from 'react';
import { Machine } from '@/types/database';
import { WashingMachine, AlertCircle, Clock } from 'lucide-react';
import type { GlobalSession } from './DashboardClient';

interface MachineCardProps {
  machine: Machine;
  activeSession?: GlobalSession | null;
  floorLabel: string;
  onClick: () => void;
}

export default function MachineCard({ machine, activeSession, floorLabel, onClick }: MachineCardProps) {
  // Determine styles and labels based on status
  let cardClass = '';
  let badgeClass = '';
  let statusText = '';
  let Icon = WashingMachine;

  switch (machine.status) {
    case 'free':
      cardClass = 'border-green-200 bg-white hover:border-green-400 hover:shadow-md cursor-pointer';
      badgeClass = 'bg-green-100 text-green-700 border-green-200';
      statusText = 'Available';
      break;
    case 'occupied':
      cardClass = 'border-red-200 bg-red-50';
      badgeClass = 'bg-red-100 text-red-700 border-red-200';
      statusText = activeSession?.profiles?.name ? `Occupied by ${activeSession.profiles.name.split(' ')[0]}` : 'Occupied';
      Icon = Clock; // Shows timer in M3
      break;
    case 'maintenance':
      cardClass = 'border-slate-200 bg-slate-50 opacity-75 cursor-pointer';
      badgeClass = 'bg-slate-200 text-slate-700 border-slate-300';
      statusText = 'Maintenance';
      Icon = AlertCircle;
      break;
    default:
      cardClass = 'border-slate-200 bg-white cursor-pointer';
      badgeClass = 'bg-slate-100 text-slate-600';
      statusText = machine.status;
  }

  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (machine.status !== 'occupied' || !activeSession?.start_time) {
      setTimeLeft('');
      return;
    }

    const calculateTime = () => {
      const startTime = new Date(activeSession.start_time).getTime();
      const endTime = startTime + 45 * 60 * 1000; // 45 minutes
      const now = new Date().getTime();
      const diff = endTime - now;

      if (diff <= 0) {
        const lateMinutes = Math.floor(Math.abs(diff) / 1000 / 60);
        setTimeLeft(`Late by ${lateMinutes} min${lateMinutes === 1 ? '' : 's'}`);
        return;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      setTimeLeft(`${minutes} min${minutes === 1 ? '' : 's'} left`);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // update every minute

    return () => clearInterval(interval);
  }, [machine.status, activeSession]);

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col justify-between cursor-pointer ${cardClass}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{machine.name}</h3>
          <p className="text-xs text-slate-500 font-medium">{floorLabel}</p>
        </div>
        <div className={`p-2 rounded-full ${badgeClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass} max-w-[70%] truncate block`} title={statusText}>
          {statusText}
        </span>
        
        {timeLeft && (
          <span className="text-xs font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded border border-red-100 animate-pulse">
            {timeLeft}
          </span>
        )}
      </div>
    </div>
  );
}
