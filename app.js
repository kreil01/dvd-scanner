// DVD-Katalog v0.6 – app.js
// Änderungen ggü. v0.4.1: Supabase Auth Login-Gate (showApp/showLogin/initAuthGate/doLogin), Abmelden-Button
const $=id=>document.getElementById(id); let db=null,catalog=[],editing=null;

window.addEventListener("error", e=>{
  const tech=document.getElementById("tech");
  if(tech) tech.textContent="JavaScript-Fehler: "+(e.message||"unbekannt");
});

function maskKeyInfo(key){
  const k=String(key||"");
  if(!k) return "(leer)";
  const type = k.startsWith("sb_publishable_") ? "Publishable key"
             : k.startsWith("eyJ") ? "Legacy anon/JWT key"
             : k.startsWith("sb_secret_") ? "SECRET KEY – nicht für Browser verwenden!"
             : k.startsWith("service_role") ? "service_role – nicht für Browser verwenden!"
             : "Unbekannter Key-Typ";
  const preview = k.length > 14 ? `${k.slice(0,8)}…${k.slice(-6)}` : k;
  return `${type}\n${preview}\nLänge: ${k.length}`;
}

async function runSupabaseDiagnostic(){
  const u = String(window.SUPABASE_URL || "").trim();
  const k = String(window.SUPABASE_ANON_KEY || "").trim();

  $("diagSupabaseUrl").textContent = u || "(leer)";
  $("diagSupabaseKey").textContent = maskKeyInfo(k);
  $("diagSupabaseTest").textContent = "Initialisierung …";
  $("diagSupabaseResponse").textContent = "–";

  if(!u || !k){
    $("diagSupabaseTest").textContent = "Abbruch";
    $("diagSupabaseResponse").textContent = "SUPABASE_URL oder SUPABASE_ANON_KEY ist leer.";
    return;
  }

  let testClient;
  try{
    testClient = window.supabase.createClient(u, k);
  }catch(e){
    $("diagSupabaseTest").textContent = "createClient fehlgeschlagen";
    $("diagSupabaseResponse").textContent = String(e?.message || e);
    return;
  }

  $("diagSupabaseTest").textContent = 'SELECT id,title FROM public.titles LIMIT 1';

  try{
    const res = await testClient.from("titles").select("id,title").limit(1);

    const out = {
      data: res.data ?? null,
      error: res.error ? {
        code: res.error.code ?? null,
        message: res.error.message ?? null,
        details: res.error.details ?? null,
        hint: res.error.hint ?? null
      } : null,
      status: res.status ?? null,
      statusText: res.statusText ?? null
    };

    $("diagSupabaseResponse").textContent = JSON.stringify(out, null, 2);

    if(res.error){
      $("diagSupabaseTest").textContent = "SELECT fehlgeschlagen";
    }else{
      $("diagSupabaseTest").textContent = "SELECT erfolgreich";
    }
  }catch(e){
    $("diagSupabaseTest").textContent = "Request-Ausnahme";
    $("diagSupabaseResponse").textContent = String(e?.stack || e?.message || e);
  }
}

function init(){
 const u=String(window.SUPABASE_URL||""),k=String(window.SUPABASE_ANON_KEY||"");
 if(!u||!k||u.includes("HIER_")||k.includes("HIER_")){$("tech").textContent="Worker konfiguriert; Supabase v0.3 noch nicht eingerichtet.";return}
 db=window.supabase.createClient(u,k);$("tech").textContent="Worker und Supabase konfiguriert. Project URL: "+u;
}

