// ============ FIREBASE CONFIG ============
const firebaseConfig = {
  apiKey: "AIzaSyBhh3nIzAWyvT47HQ-hh6umjqoCMYBI1Lk",
  authDomain: "johcards-2db9b.firebaseapp.com",
  projectId: "johcards-2db9b",
  storageBucket: "johcards-2db9b.firebasestorage.app",
  messagingSenderId: "955656442066",
  appId: "1:955656442066:web:3f0d0335191d67eac61d0b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const WATEJA = db.collection("michango_wateja");

// ====== BEI ZA KADI (badilisha hapa ukihitaji) ======
const KADI_DOUBLE = 100000;  // ahadi ya 100,000 na zaidi = DOUBLE
const KADI_SINGLE = 70000;   // ahadi ya 70,000 hadi chini ya 100,000 = SINGLE

// ====== HALI YA UKURASA ======
let wateja = [];
let mtejaSasa = null;
let wote = [];
let kichujio = "wote";
let neno = "";
let mudaWaMwisho = null;   // saa ya mwisho Sheet iliposomwa

const kichwa = document.getElementById("kichwa");
const chaguaMteja = document.getElementById("chaguaMteja");
const maudhui = document.getElementById("maudhui");
const takwimu = document.getElementById("takwimu");
const mwili = document.getElementById("mwili");
const tafuta = document.getElementById("tafuta");
const kitufePakua = document.getElementById("pakua");
const kitufeRipoti = document.getElementById("ripoti");
const ujumbe = document.getElementById("ujumbe");
const muhtasariKadi = document.getElementById("muhtasariKadi");

const fomu = document.getElementById("fomu");
const fJina = document.getElementById("fJina");
const fLink = document.getElementById("fLink");
const fTab = document.getElementById("fTab");
const fUjumbe = document.getElementById("fUjumbe");
const kitufeHifadhi = document.getElementById("hifadhiMteja");

const majinaKundi = {
  wote: "Wote",
  maliza: "Wamemaliza",
  punguza: "Wamepunguza",
  deni: "Wanadaiwa",
  hajaahidi: "Hawajaahidi"
};

const majinaHali = {
  maliza: "Amemaliza",
  punguza: "Amepunguza",
  deni: "Anadaiwa",
  hajaahidi: "Hajaahidi"
};

// ====== VYOMBO VYA KUSAIDIA ======
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c !== "\r") cell += c;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function nambari(v) {
  const n = parseInt(String(v || "").replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function safishaSimu(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (!d) return { simu: "", hali: "tupu" };
  if (d.startsWith("0") && d.length === 10) d = "255" + d.slice(1);
  else if (d.length === 9) d = "255" + d;
  const sawa = d.length === 12 && d.startsWith("255");
  return { simu: d, hali: sawa ? "sawa" : "kosa" };
}

function amuaHali(ahadi, amelipa) {
  if (ahadi <= 0 && amelipa <= 0) return "hajaahidi";
  if (amelipa <= 0) return "deni";
  if (amelipa >= ahadi) return "maliza";
  return "punguza";
}

// Aina ya kadi: kwa waliomaliza tu
function amuaKadi(hali, ahadi) {
  if (hali !== "maliza") return "";
  if (ahadi >= KADI_DOUBLE) return "DOUBLE";
  if (ahadi >= KADI_SINGLE) return "SINGLE";
  return "";
}

function nafasiYaKadi(k) {
  if (k === "DOUBLE") return 0;
  if (k === "SINGLE") return 1;
  return 2;
}

function pesa(n) { return n.toLocaleString("en-US"); }

function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function kumbukaMteja(id) {
  try { localStorage.setItem("mtejaWaMwisho", id); } catch (e) {}
}
function mtejaAliyekumbukwa() {
  try { return localStorage.getItem("mtejaWaMwisho"); } catch (e) { return null; }
}

function urlYaSheet(m) {
  return "https://docs.google.com/spreadsheets/d/" + m.sheetId +
    "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(m.tab || "Michango");
}

// Kundi la sasa: linasomwa kutoka kwenye kadi iliyochaguliwa ukurasani
function kundiLaSasa() {
  const kadi = document.querySelector(".kadi.chaguliwa");
  return kadi ? kadi.dataset.k : kichujio;
}

// Watu wa kundi; kwa "maliza" DOUBLE zinaanza kisha SINGLE
function watuWaKundi(kundi) {
  const orodha = wote.filter(x => kundi === "wote" || x.hali === kundi);
  if (kundi === "maliza") {
    orodha.sort((a, b) => nafasiYaKadi(a.kadi) - nafasiYaKadi(b.kadi));
  }
  return orodha;
}

function sasishaKitufe() {
  const kundi = kundiLaSasa();
  const naSimu = watuWaKundi(kundi).filter(x => x.simuHali === "sawa").length;
  kitufePakua.textContent =
    "Pakua Excel: " + majinaKundi[kundi] + " (" + naSimu + ")";
}

function sasishaMuhtasariKadi() {
  const w = wote.filter(x => x.hali === "maliza");
  const d = w.filter(x => x.kadi === "DOUBLE").length;
  const s = w.filter(x => x.kadi === "SINGLE").length;
  const h = w.length - d - s;
  muhtasariKadi.textContent =
    "Cards (completed): DOUBLE " + d + " | SINGLE " + s +
    (h ? " | No card (pledge below " + pesa(KADI_SINGLE) + "): " + h : "");
}

// ====== WATEJA (FIRESTORE) ======
async function pakiaWateja(chaguaId) {
  try {
    const snap = await WATEJA.orderBy("createdAt", "asc").get();
    wateja = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  } catch (e) {
    kichwa.textContent = "Imeshindwa kusoma wateja: " + e.message;
    return;
  }

  chaguaMteja.innerHTML = wateja.map(m =>
    '<option value="' + esc(m.id) + '">' + esc(m.jina) + "</option>"
  ).join("");

  if (!wateja.length) {
    mtejaSasa = null;
    wote = [];
    maudhui.hidden = true;
    kichwa.textContent = "Hakuna mteja bado. Bonyeza + Mteja Mpya.";
    return;
  }

  const id = chaguaId || mtejaAliyekumbukwa();
  mtejaSasa = wateja.find(m => m.id === id) || wateja[0];
  chaguaMteja.value = mtejaSasa.id;
  kumbukaMteja(mtejaSasa.id);
  badilishaMteja();
}

function badilishaMteja() {
  wote = [];
  mudaWaMwisho = null;
  kichujio = "wote";
  neno = "";
  tafuta.value = "";
  ujumbe.textContent = "";
  maudhui.hidden = false;
  pakia();
}

// ====== KUPAKIA DATA YA SHEET ======
async function pakia() {
  if (!mtejaSasa) return;
  const kwaMteja = mtejaSasa.id;
  kichwa.textContent = mtejaSasa.jina + " — inapakia...";

  try {
    const res = await fetch(urlYaSheet(mtejaSasa));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = parseCSV(await res.text());

    // Kama mteja amebadilishwa wakati tunasubiri, achana na matokeo haya
    if (!mtejaSasa || mtejaSasa.id !== kwaMteja) return;

    // Mstari wa vichwa: seli fupi yenye neno MAJINA (vichwa ni vifupi)
    const h = rows.findIndex(r =>
      r.some(c => c.trim().length <= 60 && c.toUpperCase().includes("MAJINA"))
    );
    if (h < 0) {
      throw new Error(
        "Neno MAJINA halionekani kwenye kichwa chochote. Mistari ya juu niliyosoma: " +
        rows.slice(0, 3).map(r => r.filter(c => c.trim()).join(" | ")).join(" // ")
      );
    }

    // Seli ndefu (maelezo, si vichwa) zinapuuzwa
    const head = rows[h].map(c => (c.trim().length > 80 ? "" : c.toUpperCase()));

    // Tafuta kwa kipaumbele: neno la kwanza kwenye orodha linashinda
    const colKwa = (orodha) => {
      for (const k of orodha) {
        const i = head.findIndex(c => c.includes(k));
        if (i >= 0) return i;
      }
      return -1;
    };

    const iJina = colKwa(["MAJINA"]);
    const iAhadi = colKwa(["AHIDIWA", "AHADI"]);
    const iLipa = colKwa(["PUNGUZ", "PINGUZ", "MALIZO", "LIPWA", "LIPA"]);
    const iSimu = colKwa(["SIMU"]);

    const zilizokosekana = [];
    if (iAhadi < 0) zilizokosekana.push("AHIDIWA");
    if (iLipa < 0) zilizokosekana.push("PUNGUZWA");
    if (iSimu < 0) zilizokosekana.push("SIMU");
    if (zilizokosekana.length) {
      throw new Error(
        "Nguzo zisizoonekana: " + zilizokosekana.join(", ") +
        ". Vichwa nilivyoona: " + rows[h].filter(c => c.trim()).join(" | ")
      );
    }

    wote = [];
    rows.slice(h + 1).forEach(r => {
      const jina = (r[iJina] || "").trim();
      if (!jina) return;
      if (jina.toUpperCase().startsWith("JUMLA")) return;

      let ahadi = nambari(r[iAhadi]);
      const amelipa = nambari(r[iLipa]);
      const s = safishaSimu(r[iSimu]);

      // Mstari usio na ahadi, malipo wala simu hauhesabiwi
      if (ahadi <= 0 && amelipa <= 0 && s.hali === "tupu") return;

      // Amelipa bila ahadi kuandikwa: ahadi = alichokwisha lipa
      if (ahadi <= 0 && amelipa > 0) ahadi = amelipa;

      const hali = amuaHali(ahadi, amelipa);
      wote.push({
        jina,
        ahadi,
        amelipa,
        baki: Math.max(ahadi - amelipa, 0),
        simu: s.simu,
        simuHali: s.hali,
        hali,
        kadi: amuaKadi(hali, ahadi)
      });
    });

    mudaWaMwisho = new Date();
    const saa = mudaWaMwisho.toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" });
    const jAhadi = wote.reduce((a, x) => a + x.ahadi, 0);
    const jLipa = wote.reduce((a, x) => a + x.amelipa, 0);

    // Onyo kama nguzo ya ahadi inaonekana si sahihi
    const naAhadi = wote.filter(x => x.ahadi > 0);
    const dogo = naAhadi.filter(x => x.ahadi < 1000).length;
    const onyo = (naAhadi.length && dogo > naAhadi.length / 2)
      ? " | ONYO: nguzo ya ahadi inaonekana si sahihi (namba ndogo sana). Angalia vichwa vya Sheet."
      : "";

    kichwa.textContent =
      mtejaSasa.jina + " | Ahadi: " + pesa(jAhadi) + " | Kimelipwa: " + pesa(jLipa) +
      " | Kilichobaki: " + pesa(jAhadi - jLipa) + " | Last refresh " + saa + onyo;

    onyesha();
  } catch (e) {
    kichwa.textContent =
      mtejaSasa.jina + " — imeshindwa kusoma Sheet: " + e.message;
    wote = [];
    mwili.innerHTML = "";
    takwimu.innerHTML = "";
    muhtasariKadi.textContent = "";
  }
}

// ====== KUONYESHA ======
function onyesha() {
  const idadi = {
    wote: wote.length,
    maliza: wote.filter(x => x.hali === "maliza").length,
    punguza: wote.filter(x => x.hali === "punguza").length,
    deni: wote.filter(x => x.hali === "deni").length,
    hajaahidi: wote.filter(x => x.hali === "hajaahidi").length
  };

  const kadi = [
    ["wote", "wote", "Wote"],
    ["maliza", "amilia", "Wamemaliza"],
    ["punguza", "mchache", "Wamepunguza"],
    ["deni", "deni", "Wanadaiwa"],
    ["hajaahidi", "hajaahidi", "Hawajaahidi"]
  ];

  takwimu.innerHTML = kadi.map(k =>
    '<button class="kadi ' + k[1] + (kichujio === k[0] ? " chaguliwa" : "") +
    '" data-k="' + k[0] + '">' +
    '<div class="namba">' + idadi[k[0]] + '</div>' +
    '<div class="maelezo">' + k[2] + '</div></button>'
  ).join("");

  sasishaKitufe();
  sasishaMuhtasariKadi();

  const orodha = watuWaKundi(kichujio).filter(x =>
    x.jina.toLowerCase().includes(neno)
  );

  if (!orodha.length) {
    mwili.innerHTML = '<tr><td colspan="8" class="tupu-ujumbe">Hakuna majina yanayolingana.</td></tr>';
    return;
  }

  mwili.innerHTML = orodha.map((x, i) => {
    let simuHtml;
    if (x.simuHali === "tupu") simuHtml = '<span class="onyo">Hana namba</span>';
    else if (x.simuHali === "kosa") simuHtml = esc(x.simu) + ' <span class="onyo">(ina shida)</span>';
    else simuHtml = esc(x.simu);

    const kadiHtml = x.kadi
      ? '<span class="aina ' + x.kadi.toLowerCase() + '">' + x.kadi + "</span>"
      : "—";

    const ahadiHtml = x.hali === "hajaahidi" ? "—" : pesa(x.ahadi);
    const bakiHtml = x.hali === "hajaahidi" ? "—" : pesa(x.baki);

    return "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      "<td>" + esc(x.jina) + "</td>" +
      '<td class="kulia">' + ahadiHtml + "</td>" +
      '<td class="kulia">' + pesa(x.amelipa) + "</td>" +
      '<td class="kulia">' + bakiHtml + "</td>" +
      "<td>" + simuHtml + "</td>" +
      "<td>" + kadiHtml + "</td>" +
      '<td><span class="hali ' + x.hali + '">' + majinaHali[x.hali] + "</span></td>" +
      "</tr>";
  }).join("");
}

// ====== KUBONYEZA KADI ======
takwimu.addEventListener("click", (e) => {
  const kadi = e.target.closest(".kadi");
  if (!kadi) return;
  kichujio = kadi.dataset.k;
  ujumbe.textContent = "";
  onyesha();
});

// ====== KUPAKUA EXCEL ======
kitufePakua.addEventListener("click", () => {
  if (typeof XLSX === "undefined") {
    ujumbe.textContent = "Maktaba ya Excel haijapakia. Jaribu kusasisha ukurasa.";
    return;
  }

  const kundi = kundiLaSasa();
  const k = watuWaKundi(kundi);
  const sawa = k.filter(x => x.simuHali === "sawa");
  const hawakujumuishwa = k.length - sawa.length;

  if (!sawa.length) {
    ujumbe.textContent = "Hakuna majina yenye namba sahihi kwenye kundi hili (" + majinaKundi[kundi] + ").";
    return;
  }

  const naKadi = kundi === "maliza";

  // Nguzo za fedha kwa kila kundi. Kila nguzo inakuwa alama ya SMS:
  // ahadi = [AHADI], kiasi (alicholipa) = [KIASI], baki (anachodaiwa) = [BAKI]
  const nguzoZaFedha = {
    wote:      ["ahadi", "kiasi", "baki"],
    maliza:    ["kiasi"],
    punguza:   ["ahadi", "kiasi", "baki"],
    deni:      ["ahadi", "baki"],
    hajaahidi: []
  }[kundi] || [];

  const thamani = (x, n) => {
    if (x.hali === "hajaahidi") return "";
    if (n === "ahadi") return pesa(x.ahadi);
    if (n === "kiasi") return pesa(x.amelipa);
    return pesa(x.baki);
  };

  const vichwa = ["jina", "namba ya simu"];
  const upana = [{ wch: 34 }, { wch: 16 }];
  if (naKadi) { vichwa.push("aina ya kadi"); upana.push({ wch: 14 }); }
  nguzoZaFedha.forEach(n => { vichwa.push(n); upana.push({ wch: 14 }); });

  const data = sawa.map(x => {
    const r = { "jina": x.jina, "namba ya simu": String(x.simu) };
    if (naKadi) r["aina ya kadi"] = x.kadi || "";
    nguzoZaFedha.forEach(n => { r[n] = thamani(x, n); });
    return r;
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: vichwa });
  ws["!cols"] = upana;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Majina");

  const slug = (mtejaSasa ? mtejaSasa.jina : "mteja")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "mteja";
  const tarehe = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, "michango-" + slug + "-" + kundi + "-" + tarehe + ".xlsx");

  let maelezo = "";
  if (naKadi) {
    const d = sawa.filter(x => x.kadi === "DOUBLE").length;
    const s = sawa.filter(x => x.kadi === "SINGLE").length;
    maelezo = " DOUBLE: " + d + ", SINGLE: " + s + ".";
  }

  ujumbe.textContent =
    majinaKundi[kundi] + ": imepakuliwa majina " + sawa.length + "." + maelezo +
    " Nguzo: " + vichwa.join(", ") + "." +
    (hawakujumuishwa
      ? " Hawakujumuishwa: " + hawakujumuishwa + " (hawana namba au ina shida)."
      : "");
});

// ====== PDF REPORT (Kiswahili; "Last updated" na "Collection percentage" kwa Kiingereza) ======
function tengenezaPDF() {
  if (!mtejaSasa || !wote.length) {
    ujumbe.textContent = "Hakuna data ya kutengeneza ripoti. Bonyeza Refresh kwanza.";
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    ujumbe.textContent = "Maktaba ya PDF haijapakia. Jaribu kusasisha ukurasa.";
    return;
  }

  const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    ujumbe.textContent = "Maktaba ya PDF (autotable) haijapakia. Jaribu kusasisha ukurasa.";
    return;
  }

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const KAHAWIA = [91, 58, 41];
  const KIJANI = [79, 122, 58];
  const CHUNGWA = [232, 131, 42];
  const NYEKUNDU = [178, 58, 46];
  const KIJIVU = [120, 100, 84];

  // ---- Takwimu ----
  const maliza = watuWaKundi("maliza");
  const punguza = wote.filter(x => x.hali === "punguza");
  const deni = wote.filter(x => x.hali === "deni");
  const hajaahidi = wote.filter(x => x.hali === "hajaahidi");
  const jumla = (orodha, f) => orodha.reduce((a, x) => a + x[f], 0);
  const jAhadi = jumla(wote, "ahadi");
  const jLipa = jumla(wote, "amelipa");
  const jBaki = jumla(wote, "baki");
  const asilimia = jAhadi ? (jLipa / jAhadi) * 100 : 0;
  const shareYa = (n) => (wote.length ? ((n / wote.length) * 100).toFixed(1) : "0.0") + "%";
  const kadiD = maliza.filter(x => x.kadi === "DOUBLE").length;
  const kadiS = maliza.filter(x => x.kadi === "SINGLE").length;
  const tarehe = (mudaWaMwisho || new Date()).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  // ---- Kichwa cha ripoti ----
  doc.setFillColor(KAHAWIA[0], KAHAWIA[1], KAHAWIA[2]);
  doc.rect(0, 0, W, 96, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RIPOTI YA MICHANGO", M, 40);
  doc.setFontSize(13);
  doc.text(doc.splitTextToSize(mtejaSasa.jina, W - 2 * M)[0], M, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Imeandaliwa na JOHCARDS Customer Service", M, 82);
  doc.text("Last updated: " + tarehe, W - M, 82, { align: "right" });

  let y = 124;

  function nafasi(kiasi) {
    if (y + kiasi > H - 60) { doc.addPage(); y = M; }
  }

  function kichwaSehemu(maandishi, rangi) {
    nafasi(80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(rangi[0], rangi[1], rangi[2]);
    doc.text(maandishi, M, y);
  }

  // Jedwali la kawaida: namba na vichwa vyake vinapangwa kulia
  function jedwali(opt, kulia, rangi) {
    doc.autoTable(Object.assign({
      margin: { left: M, right: M, bottom: 50 },
      showFoot: "lastPage",
      styles: { fontSize: 9, cellPadding: 5, valign: "middle", textColor: [59, 42, 30] },
      headStyles: { fillColor: rangi, textColor: 255, fontSize: 8, fontStyle: "bold" },
      footStyles: { fillColor: [240, 232, 220], textColor: KAHAWIA, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 245, 238] },
      didParseCell: function (d) {
        if (kulia.indexOf(d.column.index) >= 0) d.cell.styles.halign = "right";
      }
    }, opt));
  }

  // ---- Muhtasari: watu ----
  kichwaSehemu("MUHTASARI", KAHAWIA);
  jedwali({
    startY: y + 10,
    head: [["HALI", "IDADI YA WATU", "ASILIMIA"]],
    body: [
      ["Waliomaliza kulipa", String(maliza.length), shareYa(maliza.length)],
      ["Waliopunguza (bado wanadaiwa kiasi)", String(punguza.length), shareYa(punguza.length)],
      ["Wasiolipa kabisa", String(deni.length), shareYa(deni.length)],
      ["Hawajaahidi (wana namba tu)", String(hajaahidi.length), shareYa(hajaahidi.length)]
    ],
    foot: [["JUMLA YA WATU", String(wote.length), "100.0%"]],
    columnStyles: { 1: { cellWidth: 110 }, 2: { cellWidth: 90 } }
  }, [1, 2], KAHAWIA);
  y = doc.lastAutoTable.finalY + 18;

  // ---- Muhtasari: fedha ----
  nafasi(130);
  jedwali({
    startY: y,
    head: [["MAELEZO", "KIASI (TSh)"]],
    body: [
      ["Kinachotarajiwa (jumla ya ahadi)", pesa(jAhadi)],
      ["Kilichokusanywa hadi sasa", pesa(jLipa)],
      ["Kilichobaki", pesa(jBaki)]
    ],
    foot: [["Collection percentage", asilimia.toFixed(1) + "%"]],
    columnStyles: { 1: { cellWidth: 140 } }
  }, [1], KAHAWIA);
  y = doc.lastAutoTable.finalY + 26;

  // ---- Progress bar ----
  nafasi(70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(KAHAWIA[0], KAHAWIA[1], KAHAWIA[2]);
  doc.text("Collection percentage: " + asilimia.toFixed(1) + "%", M, y);
  doc.setFillColor(230, 220, 205);
  doc.roundedRect(M, y + 8, W - 2 * M, 14, 4, 4, "F");
  const upana = (Math.min(asilimia, 100) / 100) * (W - 2 * M);
  if (upana > 0) {
    doc.setFillColor(KIJANI[0], KIJANI[1], KIJANI[2]);
    doc.roundedRect(M, y + 8, Math.max(upana, 8), 14, 4, 4, "F");
  }
  y += 44;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(KIJIVU[0], KIJIVU[1], KIJIVU[2]);
  doc.text("Kadi kwa waliomaliza: DOUBLE " + kadiD + "  |  SINGLE " + kadiS, M, y);
  y += 32;

  // ---- Sehemu za majina ----
  function sehemu(maandishi, rangi, head, body, foot, kulia, upanaNguzo) {
    kichwaSehemu(maandishi, rangi);
    if (!body.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(KIJIVU[0], KIJIVU[1], KIJIVU[2]);
      doc.text("Hakuna.", M, y + 18);
      y += 42;
      return;
    }
    jedwali({
      startY: y + 10,
      head: [head],
      body: body,
      foot: [foot],
      columnStyles: upanaNguzo
    }, kulia, rangi);
    y = doc.lastAutoTable.finalY + 30;
  }

  sehemu(
    "WALIOMALIZA KULIPA (" + maliza.length + ")",
    KIJANI,
    ["S/N", "MAJINA", "KIASI KILICHOAHIDIWA (TSh)", "KIASI KILICHOPUNGUZWA (TSh)", "AINA YA KADI"],
    maliza.map((x, i) => [i + 1, x.jina, pesa(x.ahadi), pesa(x.amelipa), x.kadi || "-"]),
    ["", "JUMLA", pesa(jumla(maliza, "ahadi")), pesa(jumla(maliza, "amelipa")), ""],
    [2, 3],
    { 0: { cellWidth: 32 }, 2: { cellWidth: 100 }, 3: { cellWidth: 100 }, 4: { cellWidth: 68 } }
  );

  sehemu(
    "WALIOPUNGUZA (" + punguza.length + ") - bado wanadaiwa kiasi",
    CHUNGWA,
    ["S/N", "MAJINA", "KIASI KILICHOAHIDIWA (TSh)", "KIASI KILICHOPUNGUZWA (TSh)", "KILICHOBAKI (TSh)"],
    punguza.map((x, i) => [i + 1, x.jina, pesa(x.ahadi), pesa(x.amelipa), pesa(x.baki)]),
    ["", "JUMLA", pesa(jumla(punguza, "ahadi")), pesa(jumla(punguza, "amelipa")), pesa(jumla(punguza, "baki"))],
    [2, 3, 4],
    { 0: { cellWidth: 32 }, 2: { cellWidth: 95 }, 3: { cellWidth: 95 }, 4: { cellWidth: 78 } }
  );

  sehemu(
    "WASIOLIPA KABISA (" + deni.length + ")",
    NYEKUNDU,
    ["S/N", "MAJINA", "KIASI KILICHOAHIDIWA (TSh)", "KILICHOBAKI (TSh)"],
    deni.map((x, i) => [i + 1, x.jina, pesa(x.ahadi), pesa(x.baki)]),
    ["", "JUMLA", pesa(jumla(deni, "ahadi")), pesa(jumla(deni, "baki"))],
    [2, 3],
    { 0: { cellWidth: 32 }, 2: { cellWidth: 120 }, 3: { cellWidth: 110 } }
  );

  sehemu(
    "HAWAJAAHIDI (" + hajaahidi.length + ") - hawajaandikiwa ahadi",
    KIJIVU,
    ["S/N", "MAJINA"],
    hajaahidi.map((x, i) => [i + 1, x.jina]),
    ["", "JUMLA: " + hajaahidi.length],
    [],
    { 0: { cellWidth: 32 } }
  );

  // ---- Footer kwenye kila ukurasa ----
  const kurasa = doc.internal.getNumberOfPages();
  for (let i = 1; i <= kurasa; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(KIJIVU[0], KIJIVU[1], KIJIVU[2]);
    doc.text("JOHCARDS Customer Service", M, H - 24);
    doc.text("Ukurasa " + i + " wa " + kurasa, W - M, H - 24, { align: "right" });
  }

  doc.setProperties({ title: "Ripoti ya Michango - " + mtejaSasa.jina });

  const slug = mtejaSasa.jina.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 30) || "mteja";
  doc.save("ripoti-" + slug + "-" + new Date().toISOString().slice(0, 10) + ".pdf");
  ujumbe.textContent = "PDF report imepakuliwa.";
}

kitufeRipoti.addEventListener("click", tengenezaPDF);

// ====== KUSAJILI / KUFUTA MTEJA ======
chaguaMteja.addEventListener("change", () => {
  mtejaSasa = wateja.find(m => m.id === chaguaMteja.value) || null;
  if (mtejaSasa) {
    kumbukaMteja(mtejaSasa.id);
    badilishaMteja();
  }
});

document.getElementById("mtejaMpya").addEventListener("click", () => {
  fJina.value = "";
  fLink.value = "";
  fTab.value = "Michango";
  fUjumbe.textContent = "";
  fomu.hidden = false;
  fJina.focus();
});

document.getElementById("ghairiMteja").addEventListener("click", () => {
  fomu.hidden = true;
});

kitufeHifadhi.addEventListener("click", async () => {
  const jina = fJina.value.trim();
  const tab = fTab.value.trim() || "Michango";
  const m = fLink.value.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (!jina) { fUjumbe.textContent = "Andika jina la mteja au tukio."; return; }
  if (!m) { fUjumbe.textContent = "Link ya Google Sheet si sahihi. Bandika link nzima."; return; }

  kitufeHifadhi.disabled = true;
  fUjumbe.textContent = "Inahifadhi...";
  try {
    const ref = await WATEJA.add({
      jina: jina,
      sheetId: m[1],
      tab: tab,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    fomu.hidden = true;
    await pakiaWateja(ref.id);
  } catch (e) {
    fUjumbe.textContent = "Imeshindwa kuhifadhi: " + e.message;
  }
  kitufeHifadhi.disabled = false;
});

document.getElementById("futaMteja").addEventListener("click", async () => {
  if (!mtejaSasa) return;
  const ndiyo = confirm(
    'Futa mteja "' + mtejaSasa.jina + '"? Sheet yake haitaguswa, ila ataondoka kwenye mfumo huu.'
  );
  if (!ndiyo) return;
  try {
    await WATEJA.doc(mtejaSasa.id).delete();
    mtejaSasa = null;
    await pakiaWateja();
  } catch (e) {
    kichwa.textContent = "Imeshindwa kufuta: " + e.message;
  }
});

// ====== MATUKIO MENGINE ======
tafuta.addEventListener("input", () => {
  neno = tafuta.value.trim().toLowerCase();
  onyesha();
});
document.getElementById("sasisha").addEventListener("click", pakia);

// ====== ANZA ======
pakiaWateja();
