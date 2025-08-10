// Planning v6 — swipe drawer + day/week/month views + better layout
const $  = (q, r=document) => r.querySelector(q);
const $$ = (q, r=document) => Array.from(r.querySelectorAll(q));

/* ---------------- State ---------------- */
const state = {
  data: null,
  get currentYear(){ return this.data.currentYear || String(new Date().getFullYear()); },
  set currentYear(y){ this.data.currentYear = y; save(); render(); },
  view: "home",            // "home" | "calendar"
  viewMode: "day",         // "day" | "week" | "month"
  selectedDate: todayISO() // yyyy-mm-dd
};

/* ---------------- Elements ---------------- */
const drawer = $("#drawer");
const hamburgerBtn = $("#hamburgerBtn");
const closeDrawerBtn = $("#closeDrawerBtn");
const edgeOpener = $("#edgeOpener");

const yearList = $("#yearList");
const addYearBtn = $("#addYearBtn");
const backupBtn = $("#backupBtn");
const restoreInput = $("#restoreInput");

const topTitle = $("#topTitle");
const viewModeBtn = $("#viewModeBtn");
const viewMenu = $("#viewMenu");

const homeSection = $("#homeSection");
const addItemLargeBtn = $("#addItemLargeBtn");

const calendarSection = $("#calendarSection");
const calLabel = $("#calLabel");
const calContent = $("#calContent");
const addItemFab = $("#addItemFab");
const exportYearBtn = $("#exportYearBtn");

const itemModal = $("#itemModal");
const itemForm = $("#itemForm");
const modalTitle = $("#modalTitle");
const itemIdInput = $("#itemId");
const itemTitleInput = $("#itemTitle");
const itemDateInput = $("#itemDate");
const itemTimeInput = $("#itemTime");
const itemNotesInput = $("#itemNotes");

const settingsModal = $("#settingsModal");
const themeSelect = $("#themeSelect");
const langSelect = $("#langSelect");
const reminderTimeSettings = $("#reminderTimeSettings");
const beepStyleSelect = $("#beepStyleSelect");
const testBeepBtn = $("#testBeepBtn");
const makeICSFromSettingsBtn = $("#makeICSFromSettingsBtn");
const saveSettingsBtn = $("#saveSettingsBtn");
const installBtn = $("#installBtn");

/* ---------------- Init ---------------- */
init();
function init(){
  // Storage
  const raw = localStorage.getItem("planningData");
  if(raw){ try{ state.data = JSON.parse(raw); } catch{ state.data=null; } }
  if(!state.data){
    state.data = {
      years:{},
      settings:{ theme:"auto", language:"fr", reminderTime:"21:00", beepStyle:"classic" },
      currentYear: String(new Date().getFullYear())
    };
  }
  // ensure current year
  ensureYear(state.currentYear);
  // if selectedDate not in currentYear, set Jan 1
  if(state.selectedDate.slice(0,4) !== state.currentYear){
    state.selectedDate = `${state.currentYear}-01-01`;
  }

  // Listeners — drawer
  hamburgerBtn.addEventListener("click", toggleDrawer);
  closeDrawerBtn.addEventListener("click", closeDrawer);
  drawer.addEventListener("click", (e)=>{ if(e.target === drawer) closeDrawer(); });
  enableDrawerSwipe();

  // Edge swipe to open
  enableEdgeOpen();

  // Menu years
  addYearBtn.addEventListener("click", onAddYear);

  // Tools
  backupBtn.addEventListener("click", exportBackupJSON);
  restoreInput.addEventListener("change", importBackupJSON);
  exportYearBtn.addEventListener("click", exportYearICS);

  // Home
  addItemLargeBtn.addEventListener("click", ()=>{ closeDrawer(); openItemModal({date: state.selectedDate}); });

  // Calendar
  addItemFab.addEventListener("click", ()=> openItemModal({date: state.selectedDate}) );

  // View menu
  viewModeBtn.addEventListener("click", ()=>{
    const open = viewMenu.hidden;
    viewMenu.hidden = !open;
    viewModeBtn.setAttribute("aria-expanded", String(open));
  });
  viewMenu.addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-view]");
    if(!btn) return;
    state.viewMode = btn.dataset.view; // "day" | "week" | "month"
    viewModeBtn.textContent = (state.viewMode==="day" ? "Jour ▾" : state.viewMode==="week" ? "Semaine ▾" : "Mois ▾");
    viewMenu.hidden = true;
    render();
  });
  document.addEventListener("click", (e)=>{
    if(!viewMenu.hidden && !viewMenu.contains(e.target) && e.target !== viewModeBtn) viewMenu.hidden = true;
  });

  // Swipe on calendar content
  enableCalendarSwipe();

  // Settings
  $("#openSettingsBtn").addEventListener("click", ()=> settingsModal.showModal());
  saveSettingsBtn.addEventListener("click", (e)=>{
    e.preventDefault();
    state.data.settings.theme = themeSelect.value;
    state.data.settings.language = langSelect.value;
    state.data.settings.reminderTime = reminderTimeSettings.value || "21:00";
    state.data.settings.beepStyle = beepStyleSelect.value || "classic";
    save();
    applyTheme(state.data.settings.theme);
    settingsModal.close();
  });
  testBeepBtn.addEventListener("click", playBeep);
  makeICSFromSettingsBtn.addEventListener("click", createDailyReminderICS);

  // PWA install
  let deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", (e)=>{ e.preventDefault(); deferredInstallPrompt=e; installBtn.hidden=false; });
  installBtn.addEventListener("click", async ()=>{ if(!deferredInstallPrompt) return; deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; installBtn.hidden=true; });

  // Theme defaults
  applyTheme(state.data.settings.theme || "auto");
  themeSelect.value = state.data.settings.theme || "auto";
  langSelect.value = state.data.settings.language || "fr";
  reminderTimeSettings.value = state.data.settings.reminderTime || "21:00";
  beepStyleSelect.value = state.data.settings.beepStyle || "classic";

  // SW
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("./service-worker.js").catch(console.error); }

  // First render
  render();
}

