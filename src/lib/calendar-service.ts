import type { CategoryId, HomeState, Priority, ProjectStatus, TaskStatus } from "./types";

export type CalendarSourceType = "project" | "task" | "reminder";

export interface CalendarEvent {
  id: string;
  sourceType: CalendarSourceType;
  sourceId: string;
  projectId?: string;
  title: string;
  date: string;
  time?: string;
  categoryId?: CategoryId;
  status?: ProjectStatus | TaskStatus;
  priority?: Priority;
  completed?: boolean;
  active?: boolean;
}

export interface CalendarFilter {
  project: boolean;
  task: boolean;
  reminder: boolean;
  completed: boolean;
  categoryId?: CategoryId;
}

export function buildCalendarEvents(state: HomeState): CalendarEvent[] {
  const projectById = new Map(state.projects.map((project) => [project.id, project]));
  const taskById = new Map(state.tasks.map((task) => [task.id, task]));

  const projects: CalendarEvent[] = state.projects
    .filter((project) => Boolean(project.endDate))
    .map((project) => ({
      id: `project:${project.id}`,
      sourceType: "project",
      sourceId: project.id,
      projectId: project.id,
      title: project.title,
      date: project.endDate!,
      categoryId: project.category,
      status: project.status,
      priority: project.priority,
      completed: project.status === "done",
    }));

  const tasks: CalendarEvent[] = state.tasks
    .filter((task) => Boolean(task.dueDate))
    .map((task) => {
      const project = projectById.get(task.projectId);
      return {
        id: `task:${task.id}`,
        sourceType: "task" as const,
        sourceId: task.id,
        projectId: task.projectId,
        title: task.title,
        date: task.dueDate!,
        categoryId: project?.category,
        status: task.status,
        priority: task.priority,
        completed: task.status === "done",
      };
    });

  const reminders: CalendarEvent[] = state.reminders
    .filter((reminder) => reminder.active && Boolean(reminder.startDate))
    .map((reminder) => {
      const referencedTask = reminder.referenceType === "task" ? taskById.get(reminder.referenceId) : undefined;
      const projectId = reminder.referenceType === "project" ? reminder.referenceId : referencedTask?.projectId;
      const project = projectId ? projectById.get(projectId) : undefined;
      return {
        id: `reminder:${reminder.id}`,
        sourceType: "reminder" as const,
        sourceId: reminder.id,
        projectId,
        title: reminder.title,
        date: reminder.startDate,
        time: reminder.time,
        categoryId: project?.category,
        active: reminder.active,
        completed: false,
      };
    });

  return [...projects, ...tasks, ...reminders].sort((a, b) => {
    const aKey = `${a.date}T${a.time || "23:59"}`;
    const bKey = `${b.date}T${b.time || "23:59"}`;
    return aKey.localeCompare(bKey) || a.title.localeCompare(b.title, "de");
  });
}

export function filterCalendarEvents(events: CalendarEvent[], filter: CalendarFilter) {
  return events.filter((event) => {
    if (!filter[event.sourceType]) return false;
    if (!filter.completed && event.completed) return false;
    if (filter.categoryId && event.categoryId !== filter.categoryId) return false;
    return true;
  });
}

export function eventsForMonth(events: CalendarEvent[], year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  return events.filter((event) => event.date.startsWith(prefix));
}

export function agendaFrom(events: CalendarEvent[], fromDate: string, limit = 30) {
  return events.filter((event) => event.date >= fromDate).slice(0, limit);
}
