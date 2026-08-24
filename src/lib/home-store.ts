import { useSyncExternalStore } from "react";
import type { BlockedPeriod, CategoryId, HomeState, PlanningSettings, Project, Reminder, Task, TaskStatus } from "./types";
import * as repo from "./repository/supabase-repository";

const LEGACY_STORAGE_KEY = "heimwerk-v022";
const EMPTY_STATE: HomeState = { projects: [], tasks: [], reminders: [], blockedPeriods: [], planningSettings: { maxTasksPerDay: 3, maxHoursPerDay: 4 } };

let state: HomeState = EMPTY_STATE;
let userId: string | undefined;
let initialized = false;
let lastError: string | undefined;
const listeners = new Set<() => void>();

function normalize(input: HomeState): HomeState {
  const projectIds = new Set(input.projects.map((p) => p.id));
  const projects = input.projects.map((p) => ({
    ...p,
    category: p.category || ("other" as CategoryId),
    links: Array.isArray(p.links) ? p.links : [],
  }));
  const tasks = input.tasks
    .filter((t) => projectIds.has(t.projectId))
    .map((t) => ({ ...t, links: Array.isArray(t.links) ? t.links : [] }));
  return { projects, tasks, reminders: input.reminders ?? [], blockedPeriods: input.blockedPeriods ?? [], planningSettings: input.planningSettings ?? { maxTasksPerDay:3,maxHoursPerDay:4 } };
}

function emit() {
  listeners.forEach((listener) => listener());
}

function update(fn: (current: HomeState) => HomeState) {
  state = fn(state);
  emit();
}

function reportError(error: unknown) {
  lastError = error instanceof Error ? error.message : String(error);
  console.error("Heimwerk Persistenzfehler:", error);
  emit();
}

async function persist(action: () => Promise<void>) {
  try {
    await action();
    lastError = undefined;
    emit();
  } catch (error) {
    reportError(error);
  }
}

function legacyState(): HomeState | undefined {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw) as HomeState) : undefined;
  } catch {
    return undefined;
  }
}

function remapLegacy(input: HomeState): HomeState {
  const projectMap = new Map<string, string>();
  const taskMap = new Map<string, string>();
  input.projects.forEach((p) => projectMap.set(p.id, crypto.randomUUID()));
  input.tasks.forEach((t) => taskMap.set(t.id, crypto.randomUUID()));

  return {
    projects: input.projects.map((p) => ({
      ...p,
      id: projectMap.get(p.id)!,
      links: (p.links ?? []).map((l) => ({ ...l, id: crypto.randomUUID() })),
    })),
    tasks: input.tasks
      .filter((t) => projectMap.has(t.projectId))
      .map((t) => ({
        ...t,
        id: taskMap.get(t.id)!,
        projectId: projectMap.get(t.projectId)!,
        links: (t.links ?? []).map((l) => ({ ...l, id: crypto.randomUUID() })),
      })),
    blockedPeriods: input.blockedPeriods ?? [],
    planningSettings: input.planningSettings ?? { maxTasksPerDay:3,maxHoursPerDay:4 },
    reminders: input.reminders
      .filter((r) => r.referenceType === "project" ? projectMap.has(r.referenceId) : taskMap.has(r.referenceId))
      .map((r) => ({
        ...r,
        id: crypto.randomUUID(),
        referenceId: r.referenceType === "project" ? projectMap.get(r.referenceId)! : taskMap.get(r.referenceId)!,
      })),
  };
}

async function migrateLegacy(uid: string, legacy: HomeState) {
  const migrated = remapLegacy(legacy);
  for (const project of migrated.projects) await repo.saveProject(uid, project);
  for (const task of migrated.tasks) await repo.saveTask(uid, task);
  for (const reminder of migrated.reminders) await repo.saveReminder(uid, reminder);
  localStorage.setItem(`${LEGACY_STORAGE_KEY}-migrated`, new Date().toISOString());
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  return migrated;
}

