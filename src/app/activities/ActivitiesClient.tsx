"use client";

import { useState, useOptimistic, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  Dumbbell,
  Coffee,
  BookOpen,
  Calendar as CalendarIcon,
  User,
  Pencil,
  Trash2,
  MapPin,
  Clock,
  Activity as ActivityIcon,
} from "lucide-react";
import { Database } from "@/types/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addActivity, editActivity, deleteActivity } from "@/app/actions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  Club: {
    icon: Users,
    color: "text-pink-400",
    bg: "bg-pink-950/40",
    border: "border-pink-800/50",
  },
  Gym: {
    icon: Dumbbell,
    color: "text-orange-400",
    bg: "bg-orange-950/40",
    border: "border-orange-800/50",
  },
  Personal: {
    icon: Coffee,
    color: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-800/50",
  },
  Study: {
    icon: BookOpen,
    color: "text-blue-400",
    bg: "bg-blue-950/40",
    border: "border-blue-800/50",
  },
  Event: {
    icon: CalendarIcon,
    color: "text-purple-400",
    bg: "bg-purple-950/40",
    border: "border-purple-800/50",
  },
  Meeting: {
    icon: User,
    color: "text-cyan-400",
    bg: "bg-cyan-950/40",
    border: "border-cyan-800/50",
  },
  Other: {
    icon: CalendarIcon,
    color: "text-zinc-400",
    bg: "bg-zinc-900/60",
    border: "border-zinc-700/50",
  },
};

