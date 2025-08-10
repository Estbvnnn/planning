// Planning PWA — clean rebuild (robust menu & settings)
const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => Array.from(root.querySelectorAll(q));

const state = {
  data: null,
  get currentYear(){ return this.data.currentYear || String(new Date().getFullYear()); },
  set currentYear(y){ this.data.currentYear = y; save(); render(); }
};

// Elements
const emptyState = $("#emptyState");
const itemsSection = $("#itemsSection");
const itemsList = $("#itemsList");
const yearHeading = $("#yearHeading");
const currentYearLabel = $("#currentYearLabel");
const addItemLargeBtn = $("#addItemLargeBtn");
const addItemFab = $("#addItemFab");
const itemModal = $("#itemModal");
const itemForm = $("#itemForm");
const modalTitle = $("#modalTitle");
const itemIdInput = $("#itemId");
const itemTitleInput = $("#itemTitle");
const itemDateInput = $("#itemDate");
const itemTimeInput = $("#itemTime");
const itemNotesInput = $("#itemNotes");
const yearList = $("#yearList");
const addYearBtn = $("#addYearBtn");
const exportYearBtn = $("#exportYearBtn");
const backupBtn = $("#backupBtn");
const restoreInput = $("#restoreInput");
const installBtn = $("#installBtn");
const drawer = $("#drawer");
const hamburgerBtn = $("#hamburgerBtn");
const closeDrawerBtn = $("#closeDrawerBtn");

// Settings
const openSettingsBtn = $("#openSettingsBtn");
const settingsModal = $("#settingsModal");
const themeSelect = $("#themeSelect");
const langSelect = $("#langSelect");
const reminderTimeSettings = $("#reminderTimeSettings");
const soundEnabledInput = $("#soundEnabled");
const testBeepBtn = $("#testBeepBtn");
const makeICSFromSettingsBtn = $("#makeICSFromSettingsBtn");
const saveSettingsBtn = $("#saveSettingsBtn");

// i18n
const i18n = { lang: "fr", t(k){ return (dict[this.lang] && dict[this.lang][k]) || dict.fr[k] || k; } };
const dict = {
  fr: { newItem:"Nouvel élément", editItem:"Modifier l’élément" },
  en: { newItem:"New item", editItem:"Edit item" }
};

// Utils
function setIf(el, prop, val){ if(el) el[prop] = val; }

init();

function init(){
  // Storage
  const raw = localStorage.getItem("planningData");
  if(raw){ try { state.data = JSON.parse(raw); } catch(e){ state.data = null; } }
  if(!state.data){
    state.data = { years:{}, settings:{ reminderTime:"21:00", theme:"auto", language:"fr", sound:true }, currentYear:String(new Date().getFullYear()) };
  }
  ensureYear(state.currentYear);

  // Listeners
  addItemLargeBtn.addEventListener("click", () => openItemModal());
  addItemFab.addEventListener("click", () => openItemModal());
  itemForm.addEventListener("submit", onSaveItem);
  addYearBtn.addEventListener("click", onAddYear);
  exportYearBtn.addEventListener("click", exportYearICS);
  backupBtn.addEventListener("click", exportBackupJSON);
  restoreInput.addEventListener("change", importBackupJSON);

  // Settings
  openSettingsBtn.addEventListener("click", ()=> settingsModal.showModal());
  saveSettingsBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    state.data.settings.theme = themeSelect.value;
    state.data.settings.language = langSelect.value;
    state.data.settings.reminderTime = reminderTimeSettings.value || "21:00";
    state.data.settings.sound = !!soundEnabledInput.checked;
    save();
    i18n.lang = state.data.settings.language;
    applyTheme(state.data.settings.theme);
    settingsModal.close();
  });
  testBeepBtn.addEventListener("click", playBeep);
  makeICSFromSettingsBtn.addEventListener("click", createDailyReminderICS);

  // Drawer
  hamburgerBtn.addEventListener("click", toggleDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (e)=>{ if(e.target === drawer) closeDrawer(); });

  // PWA install
  let deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault(); deferredInstallPrompt = e; installBtn.hidden = false;
  });
  installBtn.addEventListener("click", async ()=>{
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null; installBtn.hidden = true;
  });

  // SW
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("./service-worker.js").catch(console.error);
  }

  // Defaults
  themeSelect.value = state.data.settings.theme || "auto";
  langSelect.value = state.data.settings.language || "fr";
  reminderTimeSettings.value = state.data.settings.reminderTime || "21:00";
  soundEnabledInput.checked = !!state.data.settings.sound;
  i18n.lang = state.data.settings.language || "fr";
  applyTheme(state.data.settings.theme || "auto");

  render();
}