function showApp(session){
 $("loginScreen").classList.add("hidden");
 $("appMain").classList.remove("hidden");
 $("userEmail").textContent=session?.user?.email||"";
}
function showLogin(){
 $("appMain").classList.add("hidden");
 $("loginScreen").classList.remove("hidden");
}
async function initAuthGate(){
 if(!db){
  $("loginInfo").textContent="Supabase ist noch nicht konfiguriert (config.js) – Anmeldung nicht möglich.";
  showLogin();
  return;
 }
 try{
  const {data:{session}}=await db.auth.getSession();
  if(session)showApp(session);else showLogin();
  db.auth.onAuthStateChange((_event,session)=>{
   if(session)showApp(session);else showLogin();
  });
 }catch(e){
  $("loginError").textContent="Fehler beim Prüfen der Anmeldung: "+(e?.message||e);
  $("loginError").classList.remove("hidden");
  showLogin();
 }
}
async function doLogin(){
 $("loginError").classList.add("hidden");
 const email=$("loginEmail").value.trim(),password=$("loginPassword").value;
 if(!db){$("loginError").textContent="Supabase ist nicht konfiguriert.";$("loginError").classList.remove("hidden");return}
 if(!email||!password){$("loginError").textContent="Bitte E-Mail und Passwort eingeben.";$("loginError").classList.remove("hidden");return}
 $("loginSubmit").disabled=true;$("loginSubmit").textContent="Anmelden …";
 const {error}=await db.auth.signInWithPassword({email,password});
 $("loginSubmit").disabled=false;$("loginSubmit").textContent="Anmelden";
 if(error){
  $("loginError").textContent=error.message||"Anmeldung fehlgeschlagen.";
  $("loginError").classList.remove("hidden");
 }else{
  $("loginPassword").value="";
 }
}
$("loginSubmit").onclick=doLogin;
$("loginPassword").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin()});
$("logout").onclick=async()=>{if(db)await db.auth.signOut();};

function status(t){$("status").textContent=t}
function formatDbError(stage,error){
 const obj={
  stage,
  code:error?.code||null,
  message:error?.message||String(error||""),
  details:error?.details||null,
  hint:error?.hint||null
 };
 return JSON.stringify(obj,null,2);
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 const n=b.dataset.tab;
 $("scanPanel").classList.toggle("hidden",n!=="scan");
 $("collectionPanel").classList.toggle("hidden",n!=="collection");
 $("reportingPanel").classList.toggle("hidden",n!=="reporting");
 if(n==="collection")loadCatalog().then(safeRender(renderSearch,"Sammlung"));
 if(n==="reporting")loadCatalog().then(safeRender(renderReports,"Reporting"));
});

function safeRender(fn,label){
 return function(){
  try{ fn(); }
  catch(e){
   console.error(`Fehler in ${label}:`,e);
   const tech=$("tech");
   if(tech) tech.textContent=`Fehler im Bereich "${label}": ${e?.message||e}`;
  }
 };
}

function decodeAttempt(src, config){
  return new Promise((resolve)=>{
    Quagga.decodeSingle({
      src,
      locate:true,
      numOfWorkers:0,
      inputStream:{ size: config.size },
      locator:{ patchSize:config.patchSize, halfSample:config.halfSample },
      decoder:{ readers:["ean_reader","ean_8_reader","upc_reader","upc_e_reader"] }
    }, result => resolve(result || null));
  });
}

async function decodeBarcode(src){
  const attempts = [
    {size:1600, patchSize:"medium", halfSample:false, label:"hohe Auflösung"},
    {size:1200, patchSize:"small", halfSample:false, label:"kleiner Barcode"},
    {size:800, patchSize:"medium", halfSample:true, label:"Standard"},
    {size:0, patchSize:"small", halfSample:false, label:"Originalauflösung"}
  ];

  for(let i=0;i<attempts.length;i++){
    const a=attempts[i];
    $("progress").textContent=`Foto wird ausgewertet – Versuch ${i+1} von ${attempts.length}: ${a.label}`;
    $("scanStatus").textContent="Barcode-Decoder aktiv …";
    await new Promise(r=>setTimeout(r,60));

    const result = await decodeAttempt(src,a);
    if(result && result.codeResult && result.codeResult.code){
      const code=String(result.codeResult.code).trim();
      if(/^\d{8,14}$/.test(code)){
        return {
          code,
          format: result.codeResult.format || "EAN/UPC"
        };
      }
    }
  }
  return null;
}

