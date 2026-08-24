import { useState } from "react";
import { categories } from "../lib/categories";
import { DateField } from "./DateField";
import { LinkEditor } from "./LinkEditor";
import { newId } from "../lib/home-store";
import type { CategoryId, Priority, Project, ProjectStatus } from "../lib/types";

export function ProjectForm({ project, onSave }: { project?: Project; onSave: (project: Project) => void }) {
  const [value, setValue] = useState<Project>(project ?? {
    id: newId("project"),
    title: "",
    category: "house",
    status: "new",
    priority: "normal",
    endDate: "",
    description: "",
    goal: "",
    links: [],
  });

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); if (value.title.trim()) onSave({ ...value, title: value.title.trim() }); }}>
      <label>Titel<input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} required /></label>
      <div className="form-cols">
        <label>Kategorie<select value={value.category} onChange={(e) => setValue({ ...value, category: e.target.value as CategoryId })}>
          {Object.values(categories).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select></label>
        <label>Status<select value={value.status} onChange={(e) => setValue({ ...value, status: e.target.value as ProjectStatus })}>
          <option value="new">Neu</option><option value="planning">In Planung</option><option value="doing">In Umsetzung</option><option value="done">Fertig</option>
        </select></label>
      </div>
      <div className="form-cols">
        <label>Priorität<select value={value.priority} onChange={(e) => setValue({ ...value, priority: e.target.value as Priority })}>
          <option value="high">Hoch</option><option value="normal">Normal</option><option value="low">Niedrig</option>
        </select></label>
        <DateField label="Endtermin" value={value.endDate} onChange={(endDate) => setValue({ ...value, endDate })} />
      </div>
      <label>Beschreibung<textarea value={value.description ?? ""} onChange={(e) => setValue({ ...value, description: e.target.value })} /></label>
      <label>Ziel<textarea value={value.goal ?? ""} onChange={(e) => setValue({ ...value, goal: e.target.value })} /></label>
      <LinkEditor links={value.links ?? []} onChange={(links) => setValue({ ...value, links })} />
      <button className="button primary" type="submit">Speichern</button>
    </form>
  );
}
