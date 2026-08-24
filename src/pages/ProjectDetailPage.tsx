import { CalendarDays, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { HomeState, Project, Task } from "../lib/types";
import { CategoryChip, CategoryIcon } from "../components/CategoryIcon";
import { ProgressBar } from "../components/ProgressBar";
import { LinkList } from "../components/LinkEditor";
import { TaskItem } from "../components/TaskItem";
import { homeStore } from "../lib/home-store";

export function ProjectDetailPage({
  state,
  project,
  onEditProject,
  onNewTask,
  onEditTask,
  onAiTasks,
  onBack,
}: {
  state: HomeState;
  project: Project;
  onEditProject: () => void;
  onNewTask: () => void;
  onEditTask: (task: Task) => void;
  onAiTasks: () => void;
  onBack: () => void;
}) {
  const tasks = state.tasks.filter((t) => t.projectId === project.id);
  return (
    <section>
      <button className="button ghost" onClick={onBack}>← Vorhaben</button>
      <div className="detail-grid">
        <div className="page-stack">
          <article className="card project-detail">
            <div className="project-card-head">
              <CategoryIcon category={project.category} size="lg" />
              <div className="grow">
                <div className="detail-head">
                  <div><h1>{project.title}</h1><CategoryChip category={project.category} /></div>
                  <div className="row-actions">
                    <button className="button ghost" onClick={onEditProject}><Pencil /> Bearbeiten</button>
                    <button className="button danger" onClick={() => { if (confirm(`Vorhaben "${project.title}" wirklich löschen?`)) { homeStore.deleteProject(project.id); onBack(); } }}><Trash2 /> Löschen</button>
                  </div>
                </div>
              </div>
            </div>
            <p>{project.description}</p>
            <p><strong>Ziel:</strong> {project.goal || "—"}</p>
            <p className="secondary"><CalendarDays /> Endtermin {project.endDate || "nicht gesetzt"}</p>
            <ProgressBar tasks={tasks} />
            <LinkList links={project.links} />
          </article>

          <article className="card panel">
            <div className="panel-head">
              <h2>Aufgaben</h2>
              <div className="row-actions">
                <button className="button primary" onClick={onNewTask}><Plus /> Aufgabe</button>
                <button className="button ghost" onClick={onAiTasks}><Sparkles /> KI-Vorschläge</button>
              </div>
            </div>
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} project={project} onEdit={() => onEditTask(task)} onDelete={() => { if (confirm(`Aufgabe "${task.title}" wirklich löschen?`)) homeStore.deleteTask(task.id); }} />
            ))}
            {!tasks.length && <p className="secondary">Noch keine Aufgaben.</p>}
          </article>
        </div>
        <aside className="card ai-panel">
          <h2><Sparkles /> KI-Assistent</h2>
          <p>V0.3.2 nutzt die echte KI-Integration über den Cloudflare-Worker. Vorschläge werden vor der Übernahme angezeigt und bleiben vollständig bearbeitbar.</p>
          <button className="button ai" onClick={onAiTasks}><Sparkles /> Aufgaben vorschlagen</button>
        </aside>
      </div>
    </section>
  );
}
