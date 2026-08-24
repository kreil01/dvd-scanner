import type { HomeState, Task } from "../lib/types";
import { homeStore } from "../lib/home-store";
import { TaskItem } from "../components/TaskItem";

export function TasksPage({ state, onEdit }: { state: HomeState; onEdit: (task: Task) => void }) {
  return (
    <section className="card panel">
      <h1>Aufgaben</h1>
      {state.tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          project={state.projects.find((p) => p.id === task.projectId)}
          onEdit={() => onEdit(task)}
          onDelete={() => {
            if (confirm(`Aufgabe "${task.title}" wirklich löschen?`)) homeStore.deleteTask(task.id);
          }}
        />
      ))}
    </section>
  );
}
