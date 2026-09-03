"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

// --- TASKS ---
export async function addTask(formData: FormData) {
  const supabase = await createClient()
  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const dueDate = formData.get("dueDate") as string
  const priority = formData.get("priority") as string
  const estimatedMinutes = parseInt(formData.get("estimatedMinutes") as string) || 0

  await supabase.from("tasks").insert({
    title,
    description,
    due_date: dueDate || null,
    priority,
    estimated_minutes: estimatedMinutes,
  })

  revalidatePath("/tasks")
  revalidatePath("/")
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
  const supabase = await createClient()
  await supabase.from("tasks").update({ completed }).eq("id", id)
  revalidatePath("/tasks")
  revalidatePath("/")
}

export async function deleteTask(id: number) {
  const supabase = await createClient()
  await supabase.from("tasks").delete().eq("id", id)
  revalidatePath("/tasks")
  revalidatePath("/")
}

// --- CLASSES ---
export async function addClass(formData: FormData) {
  const supabase = await createClient()
  await supabase.from("classes").insert({
    title: formData.get("title") as string,
    day_of_week: formData.get("day_of_week") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    room: formData.get("room") as string,
    faculty: formData.get("faculty") as string,
  })
  revalidatePath("/schedule")
  revalidatePath("/")
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
  await supabase.from("classes").delete().eq("id", id)
  revalidatePath("/schedule")
  revalidatePath("/")
}

// --- ACTIVITIES ---
export async function addActivity(formData: FormData) {
  const supabase = await createClient()
  await supabase.from("activities").insert({
    title: formData.get("title") as string,
    type: formData.get("type") as string,
    date: formData.get("date") as string,
    start_time: formData.get("start_time") as string,
    end_time: formData.get("end_time") as string,
    location: formData.get("location") as string,
  })
  revalidatePath("/activities")
  revalidatePath("/")
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
  revalidatePath("/activities")
  revalidatePath("/")
}

export async function deleteActivity(id: number) {
  const supabase = await createClient()
  await supabase.from("activities").delete().eq("id", id)
  revalidatePath("/activities")
  revalidatePath("/")
}

