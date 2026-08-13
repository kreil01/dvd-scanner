// DVD-Katalog v0.6.11 – app.js
// Änderungen ggü. v0.4.1: Supabase Auth Login-Gate (showApp/showLogin/initAuthGate/doLogin), Abmelden-Button
const $=id=>document.getElementById(id); let db=null,catalog=[],editing=null,lastScannedEan=null,pendingLookup=null,manualTmdbData=null;

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

    lastScannedEan=decoded.code;
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
 pendingLookup=null;
 $("result").classList.remove("hidden");
 $("ean").textContent=ean;
 $("duplicate").classList.add("hidden");
 $("saveState").textContent="";
 $("saveError").classList.add("hidden");
 $("saveError").textContent="";
 $("lookupState").textContent="Prüfe …";
 $("matchReview").classList.add("hidden");
 $("refreshEanCache").classList.add("hidden");

 if(db){
  const x=await findEdition(ean);
  if(x){
   showExisting(x);
   $("refreshEanCache").classList.remove("hidden");
   return {found:true,existing:true,data:x};
  }
 }

 $("lookupState").textContent="Produktsuche …";
 const d=await lookup(ean);

 if(!d.found){
  $("title").textContent="Kein Produkt gefunden";
  $("filmMeta").textContent=d.message||"";
  $("people").textContent="";
  $("editionMeta").textContent="";
  $("lookupState").textContent="Offen";
  return {found:false,data:d};
 }

 showLookup(d);
 pendingLookup={ean,data:d,originalTitle:d.title||"",originalMedium:d.medium||""};
 showMatchReview(d);
 $("saveState").textContent="Noch nicht gespeichert – Zuordnung bitte prüfen.";
 $("lookupState").textContent="Prüfen";
 $("refreshEanCache").classList.remove("hidden");
 return {found:true,pending:true,data:d};
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
function matchConfidence(d){
 if(!d?.tmdb_id)return {level:"low",label:"Keine TMDb-Zuordnung"};
 const sim=Number(d.tmdb_title_similarity||0);
 const qPart=d.tmdb_query_part??null,cPart=d.tmdb_candidate_part??null;
 const partConflict=qPart!==null && cPart!==null && qPart!==cPart;
 const missingPart=qPart!==null && cPart===null;
 if(partConflict||missingPart||sim<0.55)return {level:"low",label:"Niedrige Konfidenz"};
 if(sim<0.72)return {level:"medium",label:"Mittlere Konfidenz"};
 return {level:"high",label:"Hohe Konfidenz"};
}

function showMatchReview(d){
 const conf=matchConfidence(d);
 $("matchReview").classList.remove("hidden");
 $("matchConfidence").textContent=conf.label;
 $("matchConfidence").className=`confidence-badge confidence-${conf.level}`;
 $("matchSimilarity").textContent=d.tmdb_id?`${Math.round(Number(d.tmdb_title_similarity||0)*100)} %`:"–";
 $("matchScore").textContent=d.tmdb_match_score??"–";
 const qp=d.tmdb_query_part??null,cp=d.tmdb_candidate_part??null;
 $("matchPart").textContent=qp!==null?`Quelle ${qp} / TMDb ${cp??"keine"}`:"keine";
 $("reviewTitle").value=d.title||"";
 $("reviewMedium").value=["DVD","Blu-ray","4K UHD","Sonstiges"].includes(d.medium)?d.medium:"";

 const warning=[];
 if(!d.tmdb_id)warning.push("Es wurde keine belastbare TMDb-Zuordnung gefunden.");
 if(qp!==null&&cp===null)warning.push(`Die Quelle deutet auf Teil/Episode ${qp}, der TMDb-Titel trägt jedoch keine erkennbare Teilnummer.`);
 if(qp!==null&&cp!==null&&qp!==cp)warning.push(`Teil-/Episodennummer widerspricht sich: Quelle ${qp}, TMDb ${cp}.`);
 if(Number(d.tmdb_title_similarity||0)<0.55&&d.tmdb_id)warning.push("Die Titelähnlichkeit ist niedrig.");
 $("matchWarning").textContent=warning.join(" ");
 $("matchWarning").classList.toggle("hidden",warning.length===0);

 $("reviewTitleHint").textContent="Wird der Titel geändert, speichert die App den Eintrag bewusst ohne TMDb-Verknüpfung und ohne automatisch übernommene TMDb-Zusatzdaten.";
}