$("file").addEventListener("change", async event=>{
  const file=event.target.files?.[0];
  if(!file) return;

  $("error").classList.add("hidden");
  $("result").classList.add("hidden");
  status("Foto erhalten");
  $("scanStatus").textContent="Foto übernommen – Decoder wird gestartet.";
  $("progress").classList.remove("hidden");
  $("progress").textContent="Foto wird vorbereitet …";

  const objectUrl=URL.createObjectURL(file);

  if($("preview")){
    $("preview").src=objectUrl;
    $("previewWrap").classList.remove("hidden");
  }

  if(typeof Quagga==="undefined"){
    $("error").textContent="Der Barcode-Decoder konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite neu laden.";
    $("error").classList.remove("hidden");
    $("progress").classList.add("hidden");
    URL.revokeObjectURL(objectUrl);
    event.target.value="";
    return;
  }

  try{
    const decoded=await decodeBarcode(objectUrl);

    if(!decoded){
      throw new Error("Foto wurde verarbeitet, aber kein EAN-/UPC-Barcode erkannt. Bitte Barcode größer, gerade und ohne Spiegelung fotografieren.");
    }

    $("scanStatus").textContent=`Barcode erkannt: ${decoded.code} (${decoded.format})`;
    status("Barcode erkannt");
    $("progress").classList.add("hidden");

    await process(decoded.code);

  }catch(err){
    console.error(err);
    $("error").textContent="Fehler bei der Bildverarbeitung: "+(err?.message||String(err));
    $("error").classList.remove("hidden");
    $("scanStatus").textContent="Auswertung beendet – kein verwertbarer Barcode.";
    status("Nicht erkannt");
  }finally{
    $("progress").classList.add("hidden");
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    event.target.value="";
  }
});

async function process(ean){
 $("result").classList.remove("hidden");$("ean").textContent=ean;$("duplicate").classList.add("hidden");$("saveState").textContent="";$("saveError").classList.add("hidden");$("saveError").textContent="";$("lookupState").textContent="Prüfe …";
 if(db){const x=await findEdition(ean);if(x){showExisting(x);return}}
 $("lookupState").textContent="Produktsuche …";
 const d=await lookup(ean);
 if(!d.found){$("title").textContent="Kein Produkt gefunden";$("filmMeta").textContent=d.message||"";$("people").textContent="";$("editionMeta").textContent="";$("lookupState").textContent="Offen";return}
 showLookup(d);
 if(db){const saved=await saveAll(ean,d);$("saveState").textContent=saved?"✓ Film und Ausgabe gespeichert":"⚠ Speichern fehlgeschlagen – Details unten"}
 else $("saveState").textContent="⚠ Supabase noch nicht eingerichtet";
}

async function lookup(ean){
 const base=String(window.DVD_LOOKUP_WORKER_URL||"").replace(/\/+$/,"");
 const r=await fetch(`${base}/lookup?ean=${encodeURIComponent(ean)}`,{cache:"no-store"});
 const d=await r.json();if(!r.ok)throw new Error(d.message||d.error||`HTTP ${r.status}`);return d;
}
function showLookup(d){
 $("title").textContent=d.title||"(ohne Titel)";
 $("filmMeta").textContent=[d.release_year,d.genres?.join(", "),d.runtime_minutes?d.runtime_minutes+" Min.":null,d.fsk?`FSK ${d.fsk}`:null].filter(Boolean).join(" · ");
 $("people").textContent=[d.directors?.length?`Regie: ${d.directors.join(", ")}`:null,d.actors?.length?`Darsteller: ${d.actors.slice(0,8).join(", ")}`:null].filter(Boolean).join(" | ");
 $("editionMeta").textContent=[d.medium,d.publisher,d.source].filter(Boolean).join(" · ");
 if(d.poster_url){
   $("poster").src=d.poster_url;
   $("poster").classList.remove("hidden");
   $("poster").onerror=()=>{$("poster").classList.add("hidden")};
 }else $("poster").classList.add("hidden");
 if(d.metadata_status){
   const current=$("editionMeta").textContent;
   $("editionMeta").textContent=[current,d.metadata_status,d.poster_source?`Bild: ${d.poster_source}`:null].filter(Boolean).join(" · ");
 }
 $("lookupState").textContent="Gefunden";
}
function showExisting(x){
 $("title").textContent=x.title;$("filmMeta").textContent=[x.release_year,x.genres?.join(", "),x.medium].filter(Boolean).join(" · ");
 $("people").textContent=x.actors?.length?`Darsteller: ${x.actors.slice(0,8).join(", ")}`:"";
 $("editionMeta").textContent=locationText(x);$("duplicate").textContent="Diese EAN ist bereits in der Sammlung gespeichert.";$("duplicate").classList.remove("hidden");$("lookupState").textContent="Vorhanden";
}
async function findEdition(ean){const {data,error}=await db.from("catalog_view").select("*").eq("ean",ean).limit(1);if(error)return null;return data?.[0]||null}

