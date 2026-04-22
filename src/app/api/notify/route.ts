import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const { sessionId, machineId } = await request.json();

    if (!sessionId || !machineId) {
      return NextResponse.json({ error: 'Missing sessionId or machineId' }, { status: 400 });
    }

    const cookieStore = await cookies();
    
    // Use SERVICE_ROLE_KEY to bypass RLS when updating someone else's active session.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch { }
          },
        },
      }
    );

    // Get the session to ensure it's still active and check cooldown
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('user_id, notified_at, machine_id')
      .eq('session_id', sessionId)
      .eq('status', 'active')
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Active session not found' }, { status: 404 });
    }

    // Cooldown check on the server explicitly (10 mins)
    if (session.notified_at) {
      const notifiedTime = new Date(session.notified_at).getTime();
      const now = new Date().getTime();
      const diffSinceNotify = now - notifiedTime;
      if (diffSinceNotify < 10 * 60 * 1000) {
        return NextResponse.json({ error: 'Cooldown active. Machine was notified recently.' }, { status: 429 });
      }
    }

    // Update notified_at
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ notified_at: new Date().toISOString() })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('Update Error:', updateError);
      return NextResponse.json({ error: 'Failed to update session: ' + updateError.message }, { status: 500 });
    }

    // Get the occupant's profile to fetch their push subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_subscription')
      .eq('id', session.user_id)
      .single();

    // If they have a push subscription, dispatch it via web-push!
    if (profile && profile.push_subscription) {
      try {
        const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
        const vapidPrivate = process.env.VAPID_PRIVATE_KEY!;
        if (vapidPublic && vapidPrivate) {
          webpush.setVapidDetails(
            'mailto:admin@washbook.app',
            vapidPublic,
            vapidPrivate
          );

          const subscription = JSON.parse(profile.push_subscription);
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: "Machine Needed!",
              body: "Someone is waiting! Please remove your clothes and end your session.",
              url: "/"
            })
          );
        }
      } catch (pushErr) {
        console.error('Failed to send push notification', pushErr);
        // We do not fail the overall request if just the push payload fails (e.g. invalid endpoint),
        // because the in-app banner will still successfully trigger via real-time DB broadcast!
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
