import { createClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import TodayClient from "./TodayClient";
import { generateMorningBriefing } from "@/lib/briefing";

// Next.js 15+ searchParams is a Promise
export default async function TodayPage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  
  const actualTodayObj = toZonedTime(new Date(), "Asia/Kolkata");
  const actualTodayStr = format(actualTodayObj, "yyyy-MM-dd");
  const currentTimeStr = format(actualTodayObj, "HH:mm");
  
  const targetDateStr = searchParams.date || actualTodayStr;
  const targetDateObj = parseISO(targetDateStr);
  const targetDayOfWeek = format(targetDateObj, "EEEE");

  const { data: { user } } = await supabase.auth.getUser();
  
  const [
    { data: classes, error: classesError },
    { data: activities, error: activitiesError },
    { data: tasks, error: tasksError },
    { data: profile }
  ] = await Promise.all([
    supabase.from("classes").select("*").ilike("day_of_week", `%${targetDayOfWeek}%`).order("start_time", { ascending: true }),
    supabase.from("activities").select("*").eq("date", targetDateStr).order("start_time", { ascending: true }),
    supabase.from("tasks")
      .select("*")
      .or(`due_date.eq.${targetDateStr},and(completed.eq.false,due_date.lt.${targetDateStr})`),
    user ? supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null })
  ]);

  if (classesError) console.error("Error fetching classes:", { message: classesError.message, details: classesError.details, hint: classesError.hint, code: classesError.code });
  if (tasksError) console.error("Error fetching tasks:", { message: tasksError.message, details: tasksError.details, hint: tasksError.hint, code: tasksError.code });
  if (activitiesError) console.error("Error fetching activities:", { message: activitiesError.message, details: activitiesError.details, hint: activitiesError.hint, code: activitiesError.code });

  const briefing = generateMorningBriefing(
    classes || [],
    activities || [],
    tasks || [],
    targetDateStr,
    actualTodayStr,
    currentTimeStr
  );

  return (
    <TodayClient 
      classes={classes || []} 
      activities={activities || []} 
      tasks={tasks || []} 
      targetDateStr={targetDateStr}
      actualTodayStr={actualTodayStr}
      briefing={briefing}
      userName={profile?.display_name || undefined}
      serverHour={actualTodayObj.getHours()}
    />
  );
}
