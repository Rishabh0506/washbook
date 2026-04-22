import { useState, useEffect } from 'react';
import { Machine } from '@/types/database';
import { WashingMachine, AlertCircle, Clock } from 'lucide-react';
import type { GlobalSession } from './DashboardClient';

interface MachineCardProps {
  machine: Machine;
  activeSession?: GlobalSession | null;
  floorLabel: string;
  onClick: () => void;
  currentUserId: string;
}

export default function MachineCard({ machine, activeSession, floorLabel, onClick, currentUserId }: MachineCardProps) {
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
  const [notifyLoading, setNotifyLoading] = useState(false);

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

  // Calculate progress for occupied
  let progressPercent = 0;
  if (machine.status === 'occupied' && activeSession?.start_time) {
    const startTime = new Date(activeSession.start_time).getTime();
    const duration = 45 * 60 * 1000;
    const now = new Date().getTime();
    const elapsed = now - startTime;
    progressPercent = Math.min(100, Math.max(0, (elapsed / duration) * 100));
  }

  // Adjust icon styles for new design
  let iconBgClass = 'bg-slate-200 text-slate-500';
  if (machine.status === 'free') iconBgClass = 'bg-green-100 text-green-700';
  if (machine.status === 'occupied') iconBgClass = 'bg-slate-200 text-slate-600'; // the image shows a grey box

  // Notified UI rules
  const isOccupant = activeSession?.user_id === currentUserId;
  const isLate = timeLeft.startsWith('Late');
  let canNotify = false;
  let hasBeenNotifiedRecently = false;
  let notifyTimeLeft = '';

  if (machine.status === 'occupied' && !isOccupant && isLate) {
    if (activeSession?.notified_at) {
      const notifiedTime = new Date(activeSession.notified_at).getTime();
      const now = new Date().getTime();
      const diffSinceNotify = now - notifiedTime;
      if (diffSinceNotify < 10 * 60 * 1000) {
        hasBeenNotifiedRecently = true;
        const minsLeft = Math.ceil((10 * 60 * 1000 - diffSinceNotify) / 60000);
        notifyTimeLeft = `${minsLeft}m`;
      } else {
        canNotify = true;
      }
    } else {
      canNotify = true;
    }
  }

  const handleNotify = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canNotify || !activeSession) return;
    
    setNotifyLoading(true);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.session_id, machineId: machine.machine_id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to notify');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to send notification.');
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-row gap-4 items-stretch cursor-pointer bg-white hover:shadow-md ${cardClass}`}
    >
      {/* Icon Block */}
      <div className={`w-20 rounded-xl flex items-center justify-center shrink-0 ${iconBgClass}`}>
        <WashingMachine className="h-8 w-8" />
      </div>

      {/* Content Block */}
      <div className="flex-1 flex flex-col justify-between py-1">
        {/* Top Row */}
        <div className="flex justify-between items-start">
          <h3 className="text-base font-bold text-slate-800">{machine.name}</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
            {statusText}
          </span>
        </div>
        
        {/* Subtitle / Time */}
        <div className="mt-1 mb-3">
          {machine.status === 'occupied' ? (
            <p className="text-xs font-medium text-slate-600">
              {timeLeft ? (timeLeft.startsWith('Late') ? timeLeft : `Cycle ends in ${timeLeft.replace(' left', '')}`) : 'Calculating...'}
            </p>
          ) : (
            <p className="text-xs font-medium text-slate-500">{floorLabel} • Ready for use</p>
          )}
        </div>

        {/* Bottom Element */}
        <div className="mt-auto">
          {machine.status === 'occupied' ? (
            <div className="space-y-2">
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-700 rounded-full transition-all duration-1000 ease-in-out" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              {/* Notify Button */}
              {isLate && !isOccupant && (
                hasBeenNotifiedRecently ? (
                  <button disabled className="w-full py-1.5 rounded-lg text-xs font-bold text-slate-500 bg-slate-100 cursor-not-allowed">
                    Notified ✓ ({notifyTimeLeft})
                  </button>
                ) : (
                  <button 
                    onClick={handleNotify} 
                    disabled={notifyLoading}
                    className="w-full py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    {notifyLoading ? 'Notifying...' : 'Notify Occupant'}
                  </button>
                )
              )}
            </div>
          ) : machine.status === 'free' ? (
            <button className="w-full py-1.5 rounded-lg text-xs font-bold text-green-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              Book {machine.name.split('-')[0]}
            </button>
          ) : (
            <div className="w-full h-1.5 bg-transparent"></div>
          )}
        </div>
      </div>
    </div>
  );
}
