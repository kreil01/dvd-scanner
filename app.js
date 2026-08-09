const fileInput = document.getElementById("fileInput");
const previewWrap = document.getElementById("previewWrap");
const preview = document.getElementById("preview");
const decoderInfo = document.getElementById("decoderInfo");
const statusPill = document.getElementById("statusPill");

const resultCard = document.getElementById("resultCard");
const barcodeEl = document.getElementById("barcode");
const lookupState = document.getElementById("lookupState");
const titleEl = document.getElementById("title");
const brandEl = document.getElementById("brand");
const descriptionEl = document.getElementById("description");
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

let history = JSON.parse(localStorage.getItem("dvdScannerHistory") || "[]");

const formats = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E
];

function setStatus(text) {
  statusPill.textContent = text;
}

function beep(success = true) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = success ? 900 : 350;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, success ? 120 : 220);
  } catch (_) {}
  if (navigator.vibrate) navigator.vibrate(success ? 80 : [80, 60, 80]);
}

fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  previewWrap.classList.remove("hidden");

  setStatus("Bild wird analysiert …");
  decoderInfo.innerHTML = "<strong>Status:</strong> Barcode wird gesucht …";
  resultCard.classList.add("hidden");

  const scanner = new Html5Qrcode("reader", {
    formatsToSupport: formats,
    verbose: false
  });

  try {
    const code = await scanner.scanFile(file, true);
    const cleaned = String(code || "").trim();

    if (!/^\d{8,14}$/.test(cleaned)) {
      throw new Error("Kein gültiger EAN-/UPC-Code erkannt");
    }

    decoderInfo.innerHTML = "<strong>Status:</strong> Barcode erkannt ✓";
    setStatus("Barcode erkannt");
    beep(true);

    await handleBarcode(cleaned);
  } catch (err) {
    console.error(err);
    setStatus("Nicht erkannt");
    decoderInfo.innerHTML =
      "<strong>Status:</strong> Kein lesbarer EAN-/UPC-Barcode erkannt. Bitte erneut fotografieren.";
    beep(false);
  } finally {
    try { await scanner.clear(); } catch (_) {}
    URL.revokeObjectURL(objectUrl);
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
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });

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
    meta.textContent = `EAN/UPC ${entry.barcode}`;

    left.append(title, meta);

    const right = document.createElement("div");
    right.className = entry.found ? "ok" : "missing";
    right.textContent = entry.found ? "✓ erkannt" : "⚠ offen";

    row.append(left, right);
    historyEl.appendChild(row);
  });
}

function exportCsv() {
  if (!history.length) {
    alert("Noch keine Scans vorhanden.");
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

nextBtn.addEventListener("click", () => {
  resultCard.classList.add("hidden");
  previewWrap.classList.add("hidden");
  preview.removeAttribute("src");
  setStatus("Bereit");
  decoderInfo.innerHTML = "<strong>Status:</strong> Noch kein Foto ausgewählt.";
  window.scrollTo({ top: 0, behavior: "smooth" });
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
