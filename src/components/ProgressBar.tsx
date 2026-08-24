import { calculateProjectProgress } from "../lib/progress";
import type { Task } from "../lib/types";

export function ProgressBar({ tasks }: { tasks: Task[] }) {
  const p = calculateProjectProgress(tasks);
  return (
    <div className="project-progress">
      <div className="progress-track" aria-label={`Fortschritt ${p.percent} Prozent`}>
        {p.total === 0 ? (
          <span className="segment segment-empty" />
        ) : (
          <>
            <span className="segment segment-open" style={{ width: `${(p.open / p.total) * 100}%` }} />
            <span className="segment segment-progress" style={{ width: `${(p.progress / p.total) * 100}%` }} />
            <span className="segment segment-done" style={{ width: `${(p.done / p.total) * 100}%` }} />
          </>
        )}
      </div>
      <div className="progress-meta">
        <span>{p.total ? `${p.open} offen · ${p.progress} in Arbeit · ${p.done} erledigt` : "Keine Aufgaben"}</span>
        <strong>{p.percent} %</strong>
      </div>
    </div>
  );
}