async function saveAll(ean,d){
 let titleId=null;

 if(d.tmdb_id){
   const lookup = await db
     .from("titles")
     .select("id")
     .eq("tmdb_type",d.tmdb_type)
     .eq("tmdb_id",d.tmdb_id)
     .limit(1);

   if(lookup.error){
     $("saveError").textContent=formatDbError("titles-select",lookup.error);
     $("saveError").classList.remove("hidden");
     return false;
   }

   titleId=lookup.data?.[0]?.id||null;
 }

 if(!titleId){
   const row={
     tmdb_type:d.tmdb_type||null,
     tmdb_id:d.tmdb_id||null,
     title:d.title||"",
     original_title:d.original_title||null,
     release_year:d.release_year||null,
     genres:d.genres||[],
     directors:d.directors||[],
     actors:d.actors||[],
     runtime_minutes:d.runtime_minutes||null,
     fsk:d.fsk||null,
     production_countries:d.production_countries||[],
     poster_url:d.poster_url||null
   };

   const ins = await db.from("titles").insert(row).select("id").single();

   if(ins.error){
     $("saveError").textContent=formatDbError("titles-insert",ins.error);
     $("saveError").classList.remove("hidden");
     return false;
   }

   titleId=ins.data.id;
 }

 const pos=await getPosition();

 const ed={
   ean,
   title_id:titleId,
   medium:d.medium||null,
   edition_name:d.edition_name||null,
   publisher:d.publisher||null,
   languages:d.languages||[],
   area:$("area").value.trim()||null,
   shelf:$("shelf").value.trim()||null,
   compartment:$("compartment").value.trim()||null,
   position:pos,
   source:d.source||null
 };

 const insEdition = await db.from("editions").insert(ed);

 if(insEdition.error){
   $("saveError").textContent=formatDbError("editions-insert",insEdition.error);
   $("saveError").classList.remove("hidden");
   return false;
 }

 if(!$("position").value) $("position").placeholder=String((pos||0)+1);
 return true;
}
async function getPosition(){
 if($("position").value)return parseInt($("position").value,10);
 if(!db)return null;
 const area=$("area").value.trim(),shelf=$("shelf").value.trim(),compartment=$("compartment").value.trim();
 let q=db.from("editions").select("position");
 q=area?q.eq("area",area):q.is("area",null);
 q=shelf?q.eq("shelf",shelf):q.is("shelf",null);
 q=compartment?q.eq("compartment",compartment):q.is("compartment",null);
 const {data}=await q.order("position",{ascending:false}).limit(1);
 return (data?.[0]?.position||0)+1;
}
async function loadCatalog(){
 if(!db){catalog=[];return}
 const {data,error}=await db.from("catalog_view").select("*").order("title",{ascending:true});
 if(error){$("tech").textContent="Datenbankfehler: "+error.message;catalog=[];return}
 catalog=data||[];$("count").textContent=catalog.length;
}
function locationText(x){return [x.area,x.shelf,x.compartment,x.position?`Pos. ${x.position}`:null].filter(Boolean).join(" · ")}