function ensureYear(y){
  if(!state.data.years[y]){
    state.data.years[y] = { items:[], lastModified: Date.now() };
    save();
  }
}

function save(){
  state.data.years[state.currentYear].lastModified = Date.now();
  localStorage.setItem("planningData", JSON.stringify(state.data));
}

function render(){
  setText(currentYearLabel, state.currentYear);
  setText(yearHeading, state.currentYear);
  renderYearList();
  renderItems();
}
function setText(el, text){ if(el) el.textContent = text; }

function renderYearList(){
  yearList.innerHTML = "";
  const years = Object.keys(state.data.years).sort();
  years.forEach(y => {
    const btn = document.createElement("button");
    btn.className = "ghost-btn";
    btn.textContent = y + (y === state.currentYear ? " •" : "");
    btn.addEventListener("click", ()=>{ state.currentYear = y; closeDrawer(); });
    yearList.appendChild(btn);
  });
}

function renderItems(){
  const items = [...state.data.years[state.currentYear].items];
  items.sort((a,b)=> (a.date+(a.time||"")) < (b.date+(b.time||"")) ? -1 : 1);
  itemsList.innerHTML = "";
  if(items.length === 0){
    itemsSection.hidden = true; emptyState.hidden = false; return;
  }
  emptyState.hidden = true; itemsSection.hidden = false;
  const tmpl = $("#itemTemplate");
  for(const it of items){
    const node = tmpl.content.firstElementChild.cloneNode(true);
    $(".card-title", node).textContent = it.title;
    $(".card-date", node).textContent = formatDateTime(it.date, it.time);
    $(".card-notes", node).textContent = it.notes || "";
    $(".mini-btn.edit", node).addEventListener("click", ()=> openItemModal(it));
    $(".mini-btn.delete", node).addEventListener("click", ()=> deleteItem(it.id));
    itemsList.appendChild(node);
  }
}

function onAddYear(){
  const y = prompt("Créer une année (ex. 2026) :", String(new Date().getFullYear()));
  if(!y) return;
  if(!/^[0-9]{4}$/.test(y)) { alert("Année invalide"); return; }
  ensureYear(y);
  state.currentYear = y;
  closeDrawer();
}

function openItemModal(item){
  modalTitle.textContent = item ? i18n.t("editItem") : i18n.t("newItem");
  itemIdInput.value = item ? item.id : "";
  itemTitleInput.value = item ? item.title : "";
  itemDateInput.value = item ? item.date : "";
  itemTimeInput.value = item ? (item.time || "") : "";
  itemNotesInput.value = item ? (item.notes || "") : "";
  itemModal.showModal();
}

function onSaveItem(e){
  e.preventDefault();
  const id = itemIdInput.value || cryptoRandom();
  const title = (itemTitleInput.value || "").trim();
  const date = itemDateInput.value;
  const time = itemTimeInput.value || "";
  const notes = (itemNotesInput.value || "").trim();
  if(!title || !date){ return; }

  const items = state.data.years[state.currentYear].items;
  const existingIdx = items.findIndex(x=>x.id===id);
  const payload = { id, title, date, time, notes, createdAt: existingIdx>=0 ? items[existingIdx].createdAt : Date.now() };
  if(existingIdx>=0) items[existingIdx] = payload;
  else items.push(payload);

  save(); itemModal.close(); render();
}

