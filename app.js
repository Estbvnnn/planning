// Planning PWA — v5 (UI polish, no overlap, unified buttons, 5 beep styles, i18n)
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
const emptyHint = $("#emptyHint");
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
const beepStyleSelect = $("#beepStyleSelect");
const testBeepBtn = $("#testBeepBtn");
const makeICSFromSettingsBtn = $("#makeICSFromSettingsBtn");
const saveSettingsBtn = $("#saveSettingsBtn");

// i18n
const dict = {
  fr: {
    menuTitle:"Planning",
    yearsHeading:"ANNÉES", toolsHeading:"OUTILS",
    addYear:"+ Ajouter une année",
    exportYear:"Exporter l’année (.ics)", exportBackup:"Exporter sauvegarde (.json)",
    importBackup:"Importer sauvegarde (.json)",
    settings:"Paramètres", install:"Installer",
    tapPlus:"Touchez “+” pour ajouter votre premier slot.",
    newItem:"Nouveau slot", editItem:"Modifier le slot",
    title:"Titre", date:"Date", timeOptional:"Heure (optionnel)", notes:"Notes",
    cancel:"Annuler", save:"Enregistrer",
    edit:"Modifier", delete:"Supprimer",
    theme:"Thème", themeAuto:"Auto (système)", themeDark:"Sombre", themeLight:"Clair",
    language:"Langue", dailyReminder:"Rappel quotidien (heure)",
    beepStyle:"Style de bip", beepClassic:"Classique", beepChime:"Carillon", beepBell:"Cloche", beepClick:"Clic", beepSweep:"Montée",
    testBeep:"Tester le bip", createICS:"Créer le rappel calendrier (.ics)", close:"Fermer",
    checkTomorrow:"Vérifier le planning de demain",
    toastImport:"Sauvegarde importée.", toastImportFail:"Import impossible : "
  },
  en: {
    menuTitle:"Planner",
    yearsHeading:"YEARS", toolsHeading:"TOOLS",
    addYear:"+ Add a year",
    exportYear:"Export year (.ics)", exportBackup:"Export backup (.json)",
    importBackup:"Import backup (.json)",
    settings:"Settings", install:"Install",
    tapPlus:"Tap “+” to add your first slot.",
    newItem:"New slot", editItem:"Edit slot",
    title:"Title", date:"Date", timeOptional:"Time (optional)", notes:"Notes",
    cancel:"Cancel", save:"Save",
    edit:"Edit", delete:"Delete",
    theme:"Theme", themeAuto:"Auto (system)", themeDark:"Dark", themeLight:"Light",
    language:"Language", dailyReminder:"Daily reminder (time)",
    beepStyle:"Beep style", beepClassic:"Classic", beepChime:"Chime", beepBell:"Bell", beepClick:"Click", beepSweep:"Sweep",
    testBeep:"Test beep", createICS:"Create calendar reminder (.ics)", close:"Close",
    checkTomorrow:"Review tomorrow’s plan",
    toastImport:"Backup imported.", toastImportFail:"Import failed: "
  }
};
const i18n = { lang:"fr", t:k => (dict[i18n.lang] && dict[i18n.lang][k]) || dict.fr[k] || k };

init();

