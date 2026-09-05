"use client";

import { useMemo } from "react";
import { format, parseISO, addDays, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  ArrowRight,
  Coffee,
  BookOpen,
  Activity,
  CheckSquare,
} from "lucide-react";
import { toggleTaskCompletion } from "@/app/actions";
import { generateTimeline } from "@/lib/timeline";
import MiniTimeline from "@/components/MiniTimeline";
import QuickAddDialog from "@/components/QuickAddDialog";
import { BriefingData } from "@/lib/briefing";
import { cn } from "@/lib/utils";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default function TodayClient({
  classes,
  activities,
  tasks,
  targetDateStr,
  actualTodayStr,
  briefing,
  userName,
  serverHour,
}: {
  classes: Database["public"]["Tables"]["classes"]["Row"][];
  activities: Database["public"]["Tables"]["activities"]["Row"][];
  tasks: Task[];
  targetDateStr: string;
  actualTodayStr: string;
  briefing: BriefingData;
  userName?: string;
  serverHour: number;
}) {
  const router = useRouter();
  const targetDateObj = parseISO(targetDateStr);
  const formattedDate = format(targetDateObj, "EEEE, MMM d");
  const isActualToday = targetDateStr === actualTodayStr;

  let greetingPhrase = "Good evening";
  if (serverHour < 12) greetingPhrase = "Good morning";
  else if (serverHour < 17) greetingPhrase = "Good afternoon";
  const greeting = userName ? `${greetingPhrase}, ${userName}` : `${greetingPhrase}`;

  const targetTasks = tasks.filter((t) => t.due_date === targetDateStr);
  const pendingTargetTasks = targetTasks.filter((t) => !t.completed);
  const completedTargetTasks = targetTasks.filter((t) => t.completed);
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.due_date && t.due_date < targetDateStr
  );
  const upcomingHighTasks = tasks.filter(
    (t) =>
      !t.completed &&
      t.priority === "High" &&
      (!t.due_date || t.due_date > targetDateStr)
  );

  const totalTasksForDay = pendingTargetTasks.length + completedTargetTasks.length;
  const completedTasksCount = completedTargetTasks.length;
  const progressPercentage =
    totalTasksForDay === 0
      ? 0
      : Math.round((completedTasksCount / totalTasksForDay) * 100);

  const priorityCandidates = [...overdueTasks, ...pendingTargetTasks].sort((a, b) => {
    if (a.priority === "High" && b.priority !== "High") return -1;
    if (b.priority === "High" && a.priority !== "High") return 1;
    if (a.priority === "Medium" && b.priority === "Low") return -1;
    if (b.priority === "Medium" && a.priority === "Low") return 1;
    return (a.due_date || "") < (b.due_date || "") ? -1 : 1;
  });
  const topPriorityTask = priorityCandidates[0];

  const allTimelineElements = useMemo(
    () => generateTimeline(classes, activities, priorityCandidates),
    [classes, activities, priorityCandidates]
  );

  const previewTasks = [
    ...overdueTasks.slice(0, 2),
    ...pendingTargetTasks.slice(0, 3),
  ].slice(0, 5);

  const handleToggle = async (id: number, completed: boolean) => {
    await toggleTaskCompletion(id, !completed);
  };

  const navDate = (days: number) => {
    const newDate =
      days === 1 ? addDays(targetDateObj, 1) : subDays(targetDateObj, 1);
    router.push(`/?date=${format(newDate, "yyyy-MM-dd")}`);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col lg:block space-y-8 lg:space-y-6 pb-24 lg:pb-0">
      
      {/* 1. Header (Greeting + Date) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 order-1 lg:order-none px-4 lg:px-0 mt-4 lg:mt-0">
        <div className="space-y-1">
          {isActualToday ? (
            <>
              <h1 className="text-3xl font-bold text-zinc-50 tracking-tight leading-none">
                {greeting}
              </h1>
              <p className="text-sm font-medium text-zinc-400">
                {formattedDate}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-zinc-50 tracking-tight leading-none">
                {formattedDate}
              </h1>
              <p className="text-sm font-medium text-zinc-400">
                Daily Planner
              </p>
            </>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 bg-zinc-900/60 p-1 rounded-full border border-zinc-800/80">
          <QuickAddDialog defaultDate={targetDateStr} trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-300 hover:text-zinc-100 bg-zinc-800/80">
               <span className="text-lg leading-none mb-0.5">+</span>
            </Button>
          } />
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-100" onClick={() => navDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {!isActualToday && (
            <Button variant="ghost" size="sm" className="h-8 rounded-full text-zinc-400 hover:text-zinc-100 text-xs px-3" onClick={() => router.push(`/?date=${actualTodayStr}`)}>
              Today
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-zinc-400 hover:text-zinc-100" onClick={() => navDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 2. Current/Next schedule item (MOBILE ONLY) */}
      <div className="lg:hidden order-2 px-4 space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Up Next</h2>
        {briefing.nextScheduled ? (
          <div className="relative overflow-hidden rounded-2xl bg-indigo-950/20 border border-indigo-500/20 p-4 shadow-sm">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
             <div className="flex flex-col gap-1.5 pl-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Upcoming
                </span>
                <span className="text-lg font-semibold text-zinc-100 leading-tight">
                  {briefing.nextScheduled.title}
                </span>
                <span className="text-sm font-medium text-indigo-200/70">
                  {briefing.nextScheduled.time}
                </span>
             </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800/80 p-4 text-center">
             <p className="text-sm text-zinc-500">Nothing else scheduled</p>
          </div>
        )}
      </div>

      {/* 3. Priority Tasks (MOBILE ONLY) */}
      <div className="lg:hidden order-3 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Tasks</h2>
          <Link href="/tasks" className="text-xs font-medium text-zinc-400 flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {previewTasks.length === 0 && completedTargetTasks.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-800 rounded-2xl">
            <CheckSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">No tasks for this date</p>
            <QuickAddDialog
              defaultDate={targetDateStr}
              trigger={<Button variant="ghost" size="sm" className="mt-2 text-xs text-zinc-500">Add a task</Button>}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {previewTasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={handleToggle} actualTodayStr={actualTodayStr} />
            ))}
            {completedTargetTasks.length > 0 && (
              <div className="pt-2 mt-2 border-t border-zinc-800/60">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2 px-1">
                  Completed ({completedTargetTasks.length})
                </p>
                <div className="space-y-2">
                  {completedTargetTasks.slice(0, 2).map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={handleToggle} actualTodayStr={actualTodayStr} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Timeline (MOBILE ONLY) */}
      <div className="lg:hidden order-4 px-4 space-y-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Timeline</h2>
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4">
          <MiniTimeline elements={allTimelineElements} isViewingToday={isActualToday} hoursAhead={4} />
        </div>
      </div>

      {/* 5. Daily Progress (MOBILE ONLY) */}
      <div className="lg:hidden order-5 px-4 space-y-3 mt-4">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Daily Progress</h2>
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 font-medium">Tasks Completed</span>
            <span className="font-semibold text-zinc-200">{completedTasksCount} / {totalTasksForDay}</span>
          </div>
          {totalTasksForDay > 0 && (
             <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${progressPercentage}%` }} />
             </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <StatPill icon={BookOpen} label={`${briefing.summary.classesCount} classes`} color="blue" />
            <StatPill icon={Activity} label={`${briefing.summary.activitiesCount} activities`} color="purple" />
          </div>
        </div>
      </div>

      {/* DESKTOP CONTENT */}

      <div className="hidden lg:flex flex-wrap gap-1.5">
        <StatPill icon={BookOpen} label={`${briefing.summary.classesCount} classes`} color="blue" />
        <StatPill icon={CheckSquare} label={`${briefing.summary.tasksCount} tasks`} color="amber" />
        <StatPill icon={Activity} label={`${briefing.summary.activitiesCount} activities`} color="purple" />
        {totalTasksForDay > 0 && (
          <StatPill
            icon={CheckCircle2}
            label={`${completedTasksCount}/${totalTasksForDay} done`}
            color="green"
          />
        )}
      </div>

      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Focus Card */}
        <div className="lg:col-span-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Today's Focus
            </span>
            {totalTasksForDay > 0 && (
              <span className="text-xs text-zinc-500">
                {progressPercentage}%
              </span>
            )}
          </div>

          {/* Priority task */}
          {topPriorityTask ? (
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-zinc-100 leading-snug">
                  {topPriorityTask.title}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                  {topPriorityTask.due_date &&
                  topPriorityTask.due_date < actualTodayStr ? (
                    <span className="text-red-400 font-medium">Overdue</span>
                  ) : (
                    <span>Due today</span>
                  )}
                  <span className="text-zinc-700">·</span>
                  <span>{topPriorityTask.priority} priority</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">All caught up — nice work!</p>
          )}

          {/* Progress bar */}
          {totalTasksForDay > 0 && (
            <div className="w-full bg-zinc-800 rounded-full h-0.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-0.5 rounded-full transition-all duration-700"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}

          {/* Next Up + Free Time */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-lg bg-zinc-800/60 px-3 py-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <ArrowRight className="w-3 h-3" /> Next Up
              </p>
              {briefing.nextScheduled ? (
                <>
                  <p className="text-sm font-medium text-zinc-100 leading-tight truncate">
                    {briefing.nextScheduled.title}
                  </p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 shrink-0" />
                    {briefing.nextScheduled.time}
                  </p>
                </>
              ) : (
                <p className="text-xs text-zinc-600">
                  {classes.length === 0 && activities.length === 0
                    ? "No classes today"
                    : "Nothing else scheduled"}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-zinc-800/60 px-3 py-3 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Coffee className="w-3 h-3" /> Free Time
              </p>
              {briefing.freeTime ? (
                <>
                  <p className="text-sm font-medium text-green-400">
                    {briefing.freeTime}
                  </p>
                  {briefing.recommendation && (
                    <p className="text-xs text-zinc-600 line-clamp-2">
                      {briefing.recommendation}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-zinc-600">No free blocks</p>
              )}
            </div>
          </div>
        </div>

        {/* Mini Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">
            Next Few Hours
          </p>
          <MiniTimeline
            elements={allTimelineElements}
            isViewingToday={isActualToday}
            hoursAhead={4}
          />
        </div>
      </div>

      {/* Tasks Preview Desktop */}
      <div className="hidden lg:block space-y-2">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Tasks
          </h2>
          <Link
            href="/tasks"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
          >
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {previewTasks.length === 0 && completedTargetTasks.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
            <CheckSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">No tasks for this date</p>
            <QuickAddDialog
              defaultDate={targetDateStr}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-200"
                >
                  Add a task
                </Button>
              }
            />
          </div>
        ) : (
          <div className="space-y-1">
            {previewTasks.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={handleToggle} actualTodayStr={actualTodayStr} />
            ))}
            {completedTargetTasks.length > 0 && (
              <div className="pt-2 mt-1 border-t border-zinc-800/60">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-1.5 px-1">
                  Completed ({completedTargetTasks.length})
                </p>
                {completedTargetTasks.slice(0, 2).map((task) => (
                  <TaskRow key={task.id} task={task} onToggle={handleToggle} actualTodayStr={actualTodayStr} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ElementType;
  label: string;
  color: "blue" | "amber" | "purple" | "green";
}) {
  const colors = {
    blue: "text-blue-400/80 bg-blue-500/8 border-blue-500/15",
    amber: "text-amber-400/80 bg-amber-500/8 border-amber-500/15",
    purple: "text-purple-400/80 bg-purple-500/8 border-purple-500/15",
    green: "text-green-400/80 bg-green-500/8 border-green-500/15",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border",
        colors[color]
      )}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function TaskRow({
  task,
  onToggle,
  actualTodayStr,
}: {
  task: Task;
  onToggle: (id: number, val: boolean) => void;
  actualTodayStr: string;
}) {
  const isCompleted = task.completed;
  const isOverdue =
    !isCompleted && task.due_date && task.due_date < actualTodayStr;

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 lg:gap-3 px-4 lg:px-3 py-3 lg:py-2 rounded-2xl lg:rounded-lg border transition-all duration-200",
        isCompleted
          ? "border-transparent bg-zinc-900/20 lg:bg-transparent opacity-50"
          : "border-zinc-800/60 bg-zinc-900/60 lg:bg-zinc-900/40 hover:border-zinc-700/60 hover:bg-zinc-800/40 active:scale-[0.98] lg:active:scale-100 shadow-sm lg:shadow-none"
      )}
    >
      <button
        onClick={() => onToggle(task.id, task.completed)}
        className={cn(
          "shrink-0 transition-colors duration-200 p-0.5",
          isCompleted
            ? "text-indigo-500 lg:text-green-500"
            : "text-zinc-600 lg:text-zinc-700 hover:text-indigo-400 lg:hover:text-green-400"
        )}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 lg:w-4 lg:h-4" />
        ) : (
          <Circle className="w-5 h-5 lg:w-4 lg:h-4" />
        )}
      </button>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p
          className={cn(
            "text-[15px] lg:text-sm leading-tight truncate font-medium lg:font-normal",
            isCompleted ? "line-through text-zinc-500 lg:text-zinc-600" : "text-zinc-100 lg:text-zinc-200"
          )}
        >
          {task.title}
        </p>
        {/* On mobile, show priority or duration if not completed */}
        {!isCompleted && (task.priority === "High" || task.estimated_minutes || isOverdue) && (
          <div className="flex lg:hidden items-center gap-2 text-xs mt-1">
             {isOverdue && <span className="font-semibold text-red-400">Overdue</span>}
             {!isOverdue && task.priority === "High" && <span className="font-semibold text-amber-400">High Priority</span>}
             {task.estimated_minutes && <span className="text-zinc-500">{task.estimated_minutes} min</span>}
          </div>
        )}
      </div>
      {/* Desktop indicators */}
      {!isCompleted && isOverdue && (
        <span className="hidden lg:inline text-[10px] font-semibold text-red-400 shrink-0">
          Overdue
        </span>
      )}
      {!isCompleted && task.priority === "High" && !isOverdue && (
        <span className="hidden lg:inline text-[10px] font-semibold text-amber-400 shrink-0">
          High
        </span>
      )}
    </div>
  );
}

