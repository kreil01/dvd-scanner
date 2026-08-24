const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const WORKER_VERSION = "0.3.2";

function hasTextBinding(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function openAiKey(env) {
  return typeof env.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "";
}


function bindingStatus(env) {
  return {
    supabaseUrl: hasTextBinding(env.SUPABASE_URL),
    supabaseAnonKey: hasTextBinding(env.SUPABASE_ANON_KEY),
    openAiApiKey: Boolean(openAiKey(env)),
    assetsBinding: Boolean(env.ASSETS),
  };
}

function diagnostics(env) {
  return { workerVersion: WORKER_VERSION, bindings: bindingStatus(env) };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function redact(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/sk-(?:proj-)?[A-Za-z0-9_\-]{8,}/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [REDACTED]")
    .slice(0, 700);
}

function classifyOpenAiStatus(status) {
  if (status === 400) return "bad_request";
  if (status === 401) return "authentication";
  if (status === 403) return "permission";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limit_or_quota";
  if (status >= 500) return "openai_service";
  return "openai_error";
}

async function readOpenAiPayload(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const contentLength = text.length;
  if (!text) return { rawText: "", data: null, contentType, contentLength };
  try {
    return { rawText: text, data: JSON.parse(text), contentType, contentLength };
  } catch {
    return { rawText: text, data: null, contentType, contentLength };
  }
}

function openAiErrorResponse(response, payload) {
  const error = payload?.data?.error;
  const requestId = response.headers.get("x-request-id") || response.headers.get("request-id") || "";
  const rawErrorText = payload?.rawText || "";
  const nestedMessage = error?.message || payload?.data?.message || payload?.data?.detail || "";
  const message = redact(nestedMessage || rawErrorText || `OpenAI HTTP ${response.status}`);
  const type = redact(error?.type || payload?.data?.type || "");
  const code = redact(typeof error?.code === "string" ? error.code : (typeof payload?.data?.code === "string" ? payload.data.code : ""));
  const category = classifyOpenAiStatus(response.status);

  console.error("OpenAI API error", {
    status: response.status,
    category,
    type: type || undefined,
    code: code || undefined,
    requestId: requestId || undefined,
  });

  return json({
    error: `OpenAI-Anfrage fehlgeschlagen (HTTP ${response.status}).`,
    openai: {
      status: response.status,
      category,
      type: type || undefined,
      code: code || undefined,
      message: message || undefined,
      requestId: requestId || undefined,
      raw: redact(payload?.rawText || ""),
      contentType: payload?.contentType || undefined,
      contentLength: payload?.contentLength ?? undefined,
    },
    diagnostics: {
      workerVersion: WORKER_VERSION,
    },
  }, 502);
}

async function authenticate(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return false;
  if (!hasTextBinding(env.SUPABASE_URL) || !hasTextBinding(env.SUPABASE_ANON_KEY)) throw new Error("SERVER_SUPABASE_CONFIG");

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: env.SUPABASE_ANON_KEY },
  });
  return response.ok;
}

async function requireAuthenticated(request, env) {
  try {
    const authenticated = await authenticate(request, env);
    if (!authenticated) return json({ error: "Anmeldung ungültig oder abgelaufen." }, 401);
  } catch (error) {
    if (error instanceof Error && error.message === "SERVER_SUPABASE_CONFIG") {
      return json({ error: "KI-Server ist noch nicht vollständig konfiguriert (Supabase Runtime-Variablen fehlen).", diagnostics: diagnostics(env) }, 503);
    }
    throw error;
  }
  if (!openAiKey(env)) {
    return json({ error: "OPENAI_API_KEY ist für die aktuell laufende Worker-Version nicht verfügbar.", diagnostics: diagnostics(env) }, 503);
  }
  return null;
}

function extractOutputText(response) {
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
      if (content.type === "refusal") throw new Error("OPENAI_REFUSAL");
    }
  }
  return "";
}