function buildConfirmedLookup(){
 if(!pendingLookup)return null;
 const d={...pendingLookup.data};
 const reviewedTitle=$("reviewTitle").value.trim();
 const reviewedMedium=$("reviewMedium").value||null;
 const titleChanged=reviewedTitle && reviewedTitle!==pendingLookup.originalTitle;

 d.medium=reviewedMedium;
 if(titleChanged){
  d.title=reviewedTitle;
  d.tmdb_type=null;
  d.tmdb_id=null;
  d.original_title=null;
  d.release_year=null;
  d.genres=[];
  d.directors=[];
  d.actors=[];
  d.runtime_minutes=null;
  d.fsk=null;
  d.production_countries=[];
  if(d.poster_source==="TMDb")d.poster_url=d.product_image_url||null;
  d.metadata_enriched=false;
  d.metadata_status="Titel manuell korrigiert – keine TMDb-Zusatzdaten übernommen";
 }
 return d;
}

async function confirmLookupAndSave(){
 if(!pendingLookup||!db)return;
 $("confirmLookupSave").disabled=true;
 $("saveError").classList.add("hidden");
 try{
  const d=buildConfirmedLookup();
  const saved=await saveAll(pendingLookup.ean,d);
  if(saved){
   $("saveState").textContent="✓ Film und Ausgabe gespeichert";
   $("lookupState").textContent="Gespeichert";
   $("matchReview").classList.add("hidden");
   pendingLookup=null;
  }else{
   $("saveState").textContent="⚠ Speichern fehlgeschlagen – Details unten";
  }
 }finally{
  $("confirmLookupSave").disabled=false;
 }
}

function rejectLookupToManual(){
 if(!pendingLookup)return;
 $("manualFullBarcode").value=pendingLookup.ean;
 $("manualFullTitle").value=$("reviewTitle").value.trim()||pendingLookup.data.title||"";
 $("manualFullMedium").value=$("reviewMedium").value||pendingLookup.data.medium||"";
 $("manualFullActors").value=(pendingLookup.data.actors||[]).join(", ");
 $("manualFullGenres").value=(pendingLookup.data.genres||[]).join(", ");
 $("manualFullTitle").focus();
 $("manualFullTitle").scrollIntoView({behavior:"smooth",block:"center"});
}

$("confirmLookupSave").onclick=confirmLookupAndSave;
$("rejectLookup").onclick=rejectLookupToManual;

function showExisting(x){
 $("title").textContent=x.title;$("filmMeta").textContent=[x.release_year,x.genres?.join(", "),x.medium].filter(Boolean).join(" · ");
 $("people").textContent=x.actors?.length?`Darsteller: ${x.actors.slice(0,8).join(", ")}`:"";
 $("editionMeta").textContent=locationText(x);$("duplicate").textContent="Diese EAN ist bereits in der Sammlung gespeichert.";$("duplicate").classList.remove("hidden");$("lookupState").textContent="Vorhanden";
}
async function findEdition(ean){const {data,error}=await db.from("catalog_view").select("*").eq("ean",ean).limit(1);if(error)return null;return data?.[0]||null}

async function findOrCreateTitleId(d,{showErrors=true}={}){
 if(d.tmdb_id){
  const lookup=await db.from("titles").select("id")
   .eq("tmdb_type",d.tmdb_type).eq("tmdb_id",d.tmdb_id).limit(1);
  if(lookup.error){
   if(showErrors){$("saveError").textContent=formatDbError("titles-select",lookup.error);$("saveError").classList.remove("hidden");}
   throw lookup.error;
  }
  if(lookup.data?.[0]?.id){
   const existingId=lookup.data[0].id;
   try{await backfillTitleMissingFields(existingId,d)}catch(_){}
   return existingId;
  }
 }

 if(!d.tmdb_id && d.title){
  const byTitle=await db.from("titles").select("id").eq("title",d.title).limit(1);
  if(byTitle.error){
   if(showErrors){$("saveError").textContent=formatDbError("titles-title-select",byTitle.error);$("saveError").classList.remove("hidden");}
   throw byTitle.error;
  }
  if(byTitle.data?.[0]?.id){
   const existingId=byTitle.data[0].id;
   try{await backfillTitleMissingFields(existingId,d)}catch(_){}
   return existingId;
  }
 }

 const row={
  tmdb_type:d.tmdb_type||null,tmdb_id:d.tmdb_id||null,title:d.title||"",
  original_title:d.original_title||null,release_year:d.release_year||null,
  genres:d.genres||[],directors:d.directors||[],actors:d.actors||[],
  runtime_minutes:d.runtime_minutes||null,fsk:d.fsk||null,
  production_countries:d.production_countries||[],poster_url:d.poster_url||null
 };
 const ins=await db.from("titles").insert(row).select("id").single();
 if(ins.error){
  if(showErrors){$("saveError").textContent=formatDbError("titles-insert",ins.error);$("saveError").classList.remove("hidden");}
  throw ins.error;
 }
 return ins.data.id;
}

