const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const nextBtn = document.getElementById("nextBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");
const fileInput = document.getElementById("fileInput");

const resultCard = document.getElementById("resultCard");
const barcodeEl = document.getElementById("barcode");
const lookupState = document.getElementById("lookupState");
const titleEl = document.getElementById("title");
const brandEl = document.getElementById("brand");
const descriptionEl = document.getElementById("description");
const coverWrap = document.getElementById("coverWrap");
const coverEl = document.getElementById("cover");
const notFound = document.getElementById("notFound");
const statusPill = document.getElementById("statusPill");
const decoderInfo = document.getElementById("decoderInfo");

const historyEl = document.getElementById("history");
const historyEmpty = document.getElementById("historyEmpty");
const countAll = document.getElementById("countAll");
const countFound = document.getElementById("countFound");
const countMissing = document.getElementById("countMissing");

let scanner = null;
let scanning = false;
let scanLocked = false;
let history = JSON.parse(localStorage.getItem("dvdScannerHistory") || "[]");

const formats = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E
];

function setStatus(t) { statusPill.textContent = t; }

function beep(success=true) {
  try {
    const A = window.AudioContext || window.webkitAudioContext;
    const c = new A(), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = success ? 900 : 350; g.gain.value = .08;
    o.connect(g); g.connect(c.destination); o.start();
    setTimeout(()=>{o.stop();c.close()}, success ? 120 : 220);
  } catch(_) {}
  if (navigator.vibrate) navigator.vibrate(success ? 80 : [80,60,80]);
}

async function startScanner() {
  if (scanning) return;
  scanLocked = false;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus("Kamera startet …");
  decoderInfo.innerHTML = "<strong>Decoder:</strong> Kamera wird vorbereitet …";

  try {
    scanner = new Html5Qrcode("reader", {
      formatsToSupport: formats,
      verbose: false
    });

    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 12,
        qrbox: (vw, vh) => {
          const width = Math.floor(vw * 0.90);
          return { width: width, height: Math.max(110, Math.floor(vh * 0.28)) };
        },
        aspectRatio: 1.777778
      },
      onScanSuccess,
      () => {}
    );

    scanning = true;
    setStatus("EAN-Scanner aktiv");
    decoderInfo.innerHTML = "<strong>Decoder:</strong> EAN-13 / EAN-8 / UPC aktiv";
  } catch (err) {
    console.error(err);
    setStatus("Scannerfehler");
    startBtn.disabled = false;
    stopBtn.disabled = true;
    decoderInfo.innerHTML = "<strong>Fehler:</strong> " + (err?.message || String(err));
  }
}

async function stopScanner() {
  if (scanner && scanning) {
    try { await scanner.stop(); } catch(_) {}
    try { await scanner.clear(); } catch(_) {}
  }
  scanner = null;
  scanning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Bereit");
}

async function onScanSuccess(decodedText, decodedResult) {
  if (scanLocked) return;
  const code = String(decodedText || "").trim();
  if (!/^\d{8,14}$/.test(code)) return;

  scanLocked = true;
  decoderInfo.innerHTML = "<strong>Decoder:</strong> Barcode erkannt ✓";
  await stopScanner();
  beep(true);
  await handleBarcode(code);
}

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  await stopScanner();
  setStatus("Bild wird gelesen …");
  decoderInfo.innerHTML = "<strong>Decoder:</strong> Bildanalyse …";

  try {
    const imageScanner = new Html5Qrcode("reader", {
      formatsToSupport: formats,
      verbose: false
    });
    const code = await imageScanner.scanFile(file, true);
    try { await imageScanner.clear(); } catch(_) {}
    decoderInfo.innerHTML = "<strong>Decoder:</strong> Barcode im Bild erkannt ✓";
    beep(true);
    await handleBarcode(code);
  } catch (err) {
    console.error(err);
    setStatus("Nicht erkannt");
    decoderInfo.innerHTML = "<strong>Decoder:</strong> Im Bild wurde kein EAN/UPC erkannt";
    alert("Der Barcode konnte im Foto nicht gelesen werden. Bitte näher und möglichst gerade fotografieren.");
  } finally {
    fileInput.value = "";
  }
});

