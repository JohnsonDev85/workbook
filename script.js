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

// ====== HALI YA UKURASA ======
let wateja = [];
let mtejaSasa = null;
let wote = [];
let kichujio = "wote";
let neno = "";

const kichwa = document.getElementById("kichwa");
const chaguaMteja = document.getElementById("chaguaMteja");
const maudhui = document.getElementById("maudhui");
const takwimu = document.getElementById("takwimu");
const mwili = document.getElementById("mwili");
const tafuta = document.getElementById("tafuta");
const kitufePakua = document.getElementById("pakua");
const ujumbe = document.getElementById("ujumbe");

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
  deni: "Wanadaiwa"
};

const majinaHali = {
  maliza: "Amemaliza",
  punguza: "Amepunguza",
  deni: "Anadaiwa"
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
  if (amelipa <= 0) return "deni";
  if (amelipa >= ahadi) return "maliza";
  return "punguza";
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

function watuWaKundi(kundi) {
  return wote.filter(x => kundi === "wote" || x.hali === kundi);
}

function sasishaKitufe() {
  const kundi = kundiLaSasa();
  const naSimu = watuWaKundi(kundi).filter(x => x.simuHali === "sawa").length;
  kitufePakua.textContent =
    "Pakua Excel: " + majinaKundi[kundi] + " (" + naSimu + ")";
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

    const h = rows.findIndex(r => r.some(c => c.toUpperCase().includes("MAJINA")));
    if (h < 0) throw new Error("Safu ya MAJINA haijaonekana");

    const head = rows[h].map(c => c.toUpperCase());
    const col = (k) => head.findIndex(c => c.includes(k));
    const iJina = col("MAJINA");
    const iAhadi = col("AHIDIWA");
    const iLipa = col("PUNGUZWA");
    const iSimu = col("SIMU");
    if (iAhadi < 0 || iLipa < 0 || iSimu < 0) {
      throw new Error("Nguzo moja au zaidi haijaonekana");
    }

    wote = rows.slice(h + 1)
      .filter(r => r[iJina] && r[iJina].trim() &&
                   r[iJina].trim().toUpperCase() !== "JUMLA" &&
                   nambari(r[iAhadi]) > 0)
      .map(r => {
        const ahadi = nambari(r[iAhadi]);
        const amelipa = nambari(r[iLipa]);
        const s = safishaSimu(r[iSimu]);
        return {
          jina: r[iJina].trim(),
          ahadi,
          amelipa,
          baki: Math.max(ahadi - amelipa, 0),
          simu: s.simu,
          simuHali: s.hali,
          hali: amuaHali(ahadi, amelipa)
        };
      });

    const saa = new Date().toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" });
    const jAhadi = wote.reduce((a, x) => a + x.ahadi, 0);
    const jLipa = wote.reduce((a, x) => a + x.amelipa, 0);
    kichwa.textContent =
      mtejaSasa.jina + " | Ahadi: " + pesa(jAhadi) + " | Kimelipwa: " + pesa(jLipa) +
      " | Kilichobaki: " + pesa(jAhadi - jLipa) + " | Imesasishwa " + saa;

    onyesha();
  } catch (e) {
    kichwa.textContent =
      mtejaSasa.jina + " — imeshindwa kusoma Sheet: " + e.message +
      ". Hakikisha link ni sahihi na imeshirikishwa kama 'Anyone with the link'.";
    wote = [];
    mwili.innerHTML = "";
    takwimu.innerHTML = "";
  }
}

// ====== KUONYESHA ======
function onyesha() {
  const idadi = {
    wote: wote.length,
    maliza: wote.filter(x => x.hali === "maliza").length,
    punguza: wote.filter(x => x.hali === "punguza").length,
    deni: wote.filter(x => x.hali === "deni").length
  };

  const kadi = [
    ["wote", "wote", "Wote"],
    ["maliza", "amilia", "Wamemaliza"],
    ["punguza", "mchache", "Wamepunguza"],
    ["deni", "deni", "Wanadaiwa"]
  ];

  takwimu.innerHTML = kadi.map(k =>
    '<button class="kadi ' + k[1] + (kichujio === k[0] ? " chaguliwa" : "") +
    '" data-k="' + k[0] + '">' +
    '<div class="namba">' + idadi[k[0]] + '</div>' +
    '<div class="maelezo">' + k[2] + '</div></button>'
  ).join("");

  sasishaKitufe();

  const orodha = watuWaKundi(kichujio).filter(x =>
    x.jina.toLowerCase().includes(neno)
  );

  if (!orodha.length) {
    mwili.innerHTML = '<tr><td colspan="7" class="tupu-ujumbe">Hakuna majina yanayolingana.</td></tr>';
    return;
  }

  mwili.innerHTML = orodha.map((x, i) => {
    let simuHtml;
    if (x.simuHali === "tupu") simuHtml = '<span class="onyo">Hana namba</span>';
    else if (x.simuHali === "kosa") simuHtml = esc(x.simu) + ' <span class="onyo">(ina shida)</span>';
    else simuHtml = esc(x.simu);

    return "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      "<td>" + esc(x.jina) + "</td>" +
      '<td class="kulia">' + pesa(x.ahadi) + "</td>" +
      '<td class="kulia">' + pesa(x.amelipa) + "</td>" +
      '<td class="kulia">' + pesa(x.baki) + "</td>" +
      "<td>" + simuHtml + "</td>" +
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

  const data = sawa.map(x => ({
    "jina": x.jina,
    "namba ya simu": String(x.simu),
    "kiasi kilichobaki": x.baki
  }));

  const ws = XLSX.utils.json_to_sheet(data, {
    header: ["jina", "namba ya simu", "kiasi kilichobaki"]
  });
  ws["!cols"] = [{ wch: 34 }, { wch: 16 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Majina");

  const slug = (mtejaSasa ? mtejaSasa.jina : "mteja")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "mteja";
  const tarehe = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, "michango-" + slug + "-" + kundi + "-" + tarehe + ".xlsx");

  ujumbe.textContent =
    majinaKundi[kundi] + ": imepakuliwa majina " + sawa.length + "." +
    (hawakujumuishwa
      ? " Hawakujumuishwa: " + hawakujumuishwa + " (hawana namba au ina shida)."
      : "");
});

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