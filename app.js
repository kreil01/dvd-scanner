const fileInput = document.getElementById("fileInput");
const previewWrap = document.getElementById("previewWrap");
const preview = document.getElementById("preview");
const progressBox = document.getElementById("progressBox");
const progressTitle = document.getElementById("progressTitle");
const progressDetail = document.getElementById("progressDetail");
const errorBox = document.getElementById("errorBox");
const statusPill = document.getElementById("statusPill");

const resultCard = document.getElementById("resultCard");
const barcodeEl = document.getElementById("barcode");
const formatEl = document.getElementById("format");
const lookupState = document.getElementById("lookupState");
const titleEl = document.getElementById("title");
const brandEl = document.getElementById("brand");
const descriptionEl = document.getElementById("description");
const sourceEl = document.getElementById("source");
const coverWrap = document.getElementById("coverWrap");
const coverEl = document.getElementById("cover");
const notFound = document.getElementById("notFound");

const nextBtn = document.getElementById("nextBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");

const historyEl = document.getElementById("history");
const historyEmpty = document.getElementById("historyEmpty");
const countAll = document.getElementById("countAll");
const countFound = document.getElementById("countFound");
const countMissing = document.getElementById("countMissing");
const diagUrl = document.getElementById("diagUrl");
const diagStatus = document.getElementById("diagStatus");
const diagResponse = document.getElementById("diagResponse");
const diagError = document.getElementById("diagError");


let history = JSON.parse(localStorage.getItem("dvdScannerHistory") || "[]");

function setStatus(text){ statusPill.textContent = text; }
function showProgress(title, detail){
  progressTitle.textContent = title;
  progressDetail.textContent = detail || "";
  progressBox.classList.remove("hidden");
  errorBox.classList.add("hidden");
}
function hideProgress(){ progressBox.classList.add("hidden"); }
function showError(text){
  hideProgress();
  errorBox.textContent = text;
  errorBox.classList.remove("hidden");
  setStatus("Nicht erkannt");
}

function beep(success=true){
  try{
    const A=window.AudioContext||window.webkitAudioContext;
    const c=new A(),o=c.createOscillator(),g=c.createGain();
    o.frequency.value=success?900:350; g.gain.value=.08;
    o.connect(g); g.connect(c.destination); o.start();
    setTimeout(()=>{o.stop();c.close()},success?120:220);
  }catch(_){}
  if(navigator.vibrate) navigator.vibrate(success?80:[80,60,80]);
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
    showProgress("Foto wird ausgewertet …", `Versuch ${i+1} von ${attempts.length}: ${a.label}`);
    await new Promise(r=>setTimeout(r,60));

    const result = await decodeAttempt(src,a);
    if(result && result.codeResult && result.codeResult.code){
      const code=String(result.codeResult.code).trim();
      if(/^\d{8,14}$/.test(code)){
        return {code,format:result.codeResult.format || "EAN/UPC"};
      }
    }
  }
  return null;
}

fileInput.addEventListener("change", async event=>{
  const file=event.target.files?.[0];
  if(!file) return;

  errorBox.classList.add("hidden");
  resultCard.classList.add("hidden");
  setStatus("Foto erhalten");

  const objectUrl=URL.createObjectURL(file);
  preview.src=objectUrl;
  previewWrap.classList.remove("hidden");

  if(typeof Quagga==="undefined"){
    showError("Der Barcode-Decoder konnte nicht geladen werden. Bitte Internetverbindung prüfen und die Seite neu laden.");
    URL.revokeObjectURL(objectUrl);
    fileInput.value="";
    return;
  }

  try{
    showProgress("Foto wird vorbereitet …","Barcode-Decoder wird gestartet.");
    const decoded=await decodeBarcode(objectUrl);

    if(!decoded){
      beep(false);
      showError("Foto wurde verarbeitet, aber kein EAN-/UPC-Barcode erkannt. Bitte Barcode größer, gerade und ohne Spiegelung fotografieren.");
      return;
    }

    hideProgress();
    setStatus("Barcode erkannt ✓");
    beep(true);
    await handleBarcode(decoded.code,decoded.format);
  }catch(err){
    console.error(err);
    beep(false);
    showError("Fehler bei der Bildverarbeitung: "+(err?.message||String(err)));
  }finally{
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    fileInput.value="";
  }
});

async function handleBarcode(code,format){
  barcodeEl.textContent=code;
  formatEl.textContent=`Format: ${format}`;
  lookupState.textContent="Produktsuche …";
  titleEl.textContent="DVD wird gesucht …";
  brandEl.textContent=""; descriptionEl.textContent=""; sourceEl.textContent="";
  coverWrap.classList.add("hidden"); notFound.classList.add("hidden");
  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({behavior:"smooth",block:"start"});

  const item=await lookupProduct(code);
  addToHistory(code,item,format);
  showProduct(item);
}

