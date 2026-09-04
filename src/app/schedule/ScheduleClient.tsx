"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, addDays as addDaysFn, subDays } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addClass, editClass, deleteClass } from "@/app/actions";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Calendar, CheckSquare } from "lucide-react";
import { generateTimeline } from "@/lib/timeline";
import DailyTimeline from "@/components/DailyTimeline";

type ClassEvent = Database["public"]["Tables"]["classes"]["Row"];
type ActivityEvent = Database["public"]["Tables"]["activities"]["Row"];
type Task = Database["public"]["Tables"]["tasks"]["Row"];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const DISPLAY_TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);


function hasOverlap(
  newDays: string[], 
  newStart: string, 
  newEnd: string, 
  existingClasses: ClassEvent[], 
  excludeId?: number
) {
  for (const cls of existingClasses) {
    if (excludeId && cls.id === excludeId) continue;
    const clsDays = cls.day_of_week.split(",");
    
    // Check if any days intersect
    const dayIntersect = newDays.some(d => clsDays.includes(d));
    if (dayIntersect) {
      // Check time overlap
      // Overlap exists if newStart < clsEnd AND newEnd > clsStart
      if (newStart < cls.end_time && newEnd > cls.start_time) {
        return cls;
      }
    }
  }
  return null;
}

function WeeklyCurrentTimeLine({ weekDates, actualTodayStr }: { weekDates: string[], actualTodayStr: string }) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const updateTime = () => setCurrentTime(toZonedTime(new Date(), "Asia/Kolkata"));
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!currentTime) return null; // hydration safe

  const todayIndex = weekDates.indexOf(actualTodayStr);
  if (todayIndex === -1) return null; // Not viewing the current week

  const startHour = currentTime.getHours();
  const startMin = currentTime.getMinutes();
  
  const baseHour = 0;
  const slotHeight = 80;
  const topOffset = ((startHour - baseHour) + (startMin / 60)) * slotHeight;

  return (
    <div 
      className="absolute z-30 pointer-events-none flex items-center"
      style={{
        top: `${topOffset}px`,
        left: `calc(${((todayIndex + 1) / 8) * 100}%)`,
        width: `calc(${(1 / 8) * 100}%)`,
        transform: 'translateY(-50%)'
      }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute -left-1.5" />
      <div className="h-[2px] bg-red-500 w-full opacity-75" />
    </div>
  );
}

