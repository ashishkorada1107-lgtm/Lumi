"use client";

import { useState } from "react";
import TasksList from "./TasksList";
import ActivitiesClient from "../activities/ActivitiesClient";
import { Database } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { Activity, CheckSquare } from "lucide-react";
import LocalNotificationSync from "@/components/LocalNotificationSync";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type ActivityType = Database["public"]["Tables"]["activities"]["Row"];

export default function TasksView({
  initialTasks,
  initialActivities,
  userId,
}: {
  initialTasks: Task[];
  initialActivities: ActivityType[];
  userId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"tasks" | "activities">("tasks");

  return (
    <>
      <LocalNotificationSync userId={userId} tasks={initialTasks} replaceTasks />
    <div className="w-full space-y-6">
      {/* Header & Toggle */}
      <div className="max-w-3xl mx-auto px-4 lg:px-0 flex flex-col lg:block gap-4 sm:gap-3 mb-2 lg:mb-6 mt-4 lg:mt-0">
        <div className="lg:hidden">
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">Tasks</h1>
          <p className="text-sm font-medium text-zinc-400 mt-1">Manage</p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center p-1 lg:p-1 bg-zinc-800/80 lg:bg-zinc-900/80 rounded-full lg:rounded-lg w-full lg:max-w-sm border border-zinc-800 lg:border-zinc-800/60 gap-1 lg:gap-0">
          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-6 py-3 lg:px-4 lg:py-2 text-sm font-medium rounded-full lg:rounded-md transition-all",
              activeTab === "tasks" ? "bg-zinc-700 lg:bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-400"
            )}
          >
            <CheckSquare className="w-5 h-5 lg:w-4 lg:h-4" />
            Tasks
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-6 py-3 lg:px-4 lg:py-2 text-sm font-medium rounded-full lg:rounded-md transition-all",
              activeTab === "activities" ? "bg-zinc-700 lg:bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-400"
            )}
          >
            <Activity className="w-5 h-5 lg:w-4 lg:h-4" />
            Activities
          </button>
        </div>
      </div>
      
      <div className="max-w-3xl mx-auto">
        {activeTab === "tasks" ? (
          <TasksList initialTasks={initialTasks} />
        ) : (
          <ActivitiesClient initialActivities={initialActivities} />
        )}
      </div>
    </div>
    </>
  );
}
