import { createClient } from "@/lib/supabase/server";
import TasksList from "./TasksList";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: tasks, error } = await supabase.from("tasks").select("*").order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching tasks:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  return <TasksList initialTasks={tasks || []} />;
}