/* ---------------- Data helpers ---------------- */
function ensureYear(y){
  if(!state.data.years[y]) state.data.years[y] = { items:[], lastModified: Date.now() };
}
function save(){
  const y = state.currentYear;
  if(state.data.years[y]) state.data.years[y].lastModified = Date.now();
  localStorage.setItem("planningData", JSON.stringify(state.data));
}

/* ---------------- Render ---------------- */
function render(){
  // menu years
  renderYearList();

  // title topbar
  if(state.view === "home"){
    topTitle.textContent = "Accueil";
  }else{
    const d = new Date(state.selectedDate);
    const options = { day:"2-digit", month:"long", year:"numeric" };
    const label = d.toLocaleDateString(langSelect.value==="en"?"en-US":"fr-FR", options);
    topTitle.textContent = `Calendrier ${state.currentYear}`;
    calLabel.textContent = state.viewMode==="day" ? label :
      state.viewMode==="week" ? weekLabel(d, langSelect.value) :
      monthLabel(d, langSelect.value);
  }

  // sections
  homeSection.hidden     = (state.view !== "home");
  calendarSection.hidden = (state.view !== "calendar");

  // view mode button visible seulement sur planning
  viewModeBtn.style.display = state.view === "calendar" ? "inline-flex" : "none";

  // calendar content
  if(state.view === "calendar"){
    renderCalendar();
  }
}

function renderYearList(){
  yearList.innerHTML = "";
  const years = Object.keys(state.data.years).sort();
  years.forEach(y=>{
    const btn = document.createElement("button");
    btn.className = "btn btn--ghost";
    btn.textContent = `Calendrier ${y}` + (y===state.currentYear ? " •" : "");
    btn.addEventListener("click", ()=>{
      state.currentYear = y;
      // si date hors année, recale sur 1er janvier
      if(state.selectedDate.slice(0,4) !== y) state.selectedDate = `${y}-01-01`;
      state.view = "calendar";
      closeDrawer();
      render();
    });
    yearList.appendChild(btn);
  });
}

