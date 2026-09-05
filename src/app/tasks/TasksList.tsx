"use client";

import { useState, useEffect, useOptimistic, useTransition } from "react";
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
import { Plus, CheckCircle2, Circle, Clock, Calendar, Pencil, Trash2, Loader2 } from "lucide-react";

type Task = Database["public"]["Tables"]["tasks"]["Row"];

export default function TasksList({ initialTasks }: { initialTasks: Task[] }) {
  const [isPending, startTransition] = useTransition();

  const [optimisticTasks, setOptimisticTasks] = useOptimistic(
    initialTasks,
    (state, action: { type: string, payload: any }) => {
      switch (action.type) {
        case "add":
          return [...state, action.payload];
        case "delete":
          return state.filter(t => t.id !== action.payload);
        case "toggle":
          return state.map(t => t.id === action.payload.id ? { ...t, completed: action.payload.completed } : t);
        case "edit":
          return state.map(t => t.id === action.payload.id ? { ...t, ...action.payload.updates } : t);
        default:
          return state;
      }
    }
  );

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
  const openAddDialog = (open: boolean) => {
    setIsAddOpen(open);
    if (open) {
      setAddTitle("");
      setAddDesc("");
      setAddDate("");
      setAddMin("30");
      setAddPriority("Medium");
      setAddError("");
    }
  };

  const openEditDialog = (task: Task | null) => {
    setEditTaskData(task);
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || "");
      setEditDate(task.due_date || "");
      setEditMin(task.estimated_minutes ? String(task.estimated_minutes) : "");
      setEditPriority(task.priority);
      setEditError("");
    }
  };

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

    startTransition(async () => {
      setOptimisticTasks({
        type: "add", 
        payload: {
          id: Date.now(), // temporary ID
          title: addTitle,
          description: addDesc,
          due_date: addDate || null,
          priority: addPriority,
          estimated_minutes: addMin ? parseInt(addMin) : 0,
          completed: false,
          user_id: "",
          created_at: new Date().toISOString()
        }
      });
      setIsAddOpen(false);
      try {
        await addTask(formData);
      } catch (err) {
        console.error(err);
      }
    });
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

    const id = editTaskData.id;
    const updates = {
      title: editTitle,
      description: editDesc,
      due_date: editDate || null,
      priority: editPriority,
      estimated_minutes: editMin ? parseInt(editMin) : 0,
    };

    startTransition(async () => {
      setOptimisticTasks({ type: "edit", payload: { id, updates } });
      setEditTaskData(null);
      try {
        await editTask(id, formData);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      startTransition(async () => {
        setOptimisticTasks({ type: "delete", payload: id });
        if (editTaskData?.id === id) {
          setEditTaskData(null);
        }
        try {
          await deleteTask(id);
        } catch (err) {
          console.error(err);
        }
      });
    }
  };

  const handleToggle = (id: number, completed: boolean) => {
    startTransition(async () => {
      setOptimisticTasks({ type: "toggle", payload: { id, completed: !completed } });
      try {
        await toggleTaskCompletion(id, !completed);
      } catch (err) {
        console.error(err);
      }
    });
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

  let filteredTasks = optimisticTasks;

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
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-3 px-4 lg:px-0">
        <div className="hidden lg:block">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Manage</p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Tasks</h1>
        </div>

        <Dialog open={isAddOpen} onOpenChange={openAddDialog}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="w-full lg:w-auto h-12 lg:h-9 bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-none rounded-xl lg:rounded-md text-base lg:text-sm font-medium"
            >
              <Plus className="w-5 h-5 lg:w-4 lg:h-4 mr-2 lg:mr-1.5" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Add Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {addError && <div className="text-sm text-red-400 font-medium">{addError}</div>}
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Title</Label>
                <Input
                  id="title"
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 focus:border-indigo-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Description</Label>
                <Input
                  id="description"
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Est. Minutes</Label>
                  <Input
                    id="estimatedMinutes"
                    type="number"
                    min="0"
                    value={addMin}
                    onChange={e => setAddMin(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Priority</Label>
                <Select value={addPriority} onValueChange={setAddPriority}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 lg:h-9 bg-indigo-600 hover:bg-indigo-700 text-white border-0 rounded-xl lg:rounded-md text-base lg:text-sm font-medium">
                  Save Task
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', 'pending', 'due_today', 'overdue', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-5 py-2 lg:px-3 lg:py-1 rounded-full text-sm lg:text-xs font-medium transition-colors duration-150 ${
                filter === f
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60'
              }`}
            >
              {f === 'all' ? 'All' : f === 'due_today' ? 'Due Today' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(['all', 'High', 'Medium', 'Low'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`shrink-0 px-4 py-1.5 lg:px-2.5 lg:py-0.5 rounded-full text-xs lg:text-[11px] font-medium transition-colors duration-150 border ${
                priorityFilter === p
                  ? 'bg-zinc-700 text-zinc-200 border-zinc-600'
                  : 'text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-700'
              }`}
            >
              {p === 'all' ? 'All priorities' : p}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {filteredTasks.length === 0 && (
          <div className="py-12 text-center border border-dashed border-zinc-800 rounded-xl">
            <p className="text-sm text-zinc-600">No tasks found.</p>
          </div>
        )}
        {filteredTasks.map((task) => {
          const statusInfo = getTaskStatusInfo(task);
          const priorityBorder = task.priority === 'High' ? 'border-l-red-500/60' : task.priority === 'Medium' ? 'border-l-amber-500/60' : 'border-l-zinc-700';
          return (
            <div
              key={task.id}
              className={`flex items-center gap-4 lg:gap-3 px-4 py-4 lg:px-3 lg:py-2.5 rounded-2xl lg:rounded-lg border-l-4 lg:border-l-2 border border-zinc-800/60 transition-all duration-150 ${
                task.completed
                  ? 'opacity-40 border-l-zinc-800'
                  : `bg-zinc-900/40 hover:bg-zinc-800/40 hover:border-zinc-700/60 ${priorityBorder}`
              }`}
            >
              <button
                onClick={() => handleToggle(task.id, task.completed)}
                className={`shrink-0 transition-colors duration-150 ${task.completed ? 'text-green-500' : 'text-zinc-700 hover:text-green-400'}`}
              >
                {task.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-base lg:text-sm font-medium leading-tight truncate ${task.completed ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>
                  {task.title}
                </p>
                {(task.due_date || task.estimated_minutes) && (
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-600">
                    {task.due_date && (
                      <span className={statusInfo.color === 'text-red-600 dark:text-red-500' ? 'text-red-400' : statusInfo.color === 'text-blue-600 dark:text-blue-400' ? 'text-blue-400' : ''}>
                        {format(new Date(task.due_date), "MMM d")}
                      </span>
                    )}
                    {task.estimated_minutes && <span>{task.estimated_minutes}m</span>}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-0.5">
                {!task.completed && task.priority === 'High' && (
                  <span className="text-[10px] font-semibold text-red-400 mr-1">High</span>
                )}
                <Button variant="ghost" size="icon" className="h-10 w-10 lg:h-7 lg:w-7 rounded-full lg:rounded-md text-zinc-500 lg:text-zinc-600 hover:text-zinc-200 hover:bg-zinc-700/50" onClick={() => openEditDialog(task)}>
                  <Pencil className="w-5 h-5 lg:w-3.5 lg:h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 lg:h-7 lg:w-7 rounded-full lg:rounded-md text-zinc-500 lg:text-zinc-600 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(task.id, task.title)}>
                  <Trash2 className="w-5 h-5 lg:w-3.5 lg:h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editTaskData} onOpenChange={(o) => !o && setEditTaskData(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Task</DialogTitle>
          </DialogHeader>
          {editTaskData && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && <div className="text-sm text-red-400 font-medium">{editError}</div>}
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Title</Label>
                <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} required className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Description</Label>
                <Input id="edit-description" value={editDesc} onChange={e => setEditDesc(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Due Date</Label>
                  <Input id="edit-dueDate" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Est. Minutes</Label>
                  <Input id="edit-estimatedMinutes" type="number" min="0" value={editMin} onChange={e => setEditMin(e.target.value)} className="bg-zinc-800 border-zinc-700 text-zinc-100" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Priority</Label>
                <Select value={editPriority} onValueChange={setEditPriority}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="flex-row justify-between pt-2">
                <Button type="button" variant="destructive" className="h-12 lg:h-9 rounded-xl lg:rounded-md text-base lg:text-sm" onClick={() => handleDelete(editTaskData.id, editTaskData.title)}>
                  <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 mr-2" /> Delete
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 h-12 lg:h-9 rounded-xl lg:rounded-md text-base lg:text-sm">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
