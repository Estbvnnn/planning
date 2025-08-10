// Planis v6.3.9 — dialogs exclusifs + close overlays + iPhone friendly
const $  = (q, r=document) => r.querySelector(q);

/* -------------------- STATE -------------------- */
const state = {
  data: null,
  get currentYear(){ return this.data.currentYear || String(new Date().getFullYear()); },
  set currentYear(y){ this.data.currentYear = y; save(); render(); },
  view: "home",          // "home" | "calendar"
  viewMode: "day",       // "day" | "week" | "month"
  selectedDate: todayISO()
};

/* -------------------- ELEMENTS -------------------- */
const drawer = $("#drawer");
const hamburgerBtn = $("#hamburgerBtn");
const closeDrawerBtn = $("#closeDrawerBtn");
const edgeOpener = $("#edgeOpener");

const yearList = $("#yearList");
const addYearBtn = $("#addYearBtn");

const backupBtn = $("#backupBtn");
const restoreInput = $("#restoreInput");

const openSettingsBtn = $("#openSettingsBtn");
const settingsModal = $("#settingsModal");
const themeSelect = $("#themeSelect");
const reminderTimeSettings = $("#reminderTimeSettings");
const beepStyleSelect = $("#beepStyleSelect");
const testBeepBtn = $("#testBeepBtn");
const makeICSFromSettingsBtn = $("#makeICSFromSettingsBtn");
const saveSettingsBtn = $("#saveSettingsBtn");

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

const yearModal = $("#yearModal");
const yearForm = $("#yearForm");
const yearInput = $("#yearInput");
const installBtn = $("#installBtn");

/* -------------------- INIT -------------------- */
init();
function init(){
  // load/save bootstrap
  const raw = localStorage.getItem("planningData");
  if(raw){ try{ state.data = JSON.parse(raw); } catch{ state.data=null; } }
  if(!state.data){
    state.data = {
      years:{},
      settings:{ theme:"nocturne", reminderTime:"21:00", beepStyle:"classic" },
      currentYear: String(new Date().getFullYear())
    };
  }
  ensureYear(state.currentYear);

  // Fill settings UI with saved values (if UI exists)
  if (themeSelect) themeSelect.value = state.data.settings.theme || "nocturne";
  if (reminderTimeSettings) reminderTimeSettings.value = state.data.settings.reminderTime || "";
  if (beepStyleSelect) beepStyleSelect.value = state.data.settings.beepStyle || "classic";

  // Drawer
  hamburgerBtn?.addEventListener("click", toggleDrawer);
  closeDrawerBtn?.addEventListener("click", closeDrawer);
  drawer?.addEventListener("click", (e)=>{ if(e.target === drawer) closeDrawer(); });
  enableDrawerSwipe(); enableEdgeOpen();

  // Global “close-all overlays” in capture (click/touch anywhere)
  ["pointerdown","click"].forEach(ev=>{
    document.addEventListener(ev,(e)=>{
      const t=e.target;
      if(drawer && !drawer.contains(t) && t!==hamburgerBtn) closeDrawer();
      if(!viewMenu.hidden && !viewMenu.contains(t) && t!==viewModeBtn){
        viewMenu.hidden = true; viewModeBtn?.setAttribute("aria-expanded","false");
      }
    }, true);
  });

  // ESC closes overlays
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeAllOverlays(); });
  // Close view menu on scroll/resize
  ["scroll","resize"].forEach(ev=> window.addEventListener(ev, ()=>{ viewMenu.hidden = true; }, {passive:true}));

  // Years
  addYearBtn?.addEventListener("click", ()=>{
    yearInput.value = String(new Date().getFullYear()+1);
    openDialog(yearModal);
  });
  yearForm?.addEventListener("submit",(e)=>{
    e.preventDefault();
    const y = (yearInput.value||"").trim();
    if(!/^[0-9]{4}$/.test(y)){ alert("Invalid year"); return; }
    ensureYear(y); state.currentYear = y; state.selectedDate = `${y}-01-01`;
    state.view="calendar"; yearModal.close(); render();
  });

  // Tools
  backupBtn?.addEventListener("click", exportBackupJSON);
  restoreInput?.addEventListener("change", importBackupJSON);
  exportYearBtn?.addEventListener("click", exportYearICS);

  // Home + FAB
  addItemLargeBtn?.addEventListener("click", ()=> openItemModal({date: state.selectedDate}) );
  addItemFab?.addEventListener("click", ()=> openItemModal({date: state.selectedDate}) );

  // View menu
  viewModeBtn?.addEventListener("click", ()=>{
    if(state.view!=="calendar") return;
    const open=viewMenu.hidden;
    viewMenu.hidden=!open;
    viewModeBtn.setAttribute("aria-expanded", String(open));
  });
  viewMenu?.addEventListener("click",(e)=>{
    const btn = e.target.closest("button[data-view]"); if(!btn) return;
    state.viewMode = btn.dataset.view;
    if(state.viewMode==="day"){
      const y=new Date().getFullYear();
      state.selectedDate = (String(y)===state.currentYear) ? todayISO() : `${state.currentYear}-01-01`;
    }
    viewModeBtn.textContent = state.viewMode==="day" ? "Day ▾" : state.viewMode==="week" ? "Week ▾" : "Month ▾";
    viewMenu.hidden=true; render();
  });

  enableCalendarSwipe();

  // Settings
  openSettingsBtn?.addEventListener("click", ()=>{
    openDialog(settingsModal);
    requestAnimationFrame(()=> saveSettingsBtn?.focus({preventScroll:true}) );
  });
  saveSettingsBtn?.addEventListener("click",(e)=>{
    e.preventDefault();
    state.data.settings.theme = themeSelect?.value || "nocturne";
    state.data.settings.reminderTime = reminderTimeSettings?.value || "";
    state.data.settings.beepStyle = beepStyleSelect?.value || "classic";
    save(); applyTheme(state.data.settings.theme); settingsModal.close();
  });
  testBeepBtn?.addEventListener("click", playBeep);
  makeICSFromSettingsBtn?.addEventListener("click", createDailyReminderICS);

  // Backdrop click closes dialogs
  [itemModal, yearModal, settingsModal].forEach(dlg=>{
    dlg?.addEventListener("click",(e)=>{ if(e.target === dlg) dlg.close("cancel"); });
  });

  // PWA install
  let deferredInstallPrompt=null;
  window.addEventListener("beforeinstallprompt",(e)=>{ e.preventDefault(); deferredInstallPrompt=e; installBtn.hidden=false; });
  installBtn?.addEventListener("click", async ()=>{
    if(!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
    deferredInstallPrompt=null; installBtn.hidden=true;
  });

  applyTheme(state.data.settings.theme || "nocturne");
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("./service-worker.js").catch(console.error); }

  render();
}

