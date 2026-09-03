import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { generateMorningBriefing } from '@/lib/briefing';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export const dynamic = "force-dynamic";

import { configureWebPush } from '@/lib/webpush';

export async function GET(request: Request) {
  try {
    // 1. Authenticate cron
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    // Allow manual testing without auth header if we are in development
    const isLocalDev = process.env.NODE_ENV === 'development';
    
    if (!isLocalDev && authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = configureWebPush();
    if (!config.success) {
      return NextResponse.json({ error: config.error }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    // 2. Use Service Role to query ALL push_subscriptions bypassing RLS
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('briefing_enabled', true);

    if (error || !subscriptions) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    const results = { checked: subscriptions.length, due: 0, sent: 0, failed: 0, removed: 0 };
    const now = new Date();

    for (const sub of subscriptions) {
      const tz = sub.timezone || 'UTC';
      
      // Get current time and date in the user's timezone
      const zonedNow = toZonedTime(now, tz);
      
      const currentHourMin = format(zonedNow, 'HH:mm');
      const todayDateStr = format(zonedNow, 'yyyy-MM-dd');

      // Check if we already sent it today
      if (sub.last_briefing_date === todayDateStr) {
        continue;
      }

      // Is it time? 
      if (currentHourMin >= sub.briefing_time) {
        results.due++;
        
        const targetDayOfWeek = format(zonedNow, 'EEEE');

        const [
          { data: classes },
          { data: activities },
          { data: tasks },
          { data: profile }
        ] = await Promise.all([
          supabaseAdmin.from('classes').select('*').eq('user_id', sub.user_id).ilike('day_of_week', `%${targetDayOfWeek}%`),
          supabaseAdmin.from('activities').select('*').eq('user_id', sub.user_id).eq('date', todayDateStr),
          supabaseAdmin.from('tasks').select('*').eq('user_id', sub.user_id),
          supabaseAdmin.from('profiles').select('display_name').eq('id', sub.user_id).maybeSingle()
        ]);

        const briefing = generateMorningBriefing(
          classes || [],
          activities || [],
          tasks || [],
          todayDateStr,
          todayDateStr,
          currentHourMin
        );

        const greetingName = profile?.display_name ? `, ${profile.display_name}!` : "!";
        const title = `☀️ Good morning${greetingName}`;
        const body = `You have ${briefing.summary.classesCount} classes, ${briefing.summary.tasksCount} tasks and ${briefing.summary.activitiesCount} activity today.\n\n` + 
                     (briefing.priorityTask ? `🔴 Priority:\n${briefing.priorityTask.title}\n\n` : "") + 
                     (briefing.nextScheduled ? `Next:\n${briefing.nextScheduled.title} — ${briefing.nextScheduled.time}\n\n` : "") +
                     (briefing.freeTime ? `You have free time: ${briefing.freeTime}` : "");

        try {
          await webpush.sendNotification(sub.subscription as any, JSON.stringify({ title, body }));
          
          await supabaseAdmin.from('push_subscriptions')
            .update({ last_briefing_date: todayDateStr })
            .eq('id', sub.id);
            
          results.sent++;
        } catch (err: any) {
          console.error('Failed to send push to', sub.device_id, err);
          
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
            results.removed++;
          } else {
            results.failed++;
          }
        }
      }
    }

    console.log(`Cron completed: ${JSON.stringify(results)}`);
    return NextResponse.json(results);
    
  } catch (err: any) {
    console.error("Cron unhandled error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