function renderCalendar(){
  const mode = state.viewMode; // day | week | month
  const d = new Date(state.selectedDate);
  const items = state.data.years[state.currentYear].items;

  calContent.innerHTML = "";
  if(mode === "day"){
    const list = document.createElement("div");
    list.className = "day-list";
    const todays = items.filter(it => it.date === isoDate(d)).sort(sortByDateTime);
    if(todays.length === 0){
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = langSelect.value==="en" ? "No entry for this day." : "Aucun slot ce jour.";
      list.appendChild(p);
    }else{
      const tmpl = $("#itemTemplate");
      todays.forEach(it=>{
        const node = tmpl.content.firstElementChild.cloneNode(true);
        $(".card-title", node).textContent = it.title;
        $(".card-date", node).textContent  = it.time ? it.time : "";
        $(".card-notes", node).textContent = it.notes || "";
        $(".mini-btn.edit", node).addEventListener("click", ()=> openItemModal(it));
        $(".mini-btn.delete", node).addEventListener("click", ()=> deleteItem(it.id));
        list.appendChild(node);
      });
    }
    calContent.appendChild(list);

  }else if(mode === "week"){
    const grid = document.createElement("div");
    grid.className = "week-grid";
    const start = weekStart(d);
    for(let i=0;i<7;i++){
      const day = addDays(start, i);
      const col = document.createElement("div");
      col.className = "week-col";
      const h4 = document.createElement("h4");
      h4.textContent = day.toLocaleDateString(langSelect.value==="en"?"en-US":"fr-FR", { weekday:"short", day:"2-digit", month:"short" });
      col.appendChild(h4);

      const dayItems = items.filter(it => it.date === isoDate(day)).sort(sortByDateTime);
      if(dayItems.length===0){
        const p = document.createElement("p"); p.className="muted"; p.textContent = "—";
        col.appendChild(p);
      }else{
        const ul = document.createElement("div");
        dayItems.forEach(it=>{
          const a = document.createElement("div");
          a.className = "card";
          a.innerHTML = `<div class="card-row">
              <div class="card-title">${escapeHTML(it.title)}</div>
              <div class="card-date">${it.time || ""}</div>
            </div>
            ${it.notes?`<div class="card-notes">${escapeHTML(it.notes)}</div>`:""}
            <div class="card-actions">
              <button class="mini-btn edit">Modifier</button>
              <button class="mini-btn danger delete">Supprimer</button>
            </div>`;
          $(".edit",a).addEventListener("click", ()=> openItemModal(it));
          $(".delete",a).addEventListener("click", ()=> deleteItem(it.id));
          ul.appendChild(a);
        });
        col.appendChild(ul);
      }
      grid.appendChild(col);
    }
    calContent.appendChild(grid);

  }else{ // month
    const grid = document.createElement("div");
    grid.className = "month-grid";

    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const start = weekStart(first);
    for(let i=0;i<42;i++){
      const day = addDays(start, i);
      const cell = document.createElement("div");
      cell.className = "month-cell";
      const inMonth = (day.getMonth() === d.getMonth());
      if(!inMonth) cell.style.opacity = .45;
      const head = document.createElement("div");
      head.className = "d";
      head.textContent = day.getDate();
      cell.appendChild(head);

      const dayItems = items.filter(it => it.date === isoDate(day));
      if(dayItems.length){
        const dots = document.createElement("div");
        dayItems.slice(0,5).forEach(()=>{ const dot=document.createElement("span"); dot.className="dot"; dots.appendChild(dot); });
        cell.appendChild(dots);
      }
      cell.addEventListener("click", ()=>{
        state.viewMode = "day";
        state.selectedDate = isoDate(day);
        viewModeBtn.textContent = "Jour ▾";
        render();
      });
      grid.appendChild(cell);
    }
    calContent.appendChild(grid);
  }
}

/* ---------------- Gestures ---------------- */
function enableCalendarSwipe(){
  let sx=0, sy=0, dragging=false;
  calContent.addEventListener("touchstart", (e)=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; dragging=true; }, {passive:true});
  calContent.addEventListener("touchmove", (e)=>{
    if(!dragging) return;
    const t=e.touches[0];
    const dx = t.clientX - sx, dy = t.clientY - sy;
    if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)){
      dragging=false;
      if(dx < 0) goNext(); else goPrev();
    }
  }, {passive:true});
  calContent.addEventListener("touchend", ()=> dragging=false);
}
function goNext(){
  const d = new Date(state.selectedDate);
  if(state.viewMode==="day")      state.selectedDate = isoDate(addDays(d, 1));
  else if(state.viewMode==="week")state.selectedDate = isoDate(addDays(d, 7));
  else                             state.selectedDate = isoDate(addMonths(d, 1));
  render();
}
function goPrev(){
  const d = new Date(state.selectedDate);
  if(state.viewMode==="day")      state.selectedDate = isoDate(addDays(d, -1));
  else if(state.viewMode==="week")state.selectedDate = isoDate(addDays(d, -7));
  else                             state.selectedDate = isoDate(addMonths(d, -1));
  render();
}
function enableDrawerSwipe(){
  let startX=0, startY=0, active=false;
  drawer.addEventListener("touchstart", (e)=>{ const t=e.touches[0]; startX=t.clientX; startY=t.clientY; active=true; }, {passive:true});
  drawer.addEventListener("touchmove", (e)=>{
    if(!active) return;
    const t=e.touches[0]; const dx=t.clientX - startX; const dy=t.clientY - startY;
    if(Math.abs(dx)>50 && Math.abs(dx) > Math.abs(dy) && dx<0){ active=false; closeDrawer(); }
  }, {passive:true});
  drawer.addEventListener("touchend", ()=> active=false);
}
function enableEdgeOpen(){
  let sx=0, sy=0, pulling=false;
  edgeOpener.addEventListener("touchstart", (e)=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; pulling=true; }, {passive:true});
  edgeOpener.addEventListener("touchmove", (e)=>{
    if(!pulling) return;
    const t=e.touches[0]; const dx=t.clientX - sx; const dy=t.clientY - sy;
    if(Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy) && dx>0){ pulling=false; openDrawer(); }
  }, {passive:true});
  edgeOpener.addEventListener("touchend", ()=> pulling=false);
}

