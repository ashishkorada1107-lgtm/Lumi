import { createClient } from "@/lib/supabase/server";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const actualTodayObj = toZonedTime(new Date(), "Asia/Kolkata");
  const targetDateStr = searchParams.date || format(actualTodayObj, "yyyy-MM-dd");
  const targetDateObj = parseISO(targetDateStr);
  const targetDayOfWeek = format(targetDateObj, "EEEE");

  // Compute the Mon–Sun range of the week containing targetDateStr
  const weekStart = startOfWeek(targetDateObj, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(targetDateObj, { weekStartsOn: 1 });     // Sunday
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const [
    { data: allClasses, error: allClassesError },
    { data: activities, error: activitiesError },
    { data: tasks, error: tasksError }
  ] = await Promise.all([
    supabase.from("classes").select("*"), // For weekly timetable
    supabase.from("activities").select("*").gte("date", weekStartStr).lte("date", weekEndStr).order("start_time", { ascending: true }),
    supabase.from("tasks")
      .select("*")
      .or(`and(due_date.gte.${weekStartStr},due_date.lte.${weekEndStr}),and(completed.eq.false,due_date.lt.${format(actualTodayObj, "yyyy-MM-dd")})`),
  ]);

  if (allClassesError) console.error("Error fetching all classes:", allClassesError);
  if (activitiesError) console.error("Error fetching activities:", activitiesError);
  if (tasksError) console.error("Error fetching tasks:", tasksError);

  const dailyClasses = (allClasses || [])
    .filter((c) => c.day_of_week.toLowerCase().includes(targetDayOfWeek.toLowerCase()))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));


  const actualTodayStr = format(actualTodayObj, "yyyy-MM-dd");

  return (
    <ScheduleClient 
      initialClasses={allClasses || []} 
      dailyClasses={dailyClasses || []}
      activities={activities || []}
      tasks={tasks || []}
      userId={user?.id}
      targetDateStr={targetDateStr}
      actualTodayStr={actualTodayStr}
      weekStartStr={weekStartStr}
      weekEndStr={weekEndStr}
    />
  );
}