async function backfillTitleMissingFields(titleId,d){
 const q=await db.from("titles").select("*").eq("id",titleId).single();
 if(q.error)throw q.error;
 const current=q.data||{};
 const patch={};

 const emptyScalar=v=>v===null||v===undefined||String(v).trim()==="";
 const emptyArray=v=>!Array.isArray(v)||v.length===0;

 if(emptyScalar(current.original_title) && d.original_title)patch.original_title=d.original_title;
 if(emptyScalar(current.release_year) && d.release_year)patch.release_year=d.release_year;
 if(emptyArray(current.genres) && Array.isArray(d.genres) && d.genres.length)patch.genres=d.genres;
 if(emptyArray(current.directors) && Array.isArray(d.directors) && d.directors.length)patch.directors=d.directors;
 if(emptyArray(current.actors) && Array.isArray(d.actors) && d.actors.length)patch.actors=d.actors;
 if(emptyScalar(current.runtime_minutes) && d.runtime_minutes)patch.runtime_minutes=d.runtime_minutes;
 if(emptyScalar(current.fsk) && d.fsk)patch.fsk=d.fsk;
 if(emptyArray(current.production_countries) && Array.isArray(d.production_countries) && d.production_countries.length)patch.production_countries=d.production_countries;
 if(emptyScalar(current.poster_url) && d.poster_url)patch.poster_url=d.poster_url;

 // TMDb-Identität nur ergänzen, wenn bislang keine existiert.
 if(emptyScalar(current.tmdb_type) && d.tmdb_type)patch.tmdb_type=d.tmdb_type;
 if(emptyScalar(current.tmdb_id) && d.tmdb_id)patch.tmdb_id=d.tmdb_id;

 if(Object.keys(patch).length===0)return {updated:false,fields:[]};

 const upd=await db.from("titles").update(patch).eq("id",titleId);
 if(upd.error)throw upd.error;
 return {updated:true,fields:Object.keys(patch)};
}

