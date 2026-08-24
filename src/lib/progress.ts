import type { Task } from "./types";

export interface ProjectProgress {
  total: number;
  open: number;
  progress: number;
  done: number;
  percent: number;
}

export function calculateProjectProgress(tasks: Task[]): ProjectProgress {
  const total = tasks.length;
  if (total === 0) return { total: 0, open: 0, progress: 0, done: 0, percent: 0 };

  const open = tasks.filter((t) => t.status === "open").length;
  const progress = tasks.filter((t) => t.status === "progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const percent = Math.round(((done + progress * 0.5) / total) * 100);

  return { total, open, progress, done, percent };
}