function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function ActivitiesClient({ initialActivities }: { initialActivities: Activity[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editActivityData, setEditActivityData] = useState<Activity | null>(null);

  const [optimisticActivities, setOptimisticActivities] = useOptimistic(
    initialActivities,
    (state, action: { type: string, payload: any }) => {
      switch(action.type) {
        case "add": return [...state, action.payload];
        case "edit": return state.map(a => a.id === action.payload.id ? { ...a, ...action.payload.updates } : a);
        case "delete": return state.filter(a => a.id !== action.payload);
        default: return state;
      }
    }
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-3 px-4 lg:px-0">
        <div className="hidden lg:block">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Manage</p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Activities</h1>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full lg:w-auto h-12 lg:h-9 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-none rounded-xl lg:rounded-md text-base lg:text-sm font-medium">
              <Plus className="w-5 h-5 lg:w-4 lg:h-4 mr-2 lg:mr-1.5" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Add New Activity</DialogTitle>
            </DialogHeader>
            <form
              action={async (formData) => {
                const tempId = Date.now();
                setOptimisticActivities({ 
                  type: "add", 
                  payload: { 
                    id: tempId, 
                    title: formData.get("title") as string,
                    type: formData.get("type") as string,
                    date: formData.get("date") as string,
                    start_time: formData.get("start_time") as string,
                    end_time: formData.get("end_time") as string,
                    location: formData.get("location") as string,
                    user_id: "temp"
                  } 
                });
                setIsAddOpen(false);
                try {
                  await addActivity(formData);
                } catch (err) {
                  console.error(err);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-zinc-400 text-xs uppercase tracking-wider">Activity Name</Label>
                <Input id="title" name="title" required className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="type" className="text-zinc-400 text-xs uppercase tracking-wider">Type</Label>
                  <Select name="type" defaultValue="Other">
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      {Object.keys(TYPE_CONFIG).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date" className="text-zinc-400 text-xs uppercase tracking-wider">Date</Label>
                  <Input id="date" name="date" type="date" required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_time" className="text-zinc-400 text-xs uppercase tracking-wider">Start Time</Label>
                  <Input id="start_time" name="start_time" type="time" required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_time" className="text-zinc-400 text-xs uppercase tracking-wider">End Time</Label>
                  <Input id="end_time" name="end_time" type="time" required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-zinc-400 text-xs uppercase tracking-wider">Location</Label>
                <Input id="location" name="location" className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 lg:h-9 bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-xl lg:rounded-md text-base lg:text-sm font-medium">Save Activity</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {optimisticActivities.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-zinc-800 rounded-xl">
          <ActivityIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">No activities yet</h3>
          <p className="text-sm text-zinc-500 mb-4 max-w-sm mx-auto">
            Track clubs, gym sessions, study groups, and personal events alongside your schedule.
          </p>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add your first activity
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {optimisticActivities.map((activity) => {
            const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other;
            const Icon = config.icon;

            return (
              <Card
                key={activity.id}
                className={cn(
                  "group overflow-hidden rounded-2xl lg:rounded-xl border-l-4 lg:border-l-2 bg-zinc-900/40 border border-zinc-800/60 transition-all hover:bg-zinc-800/40 hover:border-zinc-700/60",
                  config.border
                )}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Left color accent */}
                    <div
                      className={cn(
                        "w-12 shrink-0 flex flex-col items-center justify-center gap-1",
                        config.bg
                      )}
                    >
                      <Icon className={cn("w-4 h-4", config.color)} />
                      <span className={cn("text-[8px] font-bold uppercase tracking-wider", config.color)}>
                        {activity.type.slice(0, 4)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 lg:p-3.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-base lg:text-sm text-zinc-100 truncate">{activity.title}</p>
                          <span
                            className={cn(
                              "inline-block mt-1 text-[10px] lg:text-[9px] font-semibold uppercase tracking-wider px-2 py-1 lg:px-1.5 lg:py-0.5 rounded-md lg:rounded border",
                              config.color,
                              config.border,
                              config.bg
                            )}
                          >
                            {activity.type}
                          </span>
                        </div>
                        <div className="flex gap-1 lg:gap-0.5 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 lg:h-7 lg:w-7 rounded-full lg:rounded-md text-zinc-400 lg:text-zinc-500 hover:text-zinc-200"
                            onClick={() => setEditActivityData(activity)}
                          >
                            <Pencil className="w-5 h-5 lg:w-3.5 lg:h-3.5" />
                          </Button>
                          <form action={async () => {
                            setOptimisticActivities({ type: "delete", payload: activity.id });
                            try {
                              await deleteActivity(activity.id);
                            } catch (err) {
                              console.error(err);
                            }
                          }}>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="submit"
                              className="h-10 w-10 lg:h-7 lg:w-7 rounded-full lg:rounded-md text-zinc-400 lg:text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 className="w-5 h-5 lg:w-3.5 lg:h-3.5" />
                            </Button>
                          </form>
                        </div>
                      </div>

                      {/* Time — prominent */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/40">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs font-medium text-zinc-200">
                            {formatTime12(activity.start_time)} – {formatTime12(activity.end_time)}
                          </span>
                        </div>
                      </div>

                      {/* Date + location */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-zinc-600" />
                          <span>{format(new Date(activity.date), "EEE, MMM d")}</span>
                        </div>
                        {activity.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-600" />
                            <span className="truncate">{activity.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editActivityData} onOpenChange={(o) => !o && setEditActivityData(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Activity</DialogTitle>
          </DialogHeader>
          {editActivityData && (
            <form
              action={async (formData) => {
                const id = editActivityData.id;
                setOptimisticActivities({
                  type: "edit",
                  payload: {
                    id,
                    updates: {
                      title: formData.get("title") as string,
                      type: formData.get("type") as string,
                      date: formData.get("date") as string,
                      start_time: formData.get("start_time") as string,
                      end_time: formData.get("end_time") as string,
                      location: formData.get("location") as string,
                    }
                  }
                });
                setEditActivityData(null);
                try {
                  await editActivity(id, formData);
                } catch (err) {
                  console.error(err);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="edit-title" className="text-zinc-400 text-xs uppercase tracking-wider">Activity Name</Label>
                <Input id="edit-title" name="title" defaultValue={editActivityData.title} required className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-type" className="text-zinc-400 text-xs uppercase tracking-wider">Type</Label>
                  <Select name="type" defaultValue={editActivityData.type}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                      {Object.keys(TYPE_CONFIG).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-date" className="text-zinc-400 text-xs uppercase tracking-wider">Date</Label>
                  <Input id="edit-date" name="date" type="date" defaultValue={editActivityData.date} required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-start_time" className="text-zinc-400 text-xs uppercase tracking-wider">Start Time</Label>
                  <Input id="edit-start_time" name="start_time" type="time" defaultValue={editActivityData.start_time} required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-end_time" className="text-zinc-400 text-xs uppercase tracking-wider">End Time</Label>
                  <Input id="edit-end_time" name="end_time" type="time" defaultValue={editActivityData.end_time} required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-location" className="text-zinc-400 text-xs uppercase tracking-wider">Location</Label>
                <Input id="edit-location" name="location" defaultValue={editActivityData.location || ""} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 lg:h-9 bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-xl lg:rounded-md text-base lg:text-sm font-medium">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