async function saveAll(ean,d){
 try{
  const titleId=await findOrCreateTitleId(d);
  const pos=await getPosition();
  const ed={
   ean,title_id:titleId,medium:d.medium||null,edition_name:d.edition_name||null,
   publisher:d.publisher||null,languages:d.languages||[],
   area:$("area").value.trim()||null,shelf:$("shelf").value.trim()||null,
   compartment:$("compartment").value.trim()||null,position:pos,source:d.source||null
  };
  const insEdition=await db.from("editions").insert(ed);
  if(insEdition.error){
   $("saveError").textContent=formatDbError("editions-insert",insEdition.error);
   $("saveError").classList.remove("hidden");
   return false;
  }
  if(!$("position").value)$("position").placeholder=String((pos||0)+1);
  return true;
 }catch(_){
  return false;
 }
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
 let poster;
 if(x.poster_url){
   poster=document.createElement("img");poster.className="movie-poster";poster.src=x.poster_url;poster.alt=x.title||"Filmcover";poster.loading="lazy";
   poster.onerror=()=>{const ph=document.createElement("div");ph.className="movie-poster placeholder";ph.textContent="◉";poster.replaceWith(ph)};
 }else{poster=document.createElement("div");poster.className="movie-poster placeholder";poster.textContent="◉"}
 const left=document.createElement("div");
 const h=document.createElement("h4");h.textContent=x.title||"(ohne Titel)";
 const meta=document.createElement("div");meta.className="muted";
 meta.innerHTML=(x.medium?`<span class="media-badge">${esc(x.medium)}</span>`:"")+[x.release_year,x.genres?.join(", ")].filter(Boolean).map(esc).join(" · ");
 const people=document.createElement("div");people.className="muted";
 people.textContent=[x.directors?.length?`Regie: ${x.directors.slice(0,2).join(", ")}`:"",x.fsk?`FSK ${x.fsk}`:""].filter(Boolean).join(" · ");
 const why=document.createElement("div");why.className="muted";why.textContent=`Treffer: ${reason}`;
 const actions=document.createElement("div");actions.className="movie-actions";
 const edit=document.createElement("button");edit.className="secondary smallbtn";edit.textContent="Bearbeiten";edit.onclick=()=>openEdit(x);actions.appendChild(edit);
 left.append(h,meta,people,why,actions);
 const loc=document.createElement("div");loc.className="loc";loc.textContent=locationText(x)||"Kein Standort";
 d.append(poster,left,loc);return d;
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

// ---------- v0.6.7: EAN-13 manuell ----------
const manualDigits=[...document.querySelectorAll(".ean-digit")];
let manualCoverOriginalFile=null;
let manualCoverResizedBlob=null;

function isValidEan13(ean){
 if(!/^\d{13}$/.test(ean))return false;
 const digits=ean.split("").map(Number);
 let sum=0;
 for(let i=0;i<12;i++)sum+=digits[i]*(i%2===0?1:3);
 const check=(10-(sum%10))%10;
 return check===digits[12];
}

function getManualEan(){
 return manualDigits.map(x=>x.value).join("");
}

function updateManualBarcodeState(){
 const ean=getManualEan();
 $("manualBarcodeSubmit").disabled=ean.length!==13;
 if(ean.length===13){
  manualDigits.forEach(x=>x.classList.toggle("invalid-digit",!isValidEan13(ean)));
 }else{
  manualDigits.forEach(x=>x.classList.remove("invalid-digit"));
 }
}

manualDigits.forEach((input,index)=>{
 input.addEventListener("input",e=>{
  input.value=input.value.replace(/\D/g,"").slice(-1);
  if(input.value && index<manualDigits.length-1)manualDigits[index+1].focus();
  updateManualBarcodeState();
 });
 input.addEventListener("keydown",e=>{
  if(e.key==="Backspace"&&!input.value&&index>0){
   manualDigits[index-1].focus();
  }
 });
 input.addEventListener("paste",e=>{
  const digits=(e.clipboardData?.getData("text")||"").replace(/\D/g,"").slice(0,13);
  if(digits.length===13){
   e.preventDefault();
   manualDigits.forEach((x,i)=>x.value=digits[i]||"");
   updateManualBarcodeState();
   manualDigits[12].focus();
  }
 });
});

function clearManualBarcodeInputs(){
 manualDigits.forEach(x=>{
  x.value="";
  x.classList.remove("invalid-digit");
 });
 $("manualBarcodeSubmit").disabled=true;
 if(manualDigits[0])manualDigits[0].focus();
}

async function submitManualBarcode(){
 const ean=getManualEan();
 $("manualBarcodeError").classList.add("hidden");
 if(ean.length!==13||!isValidEan13(ean)){
  $("manualBarcodeError").textContent="Erfasster Barcode falsch oder wird nicht gefunden.";
  $("manualBarcodeError").classList.remove("hidden");
  return;
 }
 try{
  lastScannedEan=ean;
  status("Barcode wird gesucht");
  const result=await process(ean);
  if(!result?.found){
   $("manualBarcodeError").textContent="Erfasster Barcode falsch oder wird nicht gefunden.";
   $("manualBarcodeError").classList.remove("hidden");
  }else{
   clearManualBarcodeInputs();
   $("result").scrollIntoView({behavior:"smooth",block:"start"});
  }
 }catch(e){
  $("manualBarcodeError").textContent="Erfasster Barcode falsch oder wird nicht gefunden.";
  $("manualBarcodeError").classList.remove("hidden");
 }
}
$("manualBarcodeSubmit").onclick=submitManualBarcode;

// ---------- v0.6.7: komplette manuelle Erfassung ----------
function loadImageElement(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Bild konnte nicht gelesen werden."))};
  img.src=url;
 });
}

