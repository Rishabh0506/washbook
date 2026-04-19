'use client';

import { Machine } from '@/types/database';
import { Calendar, X, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface BookingSheetProps {
  machine: Machine | null;
  activeSession?: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingSheet({ machine, activeSession, isOpen, onClose }: BookingSheetProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !machine) return;
    
    // Fetch upcoming bookings for this machine to disable overlapping slots
    async function fetchBookings() {
      setFetching(true);
      const { data } = await supabase
        .from('bookings')
        .select('slot_start, slot_end')
        .eq('machine_id', machine!.machine_id)
        .eq('status', 'upcoming');
      
      if (data) setExistingBookings(data);
      setFetching(false);
    }
    
    fetchBookings();
    setSelectedSlot(null);
    setError(null);
  }, [isOpen, machine, supabase]);

  if (!isOpen || !machine) return null;

  // Generate dynamically packed 45-min slots for the next 24 hours
  const generateSlots = () => {
    const slots = [];
    let currentStart = new Date();

    // 1. Shift exact grid alignment if a random walk-in session is currently running
    if (activeSession && activeSession.start_time) {
      const activeEnd = new Date(activeSession.start_time).getTime() + 45 * 60000;
      if (activeEnd > currentStart.getTime()) {
        currentStart = new Date(activeEnd); // Snap dynamically
      } else {
        // Session is late! The machine is physically blocked, but theoretically available the exact second they remove clothes. 
        // We start the grid exactly from 'Now' rounded to the nearest 5 mins for UI cleanliness.
        const remainder = 5 - (currentStart.getMinutes() % 5);
        currentStart.setMinutes(currentStart.getMinutes() + remainder, 0, 0);
      }
    } else {
      // Round up to the next 5-minute mark for empty idle machines
      const remainder = currentStart.getMinutes() % 5 === 0 ? 0 : 5 - (currentStart.getMinutes() % 5);
      currentStart.setMinutes(currentStart.getMinutes() + remainder, 0, 0);
    }

    // Sort future bookings sequentially to allow algorithmic chronological packing
    const sortedBookings = [...existingBookings].sort((a, b) => 
      new Date(a.slot_start).getTime() - new Date(b.slot_start).getTime()
    );

    // 2. Generate slots chronologically, skipping past any rigid reserved blockers
    for (let i = 0; i < 32; i++) {
        const slotEnd = new Date(currentStart.getTime() + 45 * 60000);
        
        let isConflict = false;
        let conflictEnd = null;

        // Check if our proposed 45-min contiguous slot overlaps any future booking
        for (const b of sortedBookings) {
            const bStart = new Date(b.slot_start).getTime();
            const bEnd = new Date(b.slot_end).getTime();
            
            if (bStart < slotEnd.getTime() && bEnd > currentStart.getTime()) {
                isConflict = true;
                conflictEnd = new Date(bEnd);
                break;
            }
        }
        
        if (isConflict && conflictEnd) {
            slots.push({ start: new Date(currentStart), end: slotEnd, isConflict: true });
            currentStart = conflictEnd; // Jump timeline pointer cleanly past the conflicting block
        } else {
            slots.push({ start: new Date(currentStart), end: slotEnd, isConflict: false });
            currentStart = slotEnd; // Advance contiguous
        }
    }
    return slots;
  };

  const slots = generateSlots();

  async function handleConfirmBooking() {
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc('create_booking', { 
        p_machine_id: machine!.machine_id,
        p_slot_start: selectedSlot.toISOString()
    });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      router.push('/bookings'); // Redirect to my bookings
    }
  }

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed inset-x-0 bottom-0 z-[70] transform transition-transform duration-300 ease-out bg-white rounded-t-3xl shadow-2xl overflow-hidden sm:max-w-md sm:mx-auto sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-3xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-6 sm:p-8 flex-shrink-0 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Book Slot</h2>
                <p className="text-slate-500 text-sm font-medium">{machine.name} • 45 min duration</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Slot Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/50">
           {error && (
            <div className="mb-4 flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <p className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Select a Time</p>
          
          {fetching ? (
              <div className="py-12 text-center text-slate-400 font-medium animate-pulse">Loading available slots...</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-8">
              {slots.map((slot, idx) => {
                  const isSelected = selectedSlot?.getTime() === slot.start.getTime();
                  return (
                    <button
                        key={idx}
                        disabled={slot.isConflict}
                        onClick={() => setSelectedSlot(slot.start)}
                        className={`
                            px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all flex flex-col items-center justify-center gap-1
                            ${slot.isConflict 
                                ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60' 
                                : isSelected
                                ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                            }
                        `}
                    >
                        <span>{slot.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata'})}</span>
                        <span className={`text-xs ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                            to {slot.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata'})}
                        </span>
                    </button>
                  )
              })}
            </div>
          )}
        </div>

        {/* Action Bottom */}
        <div className="p-6 bg-white border-t border-slate-100 flex-shrink-0">
          <button
              onClick={handleConfirmBooking}
              disabled={!selectedSlot || loading}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2
                ${selectedSlot && !loading
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:-translate-y-0.5' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {loading ? 'Processing...' : 'Confirm Booking'}
            </button>
        </div>

      </div>
    </>
  );
}
