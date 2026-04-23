import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webPush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Determine context (Cron triggers send POST without auth, Webhooks send POST with payloads)
    // We'll set this up generically to process any completed session.
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const vapidPublic = Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';

    if (!vapidPublic || !vapidPrivate) {
      throw new Error("Missing VAPID keys in environment variables");
    }

    webPush.setVapidDetails(
      'mailto:admin@washbook.local',
      vapidPublic,
      vapidPrivate
    );

    // 1. Fetch completed sessions that haven't been notified yet (MVP: just assume trigger passes payload)
    // For simplicity in this demo Edge Function, we assume it's triggered by a Supabase Database Webhook
    // when sessions.status changes to 'completed'
    
    const { record } = await req.json(); // The payload from the Supabase Postgres Webhook
    
    if (record?.status !== 'completed') {
        return new Response(JSON.stringify({ message: "Not a completion event" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // 2. Fetch the user's push subscription
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('push_subscription')
        .eq('id', record.user_id)
        .single();

    if (error || !profile?.push_subscription) {
         console.warn("User has no push subscription, ignoring.");
         return new Response(JSON.stringify({ message: "No subscription" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const pushSub = JSON.parse(profile.push_subscription);

    // 3. Construct Notification Payload
    const title = record.status === 'completed' ? "Laundry Finished!" : "Session Ended";
    const body = record.status === 'completed' 
        ? "Your laundry cycle has finished. Please collect your clothes."
        : "Your laundry session was ended early. Please collect your clothes.";

    const payload = JSON.stringify({
        title,
        body,
        url: "/bookings"
    });

    // 4. Send the Web Push
    await webPush.sendNotification(pushSub, payload);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
