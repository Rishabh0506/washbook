'use client';

import { Session, Machine, Floor } from '@/types/database';
import { useState, useEffect } from 'react';
import { Clock, XCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { formatMachineName } from '@/utils/machine';

interface ActiveSessionBannerProps {
  session: Session | null;
  machine: Machine | null;
  floorLabel: string;
}

export default function ActiveSessionBanner({ session, machine, floorLabel }: ActiveSessionBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);
  const [showWaitingAlert, setShowWaitingAlert] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!session) return;

    const calculateTimeLeft = () => {
      const end = new Date(session.end_time).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        return 'Done';
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const left = calculateTimeLeft();
      setTimeLeft(left);
      
      // Update waiting alert status
      if (session?.notified_at) {
        const notifiedTime = new Date(session.notified_at).getTime();
        const now = new Date().getTime();
        setShowWaitingAlert(now - notifiedTime < 10 * 60 * 1000);
      } else {
        setShowWaitingAlert(false);
      }

      if (left === 'Done') clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  if (!session || !machine) return null;

  async function handleEndEarly() {

    setIsEnding(true);
    const supabase = createClient();

    const { error } = await supabase.rpc('end_session_early', { p_machine_id: machine!.machine_id });

    if (error) {
      console.error('Failed to end session:', error.message);
      setIsEnding(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-[#00695c] to-[#00897b] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full mix-blend-overlay pointer-events-none" />

      {/* Someone is waiting alert */}
      {showWaitingAlert && (
        <div className="mb-4 bg-red-500/90 border border-red-400 rounded-xl p-3 flex items-center justify-center gap-2 animate-pulse shadow-sm relative z-10">
          <AlertCircle className="h-5 w-5 text-white" />
          <span className="font-bold text-sm tracking-wide">Someone is waiting! Please end your session and free the machine.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight uppercase tracking-wide">
              {formatMachineName(machine.name)} <span className="text-teal-100 font-medium text-sm ml-1">• {floorLabel}</span>
            </h3>
            <p className="text-teal-50 text-sm mt-0.5">Your active laundry session</p>
          </div>
        </div>

        <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between sm:justify-end bg-black/10 sm:bg-transparent rounded-xl p-3 sm:p-0">
          <div className="text-left sm:text-right">
            <p className="text-xs text-teal-100 uppercase font-bold tracking-wider mb-1">Time Remaining</p>
            <p className="text-3xl font-mono font-bold leading-none">{timeLeft}</p>
          </div>

          <button
            onClick={handleEndEarly}
            disabled={isEnding}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 transition-colors rounded-lg text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            aria-label="End Session Early"
          >
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{isEnding ? 'Ending...' : 'End Early'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
