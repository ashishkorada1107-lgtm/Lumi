import { createClient } from "@/lib/supabase/server";
import ScheduleClient from "./ScheduleClient";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: classes, error } = await supabase.from("classes").select("*");

  if (error) {
    console.error("Error fetching classes:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  return <ScheduleClient initialClasses={classes || []} />;
}
