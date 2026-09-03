"use client";

import { useState, useEffect } from "react";
import { format, isBefore, isToday, startOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTask, editTask, deleteTask, toggleTaskCompletion } from "@/app/actions";
import { Plus, CheckCircle2, Circle, Clock, Calendar, Pencil, Trash2 } from "lucide-react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default function TasksList({ initialTasks }: { initialTasks: Task[] }) {
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "due_today" | "overdue">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTaskData, setEditTaskData] = useState<Task | null>(null);

  // Form states for Add
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addDate, setAddDate] = useState("");
  const [addMin, setAddMin] = useState("30");
  const [addPriority, setAddPriority] = useState("Medium");
  const [addError, setAddError] = useState("");

  // Form states for Edit
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editPriority, setEditPriority] = useState("Medium");
  const [editError, setEditError] = useState("");

  // Reset form when opening
  useEffect(() => {
    if (isAddOpen) {
      setAddTitle("");
      setAddDesc("");
      setAddDate("");
      setAddMin("30");
      setAddPriority("Medium");
      setAddError("");
    }
  }, [isAddOpen]);

  useEffect(() => {
    if (editTaskData) {
      setEditTitle(editTaskData.title);
      setEditDesc(editTaskData.description || "");
      setEditDate(editTaskData.due_date || "");
      setEditMin(editTaskData.estimated_minutes ? String(editTaskData.estimated_minutes) : "");
      setEditPriority(editTaskData.priority);
      setEditError("");
    }
  }, [editTaskData]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!addTitle.trim()) return setAddError("Title is required.");
    if (addMin && parseInt(addMin) < 0) return setAddError("Estimated duration must be positive.");
    if (addDate && isNaN(new Date(addDate).getTime())) return setAddError("Invalid due date.");

    const formData = new FormData();
    formData.append("title", addTitle);
    formData.append("description", addDesc);
    formData.append("dueDate", addDate);
    formData.append("priority", addPriority);
    formData.append("estimatedMinutes", addMin);

    await addTask(formData);
    setIsAddOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTaskData) return;
    setEditError("");

    if (!editTitle.trim()) return setEditError("Title is required.");
    if (editMin && parseInt(editMin) < 0) return setEditError("Estimated duration must be positive.");
    if (editDate && isNaN(new Date(editDate).getTime())) return setEditError("Invalid due date.");

    const formData = new FormData();
    formData.append("title", editTitle);
    formData.append("description", editDesc);
    formData.append("dueDate", editDate);
    formData.append("priority", editPriority);
    formData.append("estimatedMinutes", editMin);

    await editTask(editTaskData.id, formData);
    setEditTaskData(null);
  };

  const handleDelete = async (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      await deleteTask(id);
      if (editTaskData?.id === id) {
        setEditTaskData(null);
      }
    }
  };

  const handleToggle = async (id: number, completed: boolean) => {
    await toggleTaskCompletion(id, !completed);
  };

  const todayStart = startOfDay(new Date());

  const getTaskStatusInfo = (task: Task) => {
    if (task.completed) return { badge: "Completed", variant: "outline" as const, color: "text-zinc-500" };
    if (!task.due_date) return { badge: "Upcoming", variant: "secondary" as const, color: "text-zinc-600 dark:text-zinc-400" };
    
    const dueDate = startOfDay(new Date(task.due_date));
    
    if (isBefore(dueDate, todayStart)) {
      return { badge: "Overdue", variant: "destructive" as const, color: "text-red-600 dark:text-red-400 font-medium" };
    } else if (isToday(dueDate)) {
      return { badge: "Due today", variant: "default" as const, color: "text-blue-600 dark:text-blue-400 font-medium" };
    }
    return { badge: "Upcoming", variant: "secondary" as const, color: "text-zinc-600 dark:text-zinc-400" };
  };

  let filteredTasks = initialTasks;

  if (filter === "pending") {
    filteredTasks = filteredTasks.filter(t => !t.completed);
  } else if (filter === "completed") {
    filteredTasks = filteredTasks.filter(t => t.completed);
  } else if (filter === "due_today") {
    filteredTasks = filteredTasks.filter(t => !t.completed && t.due_date && isToday(startOfDay(new Date(t.due_date))));
  } else if (filter === "overdue") {
    filteredTasks = filteredTasks.filter(t => !t.completed && t.due_date && isBefore(startOfDay(new Date(t.due_date)), todayStart));
  }

  if (priorityFilter !== "all") {
    filteredTasks = filteredTasks.filter(t => t.priority === priorityFilter);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {addError && <div className="text-sm text-red-500 font-medium">{addError}</div>}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={addTitle} onChange={e => setAddTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={addDesc} onChange={e => setAddDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" value={addDate} onChange={e => setAddDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedMinutes">Est. Minutes</Label>
                  <Input id="estimatedMinutes" type="number" min="0" value={addMin} onChange={e => setAddMin(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={addPriority} onValueChange={setAddPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">Save Task</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 pb-2 overflow-x-auto">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} size="sm">All</Button>
          <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")} size="sm">Pending</Button>
          <Button variant={filter === "due_today" ? "default" : "outline"} onClick={() => setFilter("due_today")} size="sm">Due Today</Button>
          <Button variant={filter === "overdue" ? "default" : "outline"} onClick={() => setFilter("overdue")} size="sm">Overdue</Button>
          <Button variant={filter === "completed" ? "default" : "outline"} onClick={() => setFilter("completed")} size="sm">Completed</Button>
        </div>
        <div className="flex gap-2 pb-2 overflow-x-auto">
          <Button variant={priorityFilter === "all" ? "secondary" : "outline"} onClick={() => setPriorityFilter("all")} size="sm" className="h-7 text-xs">All Priorities</Button>
          <Button variant={priorityFilter === "High" ? "secondary" : "outline"} onClick={() => setPriorityFilter("High")} size="sm" className="h-7 text-xs">High</Button>
          <Button variant={priorityFilter === "Medium" ? "secondary" : "outline"} onClick={() => setPriorityFilter("Medium")} size="sm" className="h-7 text-xs">Medium</Button>
          <Button variant={priorityFilter === "Low" ? "secondary" : "outline"} onClick={() => setPriorityFilter("Low")} size="sm" className="h-7 text-xs">Low</Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 && (
          <p className="text-zinc-500 py-8 text-center border rounded-xl border-dashed">No tasks found.</p>
        )}
        {filteredTasks.map((task) => {
          const statusInfo = getTaskStatusInfo(task);
          return (
            <Card key={task.id} className={`transition-opacity ${task.completed ? 'opacity-60 bg-zinc-50 dark:bg-zinc-900/20' : ''}`}>
              <CardContent className="p-4 sm:p-6 flex items-start gap-4">
                <button 
                  onClick={() => handleToggle(task.id, task.completed)}
                  className={`mt-0.5 transition-colors ${task.completed ? 'text-green-500' : 'text-zinc-300 hover:text-green-500 dark:text-zinc-600'}`}
                >
                  {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium text-lg leading-tight truncate ${task.completed ? 'line-through text-zinc-500' : ''}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className={`text-sm mt-1 line-clamp-2 ${task.completed ? 'text-zinc-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!task.completed && <Badge variant={statusInfo.variant} className={statusInfo.variant === "destructive" ? "" : statusInfo.badge === "Due today" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 hover:bg-blue-200" : ""}>{statusInfo.badge}</Badge>}
                      {task.priority === 'High' && <Badge variant="destructive">High</Badge>}
                      {task.priority === 'Medium' && <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">Medium</Badge>}
                      {task.priority === 'Low' && <Badge variant="outline">Low</Badge>}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                    {task.due_date && (
                      <div className={`flex items-center gap-1.5 ${statusInfo.color}`}>
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(task.due_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    {task.estimated_minutes && (
                      <div className={`flex items-center gap-1.5 ${task.completed ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <Clock className="w-4 h-4" />
                        <span>{task.estimated_minutes}m</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-900" onClick={() => setEditTaskData(task)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-red-500" onClick={() => handleDelete(task.id, task.title)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTaskData} onOpenChange={(o) => !o && setEditTaskData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editTaskData && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && <div className="text-sm text-red-500 font-medium">{editError}</div>}
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input id="edit-description" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Due Date</Label>
                  <Input id="edit-dueDate" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-estimatedMinutes">Est. Minutes</Label>
                  <Input id="edit-estimatedMinutes" type="number" min="0" value={editMin} onChange={e => setEditMin(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex-row justify-between">
                <Button type="button" variant="destructive" onClick={() => handleDelete(editTaskData.id, editTaskData.title)}>
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
