import { Bell, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { automaticDueTasks, daysUntil, isManualReminderActive } from "../lib/reminders";
import { homeStore } from "../lib/home-store";
import type { HomeState, Reminder } from "../lib/types";

function reminderStatus(state: HomeState, reminder: Reminder) {
  if (!reminder.active) return "Deaktiviert";

  const referenceOpen = reminder.referenceType === "task"
    ? state.tasks.some((t) => t.id === reminder.referenceId && t.status !== "done")
    : state.projects.some((p) => p.id === reminder.referenceId && p.status !== "done");

  if (!referenceOpen) return "Erledigt";

  const diff = daysUntil(reminder.startDate);
  if (diff !== null && diff > 0) {
    return `Startet am ${reminder.startDate}${reminder.time ? ` um ${reminder.time}` : ""}`;
  }

  return `Aktiv · täglich seit ${reminder.startDate}${reminder.time ? ` · ${reminder.time}` : ""}`;
}

export function RemindersPage({ state, onNew, onEdit }: {
  state: HomeState;
  onNew: () => void;
  onEdit: (id: string) => void;
}) {
  const due = automaticDueTasks(state.tasks);
  const reminders = [...state.reminders].sort((a, b) =>
    `${a.startDate}T${a.time ?? "00:00"}`.localeCompare(`${b.startDate}T${b.time ?? "00:00"}`)
  );
  const activeCount = reminders.filter((r) => isManualReminderActive(state, r)).length;

  return (
    <div className="page-stack">
      <section className="card panel">
        <h1><Clock3 /> Automatische Fälligkeitshinweise</h1>
        {due.map((task) => <div className="reminder-line" key={task.id}><strong>{task.title}</strong><span className="secondary">{task.dueDate} · bis erledigt</span></div>)}
        {!due.length && <p className="secondary">Keine automatischen Hinweise.</p>}
      </section>
      <section className="card panel">
        <div className="panel-head"><h2><Bell /> Manuelle Erinnerungen</h2><button className="button primary" onClick={onNew}><Plus /> Erinnerung</button></div>
        {!!reminders.length && <p className="secondary">{reminders.length} gespeichert · {activeCount} aktuell aktiv</p>}
        {reminders.map((r) => (
          <div className="reminder-line reminder-with-action" key={r.id}>
            <div><strong>{r.title}</strong><span className="secondary">{reminderStatus(state, r)}</span></div>
            <div className="row-actions">
              <button className="button ghost small" onClick={() => onEdit(r.id)}><Pencil /> Bearbeiten</button>
              <button className="button danger small" onClick={() => homeStore.deleteReminder(r.id)}><Trash2 /> Löschen</button>
            </div>
          </div>
        ))}
        {!reminders.length && <p className="secondary">Keine manuellen Erinnerungen gespeichert.</p>}
      </section>
    </div>
  );
}
