import { useState } from "react";
import { newId } from "../lib/home-store";
import { DateField } from "./DateField";
import { LinkEditor } from "./LinkEditor";
import type { HomeState, Priority, Task, TaskStatus } from "../lib/types";
import { validateTaskDate } from "../lib/planning-service";

function formatDate(value?: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

export function TaskForm({
  state,
  task,
  projectId,
  onSave,
}: {
  state: HomeState;
  task?: Task;
  projectId?: string;
  onSave: (task: Task, extendProjectEndTo?: string) => void;
}) {
  const [value, setValue] = useState<Task>(task ?? {
    id: newId("task"),
    projectId: projectId ?? state.projects[0]?.id ?? "",
    title: "",
    description: "",
    status: "open",
    priority: "normal",
    dueDate: "",
    source: "manual",
    links: [],
    estimatedHours: undefined,
  });

  function submit() {
    if (!value.title.trim() || !value.projectId) return;

    const normalized = { ...value, title: value.title.trim() };
    const capacityError = validateTaskDate(state, normalized);
    if (capacityError) { window.alert(`Termin nicht möglich: ${capacityError}`); return; }
    const project = state.projects.find((item) => item.id === normalized.projectId);

    if (normalized.dueDate && project?.endDate && normalized.dueDate > project.endDate) {
      const confirmed = window.confirm(
        `Der Fälligkeitstermin der Aufgabe (${formatDate(normalized.dueDate)}) liegt nach dem Endtermin des Vorhabens „${project.title}“ (${formatDate(project.endDate)}).\n\n` +
        `Soll der Aufgabentermin übernommen und der Endtermin des Vorhabens automatisch auf ${formatDate(normalized.dueDate)} verschoben werden?`
      );
      if (!confirmed) return;
      onSave(normalized, normalized.dueDate);
      return;
    }

    onSave(normalized);
  }

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label>Titel<input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} required /></label>
      <label>Beschreibung<textarea value={value.description ?? ""} onChange={(e) => setValue({ ...value, description: e.target.value })} /></label>
      <label>Vorhaben<select value={value.projectId} onChange={(e) => setValue({ ...value, projectId: e.target.value })}>
        {state.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
      </select></label>
      <div className="form-cols">
        <label>Status<select value={value.status} onChange={(e) => setValue({ ...value, status: e.target.value as TaskStatus })}>
          <option value="open">Offen</option><option value="progress">In Arbeit</option><option value="done">Erledigt</option>
        </select></label>
        <label>Priorität<select value={value.priority} onChange={(e) => setValue({ ...value, priority: e.target.value as Priority })}>
          <option value="high">Hoch</option><option value="normal">Normal</option><option value="low">Niedrig</option>
        </select></label>
      </div>
      <label>Geschätzter Aufwand (Stunden)<input type="number" min="0" step="0.25" value={value.estimatedHours ?? ""} onChange={(e) => setValue({ ...value, estimatedHours: e.target.value ? Number(e.target.value) : undefined })} /></label>
      <DateField label="Fällig am" value={value.dueDate} onChange={(dueDate) => setValue({ ...value, dueDate })} />
      <LinkEditor links={value.links ?? []} onChange={(links) => setValue({ ...value, links })} />
      <button className="button primary" type="submit">Speichern</button>
    </form>
  );
}
