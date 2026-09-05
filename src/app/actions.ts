"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// --- TASKS ---
export async function addTask(formData: FormData) {
  const start = Date.now()
  console.log(`[ACTION] addTask started at ${start}`)
  
  console.time("addTask_createClient")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.timeEnd("addTask_createClient")
  if (!user) throw new Error("Unauthorized")

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const dueDate = formData.get("dueDate") as string
  const priority = formData.get("priority") as string
  const estimatedMinutes = parseInt(formData.get("estimatedMinutes") as string) || 0

  console.time("addTask_supabaseInsert")
  await supabase.from("tasks").insert({
    user_id: user.id,
    title,
    description,
    due_date: dueDate || null,
    priority,
    estimated_minutes: estimatedMinutes,
  })
  console.timeEnd("addTask_supabaseInsert")

  console.time("addTask_revalidate")
  revalidatePath("/tasks")
  revalidatePath("/")
  console.timeEnd("addTask_revalidate")
  console.log(`[ACTION] addTask finished in ${Date.now() - start}ms`)
}

export async function editTask(id: number, formData: FormData) {
  const supabase = await createClient()
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const dueDate = formData.get("dueDate") as string
  const priority = formData.get("priority") as string
  const estimatedMinutes = parseInt(formData.get("estimatedMinutes") as string) || 0

  await supabase.from("tasks").update({
    title,
    description,
    due_date: dueDate || null,
    priority,
    estimated_minutes: estimatedMinutes,
  }).eq("id", id)

  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function toggleTaskCompletion(id: number, completed: boolean) {
  const start = Date.now()
  console.log(`[ACTION] toggleTaskCompletion started at ${start}`)
  console.time("toggleTaskCompletion_createClient")
  const supabase = await createClient()
  console.timeEnd("toggleTaskCompletion_createClient")
  
  console.time("toggleTaskCompletion_supabaseUpdate")
  await supabase.from("tasks").update({ completed }).eq("id", id)
  console.timeEnd("toggleTaskCompletion_supabaseUpdate")
  
  console.time("toggleTaskCompletion_revalidate")
  revalidatePath("/tasks")
  revalidatePath("/")
  revalidatePath("/focus")
  console.timeEnd("toggleTaskCompletion_revalidate")
  console.log(`[ACTION] toggleTaskCompletion finished in ${Date.now() - start}ms`)
}

export async function deleteTask(id: number) {
  const start = Date.now()
  console.log(`[ACTION] deleteTask started at ${start}`)
  const supabase = await createClient()
  
  console.time("deleteTask_supabaseDelete")
  await supabase.from("tasks").delete().eq("id", id)
  console.timeEnd("deleteTask_supabaseDelete")
  
  revalidatePath("/tasks")
  revalidatePath("/")
  console.log(`[ACTION] deleteTask finished in ${Date.now() - start}ms`)
}

// --- CLASSES ---
export async function addClass(formData: FormData) {
  const start = Date.now()
  console.log(`[ACTION] addClass started at ${start}`)
  console.time("addClass_createClient")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.timeEnd("addClass_createClient")
  if (!user) throw new Error("Unauthorized")

  console.time("addClass_supabaseInsert")
  const { error } = await supabase.from("classes").insert({
    user_id: user.id,
    title: formData.get("title") as string,
    day_of_week: formData.get("day_of_week") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    room: formData.get("room") as string,
    faculty: formData.get("faculty") as string,
  })
  console.timeEnd("addClass_supabaseInsert")
  if (error) {
    console.error("ADD CLASS ERROR:", error)
  }
  console.time("addClass_revalidate")
  revalidatePath("/schedule")
  revalidatePath("/")
  console.timeEnd("addClass_revalidate")
  console.log(`[ACTION] addClass finished in ${Date.now() - start}ms`)
}

export async function editClass(id: number, formData: FormData) {
  const supabase = await createClient()
  await supabase.from("classes").update({
    title: formData.get("title") as string,
    day_of_week: formData.get("day_of_week") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    room: formData.get("room") as string,
    faculty: formData.get("faculty") as string,
  }).eq("id", id)
  revalidatePath("/schedule")
  revalidatePath("/")
}

export async function deleteClass(id: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: deleted, error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")

  if (error) throw new Error(`Failed to delete class: ${error.message}`)
  if (!deleted?.length) throw new Error("Class was not found or could not be deleted")

  revalidatePath("/schedule")
  revalidatePath("/")
}

// --- ACTIVITIES ---
export async function addActivity(formData: FormData) {
  const start = Date.now()
  console.log(`[ACTION] addActivity started at ${start}`)
  console.time("addActivity_createClient")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.timeEnd("addActivity_createClient")
  if (!user) throw new Error("Unauthorized")

  console.time("addActivity_supabaseInsert")
  await supabase.from("activities").insert({
    user_id: user.id,
    title: formData.get("title") as string,
    type: formData.get("type") as string,
    date: formData.get("date") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    location: formData.get("location") as string,
  })
  console.timeEnd("addActivity_supabaseInsert")
  
  console.time("addActivity_revalidate")
  revalidatePath("/tasks")
  revalidatePath("/schedule")
  revalidatePath("/")
  console.timeEnd("addActivity_revalidate")
  console.log(`[ACTION] addActivity finished in ${Date.now() - start}ms`)
}

export async function editActivity(id: number, formData: FormData) {
  const supabase = await createClient()
  await supabase.from("activities").update({
    title: formData.get("title") as string,
    type: formData.get("type") as string,
    date: formData.get("date") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    location: formData.get("location") as string,
  }).eq("id", id)
  revalidatePath("/tasks")
  revalidatePath("/schedule")
  revalidatePath("/")
}

export async function deleteActivity(id: number) {
  const supabase = await createClient()
  await supabase.from("activities").delete().eq("id", id)
  revalidatePath("/tasks")
  revalidatePath("/schedule")
  revalidatePath("/")
}
