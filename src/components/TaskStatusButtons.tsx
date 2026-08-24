import { Circle, CircleCheck, CirclePlay } from "lucide-react";
import { homeStore } from "../lib/home-store";
import type { Task } from "../lib/types";

export function TaskStatusButtons({ task }: { task: Task }) {
  return (
    <div className="status-buttons">
      <button className={`status-button status-open ${task.status === "open" ? "active" : ""}`} onClick={() => homeStore.setTaskStatus(task.id, "open")}>
        <Circle /> Offen
      </button>
      <button className={`status-button status-progress ${task.status === "progress" ? "active" : ""}`} onClick={() => homeStore.setTaskStatus(task.id, "progress")}>
        <CirclePlay /> In Arbeit
      </button>
      <button className={`status-button status-done ${task.status === "done" ? "active" : ""}`} onClick={() => homeStore.setTaskStatus(task.id, "done")}>
        <CircleCheck /> Erledigt
      </button>
    </div>
  );
}
