"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addClass, editClass, deleteClass } from "@/app/actions";
import { Plus, Pencil, Trash2 } from "lucide-react";

type ClassEvent = Database["public"]["Tables"]["classes"]["Row"];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const DISPLAY_TIME_SLOTS = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"];

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

export default function ScheduleClient({ initialClasses }: { initialClasses: ClassEvent[] }) {
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
    <div className="flex flex-wrap gap-2">
      {DAYS.map(day => {
        const isSelected = selected.includes(day);
        return (
          <Button 
            key={day} 
            type="button" 
            variant={isSelected ? "default" : "outline"} 
            size="sm"
            onClick={() => {
              if (isSelected) {
                onChange(selected.filter(d => d !== day));
              } else {
                onChange([...selected, day]);
              }
            }}
            className={isSelected ? "bg-zinc-900 text-zinc-50" : "text-zinc-600"}
          >
            {day.slice(0, 3)}
          </Button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">Class</Badge>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-4">
                <Plus className="w-4 h-4 mr-2" /> Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Class</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                {addError && <div className="text-sm text-red-500 font-medium">{addError}</div>}
                <div className="space-y-2">
                  <Label htmlFor="title">Subject/Class Name</Label>
                  <Input id="title" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Machine Learning" />
                </div>
                <div className="space-y-2">
                  <Label>Days of Week</Label>
                  <DaySelector selected={addDays} onChange={setAddDays} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input id="start_time" type="time" value={addStart} onChange={e => setAddStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input id="end_time" type="time" value={addEnd} onChange={e => setAddEnd(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Input id="room" value={addRoom} onChange={e => setAddRoom(e.target.value)} placeholder="AB204" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faculty">Faculty</Label>
                    <Input id="faculty" value={addFaculty} onChange={e => setAddFaculty(e.target.value)} placeholder="Dr. Mohan" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save Class</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px] w-full">
            {/* Header */}
            <div className="grid grid-cols-8 border-b dark:border-zinc-800">
              <div className="p-4 border-r dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              </div>
              {DAYS.map((day) => (
                <div key={day} className="p-4 text-center font-medium border-r last:border-r-0 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  {day.slice(0, 3)}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="divide-y dark:divide-zinc-800 relative">
              {TIME_SLOTS.map((time, index) => (
                <div key={time} className="grid grid-cols-8 relative h-20">
                  <div className="h-full border-r dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 text-center flex items-center justify-center">
                    <span className="text-xs text-zinc-500 font-medium relative -top-3 bg-zinc-50/50 dark:bg-zinc-900/20 px-1">{DISPLAY_TIME_SLOTS[index]}</span>
                  </div>
                  
                  {DAYS.map((day) => {
                    return (
                      <div key={`${day}-${time}`} className="border-r last:border-r-0 dark:border-zinc-800 relative">
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {/* Overlay Classes */}
              {initialClasses.map((cls) => {
                const days = cls.day_of_week.split(",");
                const startHour = parseInt(cls.start_time.split(":")[0]);
                const startMin = parseInt(cls.start_time.split(":")[1]);
                const endHour = parseInt(cls.end_time.split(":")[0]);
                const endMin = parseInt(cls.end_time.split(":")[1]);
                
                const baseHour = 8; // 8:00 AM
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
                      className="absolute p-2 rounded-md border text-xs flex flex-col gap-1 overflow-hidden bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/70 dark:border-blue-800 dark:text-blue-100 cursor-pointer shadow-sm hover:shadow transition-shadow z-10"
                      style={{
                        top: `${topOffset}px`,
                        height: `${height}px`,
                        left: `calc(${((dayIndex + 1) / 8) * 100}% + 4px)`,
                        width: `calc(${(1 / 8) * 100}% - 8px)`,
                      }}
                      onClick={() => setEditClassData(cls)}
                    >
                      <span className="font-semibold leading-tight line-clamp-2">{cls.title}</span>
                      <span className="opacity-80 mt-auto truncate">{cls.start_time} - {cls.end_time}</span>
                      <span className="opacity-80 truncate">{cls.room}</span>
                    </div>
                  );
                });
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editClassData} onOpenChange={(o) => !o && setEditClassData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          {editClassData && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && <div className="text-sm text-red-500 font-medium">{editError}</div>}
              <div className="space-y-2">
                <Label htmlFor="edit-title">Subject/Class Name</Label>
                <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <DaySelector selected={editDays} onChange={setEditDays} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start_time">Start Time</Label>
                  <Input id="edit-start_time" type="time" value={editStart} onChange={e => setEditStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end_time">End Time</Label>
                  <Input id="edit-end_time" type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-room">Room</Label>
                  <Input id="edit-room" value={editRoom} onChange={e => setEditRoom(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-faculty">Faculty</Label>
                  <Input id="edit-faculty" value={editFaculty} onChange={e => setEditFaculty(e.target.value)} />
                </div>
              </div>
              <DialogFooter className="flex-row justify-between">
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