/* -------------------- DIALOG HELPER -------------------- */
// Ouvre un dialog en fermant tous les autres + overlays
function openDialog(dlg){
  [settingsModal, itemModal, yearModal].forEach(m => {
    if (m && m !== dlg && m.open) m.close();
  });
  closeAllOverlays();
  dlg.showModal();
  // clic en dehors = fermer (one-time)
  dlg.addEventListener("click", (e)=>{ if(e.target === dlg) dlg.close("cancel"); }, {once:true});
}

function closeAllOverlays(){
  viewMenu.hidden = true;
  drawer?.classList.remove("open");
  if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

/* -------------------- DATA -------------------- */
function ensureYear(y){ if(!state.data.years[y]) state.data.years[y] = { items:[], lastModified: Date.now() }; }
function save(){
  const y=state.currentYear;
  if(state.data.years[y]) state.data.years[y].lastModified=Date.now();
  localStorage.setItem("planningData", JSON.stringify(state.data));
}

/* -------------------- RENDER -------------------- */
function render(){
  renderYearList();

  const onCal = (state.view==="calendar");
  homeSection.hidden = onCal;
  calendarSection.hidden = !onCal;

  if(onCal){
    if(state.viewMode==="day" && state.currentYear===String(new Date().getFullYear())){
      state.selectedDate = todayISO();
    }
    const d=new Date(state.selectedDate);
    topTitle.textContent = `Calendar ${state.currentYear}`;
    calLabel.textContent = state.viewMode==="day" ? d.toLocaleDateString("en-US",{day:"2-digit",month:"long",year:"numeric"})
                     : state.viewMode==="week" ? weekLabel(d)
                     : monthLabel(d);
    viewModeBtn.hidden=false;
  }else{
    topTitle.textContent="Home";
    viewModeBtn.hidden=true; viewMenu.hidden=true;
  }

  if(onCal) renderCalendar();
}

function renderYearList(){
  yearList.innerHTML="";
  Object.keys(state.data.years).sort().forEach(y=>{
    const b=document.createElement("button");
    b.className="btn btn--ghost";
    b.textContent=`Calendar ${y}` + (y===state.currentYear?" •":"");
    b.addEventListener("click", ()=>{
      state.currentYear=y; state.view="calendar";
      state.selectedDate = (String(new Date().getFullYear())===y) ? todayISO() : `${y}-01-01`;
      closeAllOverlays(); render();
    });
    yearList.appendChild(b);
  });
}

function renderCalendar(){
  const items = state.data.years[state.currentYear].items;
  calContent.innerHTML="";
  const d=new Date(state.selectedDate);

  if(state.viewMode==="day"){
    const list=document.createElement("div"); list.className="day-list";
    const todays=items.filter(it=>it.date===isoDate(d)).sort(sortByDateTime);
    if(todays.length===0){ const p=document.createElement("p"); p.className="muted"; p.textContent="—"; list.appendChild(p); }
    else todays.forEach(it=> list.appendChild(itemCard(it)));
    calContent.appendChild(list);
  }else if(state.viewMode==="week"){
    const grid=document.createElement("div"); grid.className="week-grid"; // vertical
    const start=weekStart(d);
    for(let i=0;i<7;i++){
      const day=addDays(start,i);
      const col=document.createElement("div"); col.className="week-col";
      const h4=document.createElement("h4"); h4.textContent = day.toLocaleDateString("en-US",{weekday:"short",day:"2-digit",month:"short"}); col.appendChild(h4);
      const dayItems=items.filter(it=>it.date===isoDate(day)).sort(sortByDateTime);
      if(dayItems.length===0){ const p=document.createElement("p"); p.className="muted"; p.textContent="—"; col.appendChild(p); }
      else dayItems.forEach(it=> col.appendChild(itemCard(it)));
      grid.appendChild(col);
    }
    calContent.appendChild(grid);
  }else{
    const grid=document.createElement("div"); grid.className="month-grid";
    const first=new Date(d.getFullYear(), d.getMonth(), 1);
    const start=weekStart(first);
    for(let i=0;i<42;i++){
      const day=addDays(start,i);
      const cell=document.createElement("div"); cell.className="month-cell";
      const inMonth=(day.getMonth()===d.getMonth()); if(!inMonth) cell.style.opacity=.45;
      const head=document.createElement("div"); head.className="d"; head.textContent=day.getDate(); cell.appendChild(head);
      const dayItems=items.filter(it=>it.date===isoDate(day));
      if(dayItems.length){ const dots=document.createElement("div"); dayItems.slice(0,5).forEach(()=>{ const dot=document.createElement("span"); dot.className="dot"; dots.appendChild(dot); }); cell.appendChild(dots); }
      cell.addEventListener("click", ()=>{ state.viewMode="day"; state.selectedDate=isoDate(day); viewModeBtn.textContent="Day ▾"; render(); });
      grid.appendChild(cell);
    }
    calContent.appendChild(grid);
  }
}

function itemCard(it){
  const a=document.createElement("div"); a.className="card";
  a.innerHTML=`<div class="card-row">
      <div class="card-title">${escapeHTML(it.title)}</div>
      <div class="card-date">${it.time||""}</div>
    </div>
    ${it.notes?`<div class="card-notes">${escapeHTML(it.notes)}</div>`:""}
    <div class="card-actions">
      <button class="mini-btn edit">Edit</button>
      <button class="mini-btn danger delete">Delete</button>
    </div>`;
  a.querySelector(".edit").addEventListener("click", ()=>{
    openItemModal(it);
  });
  a.querySelector(".delete").addEventListener("click", ()=> deleteItem(it.id));
  return a;
}

/* -------------------- GESTURES -------------------- */
function enableCalendarSwipe(){
  let sx=0, sy=0, dragging=false;
  calContent.addEventListener("touchstart",(e)=>{ const t=e.touches[0]; sx=t.clientX; sy=t.clientY; dragging=true; },{passive:true});
  calContent.addEventListener("touchmove",(e)=>{
    if(!dragging) return;
    const t=e.touches[0]; const dx=t.clientX-sx, dy=t.clientY-sy;
    if(Math.abs(dx)>60 && Math.abs(dx)>Math.abs(dy)){ dragging=false; if(dx<0) goNext(); else goPrev(); }
  },{passive:true});
  calContent.addEventListener("touchend",()=> dragging=false);
}
function goNext(){ const d=new Date(state.selectedDate); state.selectedDate = isoDate(state.viewMode==="day"?addDays(d,1):state.viewMode==="week"?addDays(d,7):addMonths(d,1)); render(); }
function goPrev(){ const d=new Date(state.selectedDate); state.selectedDate = isoDate(state.viewMode==="day"?addDays(d,-1):state.viewMode==="week"?addDays(d,-7):addMonths(d,-1)); render(); }
function enableDrawerSwipe(){
  let startX=0,startY=0,active=false;
  drawer.addEventListener("touchstart",(e)=>{const t=e.touches[0];startX=t.clientX;startY=t.clientY;active=true;},{passive:true});
  drawer.addEventListener("touchmove",(e)=>{if(!active)return;const t=e.touches[0],dx=t.clientX-startX,dy=t.clientY-startY;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)&&dx<0){active=false;closeDrawer();}},{passive:true});
  drawer.addEventListener("touchend",()=>active=false);
}
function enableEdgeOpen(){
  let sx=0,sy=0,pulling=false;
  edgeOpener.addEventListener("touchstart",(e)=>{const t=e.touches[0];sx=t.clientX;sy=t.clientY;pulling=true;},{passive:true});
  edgeOpener.addEventListener("touchmove",(e)=>{if(!pulling)return;const t=e.touches[0],dx=t.clientX-sx,dy=t.clientY-sy;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)&&dx>0){pulling=false;openDrawer();}},{passive:true});
  edgeOpener.addEventListener("touchend",()=>pulling=false);
}