async function resizeCoverImage(file,maxWidth=900,maxHeight=1350,quality=0.82){
 const img=await loadImageElement(file);
 const scale=Math.min(1,maxWidth/img.naturalWidth,maxHeight/img.naturalHeight);
 const width=Math.max(1,Math.round(img.naturalWidth*scale));
 const height=Math.max(1,Math.round(img.naturalHeight*scale));

 const canvas=document.createElement("canvas");
 canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext("2d");
 ctx.drawImage(img,0,0,width,height);

 const blob=await new Promise((resolve,reject)=>{
  canvas.toBlob(b=>b?resolve(b):reject(new Error("Bild konnte nicht verkleinert werden.")),"image/jpeg",quality);
 });
 return {blob,width,height};
}

$("manualCoverFile").addEventListener("change",async e=>{
 const file=e.target.files?.[0];
 manualCoverOriginalFile=file||null;
 manualCoverResizedBlob=null;
 $("manualCoverPreview").classList.add("hidden");
 if(!file){
  $("manualPhotoInfo").textContent="Smartphone-Fotos werden vor dem Upload automatisch auf maximal 900 × 1350 px und als komprimiertes JPEG reduziert.";
  return;
 }
 try{
  $("manualPhotoInfo").textContent="Foto wird verkleinert …";
  const resized=await resizeCoverImage(file);
  manualCoverResizedBlob=resized.blob;
  const url=URL.createObjectURL(resized.blob);
  $("manualCoverPreview").src=url;
  $("manualCoverPreview").classList.remove("hidden");
  $("manualCoverPreview").onload=()=>URL.revokeObjectURL(url);
  $("manualPhotoInfo").textContent=`Foto vorbereitet: ${resized.width} × ${resized.height}px · ${Math.max(1,Math.round(resized.blob.size/1024))} KB JPEG`;
 }catch(err){
  manualCoverOriginalFile=null;
  manualCoverResizedBlob=null;
  manualTmdbData=null;
  clearManualTmdbResult();
  $("manualPhotoInfo").textContent="Foto konnte nicht verarbeitet werden: "+(err?.message||String(err));
 }
});

async function uploadManualCover(ean){
 if(!manualCoverResizedBlob)return null;
 if(!db)throw new Error("Supabase ist nicht verbunden.");
 const path=`manual/${Date.now()}-${ean||"ohne-barcode"}.jpg`;
 const upload=await db.storage.from("covers").upload(path,manualCoverResizedBlob,{
  contentType:"image/jpeg",
  upsert:false,
  cacheControl:"3600"
 });
 if(upload.error)throw new Error("Cover-Upload: "+upload.error.message);
 const pub=db.storage.from("covers").getPublicUrl(path);
 return pub.data?.publicUrl||null;
}

async function findTitleByExactName(title){
 if(!db)return null;
 const q=await db.from("titles").select("*").eq("title",title).limit(1);
 if(q.error)throw q.error;
 return q.data?.[0]||null;
}


function clearManualTmdbResult(){
 manualTmdbData=null;
 $("manualTmdbResult").classList.add("hidden");
 $("manualTmdbCandidates").innerHTML="";
 $("manualTmdbCount").textContent="–";
}

function escHtml(s){
 return String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}

