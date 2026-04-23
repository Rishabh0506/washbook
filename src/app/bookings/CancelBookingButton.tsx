'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CancelBookingButton({ bookingId, slotStart }: { bookingId: number, slotStart: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const isCancellable = true;

    const handleCancel = async () => {
        setLoading(true);
        const supabase = createClient();
        const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId });

        if (error) {
            console.error('Failed to cancel booking:', error.message);
            setLoading(false);
        } else {
            router.refresh();
        }
    };


    return (
        <button 
            disabled={loading}
            onClick={handleCancel}
            className="mt-4 sm:mt-0 w-full sm:w-auto px-6 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
            {loading ? 'Cancelling...' : 'Cancel'}
        </button>
    );
}
