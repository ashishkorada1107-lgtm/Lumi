import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { format, addMinutes } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { configureWebPush } from '@/lib/webpush';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Authenticate cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isLocalDev = process.env.NODE_ENV === 'development';
    
    if (!isLocalDev) {
      if (!cronSecret) {
        console.error('CRON_SECRET is missing from environment variables.');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
      }
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const isTestMode = isLocalDev && searchParams.get('test') === 'true';
    const simulatedTimeParam = isLocalDev ? searchParams.get('simulatedTime') : null;

    const config = configureWebPush();
    if (!config.success) {
      return NextResponse.json({ error: config.error }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
    }

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all subscriptions
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*');

    if (error || !subscriptions) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
    }

    const results: any = { checked: subscriptions.length, sent: 0, failed: 0, removed: 0, diagnostics: [] };
    const now = new Date();

    for (const sub of subscriptions) {
      // --------------------------------------------------------------------------------
      // DEVELOPMENT TEST BYPASS (Fake Payload)
      // --------------------------------------------------------------------------------
      if (isTestMode) {
        const title = `[TEST] Upcoming Class: Local Testing`;
        const body = `Starts in 10 minutes at 12:00 in Room 101`;
        try {
          await webpush.sendNotification(sub.subscription as any, JSON.stringify({ title, body }));
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
        continue;
      }

      // --------------------------------------------------------------------------------
      // REAL NOTIFICATION LOGIC
      // --------------------------------------------------------------------------------
      const tz = sub.timezone || 'UTC';
      const zonedNow = toZonedTime(now, tz);
      
      // Development override to test the exact real logic with a specific current time
      if (simulatedTimeParam) {
        const [simHour, simMin] = simulatedTimeParam.split(':');
        if (simHour && simMin) {
          zonedNow.setHours(parseInt(simHour, 10), parseInt(simMin, 10), 0, 0);
        }
      }

      // 1. Quantize current time to the nearest 5-minute bucket
      // This makes the logic immune to small cron execution delays (up to 4 minutes)
      const currentMinute = zonedNow.getMinutes();
      const bucketMinute = Math.floor(currentMinute / 5) * 5;
      const bucketTime = new Date(zonedNow);
      bucketTime.setMinutes(bucketMinute, 0, 0);

      // 2. Define the window: (bucket + 9 mins, bucket + 14 mins]
      // This covers a perfect non-overlapping 5-minute range roughly 10-14 mins before class
      const windowStart = addMinutes(bucketTime, 9);
      const windowEnd = addMinutes(bucketTime, 14);

      // Target day is based on the window end (to safely handle midnight crossing)
      const targetDayOfWeek = format(windowEnd, 'EEEE'); 

      // Fetch all classes for this day (fetching all is safe as a user has <20 classes/day)
      // This prevents Supabase string lexicographical bugs when checking time ranges across midnight
      const { data: classes } = await supabaseAdmin
        .from('classes')
        .select('*')
        .eq('user_id', sub.user_id)
        .ilike('day_of_week', `%${targetDayOfWeek}%`);

      const subDiags: any = {
        timezone: tz,
        simulatedCurrentTime: format(zonedNow, "yyyy-MM-dd HH:mm:ss") + " " + tz,
        bucketTime: format(bucketTime, "yyyy-MM-dd HH:mm:ss") + " " + tz,
        targetDayOfWeek,
        windowStart: format(windowStart, "HH:mm:ss") + " " + tz,
        windowEnd: format(windowEnd, "HH:mm:ss") + " " + tz,
        classesFetchedCount: classes ? classes.length : 0,
        classesDetails: []
      };

      if (classes && classes.length > 0) {
        for (const cls of classes) {
          const classDiag: any = {
            id: cls.id,
            title: cls.title,
            start_time: cls.start_time,
            day_of_week: cls.day_of_week
          };

          // Parse class start time to a Date object on the target day for safe comparison
          const [hourStr, minStr] = cls.start_time.split(':');
          const classTime = new Date(windowEnd);
          classTime.setHours(parseInt(hourStr, 10), parseInt(minStr, 10), 0, 0);
          
          classDiag.parsedClassTime = format(classTime, "HH:mm:ss") + " " + tz;
          classDiag.isAfterWindowStart = classTime > windowStart;
          classDiag.isBeforeOrEqualWindowEnd = classTime <= windowEnd;

          // Check if classTime strictly falls inside the (windowStart, windowEnd] boundary
          if (classTime > windowStart && classTime <= windowEnd) {
            classDiag.status = "ACCEPTED";
            const isLab = cls.title.toLowerCase().includes('lab');
            const eventType = isLab ? 'Lab' : 'Class';
            
            // Calculate exact minutes until start for the notification body
            const minsUntil = Math.round((classTime.getTime() - zonedNow.getTime()) / 60000);
            classDiag.differenceMinutes = minsUntil;
            
            const title = `Upcoming ${eventType}: ${cls.title}`;
            const body = `Starts in ${minsUntil} minutes at ${cls.start_time}` + (cls.room ? ` in ${cls.room}` : '');

            try {
              await webpush.sendNotification(sub.subscription as any, JSON.stringify({ title, body }));
              results.sent++;
            } catch (err: any) {
              classDiag.pushError = err.message;
              console.error('Failed to send push to', sub.device_id, err);
              if (err.statusCode === 410 || err.statusCode === 404) {
                await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
                results.removed++;
              } else {
                results.failed++;
              }
            }
          } else {
            classDiag.status = "REJECTED_OUT_OF_WINDOW";
          }
          subDiags.classesDetails.push(classDiag);
        }
      }
      
      if (isLocalDev) {
        results.diagnostics.push(subDiags);
      }
    }

    console.log(`Class Reminders Cron completed: ${JSON.stringify(results)}`);
    return NextResponse.json(results);
    
  } catch (err: any) {
    console.error("Cron unhandled error", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