async function lookupManualTitleInTmdb(){
 $("manualFullError").classList.add("hidden");
 clearManualTmdbResult();

 const title=$("manualFullTitle").value.trim();
 if(!title){
  $("manualFullError").textContent="Für die TMDb-Suche muss mindestens ein Titel eingegeben werden.";
  $("manualFullError").classList.remove("hidden");
  return;
 }

 const btn=$("manualTmdbLookup");
 btn.disabled=true; btn.textContent="TMDb wird durchsucht …";

 try{
  const base=String(window.DVD_LOOKUP_WORKER_URL||"").replace(/\/+$/,"");
  const r=await fetch(`${base}/tmdb-title?title=${encodeURIComponent(title)}`,{cache:"no-store"});
  const d=await r.json();
  if(!r.ok)throw new Error(d.message||d.error||`HTTP ${r.status}`);

  const candidates=d.candidates||[];
  if(!candidates.length){
   $("manualFullError").textContent="Keine TMDb-Kandidaten gefunden.";
   $("manualFullError").classList.remove("hidden");
   return;
  }

  $("manualTmdbCount").textContent=`${candidates.length} Treffer`;
  $("manualTmdbCandidates").innerHTML=candidates.map((c,i)=>{
   const pct=Math.round(Number(c.tmdb_title_similarity||0)*100);
   const poster=c.poster_url
    ?`<img src="${escHtml(c.poster_url)}" alt="">`
    :`<div class="cover-placeholder">🎬</div>`;
   return `<article class="tmdb-candidate">
    ${poster}
    <div>
     <h4>${escHtml(c.title||"–")}</h4>
     <p>${[c.release_year,c.original_title&&c.original_title!==c.title?c.original_title:""].filter(Boolean).map(escHtml).join(" · ")}</p>
     <p class="candidate-score">Titelähnlichkeit ${pct}% · Score ${escHtml(c.tmdb_match_score??"–")}</p>
     ${c.overview?`<p>${escHtml(c.overview.slice(0,220))}${c.overview.length>220?"…":""}</p>`:""}
    </div>
    <button class="primary tmdb-pick" type="button" data-type="${escHtml(c.tmdb_type)}" data-id="${escHtml(c.tmdb_id)}">Auswählen</button>
   </article>`;
  }).join("");

  $("manualTmdbCandidates").querySelectorAll(".tmdb-pick").forEach(b=>{
   b.onclick=()=>selectManualTmdbCandidate(b.dataset.type,b.dataset.id);
  });

  $("manualTmdbResult").classList.remove("hidden");
  $("manualTmdbResult").scrollIntoView({behavior:"smooth",block:"center"});
 }catch(err){
  $("manualFullError").textContent="TMDb-Suche fehlgeschlagen: "+(err?.message||String(err));
  $("manualFullError").classList.remove("hidden");
 }finally{
  btn.disabled=false; btn.textContent="In TMDb suchen";
 }
}

async function selectManualTmdbCandidate(type,id){
 $("manualFullError").classList.add("hidden");
 try{
  const base=String(window.DVD_LOOKUP_WORKER_URL||"").replace(/\/+$/,"");
  const r=await fetch(`${base}/tmdb-detail?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`,{cache:"no-store"});
  const d=await r.json();
  if(!r.ok||!d.found)throw new Error(d.message||d.error||`HTTP ${r.status}`);
  manualTmdbData=d;

  $("manualFullTitle").value=d.title||$("manualFullTitle").value;
  if(!$("manualFullActors").value.trim()&&d.actors?.length)$("manualFullActors").value=d.actors.join(", ");
  if(!$("manualFullGenres").value.trim()&&d.genres?.length)$("manualFullGenres").value=d.genres.join(", ");

  $("manualTmdbResult").classList.add("hidden");
  $("manualFullSuccess").textContent=`TMDb-Treffer „${d.title}“ ausgewählt. Metadaten werden beim Speichern übernommen.`;
  $("manualFullSuccess").classList.remove("hidden");
 }catch(err){
  $("manualFullError").textContent="TMDb-Details konnten nicht übernommen werden: "+(err?.message||String(err));
  $("manualFullError").classList.remove("hidden");
 }
}

$("manualTmdbLookup").onclick=lookupManualTitleInTmdb;
$("manualTmdbReject").onclick=clearManualTmdbResult;