function init(){
  const raw = localStorage.getItem("planningData");
  if(raw){ try{ state.data = JSON.parse(raw); }catch{ state.data=null; } }
  if(!state.data){
    state.data = { years:{}, settings:{ reminderTime:"21:00", theme:"auto", language:"fr", beepStyle:"classic" }, currentYear:String(new Date().getFullYear()) };
  }
  i18n.lang = state.data.settings.language || "fr";
  applyTheme(state.data.settings.theme || "auto");
  ensureYear(state.currentYear);

  // Listeners
  addItemLargeBtn.addEventListener("click", () => { closeDrawer(); openItemModal(); });
  addItemFab.addEventListener("click", () => { closeDrawer(); openItemModal(); });
  itemForm.addEventListener("submit", onSaveItem);
  addYearBtn.addEventListener("click", onAddYear);
  exportYearBtn.addEventListener("click", exportYearICS);
  backupBtn.addEventListener("click", exportBackupJSON);
  restoreInput.addEventListener("change", importBackupJSON);

  openSettingsBtn.addEventListener("click", ()=> settingsModal.showModal());
  saveSettingsBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    state.data.settings.theme = themeSelect.value;
    state.data.settings.language = langSelect.value;
    state.data.settings.reminderTime = reminderTimeSettings.value || "21:00";
    state.data.settings.beepStyle = beepStyleSelect.value || "classic";
    save();
    i18n.lang = state.data.settings.language;
    applyTheme(state.data.settings.theme);
    applyI18n();
    render();  // met à jour les libellés sur la liste
    settingsModal.close();
  });
  testBeepBtn.addEventListener("click", playBeep);
  makeICSFromSettingsBtn.addEventListener("click", createDailyReminderICS);

  hamburgerBtn.addEventListener("click", toggleDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (e)=>{ if(e.target === drawer) closeDrawer(); });

  // PWA install
  let deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e)=>{ e.preventDefault(); deferredInstallPrompt = e; installBtn.hidden = false; });
  installBtn.addEventListener("click", async ()=>{ if(!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; installBtn.hidden=true; });

  if("serviceWorker" in navigator){ navigator.serviceWorker.register("./service-worker.js").catch(console.error); }

  // Defaults
  themeSelect.value = state.data.settings.theme || "auto";
  langSelect.value = state.data.settings.language || "fr";
  reminderTimeSettings.value = state.data.settings.reminderTime || "21:00";
  beepStyleSelect.value = state.data.settings.beepStyle || "classic";

  applyI18n();
  render();
}

/* Core */
function ensureYear(y){ if(!state.data.years[y]){ state.data.years[y] = { items:[], lastModified: Date.now() }; save(); } }
function save(){ state.data.years[state.currentYear].lastModified = Date.now(); localStorage.setItem("planningData", JSON.stringify(state.data)); }
function render(){
  currentYearLabel.textContent = state.currentYear;
  yearHeading.textContent = state.currentYear;
  renderYearList(); renderItems();
}
function renderYearList(){
  yearList.innerHTML = "";
  Object.keys(state.data.years).sort().forEach(y=>{
    const btn = document.createElement("button");
    btn.className="btn btn--ghost";
    btn.textContent = y + (y===state.currentYear ? " •" : "");
    btn.addEventListener("click", ()=>{ state.currentYear=y; closeDrawer(); });
    yearList.appendChild(btn);
  });
}
function renderItems(){
  const items = [...state.data.years[state.currentYear].items];
  items.sort((a,b)=> (a.date+(a.time||"")) < (b.date+(b.time||"")) ? -1 : 1);
  itemsList.innerHTML="";
  if(items.length===0){ itemsSection.hidden=true; emptyState.hidden=false; return; }
  emptyState.hidden=true; itemsSection.hidden=false;

  const tmpl = $("#itemTemplate");
  for(const it of items){
    const node = tmpl.content.firstElementChild.cloneNode(true);
    $(".card-title", node).textContent = it.title;
    $(".card-date", node).textContent = formatDateTime(it.date, it.time);
    $(".card-notes", node).textContent = it.notes || "";
    $(".mini-btn.edit", node).textContent = i18n.t("edit");
    $(".mini-btn.delete", node).textContent = i18n.t("delete");
    $(".mini-btn.edit", node).addEventListener("click", ()=> openItemModal(it));
    $(".mini-btn.delete", node).addEventListener("click", ()=> deleteItem(it.id));
    itemsList.appendChild(node);
  }
}

