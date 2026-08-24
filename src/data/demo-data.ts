import type { HomeState } from "../lib/types";

function offsetDate(days: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const demoState: HomeState = {
  projects: [
    {
      id: "project-table",
      title: "Tisch umbauen",
      category: "furnishing",
      status: "planning",
      priority: "normal",
      endDate: offsetDate(7),
      description: "Klappe in Tischplatte und Auszug für Notebook planen.",
      goal: "Unauffälliger und praktischer Notebook-Arbeitsplatz.",
    },
    {
      id: "project-bath",
      title: "Bad renovieren",
      category: "renovation",
      status: "doing",
      priority: "high",
      endDate: offsetDate(35),
      description: "Waschtisch, Stauraum und Anschlüsse neu organisieren.",
      goal: "Praktischeres Badezimmer mit mehr Stauraum.",
    },
    {
      id: "project-garden",
      title: "Garten neu gestalten",
      category: "garden",
      status: "planning",
      priority: "high",
      endDate: offsetDate(14),
      description: "Terrasse, Beete und Bewässerung planen.",
      goal: "Pflegeleichter, gut nutzbarer Garten.",
    },
  ],
  tasks: [
    {
      id: "task-measure",
      projectId: "project-table",
      title: "Maße für Laptop-Auszug festlegen",
      description: "Breite, Tiefe und Einbauhöhe messen.",
      status: "open",
      priority: "normal",
      dueDate: offsetDate(0),
      source: "manual",
    },
    {
      id: "task-hinges",
      projectId: "project-table",
      title: "Angebote für Scharniere vergleichen",
      description: "Verdeckte Scharniere vergleichen.",
      status: "progress",
      priority: "normal",
      dueDate: offsetDate(1),
      source: "manual",
    },
    {
      id: "task-lawn",
      projectId: "project-garden",
      title: "Rasen mähen",
      description: "Fläche für weitere Gartenarbeiten vorbereiten.",
      status: "open",
      priority: "high",
      dueDate: offsetDate(-1),
      source: "manual",
    },
  ],
  blockedPeriods: [],
  planningSettings: { maxTasksPerDay: 3, maxHoursPerDay: 4 },
  reminders: [
    {
      id: "reminder-hinges",
      title: "Scharnier-Aufgabe weiterführen",
      referenceType: "task",
      referenceId: "task-hinges",
      startDate: offsetDate(-1),
      time: "09:00",
      active: true,
    },
  ],
};
