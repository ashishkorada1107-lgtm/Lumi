"use client";

import { useMemo } from "react";
import { format, parseISO, addDays, subDays } from "date-fns";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import { Clock, BookOpen, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Calendar, Circle } from "lucide-react";
import { toggleTaskCompletion } from "@/app/actions";
import { generateTimeline } from '@/lib/timeline';
import DailyTimeline from '@/components/DailyTimeline';

type ClassEvent = Database["public"]["Tables"]["classes"]["Row"];
type ActivityEvent = Database["public"]["Tables"]["activities"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

import { BriefingData } from "@/lib/briefing";
import { RefreshCw, Zap, Coffee, ArrowRight } from "lucide-react";

export default function TodayClient({
  classes,
  activities,
  tasks,
  targetDateStr,
  actualTodayStr,
  briefing,
  userName
}: {
  classes: ClassEvent[],
  activities: ActivityEvent[],
  tasks: Task[],
  targetDateStr: string,
  actualTodayStr: string,
  briefing: BriefingData,
  userName?: string
}) {
  const router = useRouter();
  const targetDateObj = parseISO(targetDateStr);
  const formattedDate = format(targetDateObj, "EEEE, MMMM d");
  const isActualToday = targetDateStr === actualTodayStr;

  const currentHour = new Date().getHours();
  let greetingPhrase = "Good evening";
  if (currentHour < 12) greetingPhrase = "Good morning";
  else if (currentHour < 17) greetingPhrase = "Good afternoon";

  const greeting = userName ? `${greetingPhrase}, ${userName}` : `${greetingPhrase}!`;

  // Process Tasks
  const targetTasks = tasks.filter(t => t.due_date === targetDateStr);
  const pendingTargetTasks = targetTasks.filter(t => !t.completed);
  const completedTargetTasks = targetTasks.filter(t => t.completed);

  const overdueTasks = tasks.filter(t => !t.completed && t.due_date && t.due_date < targetDateStr);
  const upcomingHighTasks = tasks.filter(t => !t.completed && t.priority === 'High' && (!t.due_date || t.due_date > targetDateStr));

  const totalTasksForDay = pendingTargetTasks.length + completedTargetTasks.length;
  const completedTasksCount = completedTargetTasks.length;
  const progressPercentage = totalTasksForDay === 0 ? 0 : Math.round((completedTasksCount / totalTasksForDay) * 100);

  // Today's priority
  const priorityCandidates = [...overdueTasks, ...pendingTargetTasks].sort((a, b) => {
    if (a.priority === 'High' && b.priority !== 'High') return -1;
    if (b.priority === 'High' && a.priority !== 'High') return 1;
    if (a.priority === 'Medium' && b.priority === 'Low') return -1;
    if (b.priority === 'Medium' && a.priority === 'Low') return 1;
    return (a.due_date || "") < (b.due_date || "") ? -1 : 1;
  });
  const topPriorityTask = priorityCandidates[0];

  // Process Schedule & Free Periods
  const allTimelineElements = generateTimeline(classes, activities, priorityCandidates);

  const handleToggle = async (id: number, completed: boolean) => {
    await toggleTaskCompletion(id, !completed);
  };

  const navDate = (days: number) => {
    const newDate = days === 1 ? addDays(targetDateObj, 1) : subDays(targetDateObj, 1);
    router.push(`/?date=${format(newDate, "yyyy-MM-dd")}`);
  };

  const navToday = () => {
    router.push(`/?date=${actualTodayStr}`);
  };
  
  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {isActualToday ? greeting : "Daily Planner"}
          </h1>
          <div className="text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formattedDate} {isActualToday && <Badge variant="secondary" className="ml-2">Today</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {!isActualToday && (
            <Button variant="outline" onClick={navToday}>Today</Button>
          )}
          <Button variant="outline" size="icon" onClick={() => navDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Morning Briefing */}
      {isActualToday && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-900 border-amber-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <Button variant="ghost" size="icon" onClick={handleRefresh} className="text-amber-600 dark:text-zinc-400 hover:text-amber-800 dark:hover:text-zinc-100" title="Refresh briefing">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-amber-900 dark:text-zinc-100 flex items-center gap-2">
              {briefing.greeting}
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-zinc-400 font-medium text-base">
              Your day at a glance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-6">
              <Badge variant="secondary" className="bg-white/60 dark:bg-zinc-800/60 text-amber-900 dark:text-zinc-300">
                Classes: {briefing.summary.classesCount}
              </Badge>
              <Badge variant="secondary" className="bg-white/60 dark:bg-zinc-800/60 text-amber-900 dark:text-zinc-300">
                Tasks: {briefing.summary.tasksCount}
              </Badge>
              <Badge variant="secondary" className="bg-white/60 dark:bg-zinc-800/60 text-amber-900 dark:text-zinc-300">
                Activities: {briefing.summary.activitiesCount}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-amber-800/60 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Today's Priority
                  </h4>
                  {briefing.priorityTask ? (
                    <div className="flex items-start gap-2 bg-white/40 dark:bg-zinc-800/40 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{briefing.priorityTask.title}</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {briefing.priorityTask.priority} priority
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-white/40 dark:bg-zinc-800/40 p-3 rounded-lg">
                      You're all clear for today.
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-amber-800/60 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5" /> Next
                  </h4>
                  {briefing.nextScheduled ? (
                    <div className="flex items-start gap-2 bg-white/40 dark:bg-zinc-800/40 p-3 rounded-lg">
                      <Clock className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{briefing.nextScheduled.title}</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          Starts at {briefing.nextScheduled.time}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-white/40 dark:bg-zinc-800/40 p-3 rounded-lg">
                      {classes.length === 0 && activities.length === 0 ? "No classes today 🎉" : "No more scheduled items today."}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-amber-800/60 dark:text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Coffee className="w-3.5 h-3.5" /> Free Time
                  </h4>
                  {briefing.freeTime ? (
                    <div className="flex items-start gap-2 bg-white/40 dark:bg-zinc-800/40 p-3 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-green-700 dark:text-green-400">{briefing.freeTime}</p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                          {briefing.recommendation}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-white/40 dark:bg-zinc-800/40 p-3 rounded-lg">
                      No significant free periods today.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority & Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 text-zinc-50 border-none dark:bg-zinc-100 dark:text-zinc-900 flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription className="text-zinc-400 dark:text-zinc-500 font-medium">TODAY'S PRIORITY</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            {topPriorityTask ? (
              <>
                <CardTitle className="text-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 mt-0.5 text-red-400 dark:text-red-600 shrink-0" />
                  <span className="leading-tight">{topPriorityTask.title}</span>
                </CardTitle>
                <div className="flex items-center gap-2 mt-4 text-sm font-medium text-zinc-300 dark:text-zinc-600">
                  {topPriorityTask.due_date && topPriorityTask.due_date < actualTodayStr ? (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>
                  ) : (
                    <span>Due today</span>
                  )}
                  <span>·</span>
                  <span>{topPriorityTask.priority} priority</span>
                </div>
              </>
            ) : (
              <CardTitle className="text-xl">All caught up! 🎉</CardTitle>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium">DAILY PROGRESS</CardDescription>
            <CardTitle className="text-xl">
              {completedTasksCount} / {totalTasksForDay} completed
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-auto pt-4">
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            {totalTasksForDay === 0 && (
              <p className="text-xs text-zinc-500 mt-2">No tasks scheduled for this date.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* SCHEDULE */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2 dark:border-zinc-800">
            SCHEDULE
          </h2>
          
          <DailyTimeline allTimelineElements={allTimelineElements} emptyMessage="Nothing scheduled for this date 🎉" />
        </div>

        {/* TASKS TO COMPLETE */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2 dark:border-zinc-800">
            TASKS TO COMPLETE
          </h2>

          <div className="space-y-6">
            
            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">Overdue</h3>
                {overdueTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={handleToggle} badge="Overdue" badgeVariant="destructive" />
                ))}
              </div>
            )}

            {/* Due Date Tasks */}
            {pendingTargetTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  {isActualToday ? 'Due Today' : 'Due This Date'}
                </h3>
                {pendingTargetTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={handleToggle} />
                ))}
              </div>
            )}

            {/* High Priority Upcoming */}
            {upcomingHighTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Upcoming (High Priority)</h3>
                {upcomingHighTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={handleToggle} badge="High Priority" badgeVariant="secondary" />
                ))}
              </div>
            )}

            {overdueTasks.length === 0 && pendingTargetTasks.length === 0 && upcomingHighTasks.length === 0 && (
              <div className="py-8 text-center border rounded-xl border-dashed">
                <p className="text-zinc-500">No pressing tasks for this date 🎉</p>
              </div>
            )}

            {/* Completed */}
            {completedTargetTasks.length > 0 && (
              <div className="space-y-3 pt-4 border-t dark:border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Completed</h3>
                {completedTargetTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={handleToggle} isCompleted />
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, onToggle, badge, badgeVariant, isCompleted = false }: { task: Task, onToggle: (id: number, val: boolean) => void, badge?: string, badgeVariant?: "default" | "destructive" | "outline" | "secondary", isCompleted?: boolean }) {
  return (
    <Card className={`transition-opacity ${isCompleted ? 'opacity-60 bg-zinc-50 dark:bg-zinc-900/20' : ''}`}>
      <CardContent className="p-3 sm:p-4 flex items-start gap-3">
        <button 
          onClick={() => onToggle(task.id, task.completed)}
          className={`mt-0.5 transition-colors ${task.completed ? 'text-green-500' : 'text-zinc-300 hover:text-green-500 dark:text-zinc-600'}`}
        >
          {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight truncate ${task.completed ? 'line-through text-zinc-500' : ''}`}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {badge && !isCompleted && <Badge variant={badgeVariant || "outline"} className="text-[10px] px-1.5 py-0">{badge}</Badge>}
            {task.priority === 'High' && !badge && !isCompleted && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">High</Badge>}
            {task.estimated_minutes && (
              <span className="text-zinc-500">{task.estimated_minutes} min</span>
            )}
            <span className="text-zinc-500">· {task.priority}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
