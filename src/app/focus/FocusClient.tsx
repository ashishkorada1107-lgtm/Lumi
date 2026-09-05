"use client";

import { useState, useEffect, useMemo } from "react";
import { Play, Pause, Square, CheckCircle2, RotateCcw, ArrowLeft, Timer } from "lucide-react";
import { Database } from "@/types/database.types";
import { toggleTaskCompletion } from "@/app/actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type FocusState = "SELECT" | "READY" | "RUNNING" | "PAUSED" | "FINISHED";

export default function FocusClient({ tasks, actualTodayStr }: { tasks: Task[], actualTodayStr: string }) {
  const router = useRouter();
  const [state, setState] = useState<FocusState>("SELECT");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [durationMs, setDurationMs] = useState(25 * 60 * 1000);
  const [remainingMs, setRemainingMs] = useState(25 * 60 * 1000);
  const [endTime, setEndTime] = useState<number | null>(null);
  
  const [isCompleting, setIsCompleting] = useState(false);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.priority !== "high" && b.priority === "high") return 1;
      
      const aOverdue = a.due_date && a.due_date < actualTodayStr;
      const bOverdue = b.due_date && b.due_date < actualTodayStr;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      const aToday = a.due_date === actualTodayStr;
      const bToday = b.due_date === actualTodayStr;
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      
      return 0;
    });
  }, [tasks, actualTodayStr]);

  useEffect(() => {
    if (state !== "RUNNING" || !endTime) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setRemainingMs(remaining);
      
      if (remaining <= 0) {
        setState("FINISHED");
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [state, endTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    const mins = task.estimated_minutes || 25;
    const ms = mins * 60 * 1000;
    setDurationMs(ms);
    setRemainingMs(ms);
    setState("READY");
  };

  const startFocus = () => {
    setEndTime(Date.now() + remainingMs);
    setState("RUNNING");
  };

  const pauseFocus = () => {
    setState("PAUSED");
  };

  const resumeFocus = () => {
    setEndTime(Date.now() + remainingMs);
    setState("RUNNING");
  };

  const cancelFocus = () => {
    setState("SELECT");
    setSelectedTask(null);
  };

  const handleMarkComplete = async () => {
    if (!selectedTask) return;
    setIsCompleting(true);
    await toggleTaskCompletion(selectedTask.id, true);
    setIsCompleting(false);
    
    // Once complete, reset focus mode
    cancelFocus();
  };

  const handleKeepOpen = () => {
    cancelFocus();
  };

  const stopPropagation = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto pb-6">
      
      {state === "SELECT" && (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6 px-4 lg:px-0 mt-4 lg:mt-0">
            <h1 className="text-3xl lg:text-2xl font-bold text-zinc-50 tracking-tight">Focus</h1>
            <p className="text-base lg:text-sm font-medium text-zinc-400 mt-1">What do you want to work on?</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 lg:space-y-3 px-4 lg:px-0 pb-4 lg:pr-1"
               onTouchStart={stopPropagation} onTouchMove={stopPropagation}>
            {sortedTasks.length === 0 ? (
              <div className="text-center py-16 lg:py-10 bg-zinc-900/40 lg:bg-zinc-900/50 rounded-3xl lg:rounded-2xl border border-zinc-800/50 border-dashed mx-4 lg:mx-0">
                <p className="text-base lg:text-sm text-zinc-500 font-medium">No active tasks.</p>
              </div>
            ) : (
              sortedTasks.map(task => {
                const isOverdue = task.due_date && task.due_date < actualTodayStr;
                const isToday = task.due_date === actualTodayStr;
                return (
                  <div 
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className="flex flex-col p-5 lg:p-4 bg-zinc-900/60 lg:bg-zinc-900/50 border border-zinc-800/60 lg:border-zinc-800/80 rounded-3xl lg:rounded-2xl cursor-pointer hover:bg-zinc-800/80 transition-all active:scale-[0.98] lg:active:scale-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-lg lg:text-[15px] font-semibold lg:font-medium text-zinc-100 lg:text-zinc-200 leading-tight">{task.title}</span>
                      {task.priority === 'high' && (
                        <span className="shrink-0 text-[11px] lg:text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/15 lg:bg-orange-500/10 px-2.5 py-1 lg:px-2 lg:py-0.5 rounded-md lg:rounded-full">
                          High
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 lg:gap-3 mt-3 lg:mt-2 text-sm lg:text-xs font-medium text-zinc-400 lg:text-zinc-500">
                      {task.estimated_minutes ? (
                        <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {task.estimated_minutes} min</span>
                      ) : (
                        <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> 25 min</span>
                      )}
                      
                      {isOverdue && <span className="text-red-400">Overdue</span>}
                      {isToday && !isOverdue && <span className="text-indigo-400">Due Today</span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {state !== "SELECT" && selectedTask && (
        <div className="flex flex-col items-center justify-center flex-1 animate-in zoom-in-95 duration-300">
          
          <button 
            onClick={cancelFocus}
            className="absolute top-4 lg:top-2 left-4 lg:left-2 p-3 lg:p-3 text-zinc-400 hover:text-zinc-100 bg-zinc-900/60 lg:bg-transparent rounded-full lg:rounded-none border border-zinc-800/80 lg:border-transparent transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="text-center mb-8 w-full px-6">
            <h2 className="text-sm lg:text-lg font-semibold lg:font-medium text-zinc-400 uppercase tracking-widest mb-3 lg:mb-2">Focusing On</h2>
            <p className="text-3xl lg:text-2xl font-bold lg:font-semibold text-zinc-50 lg:text-zinc-100 line-clamp-2 tracking-tight">{selectedTask.title}</p>
          </div>

          <div className="relative flex items-center justify-center w-[280px] h-[280px] lg:w-64 lg:h-64 rounded-full border-[6px] lg:border-4 border-zinc-800 mb-12">
            {/* Progress ring visual approximation */}
            <div className="absolute inset-0 rounded-full border-[6px] lg:border-4 border-indigo-500" 
                 style={{ 
                   clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%, 50% 50%)',
                   opacity: state === 'FINISHED' ? 0 : (remainingMs / durationMs)
                 }} 
            />
            
            <div className="z-10 text-7xl lg:text-6xl font-bold tabular-nums tracking-tighter text-zinc-50">
              {formatTime(remainingMs)}
            </div>
          </div>

          <div 
            className="flex flex-col items-center gap-4 w-full px-6"
            onTouchStart={stopPropagation} 
            onTouchMove={stopPropagation}
          >
            {state === "READY" && (
              <Button 
                onClick={startFocus}
                className="w-full h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl lg:text-lg font-bold lg:font-semibold border-0 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
              >
                <Play className="w-6 h-6 mr-2 fill-current" /> Start Focus
              </Button>
            )}

            {state === "RUNNING" && (
              <div className="flex gap-4 w-full">
                <Button 
                  onClick={pauseFocus}
                  variant="outline"
                  className="flex-1 h-16 rounded-full border-zinc-700 lg:border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-lg lg:text-base font-semibold"
                >
                  <Pause className="w-5 h-5 mr-2 fill-current" /> Pause
                </Button>
                <Button 
                  onClick={() => setState("FINISHED")}
                  variant="ghost"
                  className="h-16 w-16 shrink-0 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400"
                >
                  <Square className="w-5 h-5 fill-current" />
                </Button>
              </div>
            )}

            {state === "PAUSED" && (
              <div className="flex gap-4 w-full">
                <Button 
                  onClick={resumeFocus}
                  className="flex-1 h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg lg:text-base font-semibold border-0 shadow-[0_4px_14px_0_rgba(79,70,229,0.39)]"
                >
                  <Play className="w-5 h-5 mr-2 fill-current" /> Resume
                </Button>
                <Button 
                  onClick={() => setState("FINISHED")}
                  variant="ghost"
                  className="h-16 w-16 shrink-0 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400"
                >
                  <Square className="w-5 h-5 fill-current" />
                </Button>
              </div>
            )}

            {state === "FINISHED" && (
              <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center mb-6 lg:mb-4 text-xl lg:text-base text-emerald-400 font-semibold lg:font-medium tracking-tight">
                  Focus session complete!
                </div>
                <Button 
                  onClick={handleMarkComplete}
                  disabled={isCompleting}
                  className="w-full h-16 lg:h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg lg:text-base font-bold lg:font-semibold border-0 shadow-[0_4px_14px_0_rgba(5,150,105,0.39)]"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" /> Mark Task Complete
                </Button>
                <Button 
                  onClick={handleKeepOpen}
                  disabled={isCompleting}
                  variant="outline"
                  className="w-full h-16 lg:h-14 rounded-full border-zinc-700 lg:border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-lg lg:text-base font-semibold"
                >
                  Keep Task Open
                </Button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
