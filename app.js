const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const nextBtn = document.getElementById("nextBtn");
const clearBtn = document.getElementById("clearBtn");
const exportBtn = document.getElementById("exportBtn");

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

const historyEl = document.getElementById("history");
const historyEmpty = document.getElementById("historyEmpty");
const countAll = document.getElementById("countAll");
const countFound = document.getElementById("countFound");
const countMissing = document.getElementById("countMissing");

let controls = null;
let scanning = false;
let scanLocked = false;
let codeReader = null;
let history = JSON.parse(localStorage.getItem("dvdScannerHistory") || "[]");

function setStatus(text) {
  statusPill.textContent = text;
}

function beep(success = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = success ? 900 : 350;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, success ? 120 : 220);
  } catch (_) {}
  if (navigator.vibrate) navigator.vibrate(success ? 80 : [80, 60, 80]);
}

async function startScanner() {
  if (scanning) return;
  scanLocked = false;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  setStatus("Kamera startet …");

  const decoderInfo = document.getElementById("decoderInfo");

  try {
    codeReader = new ZXingBrowser.BrowserMultiFormatOneDReader();

    const constraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    controls = await codeReader.decodeFromConstraints(
      constraints,
      video,
      (result, error, ctrl) => {
        if (result && !scanLocked) {
          const text = result.getText().trim();
          const format = result.getBarcodeFormat ? String(result.getBarcodeFormat()) : "";

          if (/^\d{8,14}$/.test(text)) {
            scanLocked = true;
            if (decoderInfo) {
              decoderInfo.innerHTML = `<strong>Decoder:</strong> Barcode erkannt (${format || "1D"})`;
            }
            handleBarcode(text);
          }
        }
      }
    );

    scanning = true;
    setStatus("EAN-Scanner aktiv");
    if (decoderInfo) {
      decoderInfo.innerHTML = "<strong>Decoder:</strong> 1D-Reader aktiv – EAN/UPC wird gesucht";
    }
  } catch (err) {
    console.error(err);
    setStatus("Kamerafehler");
    startBtn.disabled = false;
    stopBtn.disabled = true;
    if (decoderInfo) {
      decoderInfo.innerHTML = `<strong>Decoder-Fehler:</strong> ${String(err.message || err)}`;
    }
    alert(
      "Die Kamera bzw. der Barcode-Decoder konnte nicht gestartet werden.\n\n" +
      "Bitte prüfen Sie:\n" +
      "• Seite über HTTPS geöffnet?\n" +
      "• Kamerazugriff erlaubt?\n" +
      "• Chrome/Safari aktuell?"
    );
  }
}

function stopScanner() {
  if (controls) {
    try { controls.stop(); } catch (_) {}
  }
  controls = null;
  scanning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Bereit");
}

async function handleBarcode(code) {
  stopScanner();
  beep(true);

  barcodeEl.textContent = code;
  lookupState.textContent = "Suche …";
  titleEl.textContent = "DVD wird gesucht …";
  brandEl.textContent = "";
  descriptionEl.textContent = "";
  coverWrap.classList.add("hidden");
  notFound.classList.add("hidden");
  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });

  const existing = history.find(x => x.barcode === code);
  if (existing) {
    lookupState.textContent = "Schon gescannt";
  }

  const item = await lookupProduct(code);
  addToHistory(code, item);
  showProduct(item);
}

async function lookupProduct(code) {
  // UPCitemdb stellt für Tests einen Trial-Lookup bereit.
  // Falls der Dienst die Anfrage begrenzt oder Browserzugriffe blockiert,
  // bleibt der Barcode trotzdem im lokalen Testprotokoll erhalten.
  const url = `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`;

  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (data && Array.isArray(data.items) && data.items.length > 0) {
      const p = data.items[0];
      return {
        found: true,
        title: p.title || "Produkt erkannt",
        brand: p.brand || "",
        description: p.description || "",
        image: (p.images && p.images[0]) || ""
      };
    }
  } catch (err) {
    console.warn("Produkt-Lookup fehlgeschlagen:", err);
  }

  return { found: false, title: "", brand: "", description: "", image: "" };
}

function showProduct(item) {
  if (item.found) {
    lookupState.textContent = "Gefunden ✓";
    titleEl.textContent = item.title || "Produkt erkannt";
    brandEl.textContent = item.brand ? `Marke/Anbieter: ${item.brand}` : "";
    descriptionEl.textContent = item.description || "";
    notFound.classList.add("hidden");

    if (item.image) {
      coverEl.src = item.image;
      coverWrap.classList.remove("hidden");
    } else {
      coverWrap.classList.add("hidden");
    }
  } else {
    lookupState.textContent = "Nicht gefunden";
    titleEl.textContent = "Keine Produktdaten gefunden";
    brandEl.textContent = "";
    descriptionEl.textContent = "";
    coverWrap.classList.add("hidden");
    notFound.classList.remove("hidden");
    beep(false);
  }
}

function addToHistory(code, item) {
  history.unshift({
    time: new Date().toISOString(),
    barcode: code,
    found: !!item.found,
    title: item.title || ""
  });
  history = history.slice(0, 100);
  localStorage.setItem("dvdScannerHistory", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const found = history.filter(x => x.found).length;
  countAll.textContent = history.length;
  countFound.textContent = found;
  countMissing.textContent = history.length - found;

  historyEl.innerHTML = "";
  historyEmpty.classList.toggle("hidden", history.length > 0);

  history.forEach(entry => {
    const row = document.createElement("div");
    row.className = "history-item";

    const left = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = entry.title || entry.barcode;
    const meta = document.createElement("small");
    meta.textContent = entry.title ? `EAN/UPC ${entry.barcode}` : `EAN/UPC ${entry.barcode}`;
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = entry.found ? "ok" : "missing";
    right.textContent = entry.found ? "✓ erkannt" : "⚠ offen";

    row.appendChild(left);
    row.appendChild(right);
    historyEl.appendChild(row);
  });
}

function exportCsv() {
  if (!history.length) {
    alert("Es gibt noch keine Scans zum Exportieren.");
    return;
  }

  const esc = v => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [
    ["Zeit", "Barcode", "Erkannt", "Titel"].map(esc).join(";"),
    ...history.map(x => [
      x.time,
      x.barcode,
      x.found ? "Ja" : "Nein",
      x.title
    ].map(esc).join(";"))
  ];

  const blob = new Blob(["\ufeff" + lines.join("\n")], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dvd-scanner-testprotokoll.csv";
  a.click();
  URL.revokeObjectURL(url);
}

startBtn.addEventListener("click", startScanner);
stopBtn.addEventListener("click", stopScanner);

nextBtn.addEventListener("click", () => {
  resultCard.classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(startScanner, 300);
});

clearBtn.addEventListener("click", () => {
  if (confirm("Testprotokoll wirklich löschen?")) {
    history = [];
    localStorage.removeItem("dvdScannerHistory");
    renderHistory();
  }
});

exportBtn.addEventListener("click", exportCsv);

renderHistory();