/* ---------------- Drawer open/close ---------------- */
function toggleDrawer(){ drawer.classList.toggle("open"); hamburgerBtn.setAttribute("aria-expanded", drawer.classList.contains("open")); drawer.setAttribute("aria-hidden", String(!drawer.classList.contains("open"))); }
function openDrawer(){ drawer.classList.add("open"); hamburgerBtn.setAttribute("aria-expanded","true"); drawer.setAttribute("aria-hidden","false"); }
function closeDrawer(){ drawer.classList.remove("open"); hamburgerBtn.setAttribute("aria-expanded","false"); drawer.setAttribute("aria-hidden","true"); }

/* ---------------- CRUD ---------------- */
itemForm.addEventListener("submit", onSaveItem);
function openItemModal(item={}){
  closeDrawer();
  modalTitle.textContent = item.id ? "Modifier le slot" : "Nouveau slot";
  itemIdInput.value = item.id || "";
  itemTitleInput.value = item.title || "";
  itemDateInput.value = item.date || state.selectedDate;
  itemTimeInput.value = item.time || "";
  itemNotesInput.value = item.notes || "";
  itemModal.showModal();
}
function onSaveItem(e){
  e.preventDefault();
  const id = itemIdInput.value || uid();
  const payload = {
    id,
    title:(itemTitleInput.value||"").trim(),
    date:itemDateInput.value,
    time:itemTimeInput.value||"",
    notes:(itemNotesInput.value||"").trim(),
    createdAt: Date.now()
  };
  if(!payload.title || !payload.date) return;

  const list = state.data.years[state.currentYear].items;
  const idx = list.findIndex(x=>x.id===id);
  if(idx>=0){ payload.createdAt = list[idx].createdAt; list[idx]=payload; }
  else list.push(payload);
  save();
  itemModal.close();
  // reste sur la date du slot sauvegardé
  state.selectedDate = payload.date;
  state.view = "calendar";
  render();
}
function deleteItem(id){
  if(!confirm("Supprimer ce slot ?")) return;
  const list = state.data.years[state.currentYear].items;
  const idx = list.findIndex(x=>x.id===id);
  if(idx>=0) list.splice(idx,1);
  save(); render();
}

