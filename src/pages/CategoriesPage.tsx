import { categoryOf, categories } from "../lib/categories";
import type { CategoryId, HomeState, Project } from "../lib/types";
import { CategoryIcon } from "../components/CategoryIcon";
import { ProjectCard } from "../components/ProjectCard";
import { TaskItem } from "../components/TaskItem";

export function CategoriesPage({
  state,
  selected,
  onSelect,
  onOpenProject,
}: {
  state: HomeState;
  selected?: CategoryId;
  onSelect: (category: CategoryId) => void;
  onOpenProject: (project: Project) => void;
}) {
  if (selected) {
    const projects = state.projects.filter((p) => p.category === selected);
    const ids = new Set(projects.map((p) => p.id));
    const tasks = state.tasks.filter((t) => ids.has(t.projectId));
    return (
      <section>
        <button className="button ghost" onClick={() => onSelect(undefined as never)}>← Kategorien</button>
        <div className="category-title"><CategoryIcon category={selected} size="lg" /><h1>{categoryOf(selected).label}</h1></div>
        <h2>Vorhaben</h2>
        <div className="project-grid">
          {projects.map((project) => <ProjectCard key={project.id} project={project} tasks={state.tasks.filter((t) => t.projectId === project.id)} onOpen={() => onOpenProject(project)} />)}
        </div>
        <h2>Aufgaben</h2>
        <div className="card panel">
          {tasks.map((task) => <TaskItem key={task.id} task={task} project={state.projects.find((p) => p.id === task.projectId)} />)}
          {!tasks.length && <p className="secondary">Keine Aufgaben.</p>}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h1>Kategorien</h1>
      <div className="category-grid">
        {(Object.keys(categories) as CategoryId[]).map((id) => {
          const projectCount = state.projects.filter((p) => p.category === id).length;
          const taskCount = state.tasks.filter((t) => state.projects.find((p) => p.id === t.projectId)?.category === id).length;
          return (
            <button key={id} className="card category-card" onClick={() => onSelect(id)}>
              <CategoryIcon category={id} size="lg" />
              <strong>{categoryOf(id).label}</strong>
              <span className="secondary">{projectCount} Vorhaben · {taskCount} Aufgaben</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
