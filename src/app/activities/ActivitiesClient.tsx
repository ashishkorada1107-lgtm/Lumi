"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, Dumbbell, Coffee, BookOpen, Calendar as CalendarIcon, User, Pencil, Trash2 } from "lucide-react";
import { Database } from "@/types/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addActivity, editActivity, deleteActivity } from "@/app/actions";
import { format } from "date-fns";

type Activity = Database["public"]["Tables"]["activities"]["Row"];

const TYPE_ICONS: Record<string, React.ElementType> = {
  Club: Users,
  Gym: Dumbbell,
  Personal: Coffee,
  Study: BookOpen,
  Event: CalendarIcon,
  Meeting: User,
  Other: CalendarIcon,
};

export default function ActivitiesClient({ initialActivities }: { initialActivities: Activity[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editActivityData, setEditActivityData] = useState<Activity | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
            </DialogHeader>
            <form action={async (formData) => {
              await addActivity(formData);
              setIsAddOpen(false);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Activity Name</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select name="type" defaultValue="Other">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(TYPE_ICONS).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input id="start_time" name="start_time" type="time" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input id="end_time" name="end_time" type="time" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" />
              </div>
              <DialogFooter>
                <Button type="submit">Save Activity</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialActivities.length === 0 && (
          <p className="text-zinc-500 py-8 text-center border rounded-xl border-dashed col-span-full">No activities found.</p>
        )}
        {initialActivities.map((activity) => {
          const Icon = TYPE_ICONS[activity.type] || CalendarIcon;
          return (
            <Card key={activity.id} className="hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{activity.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                      {activity.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-sm text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{format(new Date(activity.date), "MMM d, yyyy")}</span>
                    </div>
                    <span>&middot;</span>
                    <span>{activity.start_time} - {activity.end_time}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900" onClick={() => setEditActivityData(activity)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <form action={async () => await deleteActivity(activity.id)}>
                    <Button variant="ghost" size="icon" type="submit" className="h-8 w-8 text-zinc-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editActivityData} onOpenChange={(o) => !o && setEditActivityData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Activity</DialogTitle>
          </DialogHeader>
          {editActivityData && (
            <form action={async (formData) => {
              await editActivity(editActivityData.id, formData);
              setEditActivityData(null);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Activity Name</Label>
                <Input id="edit-title" name="title" defaultValue={editActivityData.title} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select name="type" defaultValue={editActivityData.type}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(TYPE_ICONS).map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input id="edit-date" name="date" type="date" defaultValue={editActivityData.date} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start_time">Start Time</Label>
                  <Input id="edit-start_time" name="start_time" type="time" defaultValue={editActivityData.start_time} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end_time">End Time</Label>
                  <Input id="edit-end_time" name="end_time" type="time" defaultValue={editActivityData.end_time} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" name="location" defaultValue={editActivityData.location || ""} />
              </div>
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