async function handleBarcode(code) {
  barcodeEl.textContent = code;
  lookupState.textContent = "Suche …";
  titleEl.textContent = "DVD wird gesucht …";
  brandEl.textContent = "";
  descriptionEl.textContent = "";
  coverWrap.classList.add("hidden");
  notFound.classList.add("hidden");
  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({behavior:"smooth", block:"start"});

  const item = await lookupProduct(code);
  addToHistory(code, item);
  showProduct(item);
}

async function lookupProduct(code) {
  const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data?.items?.length) {
      const p = data.items[0];
      return {
        found:true,
        title:p.title || "Produkt erkannt",
        brand:p.brand || "",
        description:p.description || "",
        image:(p.images && p.images[0]) || ""
      };
    }
  } catch(err) { console.warn("Produkt-Lookup fehlgeschlagen:", err); }
  return {found:false,title:"",brand:"",description:"",image:""};
}

function showProduct(item) {
  if (item.found) {
    lookupState.textContent = "Gefunden ✓";
    titleEl.textContent = item.title || "Produkt erkannt";
    brandEl.textContent = item.brand ? `Marke/Anbieter: ${item.brand}` : "";
    descriptionEl.textContent = item.description || "";
    notFound.classList.add("hidden");
    if (item.image) { coverEl.src=item.image; coverWrap.classList.remove("hidden"); }
    else coverWrap.classList.add("hidden");
  } else {
    lookupState.textContent = "Nicht gefunden";
    titleEl.textContent = "Keine Produktdaten gefunden";
    brandEl.textContent = ""; descriptionEl.textContent = "";
    coverWrap.classList.add("hidden"); notFound.classList.remove("hidden");
    beep(false);
  }
}

function addToHistory(code,item) {
  history.unshift({time:new Date().toISOString(),barcode:code,found:!!item.found,title:item.title||""});
  history = history.slice(0,100);
  localStorage.setItem("dvdScannerHistory",JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const found = history.filter(x=>x.found).length;
  countAll.textContent=history.length; countFound.textContent=found; countMissing.textContent=history.length-found;
  historyEl.innerHTML=""; historyEmpty.classList.toggle("hidden",history.length>0);

  history.forEach(entry=>{
    const row=document.createElement("div"); row.className="history-item";
    const left=document.createElement("div");
    const t=document.createElement("strong"); t.textContent=entry.title||entry.barcode;
    const m=document.createElement("small"); m.textContent=`EAN/UPC ${entry.barcode}`;
    left.append(t,m);
    const right=document.createElement("div"); right.className=entry.found?"ok":"missing";
    right.textContent=entry.found?"✓ erkannt":"⚠ offen";
    row.append(left,right); historyEl.appendChild(row);
  });
}

function exportCsv() {
  if (!history.length) return alert("Noch keine Scans vorhanden.");
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const lines=[
    ["Zeit","Barcode","Erkannt","Titel"].map(esc).join(";"),
    ...history.map(x=>[x.time,x.barcode,x.found?"Ja":"Nein",x.title].map(esc).join(";"))
  ];
  const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const u=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=u; a.download="dvd-scanner-testprotokoll.csv"; a.click(); URL.revokeObjectURL(u);
}

startBtn.addEventListener("click",startScanner);
stopBtn.addEventListener("click",stopScanner);
nextBtn.addEventListener("click",async()=>{
  resultCard.classList.add("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
  setTimeout(startScanner,250);
});
clearBtn.addEventListener("click",()=>{
  if(confirm("Testprotokoll wirklich löschen?")){
    history=[]; localStorage.removeItem("dvdScannerHistory"); renderHistory();
  }
});
exportBtn.addEventListener("click",exportCsv);

renderHistory();