export default function ScheduleClient({ 
  initialClasses,
  dailyClasses,
  activities,
  tasks,
  targetDateStr,
  actualTodayStr,
  weekStartStr,
  weekEndStr,
}: { 
  initialClasses: ClassEvent[],
  dailyClasses: ClassEvent[],
  activities: ActivityEvent[],
  tasks: Task[],
  targetDateStr: string,
  actualTodayStr: string,
  weekStartStr: string,
  weekEndStr: string,
}) {
  const router = useRouter();
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editClassData, setEditClassData] = useState<ClassEvent | null>(null);

  // Form State for Add
  const [addTitle, setAddTitle] = useState("");
  const [addDays, setAddDays] = useState<string[]>([]);
  const [addStart, setAddStart] = useState("");
  const [addEnd, setAddEnd] = useState("");
  const [addRoom, setAddRoom] = useState("");
  const [addFaculty, setAddFaculty] = useState("");
  const [addError, setAddError] = useState("");

  // Form State for Edit
  const [editTitle, setEditTitle] = useState("");
  const [editDays, setEditDays] = useState<string[]>([]);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editFaculty, setEditFaculty] = useState("");
  const [editError, setEditError] = useState("");

  // Reset add form when opening
  useEffect(() => {
    if (isAddOpen) {
      setAddTitle("");
      setAddDays([]);
      setAddStart("");
      setAddEnd("");
      setAddRoom("");
      setAddFaculty("");
      setAddError("");
    }
  }, [isAddOpen]);

  // Load edit form data
  useEffect(() => {
    if (editClassData) {
      setEditTitle(editClassData.title);
      setEditDays(editClassData.day_of_week.split(","));
      setEditStart(editClassData.start_time);
      setEditEnd(editClassData.end_time);
      setEditRoom(editClassData.room || "");
      setEditFaculty(editClassData.faculty || "");
      setEditError("");
    }
  }, [editClassData]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!addTitle.trim()) return setAddError("Subject is required.");
    if (addDays.length === 0) return setAddError("Select at least one day.");
    if (!addStart || !addEnd) return setAddError("Start and end times are required.");
    if (addEnd <= addStart) return setAddError("End time must be after start time.");

    const overlap = hasOverlap(addDays, addStart, addEnd, initialClasses);
    if (overlap) {
      const confirm = window.confirm(`This class overlaps with "${overlap.title}" (${overlap.start_time}-${overlap.end_time}). Do you want to save anyway?`);
      if (!confirm) return;
    }

    const formData = new FormData();
    formData.append("title", addTitle);
    formData.append("day_of_week", addDays.join(","));
    formData.append("start_time", addStart);
    formData.append("end_time", addEnd);
    formData.append("room", addRoom);
    formData.append("faculty", addFaculty);

    await addClass(formData);
    setIsAddOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClassData) return;
    setEditError("");

    if (!editTitle.trim()) return setEditError("Subject is required.");
    if (editDays.length === 0) return setEditError("Select at least one day.");
    if (!editStart || !editEnd) return setEditError("Start and end times are required.");
    if (editEnd <= editStart) return setEditError("End time must be after start time.");

    const overlap = hasOverlap(editDays, editStart, editEnd, initialClasses, editClassData.id);
    if (overlap) {
      const confirm = window.confirm(`This class overlaps with "${overlap.title}" (${overlap.start_time}-${overlap.end_time}). Do you want to save anyway?`);
      if (!confirm) return;
    }

    const formData = new FormData();
    formData.append("title", editTitle);
    formData.append("day_of_week", editDays.join(","));
    formData.append("start_time", editStart);
    formData.append("end_time", editEnd);
    formData.append("room", editRoom);
    formData.append("faculty", editFaculty);

    await editClass(editClassData.id, formData);
    setEditClassData(null);
  };

  const handleDelete = async () => {
    if (!editClassData) return;
    if (window.confirm(`Are you sure you want to delete ${editClassData.title}?`)) {
      await deleteClass(editClassData.id);
      setEditClassData(null);
    }
  };

  const DaySelector = ({ selected, onChange }: { selected: string[], onChange: (d: string[]) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map(day => {
        const isSelected = selected.includes(day);
        return (
          <button 
            key={day} 
            type="button" 
            onClick={() => {
              if (isSelected) {
                onChange(selected.filter(d => d !== day));
              } else {
                onChange([...selected, day]);
              }
            }}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
              isSelected 
                ? "bg-indigo-600 text-white border-indigo-500" 
                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200 hover:bg-zinc-700/60"
            }`}
          >
            {day.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );

  const priorityCandidates = useMemo(() => {
    return tasks.filter(t => !t.completed && (
      (t.due_date && t.due_date < actualTodayStr) ||
      (t.due_date === targetDateStr) ||
      (t.priority === 'High')
    )).sort((a, b) => {
      if (a.priority === 'High' && b.priority !== 'High') return -1;
      if (b.priority === 'High' && a.priority !== 'High') return 1;
      if (a.priority === 'Medium' && b.priority === 'Low') return -1;
      if (b.priority === 'Medium' && a.priority === 'Low') return 1;
      return (a.due_date || '') < (b.due_date || '') ? -1 : 1;
    });
  }, [tasks, targetDateStr, actualTodayStr]);

  const allTimelineElements = useMemo(() => {
    return generateTimeline(dailyClasses, activities, priorityCandidates);
  }, [dailyClasses, activities, priorityCandidates]);

  const targetDateObj = parseISO(targetDateStr);
  const formattedDate = format(targetDateObj, 'EEEE, MMMM d, yyyy');
  const isActualToday = targetDateStr === actualTodayStr;
  
  const navDate = (days: number) => {
    const newDate = days === 1 ? addDaysFn(targetDateObj, 1) : subDays(targetDateObj, 1);
    router.push(`/schedule?date=${format(newDate, 'yyyy-MM-dd')}`);
  };

  const navToday = () => {
    router.push(`/schedule?date=${actualTodayStr}`);
  };

  // Compute the 7 actual dates (Mon-Sun) for the selected week
  // weekStartStr is always the Monday of the week
  const weekDates = useMemo(() => {
    return DAYS.map((_, i) => {
      const d = parseISO(weekStartStr);
      d.setDate(d.getDate() + i);
      return format(d, "yyyy-MM-dd");
    });
  }, [weekStartStr]);

  // Filter tasks whose due_date falls within the selected week
  const tasksForWeek = useMemo(() => {
    return tasks.filter(t => 
      !t.completed &&
      t.due_date !== null &&
      t.due_date >= weekStartStr &&
      t.due_date <= weekEndStr
    );
  }, [tasks, weekStartStr, weekEndStr]);

  // Group tasks by their due_date string for O(1) lookup in render
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasksForWeek) {
      const key = task.due_date!;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    }
    return map;
  }, [tasksForWeek]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Manage</p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Schedule</h1>
        </div>
        <div className="inline-flex items-center rounded-full bg-zinc-800/80 p-0.5 gap-0.5">
          <button
            onClick={() => setView('daily')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-150 ${view === 'daily' ? 'bg-zinc-600 text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Daily
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-150 ${view === 'weekly' ? 'bg-zinc-600 text-zinc-50 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Weekly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {view === 'daily' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-200">{formattedDate}</span>
                {isActualToday && (
                  <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Today
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" onClick={() => navDate(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {!isActualToday && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" onClick={navToday}>Today</Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" onClick={() => navDate(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <DailyTimeline allTimelineElements={allTimelineElements} emptyMessage="Nothing scheduled for this date." />
          </div>
        )}


        {view === 'weekly' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-end gap-3">
              <div className="flex gap-2 items-center">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Class
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Task Due
                </span>
              </div>

              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-none">
                    <Plus className="w-4 h-4 mr-1.5" /> Add Class
                  </Button>
                </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-100">Add New Class</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSubmit} className="space-y-4">
                      {addError && <div className="text-sm text-red-400 font-medium">{addError}</div>}
                      <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-zinc-400 text-xs uppercase tracking-wider">Subject / Class Name</Label>
                        <Input id="title" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Machine Learning" className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-indigo-500" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-zinc-400 text-xs uppercase tracking-wider">Days of Week</Label>
                        <DaySelector selected={addDays} onChange={setAddDays} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="start_time" className="text-zinc-400 text-xs uppercase tracking-wider">Start Time</Label>
                          <Input id="start_time" type="time" value={addStart} onChange={e => setAddStart(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="end_time" className="text-zinc-400 text-xs uppercase tracking-wider">End Time</Label>
                          <Input id="end_time" type="time" value={addEnd} onChange={e => setAddEnd(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="room" className="text-zinc-400 text-xs uppercase tracking-wider">Room</Label>
                          <Input id="room" value={addRoom} onChange={e => setAddRoom(e.target.value)} placeholder="AB204" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="faculty" className="text-zinc-400 text-xs uppercase tracking-wider">Faculty</Label>
                          <Input id="faculty" value={addFaculty} onChange={e => setAddFaculty(e.target.value)} placeholder="Dr. Mohan" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">Save Class</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

            <Card className="overflow-hidden bg-zinc-900/40 border-zinc-800/80 rounded-xl">
              <div className="overflow-x-auto">
                <div className="min-w-[800px] w-full">
                  {/* Header — shows day abbreviation + actual date */}
                  <div className="grid grid-cols-8 border-b border-zinc-800/80">
                    <div className="p-3 border-r border-zinc-800/80 bg-zinc-900/60">
                    </div>
                    {DAYS.map((day, i) => {
                      const dateStr = weekDates[i];
                      const isToday = dateStr === actualTodayStr;
                      return (
                        <div key={day} className={`p-2.5 text-center border-r last:border-r-0 border-zinc-800/80 ${isToday ? 'bg-zinc-800 text-zinc-50' : 'bg-zinc-900/60'}`}>
                          <div className={`text-[11px] font-medium ${isToday ? 'text-zinc-200' : 'text-zinc-500'}`}>{day.slice(0, 3)}</div>
                          <div className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-white' : 'text-zinc-300'}`}>
                            {format(parseISO(dateStr), 'd')}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Body — time grid + overlaid class blocks */}
                  <div className="relative">
                    <div className="divide-y divide-zinc-800/60">
                      {TIME_SLOTS.map((time, index) => (
                        <div key={time} className="grid grid-cols-8 h-20">
                          <div className="h-full border-r border-zinc-800/60 bg-zinc-900/30 text-center flex items-center justify-center">
                            <span className="text-[11px] text-zinc-500 font-medium relative -top-3 px-1">{DISPLAY_TIME_SLOTS[index]}</span>
                          </div>
                          
                          {DAYS.map((day) => {
                            return (
                              <div key={`${day}-${time}`} className="border-r last:border-r-0 border-zinc-800/60">
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                    
                    {/* Overlay Classes */}
                    {initialClasses.map((cls) => {
                      const days = cls.day_of_week.split(",");
                      const startHour = parseInt(cls.start_time.split(":")[0]);
                      const startMin = parseInt(cls.start_time.split(":")[1]);
                      const endHour = parseInt(cls.end_time.split(":")[0]);
                      const endMin = parseInt(cls.end_time.split(":")[1]);
                      
                      const baseHour = 0; // 00:00 (midnight) — full 24h grid
                      const slotHeight = 80; // 20 units (h-20) is 80px
                      
                      const topOffset = ((startHour - baseHour) + (startMin / 60)) * slotHeight;
                      const durationHours = (endHour + endMin / 60) - (startHour + startMin / 60);
                      const height = durationHours * slotHeight;
                      
                      return days.map(day => {
                        const dayIndex = DAYS.indexOf(day);
                        if (dayIndex === -1) return null;
                        
                        return (
                          <div 
                            key={`${cls.id}-${day}`}
                            className="absolute p-2 rounded-lg border-l-2 text-xs flex flex-col gap-0.5 overflow-hidden bg-zinc-800/90 border border-zinc-700/60 border-l-indigo-500 text-zinc-100 cursor-pointer shadow-sm hover:bg-zinc-700/80 transition-all z-10"
                            style={{
                              top: `${topOffset}px`,
                              height: `${height}px`,
                              left: `calc(${((dayIndex + 1) / 8) * 100}% + 4px)`,
                              width: `calc(${(1 / 8) * 100}% - 8px)`,
                            }}
                            onClick={() => setEditClassData(cls)}
                          >
                            <span className="font-semibold leading-tight line-clamp-2 text-[11px] text-zinc-100">{cls.title}</span>
                            <span className="text-[10px] text-zinc-400 mt-auto truncate">{cls.start_time} - {cls.end_time}</span>
                            {cls.room && <span className="text-[10px] text-zinc-500 truncate">{cls.room}</span>}
                          </div>
                        );
                      });
                    })}

                    <WeeklyCurrentTimeLine weekDates={weekDates} actualTodayStr={actualTodayStr} />
                  </div>

                  {/* Tasks Due row — shown below the timetable if any tasks exist for this week */}
                  {tasksForWeek.length > 0 && (
                    <div className="border-t border-zinc-800/80">
                      <div className="grid grid-cols-8">
                        {/* Row label */}
                        <div className="p-3 border-r border-zinc-800/80 bg-zinc-900/60 flex items-start justify-center">
                          <div className="flex flex-col items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider [writing-mode:vertical-rl] rotate-180 mt-1">Due</span>
                          </div>
                        </div>
                        {/* One cell per day */}
                        {weekDates.map((dateStr) => {
                          const dayTasks = tasksByDate[dateStr] || [];
                          return (
                            <div key={dateStr} className="p-2 border-r last:border-r-0 border-zinc-800/80 bg-zinc-900/30 min-h-[56px]">
                              <div className="flex flex-col gap-1">
                                {dayTasks.map(task => (
                                  <div
                                    key={task.id}
                                    className="rounded px-1.5 py-1 text-[11px] leading-tight bg-zinc-800/90 border border-zinc-700/60 border-l-2 border-l-amber-500 text-zinc-200 flex items-start gap-1"
                                    title={task.description || task.title}
                                  >
                                    <CheckSquare className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" />
                                    <div className="min-w-0">
                                      <div className="font-medium truncate text-zinc-200">{task.title}</div>
                                      <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${task.priority === 'High' ? 'bg-red-400' : task.priority === 'Medium' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
                                        <span>{task.priority}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>


            {/* Edit Dialog */}
            <Dialog open={!!editClassData} onOpenChange={(o) => !o && setEditClassData(null)}>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                  <DialogTitle className="text-zinc-100">Edit Class</DialogTitle>
                </DialogHeader>
                {editClassData && (
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    {editError && <div className="text-sm text-red-400 font-medium">{editError}</div>}
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-title" className="text-zinc-400 text-xs uppercase tracking-wider">Subject / Class Name</Label>
                      <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-indigo-500" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-zinc-400 text-xs uppercase tracking-wider">Days of Week</Label>
                      <DaySelector selected={editDays} onChange={setEditDays} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-start_time" className="text-zinc-400 text-xs uppercase tracking-wider">Start Time</Label>
                        <Input id="edit-start_time" type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-end_time" className="text-zinc-400 text-xs uppercase tracking-wider">End Time</Label>
                        <Input id="edit-end_time" type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-room" className="text-zinc-400 text-xs uppercase tracking-wider">Room</Label>
                        <Input id="edit-room" value={editRoom} onChange={e => setEditRoom(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-faculty" className="text-zinc-400 text-xs uppercase tracking-wider">Faculty</Label>
                        <Input id="edit-faculty" value={editFaculty} onChange={e => setEditFaculty(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                      </div>
                    </div>
                    <DialogFooter className="flex-row justify-between">
                      <Button type="button" variant="destructive" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </Button>
                      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">Save Changes</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
