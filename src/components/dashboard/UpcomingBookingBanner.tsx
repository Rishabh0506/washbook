'use client';

import { useState } from 'react';
import { PlayCircle, Calendar, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { formatMachineName } from '@/utils/machine';

interface UpcomingBookingBannerProps {
  booking: any;
}

export default function UpcomingBookingBanner({ booking }: UpcomingBookingBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!booking) return null;

  async function handleStartSession() {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // 1. Try to start the session on the machine
    const { error: rpcError } = await supabase.rpc('start_session_for_machine', { p_machine_id: booking.machine_id });

    if (rpcError) {
      // Sometimes it's called 'start_session' based on earlier code
      const { error: fallbackError } = await supabase.rpc('start_session', { p_machine_id: booking.machine_id });
      if (fallbackError) {
         setError(fallbackError.message || rpcError.message);
         setLoading(false);
         return;
      }
    }

    // 2. Clear booking by setting to completed
    await supabase.from('bookings').update({ status: 'completed' }).eq('booking_id', booking.booking_id);
      
    setLoading(false);
    router.refresh(); // Automatically triggers server sync for dashboard, substituting banner!
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  };

  const isToday = new Date(booking.slot_start).setHours(0,0,0,0) === new Date().setHours(0,0,0,0);
  const displayDate = isToday ? 'Today' : new Date(booking.slot_start).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', day: 'numeric' });

  return (
    <div className="mb-6 bg-gradient-to-r from-[#004d40] to-[#00695c] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-5 rounded-full mix-blend-overlay pointer-events-none" />

      {error && (
        <div className="mb-4 bg-red-500/90 border border-red-400 rounded-xl p-3 flex items-center justify-center gap-2 shadow-sm relative z-10 w-full">
          <AlertCircle className="h-5 w-5 text-white shrink-0" />
          <span className="font-semibold text-sm tracking-wide">{error}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight uppercase tracking-wide">
              {formatMachineName(booking.machineName)} <span className="text-teal-100 font-medium text-sm ml-1">• {booking.floorLabel}</span>
            </h3>
            <p className="text-teal-50 text-sm mt-0.5">Upcoming Booking</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 self-stretch sm:self-auto w-full sm:w-auto">
          <div className="bg-black/10 sm:bg-transparent rounded-xl p-3 sm:p-0 flex flex-col justify-center">
            <p className="text-xs text-teal-100 uppercase font-bold tracking-wider mb-1">Reserved Slot</p>
            <p className="text-xl sm:text-2xl font-bold leading-none flex items-center gap-2">
              <span className="bg-teal-900/40 px-2 py-0.5 rounded text-sm sm:text-base">{displayDate}</span>
              {formatTime(booking.slot_start)}
            </p>
          </div>

          <button
            onClick={handleStartSession}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-teal-50 transition-colors rounded-xl text-teal-800 shadow-md disabled:opacity-50 flex-1 sm:flex-none mt-2 sm:mt-0"
            aria-label="Start Session"
          >
            <PlayCircle className="h-5 w-5" />
            <span className="font-bold whitespace-nowrap">{loading ? 'Starting...' : 'Start Session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
