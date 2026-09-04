"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addTask, addActivity } from "@/app/actions";
import { Plus, CheckSquare, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type QuickAddType = "task" | "activity";

export default function QuickAddDialog({
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  defaultDate?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const [type, setType] = useState<QuickAddType>("task");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || "");
  const [startTime, setStartTime] = useState(defaultStartTime || "");
  const [endTime, setEndTime] = useState(defaultEndTime || "");
  const [priority, setPriority] = useState("Medium");
  const [activityType, setActivityType] = useState("Other");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setTitle("");
      setDate(defaultDate || "");
      setStartTime(defaultStartTime || "");
      setEndTime(defaultEndTime || "");
      setPriority("Medium");
      setActivityType("Other");
      setError("");
      setType(defaultStartTime ? "activity" : "task");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setLoading(true);
    try {
      if (type === "task") {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", "");
        formData.append("dueDate", date);
        formData.append("priority", priority);
        formData.append("estimatedMinutes", "30");
        await addTask(formData);
      } else {
        if (!date || !startTime || !endTime) {
          setError("Date and times are required for activities.");
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", activityType);
        formData.append("date", date);
        formData.append("start_time", startTime);
        formData.append("end_time", endTime);
        formData.append("location", "");
        await addActivity(formData);
      }
      setOpen(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : controlledOpen === undefined ? (
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-none">
            <Plus className="w-4 h-4" />
            Quick Add
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 font-medium">Quick Add</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-lg bg-zinc-800/80">
          <button
            type="button"
            onClick={() => setType("task")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors",
              type === "task"
                ? "bg-zinc-700 shadow-sm text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Task
          </button>
          <button
            type="button"
            onClick={() => setType("activity")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-colors",
              type === "activity"
                ? "bg-zinc-700 shadow-sm text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <Activity className="w-3.5 h-3.5" />
            Activity
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-400 font-medium">{error}</p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="quick-title" className="text-zinc-400 text-xs uppercase tracking-wider">Title</Label>
            <Input
              id="quick-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === "task" ? "What needs doing?" : "Activity name"}
              autoFocus
              className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-date" className="text-zinc-400 text-xs uppercase tracking-wider">Date</Label>
            <Input
              id="quick-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          {type === "task" ? (
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs uppercase tracking-wider">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quick-start" className="text-zinc-400 text-xs uppercase tracking-wider">Start</Label>
                  <Input
                    id="quick-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quick-end" className="text-zinc-400 text-xs uppercase tracking-wider">End</Label>
                  <Input
                    id="quick-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Type</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    {["Study", "Personal", "Club", "Gym", "Event", "Meeting", "Other"].map(
                      (t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-none" disabled={loading}>
            {loading ? "Saving..." : `Add ${type === "task" ? "Task" : "Activity"}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