/* Actions */
function onAddYear(){
  const y = prompt(i18n.lang==="fr"?"Créer une année (ex. 2026) :":"Create a year (e.g. 2026):", String(new Date().getFullYear()));
  if(!y) return;
  if(!/^[0-9]{4}$/.test(y)) { alert(i18n.lang==="fr"?"Année invalide":"Invalid year"); return; }
  ensureYear(y); state.currentYear=y; closeDrawer();
}
function openItemModal(item){
  closeDrawer();
  modalTitle.textContent = item ? i18n.t("editItem") : i18n.t("newItem");
  itemIdInput.value = item ? item.id : "";
  itemTitleInput.value = item ? item.title : "";
  itemDateInput.value = item ? item.date : "";
  itemTimeInput.value = item ? (item.time || "") : "";
  itemNotesInput.value = item ? (item.notes || "") : "";
  itemTitleInput.placeholder = (i18n.lang==="fr" ? "Ex. Rendez-vous" : "e.g. Meeting");
  itemNotesInput.placeholder = (i18n.lang==="fr" ? "Détails (optionnel)" : "Details (optional)");
  itemModal.showModal();
}
function onSaveItem(e){
  e.preventDefault();
  const id = itemIdInput.value || cryptoRandom();
  const title = (itemTitleInput.value||"").trim();
  const date = itemDateInput.value;
  const time = itemTimeInput.value || "";
  const notes = (itemNotesInput.value||"").trim();
  if(!title || !date) return;
  const items = state.data.years[state.currentYear].items;
  const idx = items.findIndex(x=>x.id===id);
  const payload = { id, title, date, time, notes, createdAt: idx>=0?items[idx].createdAt:Date.now() };
  if(idx>=0) items[idx]=payload; else items.push(payload);
  save(); itemModal.close(); render();
}
function deleteItem(id){
  if(!confirm(i18n.lang==="fr"?"Supprimer ce slot ?":"Delete this slot?")) return;
  const items = state.data.years[state.currentYear].items;
  const idx = items.findIndex(x=>x.id===id);
  if(idx>=0){ items.splice(idx,1); save(); render(); }
}

/* Drawer */
function toggleDrawer(){
  const open = !drawer.classList.contains("open");
  drawer.classList.toggle("open", open);
  hamburgerBtn.setAttribute("aria-expanded", String(open));
  drawer.setAttribute("aria-hidden", String(!open));
}
function closeDrawer(){ drawer.classList.remove("open"); hamburgerBtn.setAttribute("aria-expanded","false"); drawer.setAttribute("aria-hidden","true"); }

/* Utils */
function cryptoRandom(len=16){ const a=new Uint8Array(len); (self.crypto||window.crypto).getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join(""); }
function formatDateTime(d, t=""){ const [y,m,dd]=d.split("-").map(Number); const [H=0,Min=0]=(t||"").split(":").map(Number); const dt=new Date(y,m-1,dd,H||0,Min||0); const opts={weekday:"short",day:"2-digit",month:"short"}; const loc=(state.data?.settings?.language==="en")?"en-US":"fr-FR"; const date=dt.toLocaleDateString(loc,opts); return t?`${date} • ${t}`:date; }

/* Export ICS (année) */
function exportYearICS(){
  const y = state.currentYear;
  const items = [...state.data.years[y].items].sort((a,b)=> (a.date+(a.time||"")) < (b.date+(b.time||"")) ? -1 : 1);
  if(items.length===0){ alert((i18n.lang==="fr"?"Aucun slot dans ":"No slot in ")+y); return; }
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planning PWA//","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VTIMEZONE","TZID:Europe/Paris","X-LIC-LOCATION:Europe/Paris",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE"];
  const now=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  for(const it of items){
    const dtStart = toICS(it.date, it.time||"09:00");
    lines.push("BEGIN:VEVENT","UID:"+it.id+"@planning-pwa","DTSTAMP:"+now,"DTSTART;TZID=Europe/Paris:"+dtStart,"SUMMARY:"+icsEscape(it.title));
    if(it.notes) lines.push("DESCRIPTION:"+icsEscape(it.notes));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  downloadBlob(new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}),`planning-${y}.ics`);
}

/* Daily reminder ICS (optionnel) */
function createDailyReminderICS(){
  const time=(reminderTimeSettings?.value||"21:00").trim();
  const [H,M]=time.split(":").map(Number);
  const first=new Date(); first.setHours(H||21,M||0,0,0); if(first.getTime()<=Date.now()) first.setDate(first.getDate()+1);
  const dtStart=toICSfromDate(first);
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planning PWA//","CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE","TZID:Europe/Paris","X-LIC-LOCATION:Europe/Paris",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE",
    "BEGIN:VEVENT","UID:daily-reminder@"+cryptoRandom(),"DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z","DTSTART;TZID=Europe/Paris:"+dtStart,"RRULE:FREQ=DAILY",
    "SUMMARY:"+icsEscape(i18n.t("checkTomorrow")),"DESCRIPTION:"+icsEscape(i18n.t("checkTomorrow")),"BEGIN:VALARM","TRIGGER:-PT0M","ACTION:DISPLAY","END:VALARM","END:VEVENT","END:VCALENDAR"];
  downloadBlob(new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}),`planning-reminder-${time.replace(":","")}.ics`);
  alert(i18n.lang==="fr"?"Fichier .ics créé. Ajoutez-le à Calendrier si vous voulez une notif native.":"ICS created. Add to Calendar if you want a native notification.");
}

