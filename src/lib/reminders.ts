import type { HomeState, Reminder, Task } from "./types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(date?: string) {
  if (!date) return null;
  const due = new Date(`${date}T00:00:00`);
  return Math.ceil((due.getTime() - startOfToday().getTime()) / 86400000);
}

export function isManualReminderActive(state: HomeState, reminder: Reminder) {
  if (!reminder.active) return false;
  const diff = daysUntil(reminder.startDate);
  if (diff !== null && diff > 0) return false;

  if (reminder.referenceType === "task") {
    return state.tasks.some((t) => t.id === reminder.referenceId && t.status !== "done");
  }
  return state.projects.some((p) => p.id === reminder.referenceId && p.status !== "done");
}

export function automaticDueTasks(tasks: Task[]) {
  return tasks.filter((task) => {
    if (task.status === "done" || !task.dueDate) return false;
    const diff = daysUntil(task.dueDate);
    return diff !== null && diff <= 1;
  });
}