async function saveManualFullEntry(){
 $("manualFullError").classList.add("hidden");
 $("manualFullSuccess").classList.add("hidden");

 const ean=$("manualFullBarcode").value.replace(/\D/g,"").trim();
 const title=$("manualFullTitle").value.trim();
 const medium=$("manualFullMedium").value;
 const actors=csvToArray($("manualFullActors").value);
 const genres=csvToArray($("manualFullGenres").value);

 const acceptedTmdb = manualTmdbData && (
  $("manualFullTitle").value.trim()===manualTmdbData.title ||
  $("manualFullTitle").value.trim()===manualTmdbData.query_title
 ) ? manualTmdbData : null;

 if(!title||!medium){
  $("manualFullError").textContent="Titel und Medium sind Pflichtfelder.";
  $("manualFullError").classList.remove("hidden");
  return;
 }
 if(ean && (ean.length!==13||!isValidEan13(ean))){
  $("manualFullError").textContent="Der eingegebene Barcode ist keine gültige EAN-13. Barcode leer lassen oder einen gültigen Barcode eingeben.";
  $("manualFullError").classList.remove("hidden");
  return;
 }
 if(!db){
  $("manualFullError").textContent="Supabase ist nicht verbunden – manuelles Speichern ist nicht möglich.";
  $("manualFullError").classList.remove("hidden");
  return;
 }

 $("manualFullSubmit").disabled=true;
 $("manualFullSubmit").textContent="Wird gespeichert …";

 try{
  if(ean){
   const duplicate=await findEdition(ean);
   if(duplicate)throw new Error("Dieser Barcode ist bereits in der Sammlung gespeichert.");
  }

  const coverUrl=await uploadManualCover(ean);
  let titleRow=await findTitleByExactName(title);
  let titleId;

  if(titleRow){
   titleId=titleRow.id;

   // Nur fehlende Felder ergänzen, vorhandene/manuelle Daten niemals überschreiben.
   const patch={};
   if((!titleRow.actors||titleRow.actors.length===0)){
    if(actors.length)patch.actors=actors;
    else if(acceptedTmdb?.actors?.length)patch.actors=acceptedTmdb.actors;
   }
   if((!titleRow.genres||titleRow.genres.length===0)){
    if(genres.length)patch.genres=genres;
    else if(acceptedTmdb?.genres?.length)patch.genres=acceptedTmdb.genres;
   }
   if(!titleRow.directors?.length && acceptedTmdb?.directors?.length)patch.directors=acceptedTmdb.directors;
   if(!titleRow.original_title && acceptedTmdb?.original_title)patch.original_title=acceptedTmdb.original_title;
   if(!titleRow.release_year && acceptedTmdb?.release_year)patch.release_year=acceptedTmdb.release_year;
   if(!titleRow.runtime_minutes && acceptedTmdb?.runtime_minutes)patch.runtime_minutes=acceptedTmdb.runtime_minutes;
   if(!titleRow.fsk && acceptedTmdb?.fsk)patch.fsk=acceptedTmdb.fsk;
   if((!titleRow.production_countries||titleRow.production_countries.length===0)&&acceptedTmdb?.production_countries?.length)patch.production_countries=acceptedTmdb.production_countries;
   if(!titleRow.tmdb_type && acceptedTmdb?.tmdb_type)patch.tmdb_type=acceptedTmdb.tmdb_type;
   if(!titleRow.tmdb_id && acceptedTmdb?.tmdb_id)patch.tmdb_id=acceptedTmdb.tmdb_id;
   if(!titleRow.poster_url){
    if(coverUrl)patch.poster_url=coverUrl;
    else if(acceptedTmdb?.poster_url)patch.poster_url=acceptedTmdb.poster_url;
   }

   if(Object.keys(patch).length){
    const upd=await db.from("titles").update(patch).eq("id",titleId);
    if(upd.error)throw upd.error;
   }
  }else{
   const titleInsert=await db.from("titles").insert({
    tmdb_type:acceptedTmdb?.tmdb_type||null,
    tmdb_id:acceptedTmdb?.tmdb_id||null,
    title,
    original_title:acceptedTmdb?.original_title||null,
    release_year:acceptedTmdb?.release_year||null,
    genres:genres.length?genres:(acceptedTmdb?.genres||[]),
    directors:acceptedTmdb?.directors||[],
    actors:actors.length?actors:(acceptedTmdb?.actors||[]),
    runtime_minutes:acceptedTmdb?.runtime_minutes||null,
    fsk:acceptedTmdb?.fsk||null,
    production_countries:acceptedTmdb?.production_countries||[],
    poster_url:coverUrl||acceptedTmdb?.poster_url||null
   }).select("id").single();

   if(titleInsert.error)throw titleInsert.error;
   titleId=titleInsert.data.id;
  }

  const pos=await getPosition();
  const editionInsert=await db.from("editions").insert({
   ean:ean||null,
   title_id:titleId,
   medium,
   edition_name:null,
   publisher:null,
   languages:[],
   area:$("area").value.trim()||null,
   shelf:$("shelf").value.trim()||null,
   compartment:$("compartment").value.trim()||null,
   position:pos,
   source:"Manuell"
  });
  if(editionInsert.error)throw editionInsert.error;

  $("manualFullSuccess").textContent=`✓ ${title} wurde als ${medium} gespeichert.`;
  $("manualFullSuccess").classList.remove("hidden");

  $("manualFullBarcode").value="";
  $("manualFullTitle").value="";
  $("manualFullMedium").value="";
  $("manualFullActors").value="";
  $("manualFullGenres").value="";
  $("manualCoverFile").value="";
  $("manualCoverPreview").classList.add("hidden");
  $("manualPhotoInfo").textContent="Smartphone-Fotos werden vor dem Upload automatisch auf maximal 900 × 1350 px und als komprimiertes JPEG reduziert.";
  manualCoverOriginalFile=null;
  manualCoverResizedBlob=null;
  manualTmdbData=null;
  clearManualTmdbResult();

  if(!$("position").value)$("position").placeholder=String((pos||0)+1);
 }catch(err){
  $("manualFullError").textContent=err?.message||String(err);
  $("manualFullError").classList.remove("hidden");
 }finally{
  $("manualFullSubmit").disabled=false;
  $("manualFullSubmit").textContent="Film manuell speichern";
 }
}
$("manualFullSubmit").onclick=saveManualFullEntry;


