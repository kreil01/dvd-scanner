import { useState } from "react";
import { Cable, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { generateAiProjectPlan, testOpenAiConnection, type AiTaskDraft } from "../lib/ai-service";
import { homeStore, newId } from "../lib/home-store";
import type { Priority, Project, Task } from "../lib/types";
import { nextAvailableDate } from "../lib/planning-service";

interface EditableDraft extends AiTaskDraft {
  id: string;
  selected: boolean;
}

const priorityLabels: Record<Priority, string> = { low: "Niedrig", normal: "Normal", high: "Hoch" };

export function AiTaskSuggestions({ project, existing, onDone }: { project: Project; existing: Task[]; onDone: () => void }) {
  const [guidance, setGuidance] = useState("");
  const [summary, setSummary] = useState("");
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState("");
  const [error, setError] = useState("");

  async function testConnection() {
    setTesting(true);
    setError("");
    setConnectionResult("");
    try {
      setConnectionResult(await testOpenAiConnection());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  }

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const plan = await generateAiProjectPlan(project, existing, guidance);
      setSummary(plan.summary);
      setDrafts(plan.tasks.map((task) => ({ ...task, id: newId("ai-draft"), selected: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function patch(id: string, change: Partial<EditableDraft>) {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...change } : draft));
  }

  function accept() {
    const selected = drafts.filter((draft) => draft.selected && draft.title.trim());
    const latestDueDate = selected
      .map((draft) => draft.dueDate)
      .filter(Boolean)
      .sort()
      .at(-1);

    if (latestDueDate && project.endDate && latestDueDate > project.endDate) {
      const [year, month, day] = latestDueDate.split("-");
      const [projectYear, projectMonth, projectDay] = project.endDate.split("-");
      const confirmed = window.confirm(
        `Mindestens eine ausgewählte KI-Aufgabe ist später fällig (${day}.${month}.${year}) als das Vorhaben „${project.title}“ (${projectDay}.${projectMonth}.${projectYear}).\n\n` +
        `Sollen die Aufgaben übernommen und der Endtermin des Vorhabens automatisch auf ${day}.${month}.${year} verschoben werden?`
      );
      if (!confirmed) return;
      homeStore.saveProject({ ...project, endDate: latestDueDate });
    }

    const known = new Set(existing.map((task) => task.title.trim().toLocaleLowerCase("de-DE")));
    const planningState = homeStore.getSnapshot();
    const occupied = [...planningState.tasks];
    selected.forEach((draft) => {
      const key = draft.title.trim().toLocaleLowerCase("de-DE");
      if (known.has(key)) return;
      known.add(key);
      const candidate: Task = {
        id: newId("task-ai"),
        projectId: project.id,
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: "open",
        priority: draft.priority,
        dueDate: draft.dueDate,
        estimatedHours: draft.estimatedHours,
        source: "ai",
      };
      if (candidate.dueDate) candidate.dueDate = nextAvailableDate({ ...planningState, tasks: occupied }, candidate.dueDate, candidate, occupied);
      occupied.push(candidate);
      homeStore.saveTask(candidate);
    });
    onDone();
  }

  const selectedCount = drafts.filter((draft) => draft.selected && draft.title.trim()).length;

  return (
    <div className="ai-planner">
      <div className="ai-intro card panel">
        <div className="ai-intro-title"><Sparkles /><div><h2>Echte KI-Projektplanung</h2><p>Heimwerk erstellt passende Arbeitsschritte aus den Daten dieses Vorhabens. Nichts wird automatisch gespeichert.</p></div></div>
        <label className="ai-guidance">
          <span>Zusätzliche Vorgaben <small>(optional)</small></span>
          <textarea value={guidance} onChange={(event) => setGuidance(event.target.value)} placeholder="z. B. möglichst am Wochenende erledigen, Budget klein halten, Reihenfolge besonders genau planen …" />
        </label>
        <div className="row-actions">
          <button className="button primary" onClick={generate} disabled={loading || testing}>
            {loading ? <LoaderCircle className="spin" /> : drafts.length ? <RefreshCw /> : <Sparkles />}
            {loading ? "KI plant …" : drafts.length ? "Neu planen" : "KI-Plan erstellen"}
          </button>
          <button className="button ghost" onClick={testConnection} disabled={loading || testing}>
            {testing ? <LoaderCircle className="spin" /> : <Cable />}
            {testing ? "Verbindung wird geprüft …" : "KI-Verbindung testen"}
          </button>
        </div>
        {connectionResult && <div className="ai-success">{connectionResult}</div>}
        {error && <div className="ai-error">{error}</div>}
      </div>

      {drafts.length > 0 && <>
        <article className="card ai-summary"><strong>Planungsvorschlag</strong><p>{summary}</p></article>
        <div className="ai-draft-list">
          {drafts.map((draft, index) => (
            <article className={`card ai-draft ${draft.selected ? "selected" : ""}`} key={draft.id}>
              <label className="ai-select">
                <input type="checkbox" checked={draft.selected} onChange={(event) => patch(draft.id, { selected: event.target.checked })} />
                <span>Aufgabe {index + 1} übernehmen</span>
              </label>
              <label><span>Titel</span><input value={draft.title} onChange={(event) => patch(draft.id, { title: event.target.value })} /></label>
              <label><span>Beschreibung</span><textarea value={draft.description} onChange={(event) => patch(draft.id, { description: event.target.value })} /></label>
              <div className="ai-draft-cols">
                <label><span>Priorität</span><select value={draft.priority} onChange={(event) => patch(draft.id, { priority: event.target.value as Priority })}>{(Object.keys(priorityLabels) as Priority[]).map((priority) => <option value={priority} key={priority}>{priorityLabels[priority]}</option>)}</select></label>
                <label><span>Aufwand (Std.)</span><input type="number" min="0.25" step="0.25" value={draft.estimatedHours} onChange={(event) => patch(draft.id, { estimatedHours: Number(event.target.value) })} /></label>
                <label><span>Fälligkeit</span><input type="date" value={draft.dueDate} onChange={(event) => patch(draft.id, { dueDate: event.target.value })} /></label>
              </div>
            </article>
          ))}
        </div>
        <div className="ai-accept-bar"><span>{selectedCount} Aufgabe{selectedCount === 1 ? "" : "n"} ausgewählt</span><button className="button primary" disabled={!selectedCount} onClick={accept}>Ausgewählte übernehmen</button></div>
      </>}
    </div>
  );
}