$("search").oninput=safeRender(renderSearch,"Sammlung");$("refresh").onclick=()=>loadCatalog().then(safeRender(renderSearch,"Sammlung"));
function renderSearch(){
 const q=$("search").value.trim().toLowerCase();$("groups").innerHTML="";
 if(!q){
   $("searchSummary").textContent=`${catalog.length} Medien in der Sammlung`;
   const g=document.createElement("div");g.className="group";g.innerHTML=`<h3><span>Alle Medien</span><span>${catalog.length}</span></h3>`;
   catalog.forEach(x=>g.appendChild(movieCard(x,"Sammlung")));$("groups").appendChild(g);
   return;
 }
 const specs=[
  ["Titel",x=>[x.title,x.original_title]],
  ["Schauspieler",x=>x.actors||[]],
  ["Regisseur",x=>x.directors||[]],
  ["Genre",x=>x.genres||[]],
  ["Erscheinungsjahr",x=>[x.release_year]],
  ["Medium",x=>[x.medium]],
  ["FSK",x=>[x.fsk]],
  ["Standort",x=>[x.area,x.shelf,x.compartment,x.position]],
  ["EAN",x=>[x.ean]]
 ];
 let total=0;
 for(const [label,vals] of specs){
   const hits=catalog.filter(x=>vals(x).filter(v=>v!==null&&v!==undefined).some(v=>String(v).toLowerCase().includes(q)));
   if(!hits.length)continue;total+=hits.length;
   const g=document.createElement("div");g.className="group";g.innerHTML=`<h3><span>${label}</span><span>${hits.length}</span></h3>`;
   hits.forEach(x=>g.appendChild(movieCard(x,label)));$("groups").appendChild(g);
 }
 $("searchSummary").textContent=`${total} Treffer in den angezeigten Kategorien`;
}
function movieCard(x,reason){
 const d=document.createElement("div");d.className="movie";
 let cover;
 if(x.poster_url){
   cover=document.createElement("img");cover.className="movie-cover";cover.src=x.poster_url;cover.alt=`Cover ${x.title||"Film"}`;cover.loading="lazy";
   cover.onerror=()=>{const ph=document.createElement("div");ph.className="movie-cover-placeholder";ph.textContent="▶";cover.replaceWith(ph)};
 } else{cover=document.createElement("div");cover.className="movie-cover-placeholder";cover.textContent="▶"}
 const left=document.createElement("div");
 const h=document.createElement("h4");h.textContent=x.title||"(ohne Titel)";
 if(x.medium){const badge=document.createElement("span");badge.className="medium-badge";badge.textContent=x.medium;h.appendChild(badge)}
 const meta=document.createElement("div");meta.className="muted";
 meta.textContent=[x.release_year,x.genres?.join(", ")].filter(Boolean).join(" · ");
 const why=document.createElement("div");why.className="muted";why.textContent=reason==="Sammlung"?([x.directors?.[0]?`Regie: ${x.directors[0]}`:null,x.fsk?`FSK ${x.fsk}`:null].filter(Boolean).join(" · ")):`Treffer: ${reason}`;
 const actions=document.createElement("div");actions.className="movie-actions";
 const edit=document.createElement("button");edit.className="secondary smallbtn";edit.textContent="Bearbeiten";
 edit.onclick=()=>openEdit(x);actions.appendChild(edit);
 left.append(h,meta,why,actions);
 const loc=document.createElement("div");loc.className="loc";loc.textContent=locationText(x)||"–";
 d.append(cover,left,loc);return d;
}
function openEdit(x){
 editing=x;
 $("editTitle").value=x.title||"";
 $("editActors").value=(x.actors||[]).join(", ");
 $("editDirectors").value=(x.directors||[]).join(", ");
 $("editMedium").value=["DVD","Blu-ray","4K UHD","Sonstiges"].includes(x.medium)?x.medium:(x.medium?"Sonstiges":"");
 $("editArea").value=x.area||"";
 $("editShelf").value=x.shelf||"";
 $("editCompartment").value=x.compartment||"";
 $("editPosition").value=x.position||"";
 $("editError").classList.add("hidden");
 $("editOverlay").classList.remove("hidden");
}

function closeEdit(){
 editing=null;
 $("editOverlay").classList.add("hidden");
}

function csvToArray(text){
 return String(text||"").split(",").map(x=>x.trim()).filter(Boolean);
}

async function saveEdit(){
 if(!db||!editing)return;
 $("editError").classList.add("hidden");

 const titleUpdate={
  title:$("editTitle").value.trim()||editing.title,
  actors:csvToArray($("editActors").value),
  directors:csvToArray($("editDirectors").value)
 };

 const editionUpdate={
  medium:$("editMedium").value||null,
  area:$("editArea").value.trim()||null,
  shelf:$("editShelf").value.trim()||null,
  compartment:$("editCompartment").value.trim()||null,
  position:$("editPosition").value?parseInt($("editPosition").value,10):null
 };

 const t=await db.from("titles").update(titleUpdate).eq("id",editing.title_id);
 if(t.error){
  $("editError").textContent="Filmdaten: "+t.error.message;
  $("editError").classList.remove("hidden");return;
 }

 const e=await db.from("editions").update(editionUpdate).eq("id",editing.edition_id);
 if(e.error){
  $("editError").textContent="Ausgabe/Standort: "+e.error.message;
  $("editError").classList.remove("hidden");return;
 }

 closeEdit();
 await loadCatalog();
 renderSearch();
}