/* ---------------- Export/Import/ICS ---------------- */
function exportBackupJSON(){ download(new Blob([JSON.stringify(state.data,null,2)],{type:"application/json"}), "planning-backup.json"); }
function importBackupJSON(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{ const obj=JSON.parse(r.result); if(!obj||typeof obj!=="object") throw new Error("Format invalide"); state.data=obj; ensureYear(state.currentYear); save(); render(); alert("Sauvegarde importée."); }catch(err){ alert("Import impossible : "+err.message); } };
  r.readAsText(f);
}
function exportYearICS(){
  const y = state.currentYear;
  const items = [...state.data.years[y].items].sort(sortByDateTime);
  if(items.length===0){ alert("Aucun slot dans "+y); return; }
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planning PWA//","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VTIMEZONE","TZID:Europe/Paris","X-LIC-LOCATION:Europe/Paris",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE"];
  const now = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  for(const it of items){
    const dt = `${it.date.replace(/-/g,"")}T${(it.time||"09:00").replace(":","")}00`;
    lines.push("BEGIN:VEVENT","UID:"+it.id+"@planning","DTSTAMP:"+now,"DTSTART;TZID=Europe/Paris:"+dt,"SUMMARY:"+icsEscape(it.title));
    if(it.notes) lines.push("DESCRIPTION:"+icsEscape(it.notes));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  download(new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}),`planning-${y}.ics`);
}
function createDailyReminderICS(){
  const time=(reminderTimeSettings?.value||"21:00").trim();
  const [H,M]=time.split(":").map(Number);
  const first=new Date(); first.setHours(H||21,M||0,0,0); if(first.getTime()<=Date.now()) first.setDate(first.getDate()+1);
  const dtStart = `${first.getFullYear()}${String(first.getMonth()+1).padStart(2,"0")}${String(first.getDate()).padStart(2,"0")}T${String(first.getHours()).padStart(2,"0")}${String(first.getMinutes()).padStart(2,"0")}00`;
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planning PWA//","CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE","TZID:Europe/Paris","X-LIC-LOCATION:Europe/Paris",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE",
    "BEGIN:VEVENT","UID:daily-reminder@"+uid(),"DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z","DTSTART;TZID=Europe/Paris:"+dtStart,"RRULE:FREQ=DAILY",
    "SUMMARY:Vérifier le planning de demain","DESCRIPTION:Ouvrez l’app Planning et jetez un œil à demain.",
    "BEGIN:VALARM","TRIGGER:-PT0M","ACTION:DISPLAY","END:VALARM","END:VEVENT","END:VCALENDAR"];
  download(new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}),`planning-reminder-${time.replace(":","")}.ics`);
  alert("Fichier .ics créé. Ajoutez-le à Calendrier si vous voulez une notif native.");
}

/* ---------------- Utils ---------------- */
function uid(){ return cryptoRandom(16); }
function cryptoRandom(len=16){ const a=new Uint8Array(len); (self.crypto||window.crypto).getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join(""); }
function todayISO(){ const d=new Date(); return isoDate(d); }
function isoDate(d){ return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-"); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addMonths(d,n){ const x=new Date(d); x.setMonth(x.getMonth()+n); return x; }
function weekStart(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); return x; } // Lundi
function sortByDateTime(a,b){ const A=a.date+(a.time||""); const B=b.date+(b.time||""); return A<B?-1:A>B?1:0; }
function escapeHTML(s){ return (s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m])); }
function weekLabel(d,lang){ const start=weekStart(d); const end=addDays(start,6); const loc=lang==="en"?"en-US":"fr-FR"; const s=start.toLocaleDateString(loc,{ day:"2-digit", month:"short" }); const e=end.toLocaleDateString(loc,{ day:"2-digit", month:"short", year:"numeric" }); return (lang==="en"?"Week ":"Semaine ")+s+" – "+e; }
function monthLabel(d,lang){ const loc=lang==="en"?"en-US":"fr-FR"; return d.toLocaleDateString(loc,{ month:"long", year:"numeric" }); }
function icsEscape(s){ return (s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,|;/g, m=>m===","?"\\,":"\\;"); }
function download(blob,filename){ const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0); }

/* ---------------- Audio beeps ---------------- */
function playBeep(){
  try{
    const style = beepStyleSelect?.value || state.data.settings.beepStyle || "classic";
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    function tone(freq, type="sine", start=0, dur=0.25, gainMax=0.2){
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq, now+start);
      g.gain.setValueAtTime(0.0001, now+start);
      g.gain.exponentialRampToValueAtTime(gainMax, now+start+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now+start+dur);
      osc.connect(g).connect(ctx.destination); osc.start(now+start); osc.stop(now+start+dur+0.02);
    }
    function sweep(f1,f2,dur=0.4){
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type="sine"; o.frequency.setValueAtTime(f1,now); o.frequency.exponentialRampToValueAtTime(f2, now+dur);
      g.gain.setValueAtTime(0.0001,now); g.gain.exponentialRampToValueAtTime(0.22, now+0.02); g.gain.exponentialRampToValueAtTime(0.0001, now+dur);
      o.connect(g).connect(ctx.destination); o.start(now); o.stop(now+dur+0.02);
    }
    function click(){
      const buffer = ctx.createBuffer(1, 2205, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<data.length;i++){ data[i] = (Math.random()*2-1) * Math.exp(-i/200); }
      const src = ctx.createBufferSource(); src.buffer=buffer; src.connect(ctx.destination); src.start(now);
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