async function lookupProduct(code){
  const workerBase = String(window.DVD_LOOKUP_WORKER_URL || "").trim();

  diagUrl.textContent = workerBase || "(leer)";
  diagStatus.textContent = "noch kein Request";
  diagResponse.textContent = "–";
  diagError.textContent = "–";

  if(!workerBase || workerBase.includes("HIER_WORKER_URL_EINTRAGEN")){
    diagError.textContent = "Worker-URL fehlt in config.js";
    return {
      found:false,
      title:"",
      brand:"",
      description:"Worker-URL fehlt in config.js",
      image:"",
      source:"Konfiguration fehlt"
    };
  }

  const url = `${workerBase.replace(/\/+$/,"")}/lookup?ean=${encodeURIComponent(code)}`;
  diagUrl.textContent = url;

  try{
    const response = await fetch(url, {
      method:"GET",
      cache:"no-store",
      headers:{ "Accept":"application/json" }
    });

    diagStatus.textContent = `${response.status} ${response.statusText}`;

    const text = await response.text();
    diagResponse.textContent = text || "(leere Antwort)";

    let data = null;
    try{
      data = JSON.parse(text);
    }catch(parseErr){
      diagError.textContent = "JSON-Fehler: " + (parseErr?.message || String(parseErr));
      return {
        found:false,
        title:"",
        brand:"",
        description:"Worker-Antwort war kein gültiges JSON.",
        image:"",
        source:"Antwortfehler"
      };
    }

    if(!response.ok){
      diagError.textContent = data?.message || data?.error || `HTTP ${response.status}`;
      return {
        found:false,
        title:"",
        brand:"",
        description:data?.message || data?.error || `HTTP ${response.status}`,
        image:"",
        source:"Worker-Fehler"
      };
    }

    if(data?.found){
      diagError.textContent = "kein Fehler";
      return {
        found:true,
        title:cleanTitle(data.title || "Produkt erkannt"),
        brand:data.brand || "",
        description:data.description || "",
        image:data.image || "",
        source:data.source || "Worker"
      };
    }

    diagError.textContent = data?.message || "Kein Produkt gefunden";
    return {
      found:false,
      title:"",
      brand:"",
      description:data?.message || "Kein Produkt gefunden",
      image:"",
      source:data?.source || "Worker"
    };

  }catch(err){
    const msg = err?.message || String(err);
    diagStatus.textContent = "Request fehlgeschlagen";
    diagError.textContent = msg;

    return {
      found:false,
      title:"",
      brand:"",
      description:"Worker nicht erreichbar: " + msg,
      image:"",
      source:"Verbindungsfehler"
    };
  }
}

function cleanTitle(title){
  let t = String(title || "").trim();

  // Remove marketplace/condition noise
  t = t.replace(/\|\s*(dvd|blu-?ray|bluray)\b.*$/i, "");
  t = t.replace(/\|\s*condition\b.*$/i, "");
  t = t.replace(/\bcondition\s+(good|very good|acceptable|new)\b.*$/i, "");

  // Remove media labels and seller-style author tails
  t = t.replace(/\[(blu-?ray|bluray|dvd)\]/ig, "");
  t = t.replace(/\((blu-?ray|bluray|dvd)\)/ig, "");
  t = t.replace(/\bby\s+[A-ZÄÖÜ][^|,;]{1,40}(?=\s*(\||$))/i, "");
  t = t.replace(/\s+\|\s+.*$/i, "");

  // Remove dangling punctuation / whitespace
  t = t.replace(/\s{2,}/g, " ");
  t = t.replace(/[,\-–—:;|]+\s*$/g, "");
  return t.trim();
}

function showProduct(item){
  if(item.found){
    lookupState.textContent="Gefunden ✓"; titleEl.textContent=item.title||"Produkt erkannt";
    brandEl.textContent=item.brand?`Marke/Anbieter: ${item.brand}`:""; descriptionEl.textContent=item.description||""; sourceEl.textContent=item.source?`Datenquelle: ${item.source}`:"";
    notFound.classList.add("hidden");
    if(item.image){coverEl.src=item.image;coverWrap.classList.remove("hidden")}else coverWrap.classList.add("hidden");
  }else{
    lookupState.textContent="Produkt offen"; titleEl.textContent="Barcode erkannt – keine Produktdaten gefunden";
    brandEl.textContent="";descriptionEl.textContent=item.description||"";sourceEl.textContent=item.source?`Datenquelle: ${item.source}`:"";coverWrap.classList.add("hidden");notFound.classList.remove("hidden");
  }
}

function addToHistory(code,item,format){
  history.unshift({time:new Date().toISOString(),barcode:code,format,found:!!item.found,title:item.title||""});
  history=history.slice(0,100);
  localStorage.setItem("dvdScannerHistory",JSON.stringify(history));
  renderHistory();
}

function renderHistory(){
  const found=history.filter(x=>x.found).length;
  countAll.textContent=history.length;countFound.textContent=found;countMissing.textContent=history.length-found;
  historyEl.innerHTML="";historyEmpty.classList.toggle("hidden",history.length>0);
  history.forEach(entry=>{
    const row=document.createElement("div");row.className="history-item";
    const left=document.createElement("div"),t=document.createElement("strong"),m=document.createElement("small");
    t.textContent=entry.title||entry.barcode;m.textContent=`${entry.barcode}${entry.format?" · "+entry.format:""}`;left.append(t,m);
    const right=document.createElement("div");right.className=entry.found?"ok":"missing";right.textContent=entry.found?"✓ Produkt":"✓ Barcode";
    row.append(left,right);historyEl.appendChild(row);
  });
}

function exportCsv(){
  if(!history.length)return alert("Noch keine Scans vorhanden.");
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const lines=[
    ["Zeit","Barcode","Format","Produkt gefunden","Titel"].map(esc).join(";"),
    ...history.map(x=>[x.time,x.barcode,x.format||"",x.found?"Ja":"Nein",x.title].map(esc).join(";"))
  ];
  const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="dvd-scanner-testprotokoll.csv";a.click();URL.revokeObjectURL(u);
}

nextBtn.addEventListener("click",()=>{
  resultCard.classList.add("hidden");previewWrap.classList.add("hidden");preview.removeAttribute("src");
  errorBox.classList.add("hidden");hideProgress();setStatus("Bereit");window.scrollTo({top:0,behavior:"smooth"});
});
clearBtn.addEventListener("click",()=>{if(confirm("Testprotokoll wirklich löschen?")){history=[];localStorage.removeItem("dvdScannerHistory");renderHistory()}});
exportBtn.addEventListener("click",exportCsv);
renderHistory();
