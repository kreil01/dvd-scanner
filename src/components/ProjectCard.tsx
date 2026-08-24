import { CalendarDays, Star } from "lucide-react";
import { categoryOf } from "../lib/categories";
import type { Project, Task } from "../lib/types";
import { CategoryChip, CategoryIcon } from "./CategoryIcon";
import { ProgressBar } from "./ProgressBar";

export function ProjectCard({ project, tasks, onOpen }: { project: Project; tasks: Task[]; onOpen: () => void }) {
  const category = categoryOf(project.category);
  return (
    <button className="project-card card" onClick={onOpen}>
      <div className="project-card-head">
        <CategoryIcon category={project.category} size="lg" />
        <div>
          <h3>{project.title}</h3>
          <div className="chips">
            <CategoryChip category={project.category} />
            {project.priority === "high" && <span className="chip"><Star /> Wichtig</span>}
          </div>
        </div>
      </div>
      <ProgressBar tasks={tasks} />
      <div className="project-card-foot secondary">
        <span style={{ color: category.accent }}>{project.status === "done" ? "Fertig" : "Aktiv"}</span>
        <span><CalendarDays /> {project.endDate ?? "kein Endtermin"}</span>
      </div>
    </button>
  );
}
