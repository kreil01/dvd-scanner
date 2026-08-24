import type { BlockedPeriod, HomeState, Task } from "./types";

export interface DayLoad { date: string; tasks: Task[]; hours: number; overloadedCount: boolean; overloadedHours: boolean; blocked: boolean; }
export interface RescheduleChange { taskId: string; title: string; projectId: string; from: string; to: string; }
export interface ReschedulePlan { changes: RescheduleChange[]; oldProjectEnd?: string; newProjectEnd?: string; }

export function isBlocked(date: string, periods: BlockedPeriod[]) { return periods.some(p => date >= p.startDate && date <= p.endDate); }
export function activeTasksOn(state: HomeState, date: string, excludeId?: string) { return state.tasks.filter(t => t.status !== "done" && t.dueDate === date && t.id !== excludeId); }
export function hoursOf(tasks: Task[]) { return tasks.reduce((sum,t) => sum + Math.max(0, Number(t.estimatedHours || 0)), 0); }
export function dayLoad(state: HomeState, date: string, excludeId?: string): DayLoad {
  const tasks = activeTasksOn(state,date,excludeId), hours = hoursOf(tasks);
  return { date, tasks, hours, overloadedCount: tasks.length > state.planningSettings.maxTasksPerDay, overloadedHours: hours > state.planningSettings.maxHoursPerDay, blocked: isBlocked(date,state.blockedPeriods) };
}
export function overloadedDays(state: HomeState) {
  const dates = [...new Set(state.tasks.filter(t=>t.status!=="done" && t.dueDate).map(t=>t.dueDate!))].sort();
  return dates.map(d=>dayLoad(state,d)).filter(x=>x.overloadedCount || x.overloadedHours || x.blocked);
}
function addDays(iso:string,n:number){ const d=new Date(`${iso}T12:00:00`); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
export function validateTaskDate(state: HomeState, task: Task) {
  if (!task.dueDate || task.status === "done") return undefined;
  if (isBlocked(task.dueDate,state.blockedPeriods)) return "Dieser Tag liegt in einer aufgabenfreien Zeit.";
  const existing=activeTasksOn(state,task.dueDate,task.id);
  if (existing.length >= state.planningSettings.maxTasksPerDay) return `Für diesen Tag sind bereits ${state.planningSettings.maxTasksPerDay} Aufgaben geplant.`;
  const hours=hoursOf(existing)+Math.max(0,Number(task.estimatedHours||0));
  if (task.estimatedHours && hours > state.planningSettings.maxHoursPerDay) return `Die Tageskapazität von ${state.planningSettings.maxHoursPerDay} Stunden würde überschritten (${hours.toFixed(1)} h).`;
  return undefined;
}
export function nextAvailableDate(state: HomeState, start: string, task: Task, occupied: Task[] = state.tasks) {
  for(let i=0;i<366;i++){
    const date=addDays(start,i); if(isBlocked(date,state.blockedPeriods)) continue;
    const same=occupied.filter(t=>t.status!=="done"&&t.dueDate===date&&t.id!==task.id);
    if(same.length>=state.planningSettings.maxTasksPerDay) continue;
    if(hoursOf(same)+Number(task.estimatedHours||0)>state.planningSettings.maxHoursPerDay) continue;
    return date;
  }
  return start;
}
export function simulatePriorityReschedule(state: HomeState, priorityProjectId: string): ReschedulePlan {
  const project=state.projects.find(p=>p.id===priorityProjectId); if(!project) return {changes:[]};
  const rank={high:3,normal:2,low:1};
  const priorityTasks=state.tasks.filter(t=>t.projectId===priorityProjectId&&t.status!=="done"&&t.dueDate).sort((a,b)=>a.dueDate!.localeCompare(b.dueDate!));
  if(!priorityTasks.length) return {changes:[]};
  const start=priorityTasks[0].dueDate!, end=priorityTasks.at(-1)!.dueDate!;
  const candidates=state.tasks.filter(t=>t.projectId!==priorityProjectId&&t.status!=="done"&&t.dueDate&&t.dueDate>=start&&t.dueDate<=end)
    .filter(t=>rank[state.projects.find(p=>p.id===t.projectId)?.priority||"normal"] < rank[project.priority]);
  const occupied=state.tasks.filter(t=>!candidates.some(c=>c.id===t.id));
  const changes:RescheduleChange[]=[];
  let cursor=addDays(end,1);
  for(const task of candidates.sort((a,b)=>a.dueDate!.localeCompare(b.dueDate!))){
    const to=nextAvailableDate({...state,tasks:occupied},cursor,task,occupied); occupied.push({...task,dueDate:to}); cursor=to;
    changes.push({taskId:task.id,title:task.title,projectId:task.projectId,from:task.dueDate!,to});
  }
  const affectedProject=changes[0] ? state.projects.find(p=>p.id===changes[0].projectId) : undefined;
  const affectedDates=changes.filter(c=>c.projectId===affectedProject?.id).map(c=>c.to).sort();
  return {changes,oldProjectEnd:affectedProject?.endDate,newProjectEnd:affectedDates.at(-1)};
}