/* -------------------- DRAWER -------------------- */
function toggleDrawer(){ drawer.classList.toggle("open"); hamburgerBtn.setAttribute("aria-expanded", drawer.classList.contains("open")); drawer.setAttribute("aria-hidden", String(!drawer.classList.contains("open"))); }
function openDrawer(){ drawer.classList.add("open"); hamburgerBtn.setAttribute("aria-expanded","true"); drawer.setAttribute("aria-hidden","false"); }
function closeDrawer(){ drawer.classList.remove("open"); hamburgerBtn.setAttribute("aria-expanded","false"); drawer.setAttribute("aria-hidden","true"); }

/* -------------------- CRUD -------------------- */
itemForm.addEventListener("submit", onSaveItem);
function openItemModal(item={}){
  modalTitle.textContent = item.id ? "Edit slot" : "New slot";
  itemIdInput.value = item.id || "";
  itemTitleInput.value = item.title || "";
  itemDateInput.value = item.date || state.selectedDate;
  itemTimeInput.value = item.time || "";
  itemNotesInput.value = item.notes || "";
  openDialog(itemModal);
}
function onSaveItem(e){
  e.preventDefault();
  const id = itemIdInput.value || uid();
  const payload = { id, title:(itemTitleInput.value||"").trim(), date:itemDateInput.value || todayISO(), time:itemTimeInput.value||"", notes:(itemNotesInput.value||"").trim(), createdAt: Date.now() };
  if(!payload.title){ alert("Please add a title (or tap outside to close)."); return; }
  const list = state.data.years[state.currentYear].items;
  const idx = list.findIndex(x=>x.id===id);
  if(idx>=0){ payload.createdAt=list[idx].createdAt; list[idx]=payload; } else list.push(payload);
  save(); itemModal.close(); state.selectedDate = payload.date; state.view = "calendar"; render();
}
function deleteItem(id){
  if(!confirm("Delete this slot?")) return;
  const list = state.data.years[state.currentYear].items;
  const idx = list.findIndex(x=>x.id===id);
  if(idx>=0) list.splice(idx,1);
  save(); render();
}

