import { createClient } from "@/lib/supabase/server";
import ActivitiesClient from "./ActivitiesClient";

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const { data: activities, error } = await supabase.from("activities").select("*").order("date", { ascending: true });

  if (error) {
    console.error("Error fetching activities:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  return <ActivitiesClient initialActivities={activities || []} />;
}
