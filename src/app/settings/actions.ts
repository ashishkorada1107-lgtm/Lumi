"use server";

import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";
import { generateMorningBriefing } from "@/lib/briefing";
import { format } from "date-fns";

webpush.setVapidDetails(
  "mailto:test@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function savePushSubscription(deviceId: string, subJSON: any, timezone: string, briefingTime: string, briefingEnabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    device_id: deviceId,
    endpoint: subJSON.endpoint,
    subscription: subJSON,
    timezone,
    briefing_time: briefingTime,
    briefing_enabled: briefingEnabled,
    updated_at: new Date().toISOString()
  }, { onConflict: "device_id" });
  
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, error: null as string | null };
}

export async function removePushSubscription(deviceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("device_id", deviceId);
  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function sendTestNotification(deviceId: string) {
  const supabase = await createClient();
  
  const { data: sub, error: subError } = await supabase.from("push_subscriptions").select("*").eq("device_id", deviceId).single();
  if (subError) {
    if (subError.code === 'PGRST116') {
       return { error: "No subscription found in database for this device." };
    }
    return { error: `Database error: ${subError.message}` };
  }
  if (!sub) return { error: "No subscription found" };

  const actualTodayObj = new Date();
  const actualTodayStr = format(actualTodayObj, "yyyy-MM-dd");
  const currentTimeStr = format(actualTodayObj, "HH:mm");
  const targetDayOfWeek = format(actualTodayObj, "EEEE");

  const [
    { data: classes },
    { data: activities },
    { data: tasks },
    { data: profile }
  ] = await Promise.all([
    supabase.from("classes").select("*").ilike("day_of_week", `%${targetDayOfWeek}%`),
    supabase.from("activities").select("*").eq("date", actualTodayStr),
    supabase.from("tasks").select("*"),
    supabase.from("profiles").select("display_name").maybeSingle()
  ]);

  const briefing = generateMorningBriefing(
    classes || [],
    activities || [],
    tasks || [],
    actualTodayStr,
    actualTodayStr,
    currentTimeStr
  );

  const greetingName = profile?.display_name ? `, ${profile.display_name}!` : "!";
  const title = `☀️ Good morning${greetingName}`;
  const body = `You have ${briefing.summary.classesCount} classes, ${briefing.summary.tasksCount} tasks and ${briefing.summary.activitiesCount} activity today.\n\n` + 
               (briefing.priorityTask ? `🔴 Priority:\n${briefing.priorityTask.title}\n\n` : "") + 
               (briefing.nextScheduled ? `Next:\n${briefing.nextScheduled.title} — ${briefing.nextScheduled.time}\n\n` : "") +
               (briefing.freeTime ? `You have free time: ${briefing.freeTime}` : "");

  try {
    await webpush.sendNotification(sub.subscription as any, JSON.stringify({ title, body }));
    return { success: true };
  } catch (err: any) {
    console.error("Push Error", err);
    return { error: err.message || "Failed to send push notification" };
  }
}

export async function saveProfile(displayName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };
  const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: displayName, updated_at: new Date().toISOString() });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
