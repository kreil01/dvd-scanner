import { useMemo, useState } from "react";
import { Bell, CalendarDays, ChevronLeft, ChevronRight, CircleCheck, FolderKanban, ListTodo, ShieldOff, TriangleAlert, WandSparkles, Trash2 } from "lucide-react";
import { categoryOf, categories } from "../lib/categories";
import { agendaFrom, buildCalendarEvents, eventsForMonth, filterCalendarEvents, type CalendarEvent, type CalendarFilter } from "../lib/calendar-service";
import { homeStore, newId, useHomeStore } from "../lib/home-store";
import { overloadedDays, simulatePriorityReschedule } from "../lib/planning-service";
import type { CategoryId } from "../lib/types";

interface Props {
  onOpenEvent: (event: CalendarEvent) => void;
}

const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
const dateFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eventIcon(type: CalendarEvent["sourceType"]) {
  if (type === "project") return FolderKanban;
  if (type === "task") return ListTodo;
  return Bell;
}

function typeLabel(type: CalendarEvent["sourceType"]) {
  if (type === "project") return "Vorhaben";
  if (type === "task") return "Aufgabe";
  return "Erinnerung";
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const mondayIndex = (first.getDay() + 6) % 7;
  const count = Math.ceil((mondayIndex + last.getDate()) / 7) * 7;
  return Array.from({ length: count }, (_, i) => {
    const day = i - mondayIndex + 1;
    const d = new Date(year, month, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { date: `${y}-${m}-${dd}`, day: d.getDate(), currentMonth: d.getMonth() === month };
  });
}

export function CalendarPage({ onOpenEvent }: Props) {
  // Eigene Store-Subscription: Kalender reagiert unabhängig von der Parent-Komponente
  // unmittelbar auf Änderungen an Vorhaben, Aufgaben und Erinnerungen.
  const state = useHomeStore();
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [mode, setMode] = useState<"month" | "agenda">("month");
  const [blockedTitle,setBlockedTitle]=useState("Urlaub");
  const [blockedStart,setBlockedStart]=useState("");
  const [blockedEnd,setBlockedEnd]=useState("");
  const [priorityProjectId,setPriorityProjectId]=useState("");
  const [filter, setFilter] = useState<CalendarFilter>({ project: true, task: true, reminder: true, completed: false });

  // Keine zusätzliche Event-Cache-Schicht: Bei jeder Store-Änderung wird die
  // abgeleitete Kalenderansicht aus der aktuellen Single Source of Truth neu aufgebaut.
  const allEvents = buildCalendarEvents(state);
  const filtered = filterCalendarEvents(allEvents, filter);
  const monthEvents = eventsForMonth(filtered, cursor.getFullYear(), cursor.getMonth());
  const cells = useMemo(() => monthCells(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const agenda = agendaFrom(filtered, isoToday());
  const overloads = overloadedDays(state);
  const simulation = priorityProjectId ? simulatePriorityReschedule(state, priorityProjectId) : { changes: [] };

  function saveBlocked(){ if(!blockedStart||!blockedEnd||blockedEnd<blockedStart) return; homeStore.saveBlockedPeriod({id:newId(),title:blockedTitle.trim()||"Aufgabenfreie Zeit",startDate:blockedStart,endDate:blockedEnd}); setBlockedStart("");setBlockedEnd(""); }
  function applySimulation(){ if(!simulation.changes.length) return; if(!window.confirm(`${simulation.changes.length} Aufgabentermine wirklich verschieben?`)) return; for(const c of simulation.changes){ const t=state.tasks.find(x=>x.id===c.taskId); if(t) homeStore.saveTask({...t,dueDate:c.to}); } const byProject=new Map<string,string>(); for(const c of simulation.changes){ const v=byProject.get(c.projectId); if(!v||c.to>v) byProject.set(c.projectId,c.to); } for(const [pid,date] of byProject){ const p=state.projects.find(x=>x.id===pid); if(p&&p.endDate&&date>p.endDate) homeStore.saveProject({...p,endDate:date}); } }

  const eventMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of monthEvents) {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [monthEvents]);

  function moveMonth(offset: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function toggle(key: "project" | "task" | "reminder" | "completed") {
    setFilter((current) => ({ ...current, [key]: !current[key] }));
  }

  return <div className="page-stack calendar-page">
    <section className="card panel calendar-head">
      <div>
        <span className="secondary">Projektübergreifende Terminübersicht</span>
        <h1><CalendarDays /> Kalender</h1>
      </div>
      <div className="calendar-view-switch" role="group" aria-label="Kalenderansicht">
        <button className={`button small ${mode === "month" ? "primary" : "ghost"}`} onClick={() => setMode("month")}>Monat</button>
        <button className={`button small ${mode === "agenda" ? "primary" : "ghost"}`} onClick={() => setMode("agenda")}>Agenda</button>
      </div>
    </section>

    <section className="card panel planning-panel">
      <div className="panel-head"><div><span className="secondary">Planungsregeln 1A–1D</span><h2><WandSparkles /> Kapazitätsplanung</h2></div></div>
      <div className="planning-settings">
        <label>Max. Aufgaben/Tag<input type="number" min="1" max="20" value={state.planningSettings.maxTasksPerDay} onChange={e=>homeStore.savePlanningSettings({...state.planningSettings,maxTasksPerDay:Number(e.target.value)||3})}/></label>
        <label>Max. Stunden/Tag<input type="number" min="0.5" max="24" step="0.5" value={state.planningSettings.maxHoursPerDay} onChange={e=>homeStore.savePlanningSettings({...state.planningSettings,maxHoursPerDay:Number(e.target.value)||4})}/></label>
      </div>
      {overloads.length>0 && <div className="planning-warning"><TriangleAlert/><div><strong>{overloads.length} Terminballung{overloads.length===1?"":"en"} im bestehenden Kalender</strong>{overloads.slice(0,5).map(d=><small key={d.date}>{d.date}: {d.tasks.length} Aufgaben · {d.hours.toFixed(1)} h{d.blocked?" · aufgabenfreie Zeit":""}</small>)}</div></div>}
      <div className="blocked-editor"><h3><ShieldOff/> Aufgabenfreie Zeit</h3><div className="planning-grid"><input aria-label="Bezeichnung" value={blockedTitle} onChange={e=>setBlockedTitle(e.target.value)} placeholder="z. B. Urlaub"/><input type="date" value={blockedStart} onChange={e=>setBlockedStart(e.target.value)}/><input type="date" value={blockedEnd} onChange={e=>setBlockedEnd(e.target.value)}/><button className="button small ghost" onClick={saveBlocked}>Sperren</button></div>{state.blockedPeriods.map(p=><div className="blocked-row" key={p.id}><span><strong>{p.title}</strong> · {p.startDate} bis {p.endDate}</span><button className="icon-button" onClick={()=>homeStore.deleteBlockedPeriod(p.id)} aria-label="Löschen"><Trash2/></button></div>)}</div>
      <div className="reschedule-box"><h3>Prioritätsbasierte Umplanung</h3><select value={priorityProjectId} onChange={e=>setPriorityProjectId(e.target.value)}><option value="">Vorhaben auswählen …</option>{state.projects.filter(p=>p.status!=="done").map(p=><option key={p.id} value={p.id}>{p.title} · {p.priority}</option>)}</select>{priorityProjectId&&<div className="simulation-result">{simulation.changes.length===0?<p className="secondary">Keine niedriger priorisierten Termine müssen verschoben werden.</p>:<><p><strong>{simulation.changes.length} Terminverschiebung{simulation.changes.length===1?"":"en"} vorgeschlagen.</strong></p>{simulation.changes.slice(0,8).map(c=><small key={c.taskId}>{c.title}: {c.from} → {c.to}</small>)}{simulation.oldProjectEnd&&simulation.newProjectEnd&&simulation.newProjectEnd>simulation.oldProjectEnd&&<p className="planning-warning-text">Fertigstellung eines betroffenen Vorhabens verschiebt sich voraussichtlich von {simulation.oldProjectEnd} auf {simulation.newProjectEnd}.</p>}<button className="button small primary" onClick={applySimulation}>Vorschlag übernehmen</button></>}</div>}</div>
    </section>

    <section className="card panel calendar-filters">
      <div className="filter-chips">
        <button className={`filter-chip source-project ${filter.project ? "active" : ""}`} onClick={() => toggle("project")}><FolderKanban /> Vorhaben</button>
        <button className={`filter-chip source-task ${filter.task ? "active" : ""}`} onClick={() => toggle("task")}><ListTodo /> Aufgaben</button>
        <button className={`filter-chip source-reminder ${filter.reminder ? "active" : ""}`} onClick={() => toggle("reminder")}><Bell /> Erinnerungen</button>
        <button className={`filter-chip ${filter.completed ? "active" : ""}`} onClick={() => toggle("completed")}><CircleCheck /> Erledigte</button>
      </div>
      <label className="calendar-category-filter">Kategorie
        <select value={filter.categoryId || ""} onChange={(e) => setFilter((current) => ({ ...current, categoryId: (e.target.value || undefined) as CategoryId | undefined }))}>
          <option value="">Alle Kategorien</option>
          {Object.values(categories).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </select>
      </label>
    </section>

    {mode === "month" ? <section className="card panel calendar-month-card">
      <div className="calendar-toolbar">
        <button className="icon-button" aria-label="Vorheriger Monat" onClick={() => moveMonth(-1)}><ChevronLeft /></button>
        <h2>{monthFormatter.format(cursor)}</h2>
        <button className="icon-button" aria-label="Nächster Monat" onClick={() => moveMonth(1)}><ChevronRight /></button>
        <button className="button small ghost calendar-today" onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}>Heute</button>
      </div>
      <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {cells.map((cell) => {
          const dayEvents = eventMap.get(cell.date) || [];
          return <div key={cell.date} className={`calendar-day ${cell.currentMonth ? "" : "outside"} ${cell.date === isoToday() ? "today" : ""}`}>
            <span className="calendar-day-number">{cell.day}</span>
            <div className="calendar-day-events">
              {dayEvents.slice(0, 3).map((event) => {
                const Icon = eventIcon(event.sourceType);
                return <button key={event.id} className={`calendar-event source-${event.sourceType} ${event.completed ? "completed" : ""}`} title={`${typeLabel(event.sourceType)}: ${event.title}`} onClick={() => onOpenEvent(event)}>
                  <Icon /><span>{event.time ? `${event.time.slice(0, 5)} · ` : ""}{event.title}</span>
                </button>;
              })}
              {dayEvents.length > 3 && <span className="calendar-more">+{dayEvents.length - 3} weitere</span>}
            </div>
          </div>;
        })}
      </div>
    </section> : <section className="card panel agenda-card">
      <div className="panel-head"><div><span className="secondary">Ab heute</span><h2>Nächste Termine</h2></div><strong>{agenda.length}</strong></div>
      <div className="agenda-list">
        {agenda.length === 0 && <p className="secondary">Keine zukünftigen Termine für die gewählten Filter.</p>}
        {agenda.map((event) => {
          const Icon = eventIcon(event.sourceType);
          const category = event.categoryId ? categoryOf(event.categoryId) : undefined;
          return <button key={event.id} className={`agenda-item source-${event.sourceType} ${event.completed ? "completed" : ""}`} onClick={() => onOpenEvent(event)}>
            <span className="agenda-date"><strong>{dateFormatter.format(new Date(`${event.date}T12:00:00`))}</strong>{event.time && <small>{event.time.slice(0, 5)} Uhr</small>}</span>
            <span className="agenda-icon"><Icon /></span>
            <span className="agenda-copy"><strong>{event.title}</strong><small>{typeLabel(event.sourceType)}{category ? ` · ${category.label}` : ""}</small></span>
            <ChevronRight />
          </button>;
        })}
      </div>
    </section>}
  </div>;
}