/* -------------------- IMPORT/EXPORT/ICS -------------------- */
function exportBackupJSON(){ download(new Blob([JSON.stringify(state.data,null,2)],{type:"application/json"}),"planis-backup.json"); }
function importBackupJSON(e){
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ try{ const obj=JSON.parse(r.result); if(!obj||typeof obj!=="object") throw new Error("Invalid file"); state.data=obj; ensureYear(state.currentYear); save(); render(); alert("Backup restored."); }catch(err){ alert("Restore failed: "+err.message); } };
  r.readAsText(f);
}
function exportYearICS(){
  const y = state.currentYear;
  const items = [...state.data.years[y].items].sort(sortByDateTime);
  if(items.length===0){ alert("No slot in "+y); return; }
  const now = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planis//","CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VTIMEZONE","TZID:Europe/Paris","X-LIC-LOCATION:Europe/Paris",
    "BEGIN:DAYLIGHT","TZOFFSETFROM:+0100","TZOFFSETTO:+0200","TZNAME:CEST","DTSTART:19700329T020000","RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU","END:DAYLIGHT",
    "BEGIN:STANDARD","TZOFFSETFROM:+0200","TZOFFSETTO:+0100","TZNAME:CET","DTSTART:19701025T030000","RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU","END:STANDARD","END:VTIMEZONE"];
  for(const it of items){
    const dt = `${it.date.replace(/-/g,"")}T${(it.time||"09:00").replace(":","")}00`;
    lines.push("BEGIN:VEVENT","UID:"+it.id+"@planis","DTSTAMP:"+now,"DTSTART;TZID=Europe/Paris:"+dt,"SUMMARY:"+icsEscape(it.title));
    if(it.notes) lines.push("DESCRIPTION:"+icsEscape(it.notes));
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  download(new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}),`planis-${y}.ics`);
}