export const homeStore = {
  getSnapshot: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  isInitialized: () => initialized,
  getLastError: () => lastError,
  async initialize(uid: string) {
    userId = uid;
    initialized = false;
    lastError = undefined;
    emit();
    try {
      const remote = await repo.loadHomeState(uid);
      const legacy = legacyState();
      if (!remote.projects.length && !remote.tasks.length && !remote.reminders.length && legacy) {
        state = await migrateLegacy(uid, legacy);
      } else {
        state = normalize(remote);
      }
      initialized = true;
      emit();
    } catch (error) {
      initialized = true;
      reportError(error);
    }
  },
  clear() {
    state = EMPTY_STATE;
    userId = undefined;
    initialized = false;
    lastError = undefined;
    emit();
  },
  saveProject(project: Project) {
    update((s) => ({ ...s, projects: s.projects.some((p) => p.id === project.id) ? s.projects.map((p) => p.id === project.id ? project : p) : [...s.projects, project] }));
    if (userId) void persist(() => repo.saveProject(userId!, project));
  },
  deleteProject(projectId: string) {
    const taskIds = new Set(state.tasks.filter((t) => t.projectId === projectId).map((t) => t.id));
    update((s) => ({
      projects: s.projects.filter((p) => p.id !== projectId),
      tasks: s.tasks.filter((t) => t.projectId !== projectId),
      reminders: s.reminders.filter((r) => !(r.referenceType === "project" && r.referenceId === projectId) && !(r.referenceType === "task" && taskIds.has(r.referenceId))),
    }));
    if (userId) void persist(() => repo.deleteProject(userId!, projectId));
  },
  saveTask(task: Task) {
    update((s) => ({ ...s, tasks: s.tasks.some((t) => t.id === task.id) ? s.tasks.map((t) => t.id === task.id ? task : t) : [...s.tasks, task] }));
    if (userId) void persist(() => repo.saveTask(userId!, task));
  },
  setTaskStatus(taskId: string, status: TaskStatus) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const next = { ...task, status };
    update((s) => ({ ...s, tasks: s.tasks.map((t) => t.id === taskId ? next : t) }));
    if (userId) void persist(() => repo.saveTask(userId!, next));
  },
  deleteTask(taskId: string) {
    update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== taskId), reminders: s.reminders.filter((r) => !(r.referenceType === "task" && r.referenceId === taskId)) }));
    if (userId) void persist(() => repo.deleteTask(userId!, taskId));
  },
  savePlanningSettings(settings: PlanningSettings) {
    update((s) => ({ ...s, planningSettings: settings }));
    if (userId) void persist(() => repo.savePlanningSettings(userId!, settings));
  },
  saveBlockedPeriod(period: BlockedPeriod) {
    update((s) => ({ ...s, blockedPeriods: s.blockedPeriods.some(p=>p.id===period.id) ? s.blockedPeriods.map(p=>p.id===period.id?period:p) : [...s.blockedPeriods,period] }));
    if (userId) void persist(() => repo.saveBlockedPeriod(userId!, period));
  },
  deleteBlockedPeriod(id: string) {
    update((s) => ({ ...s, blockedPeriods: s.blockedPeriods.filter(p=>p.id!==id) }));
    if (userId) void persist(() => repo.deleteBlockedPeriod(userId!, id));
  },
  saveReminder(reminder: Reminder) {
    update((s) => ({ ...s, reminders: s.reminders.some((r) => r.id === reminder.id) ? s.reminders.map((r) => r.id === reminder.id ? reminder : r) : [...s.reminders, reminder] }));
    if (userId) void persist(() => repo.saveReminder(userId!, reminder));
  },
  deleteReminder(id: string) {
    update((s) => ({ ...s, reminders: s.reminders.filter((r) => r.id !== id) }));
    if (userId) void persist(() => repo.deleteReminder(userId!, id));
  },
};

export function useHomeStore() {
  return useSyncExternalStore(homeStore.subscribe, homeStore.getSnapshot);
}

export function usePersistenceStatus() {
  return useSyncExternalStore(
    homeStore.subscribe,
    () => `${initialized ? "ready" : "loading"}|${lastError ?? ""}`
  );
}

export function newId(_prefix?: string) {
  return crypto.randomUUID();
}
