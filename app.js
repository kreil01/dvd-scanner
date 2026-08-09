const $=id=>document.getElementById(id); let db=null,catalog=[];

function init(){
 const u=String(window.SUPABASE_URL||""),k=String(window.SUPABASE_ANON_KEY||"");
 if(!u||!k||u.includes("HIER_")||k.includes("HIER_")){$("tech").textContent="Worker konfiguriert; Supabase v0.3 noch nicht eingerichtet.";return}
 db=window.supabase.createClient(u,k);$("tech").textContent="Worker und Supabase v0.3 konfiguriert.";
}
function status(t){$("status").textContent=t}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 const n=b.dataset.tab;
 $("scanPanel").classList.toggle("hidden",n!=="scan");
 $("collectionPanel").classList.toggle("hidden",n!=="collection");
 $("reportingPanel").classList.toggle("hidden",n!=="reporting");
 if(n==="collection")loadCatalog().then(renderSearch);
 if(n==="reporting")loadCatalog().then(renderReports);
});

function decode(src){return new Promise(resolve=>Quagga.decodeSingle({src,locate:true,numOfWorkers:0,inputStream:{size:1500},locator:{patchSize:"medium",halfSample:false},decoder:{readers:["ean_reader","ean_8_reader","upc_reader","upc_e_reader"]}},r=>resolve(r?.codeResult?.code||null)))}
$("file").onchange=async e=>{
 const f=e.target.files?.[0]; if(!f)return; $("error").classList.add("hidden");$("progress").classList.remove("hidden");$("result").classList.add("hidden");
 const u=URL.createObjectURL(f);
 try{const code=await decode(u);if(!code)throw new Error("Kein Barcode erkannt.");await process(code)}
 catch(err){$("error").textContent=err.message||String(err);$("error").classList.remove("hidden")}
 finally{$("progress").classList.add("hidden");URL.revokeObjectURL(u);e.target.value=""}
};

async function process(ean){
 $("result").classList.remove("hidden");$("ean").textContent=ean;$("duplicate").classList.add("hidden");$("saveState").textContent="";$("lookupState").textContent="Prüfe …";
 if(db){const x=await findEdition(ean);if(x){showExisting(x);return}}
 $("lookupState").textContent="Produktsuche …";
 const d=await lookup(ean);
 if(!d.found){$("title").textContent="Kein Produkt gefunden";$("filmMeta").textContent=d.message||"";$("people").textContent="";$("editionMeta").textContent="";$("lookupState").textContent="Offen";return}
 showLookup(d);
 if(db){const saved=await saveAll(ean,d);$("saveState").textContent=saved?"✓ Film und Ausgabe gespeichert":"⚠ Speichern fehlgeschlagen"}
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
 if(d.poster_url){$("poster").src=d.poster_url;$("poster").classList.remove("hidden")}else $("poster").classList.add("hidden");
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
   const {data}=await db.from("titles").select("id").eq("tmdb_type",d.tmdb_type).eq("tmdb_id",d.tmdb_id).limit(1);
   titleId=data?.[0]?.id||null;
 }
 if(!titleId){
   const row={tmdb_type:d.tmdb_type||null,tmdb_id:d.tmdb_id||null,title:d.title||"",original_title:d.original_title||null,release_year:d.release_year||null,genres:d.genres||[],directors:d.directors||[],actors:d.actors||[],runtime_minutes:d.runtime_minutes||null,fsk:d.fsk||null,production_countries:d.production_countries||[],poster_url:d.poster_url||null};
   const {data,error}=await db.from("titles").insert(row).select("id").single();if(error){console.warn(error);return false}titleId=data.id;
 }
 const pos=await getPosition();
 const ed={ean,title_id:titleId,medium:d.medium||null,edition_name:d.edition_name||null,publisher:d.publisher||null,languages:d.languages||[],area:$("area").value.trim()||null,shelf:$("shelf").value.trim()||null,compartment:$("compartment").value.trim()||null,position:pos,source:d.source||null};
 const {error}=await db.from("editions").insert(ed);if(error){console.warn(error);return false}
 if(!$("position").value) $("position").placeholder=String((pos||0)+1);
 return true;
}
async function getPosition(){
 if($("position").value)return parseInt($("position").value,10);
 if(!db)return null;
 let q=db.from("editions").select("position").eq("area",$("area").value.trim()).eq("shelf",$("shelf").value.trim()).eq("compartment",$("compartment").value.trim()).order("position",{ascending:false}).limit(1);
 const {data}=await q;return (data?.[0]?.position||0)+1;
}
async function loadCatalog(){
 if(!db){catalog=[];return}
 const {data,error}=await db.from("catalog_view").select("*").order("title",{ascending:true});
 if(error){$("tech").textContent="Datenbankfehler: "+error.message;catalog=[];return}
 catalog=data||[];$("count").textContent=catalog.length;
}
function locationText(x){return [x.area,x.shelf,x.compartment,x.position?`Pos. ${x.position}`:null].filter(Boolean).join(" · ")}

$("search").oninput=renderSearch;$("refresh").onclick=()=>loadCatalog().then(renderSearch);
function renderSearch(){
 const q=$("search").value.trim().toLowerCase();$("groups").innerHTML="";
 if(!q){$("searchSummary").textContent="Suchbegriff eingeben.";return}
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
 d.innerHTML=`<div><h4>${esc(x.title)}</h4><div class="muted">${[x.release_year,x.genres?.join(", "),x.medium].filter(Boolean).map(esc).join(" · ")}</div><div class="muted">Treffer: ${esc(reason)}</div></div><div class="loc">${esc(locationText(x)||"–")}</div>`;return d;
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

$("refreshReport").onclick=()=>loadCatalog().then(renderReports);
function renderReports(){
 const editions=catalog.length, titleMap=new Map();catalog.forEach(x=>titleMap.set(x.title_id,x));const titles=[...titleMap.values()];
 const movies=titles.filter(x=>x.tmdb_type==="movie").length,series=titles.filter(x=>x.tmdb_type==="tv").length;
 const duplicateTitles=[...groupBy(catalog,x=>x.title_id).entries()].filter(([,v])=>v.length>1);
 const dvdBluray=duplicateTitles.filter(([,v])=>{const m=new Set(v.map(x=>(x.medium||"").toLowerCase());return [...m].some(x=>x.includes("dvd"))&&[...m].some(x=>x.includes("blu"))}).length;
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
init();