/* Helpers ICS/backup/theme/i18n */
function icsEscape(s){ return (s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,|;/g, m => m===","?"\\,":"\\;"); }
function toICS(d,t){ const [y,m,dd]=d.split("-").map(Number); const [H=9,Min=0]=(t||"09:00").split(":").map(Number); return `${y}${String(m).padStart(2,"0")}${String(dd).padStart(2,"0")}T${String(H).padStart(2,"0")}${String(Min).padStart(2,"0")}00`; }
function toICSfromDate(dt){ const y=dt.getFullYear(),m=String(dt.getMonth()+1).padStart(2,"0"),d=String(dt.getDate()).padStart(2,"0"),H=String(dt.getHours()).padStart(2,"0"),Min=String(dt.getMinutes()).padStart(2,"0"); return `${y}${m}${d}T${H}${Min}00`; }
function exportBackupJSON(){ downloadBlob(new Blob([JSON.stringify(state.data,null,2)],{type:"application/json"}),"planning-backup.json"); }
function importBackupJSON(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader(); r.onload=()=>{ try{ const obj=JSON.parse(r.result); if(!obj||typeof obj!=="object") throw new Error("Format invalide"); state.data=obj; ensureYear(state.currentYear); save(); render(); alert(i18n.t("toastImport")); }catch(err){ alert(i18n.t("toastImportFail")+err.message); } }; r.readAsText(f);
}
function downloadBlob(blob,filename){ const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0); }
function applyTheme(mode){ const html=document.documentElement; if(mode==="dark") html.setAttribute("data-theme","dark"); else if(mode==="light") html.setAttribute("data-theme","light"); else html.removeAttribute("data-theme"); }
function applyI18n(){
  document.documentElement.lang = (i18n.lang==="en")?"en":"fr";
  $$("[data-i18n]").forEach(el=>{ const k=el.getAttribute("data-i18n"); if(dict[i18n.lang][k]) el.textContent=dict[i18n.lang][k]; });
  itemTitleInput.placeholder = (i18n.lang==="fr" ? "Ex. Rendez-vous" : "e.g. Meeting");
  itemNotesInput.placeholder = (i18n.lang==="fr" ? "Détails (optionnel)" : "Details (optional)");
  const foot=$("#footnote"); if(foot) foot.textContent=(i18n.lang==="fr"?"Ultra épuré. Offline. PWA. — v5":"Ultra minimal. Offline. PWA. — v5");
}

/* WebAudio beep styles (5 choix) */
function playBeep(){
  try{
    const style = (beepStyleSelect?.value) || state.data.settings.beepStyle || "classic";
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    function tone(freq, type="sine", start=0, dur=0.25, gainMax=0.2){
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(gainMax, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + start); osc.stop(now + start + dur + 0.02);
    }
    function sweep(f1, f2, dur=0.4){
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type="sine"; osc.frequency.setValueAtTime(f1, now);
      osc.frequency.exponentialRampToValueAtTime(f2, now + dur);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(g).connect(ctx.destination); osc.start(now); osc.stop(now + dur + 0.02);
    }
    function click(){
      const buffer = ctx.createBuffer(1, 2205, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<data.length;i++){ data[i] = (Math.random()*2-1) * Math.exp(-i/200); }
      const src = ctx.createBufferSource(); src.buffer = buffer;
      src.connect(ctx.destination); src.start(now);
    }

    switch(style){
      case "classic": tone(880,"sine",0,0.28,0.22); break;
      case "chime":   tone(880,"sine",0,0.18,0.18); tone(660,"sine",0.16,0.22,0.16); break;
      case "bell":    tone(660,"triangle",0,0.40,0.24); tone(1320,"sine",0,0.25,0.10); break;
      case "click":   click(); break;
      case "sweep":   sweep(500,1400,0.45); break;
    }
  }catch(e){ console.warn("Audio not available", e); }
}
