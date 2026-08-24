import { Pencil, Trash2 } from "lucide-react";
import type { Project, Task } from "../lib/types";
import { TaskStatusButtons } from "./TaskStatusButtons";
import { LinkList } from "./LinkEditor";

export function TaskItem({
  task,
  project,
  onEdit,
  onDelete,
}: {
  task: Task;
  project?: Project;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="task-item">
      <div className="task-copy">
        <strong>{task.title}</strong>
        <span className="secondary">{project?.title ?? "Ohne Vorhaben"} · {task.source === "ai" ? "KI" : "manuell"} · {task.dueDate || "ohne Termin"}</span>
        {task.description && <span className="secondary">{task.description}</span>}
        <TaskStatusButtons task={task} />
        <LinkList links={task.links} />
      </div>
      {(onEdit || onDelete) && (
        <div className="row-actions">
          {onEdit && <button className="button ghost small" onClick={onEdit}><Pencil /> Bearbeiten</button>}
          {onDelete && <button className="button danger small" onClick={onDelete}><Trash2 /> Löschen</button>}
        </div>
      )}
    </article>
  );
}