$("next").onclick=()=>{pendingLookup=null;$("result").classList.add("hidden");$("matchReview").classList.add("hidden");$("refreshEanCache").classList.add("hidden");status("Bereit")};

$("closeEdit").onclick=closeEdit;
$("saveEdit").onclick=saveEdit;
$("deleteEdition").onclick=deleteEdition;
$("editOverlay").addEventListener("click",e=>{if(e.target===$("editOverlay"))closeEdit()});



async function refreshCurrentEanCache(){
 if(!lastScannedEan){alert("Bitte zuerst die betroffene EAN scannen.");return}
 try{
  const base=String(window.DVD_LOOKUP_WORKER_URL||"").replace(/\/+$/,"");
  const r=await fetch(`${base}/lookup?ean=${encodeURIComponent(lastScannedEan)}&refresh=1`,{cache:"no-store"});
  const d=await r.json();
  if(!r.ok)throw new Error(d.message||d.error||`HTTP ${r.status}`);
  if(!d.found)throw new Error("Für diese EAN wurden keine Produktdaten gefunden.");

  let msg=`Neu ermittelt: ${d.title||"(ohne Titel)"}`;

  if(db){
   const edition=await findEdition(lastScannedEan);
   if(edition){
    let targetTitleId=edition.title_id;

    if(d.tmdb_id){
     // Falls derselbe TMDb-Film bereits existiert, auf diesen verknüpfen.
     const existingTmdb=await db.from("titles").select("id")
      .eq("tmdb_type",d.tmdb_type).eq("tmdb_id",d.tmdb_id).limit(1);
     if(existingTmdb.error)throw existingTmdb.error;

     if(existingTmdb.data?.[0]?.id){
      targetTitleId=existingTmdb.data[0].id;
     }else{
      // Keine neue Titelzeile erzeugen: den bereits mit der EAN
      // verknüpften Titel mit der bestätigten TMDb-Identität anreichern.
      targetTitleId=edition.title_id;
     }
    }

    if(targetTitleId!==edition.title_id){
     const upd=await db.from("editions").update({
      title_id:targetTitleId,
      medium:d.medium||edition.medium||null,
      source:d.source||edition.source||null
     }).eq("id",edition.edition_id);
     if(upd.error)throw upd.error;
     msg+="\n\nGespeicherte EAN-Zuordnung wurde korrigiert.";
    }else{
     msg+="\n\nDie bestehende Titelzeile wird weiterverwendet.";
    }

    const fill=await backfillTitleMissingFields(targetTitleId,d);
    if(fill.updated)msg+=`\nFehlende Metadaten ergänzt: ${fill.fields.join(", ")}.`;
    else msg+="\nEs waren keine leeren Metadatenfelder zu ergänzen.";
   }
  }

  alert(msg);
  await loadCatalog();
  await process(lastScannedEan);
 }catch(err){
  alert("Neuprüfung fehlgeschlagen: "+(err?.message||String(err)));
 }
}
$("refreshEanCache").onclick=refreshCurrentEanCache;

init();
initAuthGate();

$("testSupabase").onclick=runSupabaseDiagnostic;
