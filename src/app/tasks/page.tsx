import { createClient } from "@/lib/supabase/server";
import TasksView from "./TasksView";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const [
    { data: tasks, error: tasksError },
    { data: activities, error: activitiesError }
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("due_date", { ascending: true }),
    supabase.from("activities").select("*").order("date", { ascending: true })
  ]);

  if (tasksError) console.error("Error fetching tasks:", tasksError);
  if (activitiesError) console.error("Error fetching activities:", activitiesError);

  return <TasksView initialTasks={tasks || []} initialActivities={activities || []} userId={user?.id} />;
}
