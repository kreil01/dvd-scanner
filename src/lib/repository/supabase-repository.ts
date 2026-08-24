import { supabase } from "../supabase";
import type { BlockedPeriod, HomeState, LinkItem, PlanningSettings, Project, Reminder, Task } from "../types";

function db() {
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  return supabase;
}

function cleanDate(value?: string) {
  return value?.trim() || null;
}

function projectRow(project: Project, userId: string) {
  return {
    id: project.id,
    user_id: userId,
    title: project.title,
    category: project.category,
    status: project.status,
    priority: project.priority,
    end_date: cleanDate(project.endDate),
    description: project.description || null,
    goal: project.goal || null,
  };
}

function taskRow(task: Task, userId: string) {
  return {
    id: task.id,
    user_id: userId,
    project_id: task.projectId,
    title: task.title,
    description: task.description || null,
    status: task.status,
    priority: task.priority,
    due_date: cleanDate(task.dueDate),
    source: task.source,
    estimated_hours: task.estimatedHours ?? null,
  };
}

function reminderRow(reminder: Reminder, userId: string) {
  return {
    id: reminder.id,
    user_id: userId,
    project_id: reminder.referenceType === "project" ? reminder.referenceId : null,
    task_id: reminder.referenceType === "task" ? reminder.referenceId : null,
    title: reminder.title,
    start_date: reminder.startDate,
    time: reminder.time || null,
    active: reminder.active,
  };
}

async function replaceLinks(userId: string, owner: { projectId?: string; taskId?: string }, links: LinkItem[]) {
  const query = db().from("links").delete().eq("user_id", userId);
  const { error: deleteError } = owner.projectId
    ? await query.eq("project_id", owner.projectId)
    : await query.eq("task_id", owner.taskId!);
  if (deleteError) throw deleteError;

  if (!links.length) return;
  const { error } = await db().from("links").insert(links.map((link) => ({
    id: link.id,
    user_id: userId,
    project_id: owner.projectId ?? null,
    task_id: owner.taskId ?? null,
    title: link.title,
    url: link.url,
    link_type: link.type,
  })));
  if (error) throw error;
}

export async function loadHomeState(userId: string): Promise<HomeState> {
  const [projectsResult, tasksResult, remindersResult, linksResult, blockedResult, settingsResult] = await Promise.all([
    db().from("projects").select("*").eq("user_id", userId).order("created_at"),
    db().from("tasks").select("*").eq("user_id", userId).order("created_at"),
    db().from("reminders").select("*").eq("user_id", userId).order("created_at"),
    db().from("links").select("*").eq("user_id", userId).order("created_at"),
    db().from("blocked_periods").select("*").eq("user_id", userId).order("start_date"),
    db().from("planning_settings").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  for (const result of [projectsResult, tasksResult, remindersResult, linksResult, blockedResult, settingsResult]) {
    if (result.error) throw result.error;
  }

  const links = linksResult.data ?? [];
  const projectLinks = (projectId: string): LinkItem[] => links
    .filter((x) => x.project_id === projectId)
    .map((x) => ({ id: x.id, title: x.title, url: x.url, type: x.link_type }));
  const taskLinks = (taskId: string): LinkItem[] => links
    .filter((x) => x.task_id === taskId)
    .map((x) => ({ id: x.id, title: x.title, url: x.url, type: x.link_type }));

  return {
    projects: (projectsResult.data ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      status: p.status,
      priority: p.priority,
      endDate: p.end_date ?? "",
      description: p.description ?? "",
      goal: p.goal ?? "",
      links: projectLinks(p.id),
    } as Project)),
    tasks: (tasksResult.data ?? []).map((t) => ({
      id: t.id,
      projectId: t.project_id,
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      dueDate: t.due_date ?? "",
      source: t.source,
      estimatedHours: t.estimated_hours == null ? undefined : Number(t.estimated_hours),
      links: taskLinks(t.id),
    } as Task)),
    blockedPeriods: (blockedResult.data ?? []).map((b) => ({ id:b.id,title:b.title,startDate:b.start_date,endDate:b.end_date } as BlockedPeriod)),
    planningSettings: settingsResult.data ? { maxTasksPerDay: settingsResult.data.max_tasks_per_day, maxHoursPerDay: Number(settingsResult.data.max_hours_per_day) } : { maxTasksPerDay:3, maxHoursPerDay:4 },
    reminders: (remindersResult.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      referenceType: r.task_id ? "task" : "project",
      referenceId: r.task_id ?? r.project_id,
      startDate: r.start_date,
      time: r.time ? String(r.time).slice(0, 5) : "",
      active: r.active,
    } as Reminder)),
  };
}

export async function saveProject(userId: string, project: Project) {
  const { error } = await db().from("projects").upsert(projectRow(project, userId));
  if (error) throw error;
  await replaceLinks(userId, { projectId: project.id }, project.links ?? []);
}

export async function deleteProject(userId: string, projectId: string) {
  const { error } = await db().from("projects").delete().eq("user_id", userId).eq("id", projectId);
  if (error) throw error;
}

export async function saveTask(userId: string, task: Task) {
  const { error } = await db().from("tasks").upsert(taskRow(task, userId));
  if (error) throw error;
  await replaceLinks(userId, { taskId: task.id }, task.links ?? []);
}

export async function deleteTask(userId: string, taskId: string) {
  const { error } = await db().from("tasks").delete().eq("user_id", userId).eq("id", taskId);
  if (error) throw error;
}

export async function saveReminder(userId: string, reminder: Reminder) {
  const { error } = await db().from("reminders").upsert(reminderRow(reminder, userId));
  if (error) throw error;
}

export async function deleteReminder(userId: string, reminderId: string) {
  const { error } = await db().from("reminders").delete().eq("user_id", userId).eq("id", reminderId);
  if (error) throw error;
}

export async function savePlanningSettings(userId: string, settings: PlanningSettings) { const {error}=await db().from("planning_settings").upsert({user_id:userId,max_tasks_per_day:settings.maxTasksPerDay,max_hours_per_day:settings.maxHoursPerDay,updated_at:new Date().toISOString()}); if(error) throw error; }
export async function saveBlockedPeriod(userId:string, period:BlockedPeriod){ const {error}=await db().from("blocked_periods").upsert({id:period.id,user_id:userId,title:period.title,start_date:period.startDate,end_date:period.endDate}); if(error) throw error; }
export async function deleteBlockedPeriod(userId:string,id:string){ const {error}=await db().from("blocked_periods").delete().eq("user_id",userId).eq("id",id); if(error) throw error; }
