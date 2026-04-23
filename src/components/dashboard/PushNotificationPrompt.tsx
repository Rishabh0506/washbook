'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// Utility to convert VAPID public key to a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationPrompt({ userId }: { userId: string }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if the browser supports notifications and service workers
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    // Only show if the user hasn't made a choice yet
    if (Notification.permission === 'default') {
      setShowPrompt(true);
    }
  }, []);

  const subscribeUser = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 5000))
        ]) as ServiceWorkerRegistration;
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          console.error('VAPID public key is missing from env variables.');
          setLoading(false);
          setShowPrompt(false);
          return;
        }

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        // Subscribe to the push manager
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });

        // Save the subscription strictly as a JSON string to Supabase
        const supabase = createClient();
        const { error } = await supabase
          .from('profiles')
          .update({ push_subscription: JSON.stringify(subscription) })
          .eq('id', userId);

        if (error) {
          console.error('Failed to save subscription to Supabase:', error);
        } else {
          console.log('Successfully subscribed to push notifications!');
        }
      }
    } catch (err) {
      console.error('Error during push subscription:', err);
    } finally {
      setLoading(false);
      setShowPrompt(false); // Hide regardless of outcome
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="mb-6 bg-white rounded-2xl p-4 sm:p-5 text-slate-800 shadow-lg border border-teal-50 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500 opacity-10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-4 relative z-10">
        <div className="bg-teal-50 p-3 rounded-full flex-shrink-0">
          <BellRing className="h-6 w-6 text-teal-600 animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">Enable Push Notifications?</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md">
            Get instant alerts when your laundry cycle finishes or when your advance booking is about to start.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto relative z-10 sm:self-stretch">
        <button
          onClick={subscribeUser}
          disabled={loading}
          className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-[#65b27b] to-[#2e9e9e] hover:shadow-md transition-all rounded-xl text-sm font-bold text-white"
        >
          {loading ? 'Enabling...' : 'Enable Alerts'}
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
