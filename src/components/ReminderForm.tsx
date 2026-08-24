import { useMemo, useState } from "react";
import { DateField } from "./DateField";
import { newId } from "../lib/home-store";
import type { HomeState, Reminder, ReminderReferenceType } from "../lib/types";

export function ReminderForm({ state, reminder, onSave }: {
  state: HomeState;
  reminder?: Reminder;
  onSave: (reminder: Reminder) => void;
}) {
  const initialType: ReminderReferenceType = reminder?.referenceType ?? (state.tasks.length ? "task" : "project");
  const [value, setValue] = useState<Reminder>(reminder ?? {
    id: newId("reminder"),
    title: "",
    referenceType: initialType,
    referenceId: initialType === "task" ? state.tasks[0]?.id ?? "" : state.projects[0]?.id ?? "",
    startDate: new Date().toISOString().slice(0, 10),
    time: "09:00",
    active: true,
  });

  const options = useMemo(
    () => value.referenceType === "task"
      ? state.tasks.map((x) => ({ id: x.id, label: x.title }))
      : state.projects.map((x) => ({ id: x.id, label: x.title })),
    [state, value.referenceType]
  );

  function changeType(referenceType: ReminderReferenceType) {
    const next = referenceType === "task" ? state.tasks : state.projects;
    setValue({ ...value, referenceType, referenceId: next[0]?.id ?? "" });
  }

  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault();
      if (value.title.trim() && value.referenceId) onSave({ ...value, title: value.title.trim() });
    }}>
      <label>Titel<input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} required /></label>
      <div className="form-cols">
        <label>Bezug<select value={value.referenceType} onChange={(e) => changeType(e.target.value as ReminderReferenceType)}>
          <option value="task">Aufgabe</option><option value="project">Vorhaben</option>
        </select></label>
        <label>Aufgabe / Vorhaben<select value={value.referenceId} onChange={(e) => setValue({ ...value, referenceId: e.target.value })}>
          {options.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select></label>
      </div>
      <div className="form-cols">
        <DateField label="Startdatum" value={value.startDate} onChange={(startDate) => setValue({ ...value, startDate })} />
        <label>Uhrzeit<input type="time" value={value.time ?? ""} onChange={(e) => setValue({ ...value, time: e.target.value })} /></label>
      </div>
      <label className="checkbox-label"><input type="checkbox" checked={value.active} onChange={(e) => setValue({ ...value, active: e.target.checked })} /> Erinnerung aktiv</label>
      <p className="form-hint">Die Erinnerung erscheint ab dem Startdatum täglich, bis die referenzierte Aufgabe erledigt bzw. das Vorhaben fertig ist.</p>
      <button className="button primary" type="submit">Speichern</button>
    </form>
  );
}