// Daily reminder ICS (RRULE:DAILY)
function createDailyReminderICS(){
  const time = (reminderTimeSettings?.value || "21:00").replace(":", "") + "00";
  const today = new Date();
  const dtstart = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}T${time}`;
  const now = new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const lines = [
    "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Planis//EN",
    "CALSCALE:GREGORIAN","METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:daily-reminder@planis",
    "DTSTAMP:"+now,
    "DTSTART;TZID=Europe/Paris:"+dtstart,
    "RRULE:FREQ=DAILY",
    "SUMMARY:Planis — Check tomorrow's planning",
    "BEGIN:VALARM","ACTION:AUDIO","TRIGGER:-PT1M","DESCRIPTION:Planis reminder","END:VALARM",
    "END:VEVENT","END:VCALENDAR"
  ];
  download(new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}),"planis-daily-reminder.ics");
}

/* -------------------- UTILS -------------------- */
function uid(){ return cryptoRandom(16); }
function cryptoRandom(len=16){ const a=new Uint8Array(len); (self.crypto||window.crypto).getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join(""); }
function todayISO(){ const d=new Date(); return isoDate(d); }
function isoDate(d){ return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-"); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addMonths(d,n){ const x=new Date(d); x.setMonth(x.getMonth()+n); return x; }
function weekStart(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); return x; }
function sortByDateTime(a,b){ const A=a.date+(a.time||""); const B=b.date+(b.time||""); return A<B?-1:A>B?1:0; }
function escapeHTML(s){ return (s||"").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[m])); }
function weekLabel(d){ const start=weekStart(d), end=addDays(start,6); const s=start.toLocaleDateString("en-US",{day:"2-digit",month:"short"}); const e=end.toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"}); return "Week "+s+" – "+e; }
function monthLabel(d){ return d.toLocaleDateString("en-US",{month:"long",year:"numeric"}); }
function icsEscape(s){ return (s||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,|;/g, m=>m===","?"\\,":"\\;"); }
function download(blob,filename){ const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },0); }
function applyTheme(name){
  const html=document.documentElement;
  html.removeAttribute("data-theme");
  if(name==="ardoise") html.setAttribute("data-theme","ardoise");
  else if(name==="porcelaine") html.setAttribute("data-theme","porcelaine");
}

/* -------------------- AUDIO -------------------- */
function playBeep(){
  try{
    const style = beepStyleSelect?.value || state.data.settings.beepStyle || "classic";
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    function tone(freq,type="sine",start=0,dur=0.25,gainMax=0.2){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,now+start); g.gain.setValueAtTime(0.0001,now+start); g.gain.exponentialRampToValueAtTime(gainMax,now+start+0.01); g.gain.exponentialRampToValueAtTime(0.0001,now+start+dur); o.connect(g).connect(ctx.destination); o.start(now+start); o.stop(now+start+dur+0.02); }
    function sweep(f1,f2,dur=0.4){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type="sine"; o.frequency.setValueAtTime(f1,now); o.frequency.exponentialRampToValueAtTime(f2,now+dur); g.gain.setValueAtTime(0.0001,now); g.gain.exponentialRampToValueAtTime(0.22,now+0.02); g.gain.exponentialRampToValueAtTime(0.0001,now+dur); o.connect(g).connect(ctx.destination); o.start(now); o.stop(now+dur+0.02); }
    function click(){ const buffer=ctx.createBuffer(1,2205,ctx.sampleRate); const data=buffer.getChannelData(0); for(let i=0;i<data.length;i++){ data[i]=(Math.random()*2-1)*Math.exp(-i/200); } const src=ctx.createBufferSource(); src.buffer=buffer; src.connect(ctx.destination); src.start(now); }
    switch(style){ case "classic": tone(880,"sine",0,0.28,0.22); break;
      case "chime": tone(880,"sine",0,0.18,0.18); tone(660,"sine",0.16,0.22,0.16); break;
      case "bell": tone(660,"triangle",0,0.40,0.24); tone(1320,"sine",0,0.25,0.10); break;
      case "click": click(); break;
      case "sweep": sweep(500,1400,0.45); break; }
  }catch(e){ console.warn("Audio not available", e); }
}