function deleteItem(id){
  if(!confirm("Supprimer cet élément ?")) return;
  const items = state.data.years[state.currentYear].items;
  const idx = items.findIndex(x=>x.id===id);
  if(idx>=0){ items.splice(idx,1); save(); render(); }
}

// Drawer
function toggleDrawer(){
  const open = !drawer.classList.contains("open");
  drawer.classList.toggle("open", open);
  hamburgerBtn.setAttribute("aria-expanded", String(open));
  drawer.setAttribute("aria-hidden", String(!open));
}
function closeDrawer(){
  drawer.classList.remove("open");
  hamburgerBtn.setAttribute("aria-expanded", "false");
  drawer.setAttribute("aria-hidden", "true");
}

// Helpers
function cryptoRandom(len=16){
  const arr = new Uint8Array(len); (self.crypto || window.crypto).getRandomValues(arr);
  return Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function formatDateTime(yyyy_mm_dd, hhmm=""){
  const [y,m,d] = yyyy_mm_dd.split("-").map(Number);
  const [H=0,Min=0] = (hhmm||"").split(":").map(Number);
  const dt = new Date(y, m-1, d, H||0, Min||0);
  const opts = { weekday:"short", day:"2-digit", month:"short" };
  const locale = (state.data?.settings?.language === "en") ? "en-US" : "fr-FR";
  const date = dt.toLocaleDateString(locale, opts);
  const time = hhmm ? " • " + hhmm : "";
  return date + time;
}

// Export year .ics
function exportYearICS(){
  const y = state.currentYear;
  const items = [...state.data.years[y].items].sort((a,b)=> (a.date+(a.time||"")) < (b.date+(b.time||"")) ? -1 : 1);
  if(items.length===0){ alert("Aucun élément dans " + y); return; }

  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Planning PWA//FR");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("BEGIN:VTIMEZONE");
  lines.push("TZID:Europe/Paris");
  lines.push("X-LIC-LOCATION:Europe/Paris");
  lines.push("BEGIN:DAYLIGHT");
  lines.push("TZOFFSETFROM:+0100");
  lines.push("TZOFFSETTO:+0200");
  lines.push("TZNAME:CEST");
  lines.push("DTSTART:19700329T020000");
  lines.push("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU");
  lines.push("END:DAYLIGHT");
  lines.push("BEGIN:STANDARD");
  lines.push("TZOFFSETFROM:+0200");
  lines.push("TZOFFSETTO:+0100");
  lines.push("TZNAME:CET");
  lines.push("DTSTART:19701025T030000");
  lines.push("RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU");
  lines.push("END:STANDARD");
  lines.push("END:VTIMEZONE");

  const nowStamp = new Date().toISOString().replace(/[-:]/g,"").split(".")[0] + "Z";
  for(const it of items){
    const dtStart = toICSLocalDateTime(it.date, it.time || "09:00");
    lines.push("BEGIN:VEVENT");
    lines.push("UID:" + it.id + "@planning-pwa");
    lines.push("DTSTAMP:" + nowStamp);
    lines.push("DTSTART;TZID=Europe/Paris:" + dtStart);
    lines.push("SUMMARY:" + icsEscape(it.title));
    if(it.notes){ lines.push("DESCRIPTION:" + icsEscape(it.notes)); }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type:"text/calendar;charset=utf-8" });
  downloadBlob(blob, `planning-${y}.ics`);
}

