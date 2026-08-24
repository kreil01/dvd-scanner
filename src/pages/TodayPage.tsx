import { Bell, ClipboardCheck, Clock3, Pickaxe, Siren } from "lucide-react";
import { automaticDueTasks, isManualReminderActive } from "../lib/reminders";
import type { HomeState, Project, Task } from "../lib/types";
import { ProjectCard } from "../components/ProjectCard";
import { TaskItem } from "../components/TaskItem";

export function TodayPage({ state, onOpenProject }: { state: HomeState; onOpenProject: (project: Project) => void }) {
  const openTasks = state.tasks.filter((t) => t.status !== "done");
  const due = automaticDueTasks(state.tasks);
  const manual = state.reminders.filter((r) => isManualReminderActive(state, r));
  const projectFor = (task: Task) => state.projects.find((p) => p.id === task.projectId);

  return (
    <>
      <section className="hero card">
        <span className="secondary">Guten Tag</span>
        <h1>Was ist heute zu erledigen?</h1>
        <p>{openTasks.length} Aufgaben warten – aus {state.projects.length} Vorhaben.</p>
      </section>

      <section className="metrics">
        <div className="metric card metric-red"><span className="metric-icon"><ClipboardCheck /></span><div><span>Heute / morgen</span><strong>{due.length}</strong></div></div>
        <div className="metric card metric-yellow"><span className="metric-icon"><Pickaxe /></span><div><span>In Arbeit</span><strong>{openTasks.filter((t) => t.status === "progress").length}</strong></div></div>
        <div className="metric card metric-yellow"><span className="metric-icon"><Siren /></span><div><span>Manuelle Erinnerungen</span><strong>{manual.length}</strong></div></div>
      </section>

      <section className="dashboard-grid">
        <div className="card panel">
          <h2><Clock3 /> Heute & fällig</h2>
          {due.length ? due.map((task) => <TaskItem key={task.id} task={task} project={projectFor(task)} />) : <p className="secondary">Nichts Dringendes.</p>}
        </div>
        <div className="card panel">
          <h2><Bell /> Erinnerungen</h2>
          {manual.length ? manual.map((r) => <div className="reminder-line" key={r.id}><strong>{r.title}</strong><span className="secondary">Täglich bis erledigt</span></div>) : <p className="secondary">Keine manuellen Erinnerungen.</p>}
        </div>
      </section>

      <section>
        <h2>Aktive Vorhaben</h2>
        <div className="project-grid">
          {state.projects.filter((p) => p.status !== "done").map((project) => (
            <ProjectCard key={project.id} project={project} tasks={state.tasks.filter((t) => t.projectId === project.id)} onOpen={() => onOpenProject(project)} />
          ))}
        </div>
      </section>
    </>
  );
}
