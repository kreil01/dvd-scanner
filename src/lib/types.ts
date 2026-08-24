export type ProjectStatus = "new" | "planning" | "doing" | "done";
export type TaskStatus = "open" | "progress" | "done";
export type Priority = "low" | "normal" | "high";
export type TaskSource = "manual" | "ai";
export type ReminderReferenceType = "task" | "project";
export type LinkType = "shopping" | "info" | "video" | "document" | "other";

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: LinkType;
}

export type CategoryId =
  | "house"
  | "renovation"
  | "furnishing"
  | "garden"
  | "mobility"
  | "finance"
  | "health"
  | "education"
  | "travel"
  | "other";

export interface Project {
  id: string;
  title: string;
  category: CategoryId;
  status: ProjectStatus;
  priority: Priority;
  endDate?: string;
  description?: string;
  goal?: string;
  links?: LinkItem[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  source: TaskSource;
  links?: LinkItem[];
  estimatedHours?: number;
}

export interface BlockedPeriod {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
}

export interface PlanningSettings {
  maxTasksPerDay: number;
  maxHoursPerDay: number;
}

export interface Reminder {
  id: string;
  title: string;
  referenceType: ReminderReferenceType;
  referenceId: string;
  startDate: string;
  time?: string;
  active: boolean;
}

export interface HomeState {
  projects: Project[];
  tasks: Task[];
  reminders: Reminder[];
  blockedPeriods: BlockedPeriod[];
  planningSettings: PlanningSettings;
}
