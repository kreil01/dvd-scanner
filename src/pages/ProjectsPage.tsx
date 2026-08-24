import type { HomeState, Project } from "../lib/types";
import { ProjectCard } from "../components/ProjectCard";

export function ProjectsPage({ state, onOpenProject }: { state: HomeState; onOpenProject: (project: Project) => void }) {
  return (
    <section>
      <h1>Vorhaben</h1>
      <div className="project-grid">
        {state.projects.map((project) => (
          <ProjectCard key={project.id} project={project} tasks={state.tasks.filter((t) => t.projectId === project.id)} onOpen={() => onOpenProject(project)} />
        ))}
      </div>
    </section>
  );
}
