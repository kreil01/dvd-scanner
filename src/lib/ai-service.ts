import { supabase } from "./supabase";
import type { Priority, Project, Task } from "./types";

export interface AiTaskDraft {
  title: string;
  description: string;
  priority: Priority;
  dueDate: string;
  estimatedHours: number;
}

export interface AiProjectPlan {
  summary: string;
  tasks: AiTaskDraft[];
}

interface OpenAiErrorInfo {
  status?: number;
  category?: string;
  code?: string;
  message?: string;
}

interface AiErrorPayload {
  error?: string;
  detail?: string;
  openai?: OpenAiErrorInfo;
  model?: string;
}

function openAiCategoryLabel(category?: string) {
  switch (category) {
    case "authentication": return "Authentifizierung/API-Key";
    case "permission": return "Berechtigung";
    case "rate_limit_or_quota": return "Rate-Limit oder API-Guthaben/Quota";
    case "bad_request": return "Anfrageformat/Modell";
    case "not_found": return "Modell/Endpunkt nicht gefunden";
    case "openai_service": return "OpenAI-Dienst";
    case "network": return "Netzwerkverbindung";
    case "invalid_response": return "ungültige OpenAI-Antwort";
    case "empty_output": return "leere Modellausgabe";
    case "schema_mismatch": return "unerwartetes Ausgabeformat";
    case "json_parse": return "JSON-Verarbeitung";
    default: return category || "OpenAI";
  }
}

function formatOpenAiError(info?: OpenAiErrorInfo) {
  if (!info) return "";
  const parts: string[] = [];
  if (info.status) parts.push(`HTTP ${info.status}`);
  if (info.category) parts.push(openAiCategoryLabel(info.category));
  if (info.code) parts.push(`Code ${info.code}`);
  if (info.message) parts.push(info.message);
  return parts.length ? ` OpenAI: ${parts.join(" · ")}.` : "";
}

function localDateIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getAccessToken() {
  if (!supabase) throw new Error("Supabase ist nicht konfiguriert.");
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error("Keine gültige Anmeldung für die KI-Anfrage gefunden.");
  return session.access_token;
}

async function parsePayload(response: Response) {
  return await response.json().catch(() => ({})) as AiErrorPayload & Record<string, unknown>;
}

function throwApiError(response: Response, payload: AiErrorPayload) {
  const base = payload.error || `KI-Anfrage fehlgeschlagen (${response.status}).`;
  throw new Error(
    base +
    (payload.model ? ` Modell: ${payload.model}.` : "") +
    formatOpenAiError(payload.openai) +
    (payload.detail ? ` Detail: ${payload.detail}.` : "")
  );
}

export async function testOpenAiConnection(): Promise<string> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/ai/openai-test", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const payload = await parsePayload(response) as AiErrorPayload & { ok?: boolean; model?: string; message?: string };
  if (!response.ok) throwApiError(response, payload);
  return `${payload.message || "OpenAI-Verbindung erfolgreich."}${payload.model ? ` Modell: ${payload.model}.` : ""}`;
}

export async function generateAiProjectPlan(project: Project, existing: Task[], guidance: string): Promise<AiProjectPlan> {
  const accessToken = await getAccessToken();

  const response = await fetch("/api/ai/project-plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      today: localDateIso(),
      project: {
        title: project.title,
        description: project.description ?? "",
        goal: project.goal ?? "",
        category: project.category,
        priority: project.priority,
        endDate: project.endDate ?? "",
      },
      existingTasks: existing.map((task) => ({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ?? "",
      })),
      guidance: guidance.trim(),
    }),
  });

  const payload = await parsePayload(response) as AiErrorPayload & { summary?: string; tasks?: AiTaskDraft[] };
  if (!response.ok) throwApiError(response, payload);
  if (!payload.summary || !Array.isArray(payload.tasks)) throw new Error("Die KI-Antwort hatte ein unerwartetes Format.");

  return { summary: payload.summary, tasks: payload.tasks };
}
