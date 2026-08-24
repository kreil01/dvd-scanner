import { useMemo, useState } from "react";
import { Bell, CalendarDays, FolderKanban, LayoutGrid, ListTodo, Plus, Shapes } from "lucide-react";
import { AiTaskSuggestions } from "./components/AiTaskSuggestions";
import { ProjectForm } from "./components/ProjectForm";
import { ReminderForm } from "./components/ReminderForm";
import { TaskForm } from "./components/TaskForm";
import { homeStore, useHomeStore, usePersistenceStatus } from "./lib/home-store";
import type { CategoryId, Project, Reminder, Task } from "./lib/types";
import type { CalendarEvent } from "./lib/calendar-service";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CalendarPage } from "./pages/CalendarPage";
import { EditPage } from "./pages/EditPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { RemindersPage } from "./pages/RemindersPage";
import { TasksPage } from "./pages/TasksPage";
import { TodayPage } from "./pages/TodayPage";

type View = "today" | "projects" | "tasks" | "reminders" | "calendar" | "categories";
type Editor = "project" | "task" | "reminder" | "ai";

export default function App() {
  const state = useHomeStore();
  const persistenceStatus = usePersistenceStatus();
  const [persistenceState, persistenceError] = persistenceStatus.split("|", 2);
  const [view, setView] = useState<View>("today");
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>();
  const [editor, setEditor] = useState<Editor>();
  const [editingProject, setEditingProject] = useState<Project>();
  const [editingTask, setEditingTask] = useState<Task>();
  const [editingReminder, setEditingReminder] = useState<Reminder>();

  const selectedProject = useMemo(() => state.projects.find((p) => p.id === selectedProjectId), [state.projects, selectedProjectId]);

  const nav = [
    ["today", LayoutGrid, "Heute"],
    ["projects", FolderKanban, "Vorhaben"],
    ["tasks", ListTodo, "Aufgaben"],
    ["reminders", Bell, "Erinnerungen"],
    ["calendar", CalendarDays, "Kalender"],
    ["categories", Shapes, "Kategorien"],
  ] as const;

  function openProject(project: Project) {
    setSelectedProjectId(project.id);
    setView("projects");
    setEditor(undefined);
  }

  function openCalendarEvent(event: CalendarEvent) {
    if (event.sourceType === "project") {
      const project = state.projects.find((p) => p.id === event.sourceId);
      if (project) openProject(project);
      return;
    }
    if (event.sourceType === "task") {
      const task = state.tasks.find((t) => t.id === event.sourceId);
      if (task) {
        const project = state.projects.find((p) => p.id === task.projectId);
        if (project) openProject(project);
      }
      return;
    }
    const reminder = state.reminders.find((r) => r.id === event.sourceId);
    if (reminder) {
      setEditingReminder(reminder);
      setView("reminders");
      setEditor("reminder");
    }
  }

  function closeEditor() {
    setEditor(undefined);
    setEditingProject(undefined);
    setEditingTask(undefined);
    setEditingReminder(undefined);
  }

  function backLabel() {
    if (selectedProject) return `Zurück zu ${selectedProject.title}`;
    if (view === "tasks") return "Zurück zu Aufgaben";
    if (view === "reminders") return "Zurück zu Erinnerungen";
    return "Zurück";
  }

  let content;

  if (editor === "project") {
    content = <EditPage title={editingProject ? "Vorhaben bearbeiten" : "Neues Vorhaben"} backLabel={backLabel()} onBack={closeEditor}>
      <ProjectForm project={editingProject} onSave={(project) => { homeStore.saveProject(project); setSelectedProjectId(project.id); setView("projects"); closeEditor(); }} />
    </EditPage>;
  } else if (editor === "task") {
    content = <EditPage title={editingTask ? "Aufgabe bearbeiten" : "Neue Aufgabe"} backLabel={backLabel()} onBack={closeEditor}>
      <TaskForm state={state} task={editingTask} projectId={selectedProject?.id} onSave={(task, extendProjectEndTo) => {
        if (extendProjectEndTo) {
          const project = state.projects.find((item) => item.id === task.projectId);
          if (project && (!project.endDate || extendProjectEndTo > project.endDate)) {
            homeStore.saveProject({ ...project, endDate: extendProjectEndTo });
          }
        }
        homeStore.saveTask(task);
        closeEditor();
      }} />
    </EditPage>;
  } else if (editor === "reminder") {
    content = <EditPage title={editingReminder ? "Erinnerung bearbeiten" : "Neue Erinnerung"} backLabel="Zurück zu Erinnerungen" onBack={closeEditor}>
      <ReminderForm state={state} reminder={editingReminder} onSave={(reminder) => { homeStore.saveReminder(reminder); setView("reminders"); closeEditor(); }} />
    </EditPage>;
  } else if (editor === "ai" && selectedProject) {
    content = <EditPage title={`KI-Aufgaben · ${selectedProject.title}`} backLabel={`Zurück zu ${selectedProject.title}`} onBack={closeEditor}>
      <AiTaskSuggestions project={selectedProject} existing={state.tasks.filter((t) => t.projectId === selectedProject.id)} onDone={closeEditor} />
    </EditPage>;
  } else if (view === "projects" && selectedProject) {
    content = <ProjectDetailPage state={state} project={selectedProject} onBack={() => setSelectedProjectId(undefined)}
      onEditProject={() => { setEditingProject(selectedProject); setEditor("project"); }}
      onNewTask={() => { setEditingTask(undefined); setEditor("task"); }}
      onEditTask={(task) => { setEditingTask(task); setEditor("task"); }}
      onAiTasks={() => setEditor("ai")} />;
  } else if (view === "today") {
    content = <TodayPage state={state} onOpenProject={openProject} />;
  } else if (view === "projects") {
    content = <ProjectsPage state={state} onOpenProject={openProject} />;
  } else if (view === "tasks") {
    content = <TasksPage state={state} onEdit={(task) => { setEditingTask(task); setEditor("task"); }} />;
  } else if (view === "calendar") {
    content = <CalendarPage onOpenEvent={openCalendarEvent} />;
  } else if (view === "reminders") {
    content = <RemindersPage state={state} onNew={() => { setEditingReminder(undefined); setEditor("reminder"); }}
      onEdit={(id) => { const r = state.reminders.find((x) => x.id === id); if (r) { setEditingReminder(r); setEditor("reminder"); } }} />;
  } else {
    content = <CategoriesPage state={state} selected={selectedCategory} onSelect={(id) => setSelectedCategory(id)} onOpenProject={openProject} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">⌂ Heimwerk</div>
        <nav>{nav.map(([id, Icon, label]) => <button key={id} className={view === id && !editor ? "active" : ""} onClick={() => { closeEditor(); setView(id); if (id !== "projects") setSelectedProjectId(undefined); }}><Icon /> {label}</button>)}</nav>
        
      </aside>

      <main className="main">
        {persistenceState === "loading" && <div className="persistence-banner">Daten werden geladen …</div>}
        {persistenceError && <div className="persistence-banner error">Speichern nicht möglich: {persistenceError}</div>}
        <header className="app-head">
          <span className="version">v0.3.2 FIX10</span>
          {!editor && <button className="button primary" onClick={() => { setEditingProject(undefined); setEditor("project"); }}><Plus /> Neues Vorhaben</button>}
        </header>
        {content}
      </main>

      {!editor && <nav className="mobile-nav">{nav.map(([id, Icon, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); if (id !== "projects") setSelectedProjectId(undefined); }}><Icon /><span>{label}</span></button>)}</nav>}
    </div>
  );
}