async function deleteEdition(){
 if(!db||!editing)return;
 const label=`${editing.title} (${editing.medium||"Ausgabe"})`;
 if(!confirm(`"${label}" wirklich aus der Sammlung löschen?`))return;

 const titleId=editing.title_id;
 const del=await db.from("editions").delete().eq("id",editing.edition_id);
 if(del.error){
  $("editError").textContent="Löschen fehlgeschlagen: "+del.error.message;
  $("editError").classList.remove("hidden");return;
 }

 // Wenn keine weitere physische Ausgabe dieses Titels existiert,
 // wird auch der verwaiste Titel-Datensatz entfernt.
 const rem=await db.from("editions").select("id").eq("title_id",titleId).limit(1);
 if(!rem.error && (!rem.data || rem.data.length===0)){
   await db.from("titles").delete().eq("id",titleId);
 }

 closeEdit();
 await loadCatalog();
 renderSearch();
}

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

$("refreshReport").onclick=()=>loadCatalog().then(safeRender(renderReports,"Reporting"));
function renderReports(){
 const editions=catalog.length, titleMap=new Map();catalog.forEach(x=>titleMap.set(x.title_id,x));const titles=[...titleMap.values()];
 const movies=titles.filter(x=>x.tmdb_type==="movie").length,series=titles.filter(x=>x.tmdb_type==="tv").length;
 const duplicateTitles=[...groupBy(catalog,x=>x.title_id).entries()].filter(([,v])=>v.length>1);
 const dvdBluray=duplicateTitles.filter(([,v])=>{
  const m=new Set(v.map(x=>(x.medium||"").toLowerCase()));
  return [...m].some(x=>x.includes("dvd")) && [...m].some(x=>x.includes("blu"));
}).length;
 $("kpis").innerHTML=[["Datenträger",editions],["Titel",titles.length],["Filme",movies],["Serien",series],["Mehrfach",duplicateTitles.length],["DVD + Blu-ray",dvdBluray]].map(([l,v])=>`<div class="kpi"><strong>${v}</strong><span>${l}</span></div>`).join("");
 renderBars("mediaReport",countBy(catalog,x=>normalizeMedium(x.medium)));
 const genreItems=[];titles.forEach(x=>(x.genres||[]).forEach(g=>genreItems.push({g})));renderBars("genreReport",countBy(genreItems,x=>x.g));
 $("duplicateReport").innerHTML=duplicateTitles.length?duplicateTitles.map(([,v])=>`<div class="dup"><strong>${esc(v[0].title)}</strong><div class="muted">${v.map(x=>esc(x.medium||"unbekannt")).join(" · ")}</div></div>`).join(""):"<p>Keine Mehrfachbestände.</p>";
 renderBars("locationReport",countBy(catalog,x=>[x.area,x.shelf,x.compartment].filter(Boolean).join(" / ")||"Ohne Standort"));
}
function normalizeMedium(m){m=(m||"Unbekannt").toLowerCase();if(m.includes("4k")||m.includes("uhd"))return"4K UHD";if(m.includes("blu"))return"Blu-ray";if(m.includes("dvd"))return"DVD";return m==="unbekannt"?"Unbekannt":m}
function groupBy(a,key){const m=new Map();a.forEach(x=>{const k=key(x);if(!m.has(k))m.set(k,[]);m.get(k).push(x)});return m}
function countBy(a,key){const m=new Map();a.forEach(x=>{const k=key(x)||"Unbekannt";m.set(k,(m.get(k)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1])}
function renderBars(id,items){
 const el=$(id);if(!items.length){el.innerHTML="<p>Keine Daten.</p>";return}const max=Math.max(...items.map(x=>x[1]));
 el.innerHTML=items.slice(0,20).map(([l,v])=>`<div class="barrow"><span>${esc(l)}</span><div class="bar"><span style="width:${Math.round(v/max*100)}%"></span></div><strong>${v}</strong></div>`).join("");
}
$("next").onclick=()=>{$("result").classList.add("hidden");status("Bereit")};

$("closeEdit").onclick=closeEdit;
$("saveEdit").onclick=saveEdit;
$("deleteEdition").onclick=deleteEdition;
$("editOverlay").addEventListener("click",e=>{if(e.target===$("editOverlay"))closeEdit()});

init();
initAuthGate();

$("testSupabase").onclick=runSupabaseDiagnostic;