// Daily reminder .ics
function createDailyReminderICS(){
  const time = (reminderTimeSettings?.value || "21:00").trim();
  const [H, M] = time.split(":").map(Number);
  const first = new Date();
  first.setHours(H||21, M||0, 0, 0);
  if(first.getTime() <= Date.now()){ first.setDate(first.getDate() + 1); }
  const dtStart = toICSLocalDateTimeISO(first);
  const lines = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Planning PWA//FR");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("BEGIN:VTIMEZONE");
  lines.push("TZID:Europe/Paris");
  lines.push("X-LIC-LOCATION:Europe/Paris");
  lines.push("BEGIN:DAYLIGHT");
  lines.push("TZOFFSETFROM:+0100");
  lines.push("TZOFFSETTO:+0200");
  lines.push("TZNAME:CEST");
  lines.push("DTSTART:19700329T020000");
  lines.push("RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU");
  lines.push("END:DAYLIGHT");
  lines.push("BEGIN:STANDARD");
  lines.push("TZOFFSETFROM:+0200");
  lines.push("TZOFFSETTO:+0100");
  lines.push("TZNAME:CET");
  lines.push("DTSTART:19701025T030000");
  lines.push("RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU");
  lines.push("END:STANDARD");
  lines.push("END:VTIMEZONE");
  lines.push("BEGIN:VEVENT");
  lines.push("UID:daily-reminder@" + cryptoRandom());
  lines.push("DTSTAMP:" + new Date().toISOString().replace(/[-:]/g,"").split(".")[0] + "Z");
  lines.push("DTSTART;TZID=Europe/Paris:" + dtStart);
  lines.push("RRULE:FREQ=DAILY");
  lines.push("SUMMARY:Vérifier le planning de demain");
  lines.push("DESCRIPTION:Ouvrez l’app Planning et jetez un œil à demain.");
  lines.push("BEGIN:VALARM");
  lines.push("TRIGGER:-PT0M");
  if(state.data.settings && state.data.settings.sound){ lines.push("ACTION:AUDIO"); }
  else { lines.push("ACTION:DISPLAY"); lines.push("DESCRIPTION:Rappel quotidien — Planning"); }
  lines.push("END:VALARM");
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type:"text/calendar;charset=utf-8" });
  downloadBlob(blob, `planning-rappel-quotidien-${time.replace(":","")}.ics`);
  alert("Fichier .ics créé. Ajoutez-le à Calendrier pour recevoir la notif quotidienne.");
}

// ICS helpers
function icsEscape(s){
  return (s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,|;|\r|\n/g, (m)=> ({",":"\\,", ";":"\\;", "\r":"", "\n":"\\n"}[m]));
}
function toICSLocalDateTime(dateStr, timeStr){
  const [y,m,d] = dateStr.split("-").map(Number);
  const [H=9,Min=0] = (timeStr||"09:00").split(":").map(Number);
  return `${y}${String(m).padStart(2,"0")}${String(d).padStart(2,"0")}T${String(H).padStart(2,"0")}${String(Min).padStart(2,"0")}00`;
}
function toICSLocalDateTimeISO(dateObj){
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth()+1).padStart(2,"0");
  const d = String(dateObj.getDate()).padStart(2,"0");
  const H = String(dateObj.getHours()).padStart(2,"0");
  const Min = String(dateObj.getMinutes()).padStart(2,"0");
  return `${y}${m}${d}T${H}${Min}00`;
}

// Backup
function exportBackupJSON(){
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type:"application/json" });
  downloadBlob(blob, "planning-backup.json");
}
function importBackupJSON(e){
  const file = e.target.files[0];
  if(!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try{
      const obj = JSON.parse(fr.result);
      if(!obj || typeof obj !== "object") throw new Error("Format invalide");
      state.data = obj;
      ensureYear(state.currentYear);
      save(); render();
      alert("Sauvegarde importée.");
    }catch(err){ alert("Import impossible : " + err.message); }
  };
  fr.readAsText(file);
}

// Download helper
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
}

// Theme + audio helpers
function applyTheme(mode){
  const html = document.documentElement;
  if(mode === "dark"){ html.setAttribute("data-theme","dark"); }
  else if(mode === "light"){ html.setAttribute("data-theme","light"); }
  else { html.removeAttribute("data-theme"); }
}
function playBeep(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  }catch(e){ console.warn("Audio not available", e); }
}
