import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { redirect } from "next/navigation";
import FocusClient from "./FocusClient";

export default async function FocusPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get current date for timezone Asia/Kolkata
  const now = new Date();
  const zonedNow = toZonedTime(now, "Asia/Kolkata");
  const actualTodayStr = format(zonedNow, "yyyy-MM-dd");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("completed", false);

  return (
    <div className="h-full">
      <FocusClient tasks={tasks || []} actualTodayStr={actualTodayStr} />
    </div>
  );
}