async function testOpenAi(request, env) {
  const authError = await requireAuthenticated(request, env);
  if (authError) return authError;

  const model = env.OPENAI_MODEL || "gpt-5-mini";
  const key = openAiKey(env);

  let authResponse;
  try {
    authResponse = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch (error) {
    return json({
      error: "Netzwerkfehler beim OpenAI-Authentifizierungstest.",
      openai: { category: "network", message: redact(error instanceof Error ? error.message : String(error)) },
      diagnostics: { workerVersion: WORKER_VERSION },
    }, 502);
  }

  const authPayload = await readOpenAiPayload(authResponse);
  if (!authResponse.ok) {
    const err = await openAiErrorResponse(authResponse, authPayload);
    const data = await err.json();
    return json({
      ...data,
      model,
      diagnostics: { workerVersion: WORKER_VERSION, stage: "models_auth" },
    }, err.status);
  }

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: "Antworte nur mit OK.",
      }),
    });
  } catch (error) {
    return json({
      error: "Netzwerkfehler beim OpenAI-Responses-Test.",
      openai: { category: "network", message: redact(error instanceof Error ? error.message : String(error)) },
      diagnostics: { workerVersion: WORKER_VERSION, stage: "responses" },
      model,
    }, 502);
  }

  const payload = await readOpenAiPayload(response);
  if (!response.ok) {
    const err = await openAiErrorResponse(response, payload);
    const data = await err.json();
    return json({
      ...data,
      model,
      diagnostics: { workerVersion: WORKER_VERSION, stage: "responses" },
    }, err.status);
  }

  return json({
    ok: true,
    workerVersion: WORKER_VERSION,
    model: payload.data?.model || model,
    message: "OpenAI-Verbindung erfolgreich.",
    diagnostics: {
      workerVersion: WORKER_VERSION,
      
      stage: "responses",
      modelsAuth: true,
      responsesApi: true,
    },
  });
}
async function planProject(request, env) {
  const authError = await requireAuthenticated(request, env);
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültige Anfrage." }, 400);
  }

  const project = body?.project;
  if (!project?.title || typeof project.title !== "string") return json({ error: "Vorhaben-Titel fehlt." }, 400);
  const existingTasks = Array.isArray(body.existingTasks) ? body.existingTasks.slice(0, 100) : [];
  const today = typeof body.today === "string" ? body.today : new Date().toISOString().slice(0, 10);
  const guidance = typeof body.guidance === "string" ? body.guidance.slice(0, 3000) : "";

  let aiResponse;
  try {
    aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey(env)}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5-mini",
        instructions: [
          "Du bist der Projektplanungs-Assistent der privaten Heimwerk-App.",
          "Antworte ausschließlich mit gültigem JSON und ohne Markdown.",
          'Das JSON muss genau diese Struktur haben: {"summary":"...","tasks":[{"title":"...","description":"...","priority":"low|normal|high","dueDate":"YYYY-MM-DD oder leer","estimatedHours":2.5}]}.',
          "Erzeuge in der Regel 4 bis 10 konkrete, realistische Aufgaben in sinnvoller Reihenfolge.",
          "Schätze für jede Aufgabe den realistischen Arbeitsaufwand in Stunden als estimatedHours (z. B. 0.5, 2, 6).",
          "Vorhandene Aufgaben dürfen nicht erneut vorgeschlagen werden.",
          "Wenn ein Endtermin vorhanden ist, verteile sinnvolle Fälligkeiten ab heute bis spätestens zum Endtermin.",
          "Wenn kein konkretes Datum sinnvoll ableitbar ist, setze dueDate auf einen leeren String.",
          "Erfinde keine Preise, Verfügbarkeiten oder gesetzlichen Vorgaben.",
        ].join("\n"),
        input: JSON.stringify({ today, project, existingTasks, guidance }),
      }),
    });
  } catch (error) {
    console.error("OpenAI network error", error instanceof Error ? error.message : String(error));
    return json({
      error: "Netzwerkfehler beim Aufruf der OpenAI API.",
      openai: { category: "network", message: redact(error instanceof Error ? error.message : String(error)) },
      diagnostics: { workerVersion: WORKER_VERSION },
    }, 502);
  }

  const payload = await readOpenAiPayload(aiResponse);
  if (!aiResponse.ok) {
    const err = await openAiErrorResponse(aiResponse, payload);
    const data = await err.json();
    return json({ ...data, model: env.OPENAI_MODEL || "gpt-5-mini" }, err.status);
  }
  if (!payload.data) return json({ error: "OpenAI hat keine gültige JSON-Antwort geliefert.", openai: { status: aiResponse.status, category: "invalid_response" }, diagnostics: { workerVersion: WORKER_VERSION } }, 502);

  let text;
  try {
    text = extractOutputText(payload.data);
  } catch (error) {
    if (error instanceof Error && error.message === "OPENAI_REFUSAL") return json({ error: "Die KI konnte für diese Eingabe keinen Planungsvorschlag erstellen." }, 422);
    throw error;
  }
  if (!text) return json({ error: "Die KI hat keine verwertbare Antwort geliefert.", openai: { status: aiResponse.status, category: "empty_output" }, diagnostics: { workerVersion: WORKER_VERSION } }, 502);

  try {
    const plan = JSON.parse(text);
    if (!plan || typeof plan.summary !== "string" || !Array.isArray(plan.tasks)) {
      return json({ error: "Die strukturierte KI-Antwort hatte ein unerwartetes Format.", openai: { status: aiResponse.status, category: "schema_mismatch" }, diagnostics: { workerVersion: WORKER_VERSION } }, 502);
    }
    return json(plan);
  } catch {
    return json({ error: "Die strukturierte KI-Antwort konnte nicht gelesen werden.", openai: { status: aiResponse.status, category: "json_parse" }, diagnostics: { workerVersion: WORKER_VERSION } }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/ai/diagnostics") {
      if (request.method !== "GET") return json({ error: "Methode nicht erlaubt." }, 405);
      return json(diagnostics(env));
    }
    if (url.pathname === "/api/ai/openai-test") {
      if (request.method !== "GET") return json({ error: "Methode nicht erlaubt." }, 405);
      try {
        return await testOpenAi(request, env);
      } catch (error) {
        console.error("Heimwerk OpenAI test error", error);
        return json({ error: "Interner Fehler beim OpenAI-Verbindungstest.", diagnostics: { workerVersion: WORKER_VERSION } }, 500);
      }
    }
    if (url.pathname === "/api/ai/project-plan") {
      if (request.method !== "POST") return json({ error: "Methode nicht erlaubt." }, 405);
      try {
        return await planProject(request, env);
      } catch (error) {
        console.error("Heimwerk AI worker error", error);
        return json({ error: "Interner Fehler der KI-Integration.", detail: redact(error instanceof Error ? error.message : String(error)), diagnostics: { workerVersion: WORKER_VERSION } }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
