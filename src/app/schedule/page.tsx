import { createClient } from "@/lib/supabase/server";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  
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
    { data: dailyClasses, error: dailyClassesError },
    { data: activities, error: activitiesError },
    { data: tasks, error: tasksError }
  ] = await Promise.all([
    supabase.from("classes").select("*"), // For weekly timetable
    supabase.from("classes").select("*").ilike("day_of_week", `%${targetDayOfWeek}%`).order("start_time", { ascending: true }),
    supabase.from("activities").select("*").eq("date", targetDateStr).order("start_time", { ascending: true }),
    supabase.from("tasks").select("*"),
  ]);

  if (allClassesError) console.error("Error fetching all classes:", allClassesError);
  if (dailyClassesError) console.error("Error fetching daily classes:", dailyClassesError);
  if (activitiesError) console.error("Error fetching activities:", activitiesError);
  if (tasksError) console.error("Error fetching tasks:", tasksError);

  const actualTodayStr = format(actualTodayObj, "yyyy-MM-dd");

  return (
    <ScheduleClient 
      initialClasses={allClasses || []} 
      dailyClasses={dailyClasses || []}
      activities={activities || []}
      tasks={tasks || []}
      targetDateStr={targetDateStr}
      actualTodayStr={actualTodayStr}
      weekStartStr={weekStartStr}
      weekEndStr={weekEndStr}
    />
  );
}
