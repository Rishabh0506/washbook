'use client';

import { Machine, Floor } from '@/types/database';
import { WashingMachine, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface MachineSheetProps {
  machine: Machine | null;
  floorLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenBooking: () => void;
  hasActiveSession: boolean;
}

export default function MachineSheet({ machine, floorLabel, isOpen, onClose, onOpenBooking, hasActiveSession }: MachineSheetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isOpen || !machine) return null;

  async function handleStartSession() {
// ... omitting middle code implicitly, using multi_replace_file_content or a better chunk here. Oh wait this replaces from line 6 to 146! I should use startLine 6 and just replace the top, and another target for the bottom button.
// Actually let me cancel this tool call and do it properly with `multi_replace_file_content`.
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: rpcError } = await supabase.rpc('start_session', { p_machine_id: machine!.machine_id });

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      router.refresh(); // Automatically triggers server sync for dashboard
    }
  }

  // Determine UI state based on machine status
  const isAvailable = machine.status === 'free';
  const isOccupied = machine.status === 'occupied';

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out bg-white rounded-t-3xl shadow-2xl overflow-hidden sm:max-w-md sm:mx-auto sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="px-6 py-6 sm:p-8">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-full ${isAvailable ? 'bg-green-100 text-green-600' : isOccupied ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                <WashingMachine className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{machine.name}</h2>
                <p className="text-slate-500 font-medium">{floorLabel}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {hasActiveSession && isAvailable && !error && (
             <div className="mb-6 flex items-center gap-3 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-100">
             <AlertCircle className="h-5 w-5 flex-shrink-0" />
             <p className="text-sm font-medium">You already have an active laundry session. You must end it before starting a new one.</p>
           </div>
          )}

          {/* Action Area */}
          <div className="space-y-4">
            {isAvailable ? (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">Duration</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5"><Clock className="h-4 w-4"/> 45 mins</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Cost</span>
                  <span className="font-bold text-slate-800">Free</span>
                </div>
              </div>
            ) : isOccupied ? (
              <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl mb-6 bg-slate-50">
                <Clock className="h-10 w-10 text-red-400 mx-auto mb-3 opacity-80" />
                <p className="text-slate-600 font-medium">This machine is currently running.</p>
                <p className="text-sm text-slate-400 mt-1">Please select an available machine.</p>
              </div>
            ) : (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl mb-6 bg-slate-50">
                <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-80" />
                <p className="text-slate-600 font-medium">Machine under maintenance.</p>
              </div>
            )}

            <button
              onClick={handleStartSession}
              disabled={!isAvailable || loading || hasActiveSession}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2
                ${isAvailable && !hasActiveSession
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              {loading ? (
                <span>Starting...</span>
              ) : isAvailable ? (
                <>
                  <CheckCircle className="h-6 w-6" />
                  Start Session Now
                </>
              ) : (
                <span>Not Available</span>
              )}
            </button>
            
            <button 
              onClick={onOpenBooking}
              className="w-full py-3 font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-colors border border-blue-100"
            >
              Book for Later
            </button>

            <button 
              onClick={onClose}
              className="w-full py-2 font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
