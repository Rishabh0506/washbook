import { useState, useEffect } from 'react';
import { Machine } from '@/types/database';
import { WashingMachine, AlertCircle, Clock, MapPin, CheckCircle, Calendar, ChevronRight } from 'lucide-react';
import type { GlobalSession } from './DashboardClient';
import { formatMachineName } from '@/utils/machine';

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
      cardClass = 'border-green-100 bg-white hover:border-green-300 hover:shadow-lg cursor-pointer';
      badgeClass = 'bg-green-50 text-green-700 border-green-100';
      statusText = 'AVAILABLE';
      break;
    case 'occupied':
      cardClass = 'border-red-100 bg-white hover:shadow-lg';
      badgeClass = 'bg-red-50 text-red-700 border-red-100';
      statusText = activeSession?.profiles?.name ? `OCCUPIED BY ${activeSession.profiles.name.split(' ')[0].toUpperCase()}` : 'OCCUPIED';
      Icon = Clock;
      break;
    case 'maintenance':
      cardClass = 'border-slate-100 bg-slate-50 opacity-75 cursor-pointer';
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
      statusText = 'MAINTENANCE';
      Icon = AlertCircle;
      break;
    default:
      cardClass = 'border-slate-100 bg-white cursor-pointer';
      badgeClass = 'bg-slate-50 text-slate-600';
      statusText = machine.status.toUpperCase();
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
      className={`p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border-2 transition-all duration-300 flex flex-row gap-4 sm:gap-6 items-stretch shadow-sm ${cardClass}`}
    >
      {/* Icon Block - Left side with decorative dots and gradient */}
      <div className={`w-20 sm:w-24 lg:w-28 rounded-2xl sm:rounded-3xl flex items-center justify-center shrink-0 relative overflow-hidden bg-[#e0f2f1]`}>
        {/* Decorative Dots */}
        <div className="absolute top-4 right-4 grid grid-cols-2 gap-1 opacity-20">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-green-800 rounded-full" />
          ))}
        </div>
        
        {/* Main Icon with stylized container */}
        <div className="relative z-10 p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/50 shadow-sm">
          <WashingMachine className="h-8 w-8 sm:h-10 sm:w-10 text-[#00695c] stroke-[1.5]" />
        </div>
      </div>

      {/* Content Block */}
      <div className="flex-1 flex flex-col justify-center py-0 sm:py-1 min-w-0">
        {/* Top Row with Title and Badge */}
        <div className="flex flex-wrap justify-between items-start gap-2 mb-3 sm:mb-4">
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1e293b] tracking-tight truncate mr-2">
            {formatMachineName(machine.name)}
          </h3>
          <span className={`inline-flex items-center px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black tracking-widest gap-1.5 sm:gap-2 border shadow-sm shrink-0 ${badgeClass}`}>
            <span className={`w-2 h-2 rounded-full ${machine.status === 'free' ? 'bg-[#38a169]' : 'bg-[#e53e3e]'}`} />
            {statusText}
          </span>
        </div>
        
        {/* Info Row: Floor | Status */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400 mb-4 sm:mb-6">
          <div className="flex items-center gap-1.5 font-medium whitespace-nowrap">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#38a169]" />
            <span className="text-xs sm:text-sm">{floorLabel}</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5 font-medium whitespace-nowrap">
            {machine.status === 'free' ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#38a169]" />
                <span className="text-xs sm:text-sm">Ready for use</span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                <span className="text-xs sm:text-sm">{timeLeft || 'In Use'}</span>
              </>
            )}
          </div>
        </div>

        {/* Bottom Action Area */}
        <div className="mt-auto">
          {machine.status === 'free' ? (
            <button className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl text-white bg-gradient-to-r from-[#65b27b] to-[#2e9e9e] hover:shadow-lg transition-all flex items-center justify-between group shadow-sm border-none">
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              <span className="flex-1 text-center px-2">Book/Use</span>
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-white/70 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : machine.status === 'occupied' ? (
             <div className="space-y-3">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600 rounded-full transition-all duration-1000 ease-in-out" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              {isLate && !isOccupant && (
                 <button 
                  onClick={handleNotify} 
                  disabled={notifyLoading || hasBeenNotifiedRecently}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border shadow-sm
                    ${hasBeenNotifiedRecently 
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                >
                   {notifyLoading ? 'Notifying...' : hasBeenNotifiedRecently ? `Notified (${notifyTimeLeft})` : 'Notify Occupant'}
                </button>
              )}
            </div>
          ) : (
            <div className="w-full py-4 text-center text-slate-400 font-bold text-sm border-2 border-dashed border-slate-200 rounded-2xl">
              Currently Unavailable
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
