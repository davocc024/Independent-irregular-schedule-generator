// ── TOAST NOTIFICATIONS ──
function showToast(message) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast'; toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ── PWA: MANIFEST CON IMAGEN PNG ──
function initPWA() {
  const iconPath = 'logo.png';
  const manifest = { name: "TimeGrid Studio", short_name: "Horarios", display: "standalone", start_url: location.href, background_color: "#131314", theme_color: "#a8c7fa", icons: [{ src: iconPath, sizes: "512x512", type: "image/png" }] };
  const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
  const linkManifest = document.createElement('link'); linkManifest.rel = 'manifest'; linkManifest.href = URL.createObjectURL(manifestBlob); document.head.appendChild(linkManifest);
  const linkApple = document.createElement('link'); linkApple.rel = 'apple-touch-icon'; linkApple.href = iconPath; document.head.appendChild(linkApple);
  const linkIcon = document.createElement('link'); linkIcon.rel = 'icon'; linkIcon.href = iconPath; document.head.appendChild(linkIcon);

  if ('serviceWorker' in navigator) {
    const swCode = `self.addEventListener('install', e => self.skipWaiting()); self.addEventListener('fetch', e => {});`;
    const swBlob = new Blob([swCode], {type: 'application/javascript'});
    navigator.serviceWorker.register(URL.createObjectURL(swBlob)).catch(()=>{});
  }
}
initPWA();

// ── CONFIGURACION TEMA Y PALETA ──
const THEME_KEY = 'horario_theme';
let isLightMode = localStorage.getItem(THEME_KEY) === 'light';
function updateThemeIcon() { document.getElementById('themeIcon').textContent = isLightMode ? '🌙' : '☀️'; }
updateThemeIcon();

function toggleTheme() {
  isLightMode = !isLightMode;
  document.documentElement.setAttribute('data-theme', isLightMode ? 'light' : 'dark');
  localStorage.setItem(THEME_KEY, isLightMode ? 'light' : 'dark');
  updateThemeIcon();
}

// ── VARIABLES GLOBALES Y AJUSTES (V2) ──
let gMode = localStorage.getItem('h_mode') || 'list';
let gSat = localStorage.getItem('h_sat') === 'true';
let gStartH = parseInt(localStorage.getItem('h_start')) || 7;
let gEndH = parseInt(localStorage.getItem('h_end')) || 20;
let gPin = localStorage.getItem('horario_pin_enabled') === 'true';

function getActiveDays() { return gSat ? ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'] : ['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES']; }

function openSettings() {
  document.getElementById('setMode').value = gMode;
  document.getElementById('setSat').checked = gSat;
  document.getElementById('setStartH').value = gStartH;
  document.getElementById('setEndH').value = gEndH;
  document.getElementById('setPin').checked = gPin;
  document.getElementById('settingsOverlay').classList.add('show');
}

function closeSettings() {
  document.getElementById('settingsOverlay').classList.remove('show');
}

function saveSettings() {
  const s = parseInt(document.getElementById('setStartH').value);
  const e = parseInt(document.getElementById('setEndH').value);
  if(s >= e) { alert("⚠️ La hora de inicio debe ser menor a la hora de fin."); return; }
  
  gMode = document.getElementById('setMode').value;
  gSat = document.getElementById('setSat').checked;
  gStartH = s; gEndH = e;
  gPin = document.getElementById('setPin').checked;
  
  localStorage.setItem('h_mode', gMode);
  localStorage.setItem('h_sat', gSat);
  localStorage.setItem('h_start', gStartH);
  localStorage.setItem('h_end', gEndH);
  localStorage.setItem('horario_pin_enabled', gPin);
  
  closeSettings();
  renderGrid(); renderManage(); renderSidebar(); 
  if(document.getElementById('viewAuto').style.display === 'flex') renderAutoSelection();
  showToast("⚙️ Ajustes globales aplicados");
}

const DB_KEY = 'horario_materias_db';
const SEL_KEY = 'horario_materias_seleccionadas';

/* COLORES DE LA PALETA */
const COLORS = ['#a8c7fa','#e5c07b','#81c995','#fde293','#f28b82','#78d9ec','#fcaded','#a8dab5','#fcb97d','#8ab4f8', '#b39ddb', '#ffcc80', '#80cbc4'];

let subjects = [];
let selected = new Set();
let editingId = null;
let chosenColor = COLORS[0];
let activeGridCells = new Set(); 
let generatedCombinations = [];
let unselectedAutoFilters = new Set(); 

// ── LÓGICA DE LOGIN (OFUSCADO) ──
const TARGET_HASH = "MzY1Mg=="; // 3652
const pinInputs = document.querySelectorAll('.pin-input');
const loginScreen = document.getElementById('loginScreen');
const loginError = document.getElementById('loginError');

// ── ANIMACIÓN DE CARGA Y VERIFICACIÓN DE PIN ──
window.addEventListener('load', () => {
  const splash = document.getElementById('splashScreen');
  const loginScreen = document.getElementById('loginScreen');
  
  // Tiempo de exhibición de la pantalla de carga (1.8 segundos)
  setTimeout(() => {
    if (splash) splash.style.opacity = '0';
    
    // Esperamos a que termine el fade out (0.6s)
    setTimeout(() => {
      if (splash) splash.style.display = 'none';
      
      // Si el PIN está activado, mostramos la pantalla de login
      if (gPin && loginScreen) { 
        loginScreen.style.display = 'flex'; 
        // Forzamos un reflow para que la animación de entrada (si la hubiera) funcione
        loginScreen.offsetHeight; 
        loginScreen.style.opacity = '1';
        
        // Auto-focus en el primer input si existe
        const firstPinInput = document.querySelector('.pin-input');
        if(firstPinInput) firstPinInput.focus();
      }
    }, 600); 
  }, 1800); 
});

pinInputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    input.classList.remove('error'); loginError.classList.remove('show');
    if (input.value.length > 1) input.value = input.value.slice(-1); 
    if (input.value.length === 1 && index < pinInputs.length - 1) { pinInputs[index + 1].focus(); }
    validatePIN();
  });
  input.addEventListener('keyup', (e) => {
    if ((e.key === 'Backspace' || e.keyCode === 8) && !input.value && index > 0) { pinInputs[index - 1].focus(); }
  });
});

function validatePIN() {
  const currentPIN = Array.from(pinInputs).map(inp => inp.value).join('');
  if (currentPIN.length === 4) {
    if (btoa(currentPIN) === TARGET_HASH) {
      loginScreen.style.opacity = '0'; setTimeout(() => loginScreen.style.visibility = 'hidden', 400);
      showToast("Bienvenido");
    } else {
      pinInputs.forEach(inp => inp.classList.add('error')); loginError.classList.add('show');
      document.querySelector('.login-box').classList.add('shake');
      setTimeout(() => { document.querySelector('.login-box').classList.remove('shake'); pinInputs.forEach(inp => inp.value = ''); pinInputs[0].focus(); }, 500);
    }
  }
}

document.getElementById('btnForceLogin').addEventListener('click', () => { validatePIN(); });

const easterEggAlert = () => { alert("Uso exclusivamente estudiantil y sin fines de lucro. Se permite la copia y modificación, siempre que no medie comercialización"); };
document.getElementById('footerGeminiBtn').addEventListener('click', easterEggAlert);
if(document.getElementById('footerGeminiBtn2')) document.getElementById('footerGeminiBtn2').addEventListener('click', easterEggAlert);

// ── IMPORTAR / EXPORTAR / BORRAR TODO ──
function exportData() {
  if (subjects.length === 0) { alert("No hay materias para exportar."); return; }
  const defaultName = "materias_respaldo.json";
  let fileName = prompt("Ingresa el nombre del archivo de respaldo:", defaultName);
  if (fileName === null) return; 
  if (!fileName.trim()) fileName = defaultName;
  if (!fileName.endsWith('.json')) fileName += '.json';

  const dataStr = JSON.stringify(subjects, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName; link.click();
  showToast("Base de datos exportada");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        let maxId = subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) : 0;
        let agregadas = 0;
        imported.forEach(impSubj => {
           const isDuplicate = subjects.some(s => String(s.name || '').trim().toLowerCase() === String(impSubj.name || '').trim().toLowerCase() && String(s.course || '') === String(impSubj.course || ''));
           if(!isDuplicate) {
               maxId++; impSubj.id = maxId; subjects.push(impSubj); agregadas++;
           }
        });
        saveData(); renderManage(); renderSidebar(); renderGrid(); updateDatalist(); updateQuickParaleloSelect();
        showToast(`✅ Importación exitosa: Se agregaron ${agregadas} materias.`);
      } else { throw new Error("Formato inválido"); }
    } catch(err) { alert("❌ Error al leer el archivo .json."); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function deleteAllSubjects() {
  if(subjects.length === 0) return;
  if(confirm("⚠️ ¿Estás seguro de que quieres borrar TODAS las materias?\n\nTe sugerimos usar el botón de 'Exportar' primero para guardar una copia de seguridad.\n¿Deseas continuar y vaciar la base de datos?")) {
      subjects = []; selected.clear(); saveData();
      renderManage(); renderSidebar(); renderGrid(); renderAutoSelection(); updateDatalist(); updateQuickParaleloSelect();
      showToast("🗑️ Base de datos eliminada.");
  }
}

// ── FUNCIONES DE TABLERO Y DATOS ──
function loadData() {
  const storedDB = localStorage.getItem(DB_KEY);
  if(storedDB) { subjects = JSON.parse(storedDB); } else { subjects = []; }
  
  const storedSel = localStorage.getItem(SEL_KEY);
  if(storedSel) {
    selected = new Set(JSON.parse(storedSel));
    const validIds = new Set(subjects.map(s => String(s.id)));
    selected.forEach(id => { if(!validIds.has(String(id))) selected.delete(id); });
  }
}

function saveData() {
  localStorage.setItem(DB_KEY, JSON.stringify(subjects));
  localStorage.setItem(SEL_KEY, JSON.stringify(Array.from(selected)));
}

function getNextId() { return subjects.length === 0 ? 1 : Math.max(...subjects.map(s => s.id)) + 1; }

function updateDatalist() {
  const uniqueNames = [...new Set(subjects.map(s => String(s.name || '').trim()))];
  document.getElementById('subjectNamesDatalist').innerHTML = uniqueNames.map(name => `<option value="${name}">`).join('');
}

function filterSidebar() {
  const query = String(document.getElementById('searchInput').value || '').toLowerCase();
  const groups = document.querySelectorAll('#sidebarList .level-group');
  groups.forEach(group => {
      let hasVisible = false;
      const items = group.querySelectorAll('.subj-item');
      items.forEach(item => {
          if(String(item.textContent || '').toLowerCase().includes(query)) { item.style.display = 'flex'; hasVisible = true; } 
          else { item.style.display = 'none'; }
      });
      group.style.display = hasVisible ? 'block' : 'none';
  });
}

function updateQuickParaleloSelect() {
  const select = document.getElementById('quickParaleloSelect');
  const currentVal = select.value;
  
  const combos = [...new Set(subjects.map(s => JSON.stringify({level: String(s.level || ''), course: String(s.course || '')})))].map(JSON.parse);
  combos.sort((a, b) => {
    if(a.level === b.level) return a.course.localeCompare(b.course);
    return a.level.localeCompare(b.level);
  });

  let html = '<option value="">Revisar paralelo completo...</option>';
  combos.forEach(c => { 
    const val = `${c.level}:::${c.course}`;
    html += `<option value="${val}">${c.level} - ${c.course}</option>`; 
  });
  
  select.innerHTML = html;
  if(combos.some(c => `${c.level}:::${c.course}` === currentVal)) { select.value = currentVal; }
}

function loadFullParalelo(val) {
  if(!val) return;
  const parts = val.split(':::');
  if(parts.length !== 2) return;
  const targetLevel = parts[0];
  const targetCourse = parts[1];

  selected.clear();
  const toAdd = subjects.filter(s => String(s.level || '') === targetLevel && String(s.course || '') === targetCourse);
  toAdd.forEach(s => selected.add(String(s.id))); 
  
  document.getElementById('conflictAlert').classList.remove('show');
  document.getElementById('currentOptionLabel').textContent = ''; 
  saveData(); renderSidebar(); renderGrid();
  showToast(`✅ ${targetLevel} ${targetCourse} cargado visualmente`);
}

function getOnboardingHTML() {
  return `
    <div class="empty-state animate-fade">
      <h3>¡Bienvenido a TimeGrid Studio! 🎓</h3>
      <p>Parece que aún no tienes asignaturas registradas. Sigue estos pasos:</p>
      <div class="empty-steps">
        <div class="empty-step"><div class="empty-step-num">1</div><div class="empty-step-desc">Ve a <b>Gestionar Materias</b> y añade las asignaturas de tu semestre.</div></div>
        <div class="empty-step"><div class="empty-step-num">2</div><div class="empty-step-desc">Abre el <b>Auto-Generador</b> para que el algoritmo cree las combinaciones perfectas.</div></div>
        <div class="empty-step"><div class="empty-step-num">3</div><div class="empty-step-desc">Aplica tu opción favorita y expórtala en la pestaña <b>Construir Horario</b>.</div></div>
      </div>
      <button class="btn primary" style="margin: 20px auto 0;" onclick="switchView('manage'); setTimeout(() => openModal(null), 100);">+ Crear mi primera materia</button>
    </div>
  `;
}

function renderSidebar() {
  const container = document.getElementById('sidebarList');
  if (subjects.length === 0) { container.innerHTML = `<div style="padding:20px; text-align:center; font-size:0.8rem; color:var(--muted);" class="animate-fade">Lista vacía.</div>`; return; }

  const grouped = {};
  subjects.forEach(s => { 
      const lvl = String(s.level || '');
      if(!grouped[lvl]) grouped[lvl] = []; 
      grouped[lvl].push(s); 
  });
  container.innerHTML = '';
  
  let delay = 0;
  Object.entries(grouped).sort((a,b) => a[0].localeCompare(b[0])).forEach(([level, list]) => {
    const grp = document.createElement('div'); grp.className = 'level-group animate-fade';
    grp.style.animationDelay = `${delay}s`; delay += 0.05;
    
    const lbl = document.createElement('div'); lbl.className = 'level-label'; lbl.innerHTML = `${level}`;
    lbl.onclick = () => { bodyDiv.classList.toggle('hidden'); lbl.classList.toggle('collapsed'); };
    grp.appendChild(lbl);
    
    const bodyDiv = document.createElement('div'); bodyDiv.className = 'level-body';
    list.forEach(s => {
      const isSelected = selected.has(String(s.id)) || selected.has(s.id);
      const item = document.createElement('div'); item.className = 'subj-item' + (isSelected ? ' selected' : '');
      item.onclick = () => toggleSubject(String(s.id));
      
      const mandatoryPin = s.isMandatory ? '<span title="Materia Obligatoria" style="color:var(--danger); font-size:0.75rem; margin-right:4px;">📌</span>' : '';
      item.innerHTML = `
        <div class="subj-color" style="background:${s.color}"></div>
        <div class="subj-info"><div class="subj-name">${mandatoryPin}${String(s.name || '')}</div><div class="subj-meta">Paralelo: ${String(s.course || '')}</div></div>
        <div class="subj-check">${isSelected ? '✓' : ''}</div>
      `;
      bodyDiv.appendChild(item);
    });
    grp.appendChild(bodyDiv); container.appendChild(grp);
  });
  filterSidebar(); 
}

function renderGrid() {
  const gridContainer = document.getElementById('scheduleGrid');
  const selectedSubjs = subjects.filter(s => selected.has(String(s.id)) || selected.has(s.id));
  gridContainer.innerHTML = '';
  
  let totalHours = 0; let totalGaps = 0;
  const activeDays = getActiveDays();
  const slotsByDay = {}; activeDays.forEach(d => slotsByDay[d] = []);
  
  gridContainer.style.gridTemplateColumns = `60px repeat(${activeDays.length}, 1fr)`;
  
  selectedSubjs.forEach(s => {
    (s.slots || []).forEach(sl => {
      totalHours += (Number(sl.end) - Number(sl.start));
      if(slotsByDay[sl.day]) slotsByDay[sl.day].push({ start: Number(sl.start), end: Number(sl.end) });
    });
  });

  const dailyHours = {};
  for (const day in slotsByDay) {
    dailyHours[day] = 0;
    const daySlots = slotsByDay[day].sort((a, b) => a.start - b.start);
    for (let i = 0; i < daySlots.length; i++) {
        dailyHours[day] += (daySlots[i].end - daySlots[i].start);
        if(i < daySlots.length - 1) {
            const gap = daySlots[i+1].start - daySlots[i].end;
            if (gap > 0) totalGaps += gap;
        }
    }
  }
  
  const headCol = document.createElement('div'); headCol.className = 'grid-head hour-col'; gridContainer.appendChild(headCol);
  activeDays.forEach(d => { 
      const h = document.createElement('div'); h.className = 'grid-head'; 
      h.innerHTML = `${d} <div class="day-hours-badge">${dailyHours[d]}h</div>`;
      gridContainer.appendChild(h); 
  });
  
  const hCol = document.createElement('div'); hCol.className = 'hour-col';
  for (let h = gStartH; h < gEndH; h++) { 
      hCol.innerHTML += `<div class="hour-cell">${h}:00<br>-<br>${h+1}:00</div>`; 
  }
  gridContainer.appendChild(hCol);
  
  activeDays.forEach(day => {
    const col = document.createElement('div'); col.className = 'grid-col';
    const dayCol = document.createElement('div'); dayCol.className = 'day-col';
    dayCol.style.height = `calc(var(--grid-hour) * ${gEndH - gStartH})`;
    
    for (let i = 0; i < (gEndH - gStartH); i++) {
        dayCol.innerHTML += `<div class="day-stripe" style="top:${i*52}px;height:52px"></div>`;
    }
    
    selectedSubjs.forEach(s => {
      (s.slots || []).filter(sl => sl.day === day).forEach(sl => {
        if(sl.end <= gStartH || sl.start >= gEndH) return;
        
        const st = Math.max(sl.start, gStartH);
        const en = Math.min(sl.end, gEndH);
        const top = (st - gStartH) * 52 + 2;
        const height = ((en - st) * 52) - 4;
        const noteHtml = s.note ? `<div class="block-note">${String(s.note || '')}</div>` : '';
        
        dayCol.innerHTML += `<div class="block animate-fade" style="top:${top}px;height:${height}px;background:${s.color};border-left:4px solid rgba(0,0,0,0.2);">
            <div class="block-name">${String(s.name || '')}</div><div class="block-detail">${String(s.course || '')} | ${sl.start}:00–${sl.end}:00</div>${noteHtml}</div>`;
      });
    });
    col.appendChild(dayCol); gridContainer.appendChild(col);
  });
  
  updateTimeLine();
  
  document.getElementById('statCount').textContent = selectedSubjs.length;
  document.getElementById('statHours').textContent = totalHours;
  document.getElementById('statGaps').textContent = totalGaps;
  
  const tooltipText = selectedSubjs.length > 0 ? selectedSubjs.map(s => `- ${String(s.name || '')} (${String(s.course || '')})`).join('\n') : 'Ninguna materia seleccionada';
  document.getElementById('counterTooltip').title = tooltipText;
}

function updateTimeLine() {
  document.querySelectorAll('.current-time-line').forEach(e => e.remove());
  const now = new Date(); const day = now.getDay(); 
  if(day >= 1 && day <= (gSat ? 6 : 5)) {
      const h = now.getHours(); const m = now.getMinutes();
      if(h >= gStartH && h < gEndH) {
          const topPx = Math.round((h - gStartH) * 52 + (m / 60) * 52);
          const cols = document.querySelectorAll('#scheduleGrid .day-col');
          if(cols[day-1]) {
              const line = document.createElement('div'); line.className = 'current-time-line';
              line.style.cssText = `position:absolute; top:${topPx}px; left:0; right:0; height:2px; background:var(--danger); z-index:20; pointer-events:none; box-shadow: 0 0 5px rgba(255,0,0,0.5);`;
              line.innerHTML = `<div style="position:absolute; left:-4px; top:-3px; width:8px; height:8px; border-radius:50%; background:var(--danger);"></div>`;
              cols[day-1].appendChild(line);
          }
      }
  }
}
setInterval(updateTimeLine, 60000);

// ── REDISEÑO GESTIÓN DE MATERIAS ──
function renderManage() {
  const container = document.getElementById('manageGrid');
  if(subjects.length === 0) { container.innerHTML = `<div style="grid-column:1/-1;">${getOnboardingHTML()}</div>`; return; }
  
  const groupedByName = {};
  subjects.forEach(s => {
      const key = String(s.name || '').trim();
      if(!groupedByName[key]) groupedByName[key] = [];
      groupedByName[key].push(s);
  });

  let html = '';
  Object.entries(groupedByName).sort((a,b) => a[0].localeCompare(b[0])).forEach(([name, list], idx) => {
      const level = String(list[0].level || '');
      const color = list[0].color || COLORS[0];
      const hasMandatory = list.some(s => s.isMandatory);
      
      html += `
      <div class="manage-card animate-fade" style="animation-delay: ${idx * 0.05}s; display:flex; flex-direction:column; gap:12px;">
          <button class="global-rm-btn" onclick="deleteEntireSubject('${name}')" title="Borrar toda la materia">🗑️</button>
          <div style="display:flex; align-items:center; gap:12px;">
              <div class="card-dot" style="background:${color}; width:18px; height:18px; border-radius:6px;"></div>
              <div style="flex:1;">
                  <div class="card-name" style="font-size:1.05rem; font-weight:800;">${name}</div>
                  <div class="card-level" style="margin-top:2px;">
                      ${hasMandatory ? `<span style="background:var(--danger); color:#fff; font-size:0.6rem; padding:2px 6px; border-radius:4px; font-weight:800; margin-right:6px;">OBLIGATORIO</span>` : ''}
                      ${level}
                  </div>
              </div>
          </div>
          <div style="font-size:0.75rem; color:var(--muted); font-weight:700; margin-top:4px;">PARALELOS DISPONIBLES:</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${list.sort((a,b) => String(a.course||'').localeCompare(String(b.course||''))).map(s => `
                  <button type="button" class="parallel-btn" onclick="editSubject('${s.id}')" title="Editar paralelo ${String(s.course||'')}">${String(s.course||'N/A')}</button>
              `).join('')}
          </div>
      </div>`;
  });
  
  container.innerHTML = html;
}

function deleteEntireSubject(targetName) {
  if(confirm(`⚠️ ¿Borrar por completo la materia "${targetName}" y todos sus paralelos?`)) {
    const idsToRemove = subjects.filter(s => String(s.name || '').trim() === targetName).map(s => String(s.id));
    subjects = subjects.filter(s => String(s.name || '').trim() !== targetName);
    idsToRemove.forEach(id => selected.delete(id));
    saveData(); renderManage(); renderSidebar(); renderGrid(); updateQuickParaleloSelect();
    if(document.getElementById('viewAuto').style.display === 'flex') renderAutoSelection();
    showToast(`🗑️ ${targetName} eliminada`);
  }
}

function renderAutoSelection() {
  const uniqueNames = [...new Set(subjects.map(s => String(s.name || '').trim()))];
  const container = document.getElementById('autoSubjectFilter');
  if(uniqueNames.length === 0) {
    container.innerHTML = '<p style="color:var(--muted); font-size:0.85rem; grid-column:1/-1;" class="animate-fade">Agrega materias primero para generar horarios.</p>'; return;
  }
  container.innerHTML = uniqueNames.map((name, index) => {
    const isMandatory = subjects.some(s => String(s.name || '').trim() === name && s.isMandatory);
    const pinHtml = isMandatory ? '<span style="color:var(--danger);" title="Obligatoria (Fija en el horario)">📌</span>' : '';
    const isChecked = !unselectedAutoFilters.has(name);
    return `
    <label class="filter-lbl animate-fade" style="animation-delay: ${index * 0.03}s">
      <input type="checkbox" value="${name}" ${isChecked ? 'checked' : ''} class="auto-filter-cb" onchange="toggleAutoFilter('${name}', this.checked)">
      <span>${pinHtml} ${name}</span>
    </label>
  `}).join('');
}

function toggleAutoFilter(name, isChecked) {
    if(isChecked) unselectedAutoFilters.delete(name);
    else unselectedAutoFilters.add(name);
}

function slotsOverlap(slotsA, slotsB) {
  for(const a of slotsA) { 
    for(const b of slotsB) { 
      if(a.day === b.day && Number(a.start) < Number(b.end) && Number(b.start) < Number(a.end)) return true; 
    } 
  } 
  return false;
}

function toggleSubject(id) {
  const targetId = String(id);
  const alertBox = document.getElementById('conflictAlert');
  if(selected.has(targetId)) { 
    selected.delete(targetId); alertBox.classList.remove('show'); 
  } else {
    const subjectToAdd = subjects.find(s => String(s.id) === targetId);
    if(!subjectToAdd) return;
    const currentSelected = subjects.filter(s => selected.has(String(s.id)));
    let conflictNames = []; let duplicateName = false;

    for(const sel of currentSelected) { 
      if(slotsOverlap(subjectToAdd.slots, sel.slots)) conflictNames.push(String(sel.name || '')); 
      if(String(sel.name || '').trim().toLowerCase() === String(subjectToAdd.name || '').trim().toLowerCase()) duplicateName = true;
    }
    
    if(duplicateName) {
      alertBox.textContent = `⚠️ Acción bloqueada: Ya tienes seleccionada "${String(subjectToAdd.name || '')}" en tu horario.`; alertBox.classList.add('show'); return;
    }
    if(conflictNames.length > 0) {
      alertBox.textContent = `⚠️ Acción bloqueada: "${String(subjectToAdd.name || '')}" cruza con "${conflictNames.join(', ')}".`; alertBox.classList.add('show'); return; 
    } 
    selected.add(targetId); alertBox.classList.remove('show'); 
  }
  document.getElementById('currentOptionLabel').textContent = ''; 
  saveData(); renderSidebar(); renderGrid();
}

function clearSelection() { 
  selected.clear(); 
  document.getElementById('conflictAlert').classList.remove('show'); 
  document.getElementById('currentOptionLabel').textContent = '';
  const sel = document.getElementById('quickParaleloSelect');
  sel.value = ''; sel.selectedIndex = 0;
  saveData(); renderSidebar(); renderGrid(); 
}

function exportSchedule() {
  if (selected.size === 0) { alert("¡El horario está vacío! Agrega materias antes de exportar."); return; }
  
  const grid = document.getElementById('scheduleGrid');
  
  // Ocultar linea de tiempo
  document.querySelectorAll('.current-time-line').forEach(e => e.style.display = 'none'); 

  // Forzar modo claro temporalmente para la exportación de PNG
  const currentTheme = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', 'light');

  // Pequeño retardo para asegurar que los estilos apliquen antes de capturar
  setTimeout(() => {
    html2canvas(grid, { 
      backgroundColor: '#ffffff', // Fondo claro garantizado
      scale: 2 
    }).then(canvas => {
      // Restaurar tema y lineas de tiempo
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.querySelectorAll('.current-time-line').forEach(e => e.style.display = 'block');
      
      const defaultName = "Horario_Academico.png";
      let fileName = prompt("Ingresa el nombre para la imagen:", defaultName);
      if (fileName === null) return; 
      if (!fileName.trim()) fileName = defaultName;
      if (!fileName.endsWith('.png')) fileName += '.png';

      const link = document.createElement('a'); 
      link.download = fileName; 
      link.href = canvas.toDataURL('image/png'); 
      link.click();
      
      showToast("📸 Horario exportado con éxito");
    }).catch(err => { 
      document.documentElement.setAttribute('data-theme', currentTheme);
      document.querySelectorAll('.current-time-line').forEach(e => e.style.display = 'block');
      console.error(err); 
    });
  }, 100);
}

// ── AUTO-GENERADOR ──
function calculateGaps(combo) {
  let gaps = 0; const activeDays = getActiveDays(); const slotsByDay = {}; activeDays.forEach(d => slotsByDay[d] = []);
  combo.forEach(s => (s.slots||[]).forEach(sl => { if(slotsByDay[sl.day]) slotsByDay[sl.day].push({ start: Number(sl.start), end: Number(sl.end) }) }));
  for (const day in slotsByDay) {
      const ds = slotsByDay[day].sort((a,b) => a.start - b.start);
      for(let i=0; i<ds.length-1; i++) {
          const gap = ds[i+1].start - ds[i].end;
          if(gap > 0) gaps += gap;
      }
  }
  return gaps;
}

function generateAutoSchedules() {
  const resultsDiv = document.getElementById('autoResults');
  resultsDiv.innerHTML = '<p style="color:var(--accent);">Calculando combinaciones óptimas...</p>';
  
  const checkboxes = document.querySelectorAll('.auto-filter-cb:checked');
  const allowedSubjects = Array.from(checkboxes).map(cb => cb.value.toLowerCase());
  const mandatoryNames = [];

  setTimeout(() => {
    const groups = {};
    subjects.forEach(s => {
      const bName = String(s.name || '').trim().toLowerCase();
      if(allowedSubjects.includes(bName)) {
        if(!groups[bName]) groups[bName] = [];
        groups[bName].push(s);
        if(s.isMandatory && !mandatoryNames.includes(bName)) { mandatoryNames.push(bName); }
      }
    });
    
    const groupKeys = Object.keys(groups);
    let allValid = [];
    let iterations = 0; const MAX_ITERATIONS = 100000; 

    function backtrack(index, currentCombo) {
      if (iterations > MAX_ITERATIONS) return; 
      iterations++;
      
      if(index === groupKeys.length) {
        if(currentCombo.length >= 1) allValid.push([...currentCombo]); return;
      }
      
      const currentGroupName = groupKeys[index];
      const isMandatoryGroup = mandatoryNames.includes(currentGroupName);

      if (!isMandatoryGroup) { backtrack(index + 1, currentCombo); }

      const parallels = groups[currentGroupName];
      for(let p of parallels) {
        let conflict = false;
        for(let c of currentCombo) { if(slotsOverlap(p.slots, c.slots)) { conflict = true; break; } }
        if(!conflict) { currentCombo.push(p); backtrack(index + 1, currentCombo); currentCombo.pop(); }
      }
    }
    
    backtrack(0, []);
    
    allValid.sort((a, b) => {
      if(b.length !== a.length) return b.length - a.length;
      const gapsA = calculateGaps(a); const gapsB = calculateGaps(b);
      if (gapsA !== gapsB) return gapsA - gapsB;
      const hA = a.reduce((acc, s) => acc + (s.slots||[]).reduce((sum,sl) => sum + (Number(sl.end) - Number(sl.start)), 0), 0);
      const hB = b.reduce((acc, s) => acc + (s.slots||[]).reduce((sum,sl) => sum + (Number(sl.end) - Number(sl.start)), 0), 0);
      return hA - hB; 
    });

    generatedCombinations = allValid;
    if (iterations > MAX_ITERATIONS) { alert("⚠️ El cálculo se detuvo por seguridad para no colgar el navegador. Mostrando los mejores resultados hallados."); }
    renderAutoResults();
  }, 100);
}

function applyAutoCombo(idsArray, indexOption) {
  selected = new Set(idsArray.map(String)); 
  document.getElementById('currentOptionLabel').textContent = `(Viendo Opción #${indexOption})`;
  document.getElementById('quickParaleloSelect').value = '';
  saveData(); renderSidebar(); renderGrid();
  showToast(`✅ Opción #${indexOption} aplicada correctamente`); switchView('schedule');
}

function renderAutoResults() {
  const resultsDiv = document.getElementById('autoResults');
  document.getElementById('btnFullScript').style.display = generatedCombinations.length ? 'block' : 'none';
  document.getElementById('btnFullCatalog').style.display = generatedCombinations.length ? 'block' : 'none';

  if(generatedCombinations.length === 0) { resultsDiv.innerHTML = '<p style="color:var(--danger);" class="animate-fade">No se encontraron combinaciones viables.</p>'; return; }

  const limit = Math.min(generatedCombinations.length, 50);
  let html = `<p style="color:var(--accent2); font-size:0.85rem; font-weight:600; margin-bottom:8px;" class="animate-fade">✅ Se generaron ${generatedCombinations.length} horarios compatibles.</p>`;
  
  for(let i = 0; i < limit; i++) {
    const combo = generatedCombinations[i];
    const totalHours = combo.reduce((acc, s) => acc + (s.slots||[]).reduce((a,sl) => a + (Number(sl.end) - Number(sl.start)), 0), 0);
    const gaps = calculateGaps(combo);
    const idsJson = JSON.stringify(combo.map(s => String(s.id)));
    
    let subjectsHtml = combo.map(s => {
       const pinHtml = s.isMandatory ? '<span style="color:var(--danger); font-size:0.7rem; margin-right:4px;" title="Obligatoria">📌</span>' : '';
       return `<div class="auto-subject"><span class="auto-subject-name">${pinHtml}${String(s.name||'')}</span><span class="auto-subject-course">Paralelo: ${String(s.course||'')}</span></div>`;
    }).join('');
    
    html += `
      <div class="auto-card animate-fade" style="animation-delay: ${i * 0.05}s">
        <div class="auto-card-header">
          <div class="auto-card-title">Opción #${i+1}</div>
          <div class="auto-card-stats">${combo.length} Materias • ${totalHours} hrs clase • ${gaps} hrs huecas</div>
        </div>
        <div>${subjectsHtml}</div>
        <button class="btn primary" style="width: 100%; margin-top: 12px; font-size:0.8rem;" onclick='applyAutoCombo(${idsJson}, ${i+1})'>Aplicar este horario</button>
      </div>`;
  }
  if(generatedCombinations.length > 50) html += `<div style="text-align:center; color:var(--muted); font-size:0.8rem; margin-top:10px;">Mostrando las 50 mejores opciones.</div>`;
  resultsDiv.innerHTML = html;
}

function downloadFullScript() {
  if(!generatedCombinations.length) return;
  let txt = `TODAS LAS POSIBILIDADES DE HORARIOS\n===============================================\n\n`;
  generatedCombinations.forEach((combo, index) => {
    const totalHours = combo.reduce((acc, s) => acc + (s.slots||[]).reduce((a,sl) => a + (Number(sl.end) - Number(sl.start)), 0), 0);
    const gaps = calculateGaps(combo);
    txt += `--- OPCIÓN #${index + 1} ---\nResumen: ${combo.length} Materias | ${totalHours} Horas totales | ${gaps} Horas huecas\n`;
    combo.forEach(s => { txt += ` > ${String(s.name||'')} - ${String(s.course||'')}\n`; }); txt += `\n`;
  });
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Posibilidades_Horarios.txt'; link.click();
}

function downloadHTMLCatalog() {
  if(!generatedCombinations.length) return;
  const expBg = isLightMode ? '#f8f9fa' : '#131314'; const expSurf = isLightMode ? '#ffffff' : '#1e1f20'; const expSurf2 = isLightMode ? '#f1f3f4' : '#282a2c'; const expBorder = isLightMode ? '#dadce0' : '#444746'; const expText = isLightMode ? '#202124' : '#e3e3e3'; const expAccent = isLightMode ? '#1a73e8' : '#e5c07b'; const expGridBg = isLightMode ? '#ffffff' : 'rgb(255, 247, 247)';

  const activeDays = getActiveDays();
  const activeHours = Array.from({length: gEndH - gStartH}, (_,i) => gStartH + i);

  let htmlContent = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8"><title>Catálogo de Horarios Generados</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${expBg}; color: ${expText}; font-family: sans-serif; padding: 40px; margin: 0; }
      h1 { text-align: center; color: ${isLightMode ? '#1a73e8' : '#a8c7fa'}; margin-bottom: 40px; }
      .schedule-container { margin-bottom: 60px; background: ${expSurf}; padding: 20px; border-radius: 12px; border: 1px solid ${expBorder}; overflow-x: auto; }
      .schedule-title { font-size: 1.2rem; font-weight: bold; margin-bottom: 15px; color: ${expAccent}; }
      .grid-wrap { display:grid; grid-template-columns:60px repeat(${activeDays.length},1fr); border:1px solid ${expBorder}; border-radius:12px; overflow:hidden; background:${expGridBg}; min-width: 700px; }
      .grid-head { background:${expSurf2}; padding:12px 6px; text-align:center; font-size:12px; font-weight:bold; color:${isLightMode?'#5f6368':'#c4c7c5'}; text-transform:uppercase; border-bottom:1px solid ${expBorder}; }
      .grid-head:first-child { border-right:1px solid rgba(0,0,0,0.08); }
      .grid-col { position:relative; border-right:1px solid rgba(0,0,0,0.08); }
      .grid-col:last-child { border-right:none; }
      .hour-col { border-right:1px solid rgba(0,0,0,0.08); }
      .hour-cell { height:52px; max-height:52px; overflow:hidden; border-bottom:1px solid rgba(0,0,0,0.08); display:flex; align-items:center; justify-content:center; padding:0 4px; font-size:10px; color:#666; font-weight:bold; text-align:center; line-height:1.2; }
      .hour-cell:last-child { border-bottom:none; }
      .day-col { position:relative; height:calc(52px * ${activeHours.length}); }
      .day-stripe { position:absolute; left:0; right:0; border-bottom:1px solid rgba(0,0,0,0.08); }
      .block { position:absolute; left:4px; right:4px; border-radius:6px; padding:6px 8px; font-size:11px; overflow:hidden; border:1px solid rgba(0,0,0,0.1); box-shadow:0 2px 6px rgba(0,0,0,.3); color:#131314; display:flex; flex-direction:column; border-left:4px solid rgba(0,0,0,0.2);}
      .block-name { font-size:13px; font-weight:bold; margin-bottom:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.1;}
      .block-detail { color:#333; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:11px; line-height:1.1;}
    </style>
  </head>
  <body><h1>Catálogo de Horarios Generados</h1>
  `;

  generatedCombinations.forEach((combo, index) => {
    const totalHours = combo.reduce((acc, s) => acc + (s.slots||[]).reduce((a,sl) => a + (Number(sl.end) - Number(sl.start)), 0), 0);
    const gaps = calculateGaps(combo);
    let gridHTML = `<div class="grid-head hour-col"></div>`;
    activeDays.forEach(d => gridHTML += `<div class="grid-head">${d}</div>`);
    gridHTML += `<div class="hour-col">`;
    activeHours.forEach(h => gridHTML += `<div class="hour-cell">${h}:00<br>-<br>${h+1}:00</div>`);
    gridHTML += `</div>`;
    activeDays.forEach(day => {
      gridHTML += `<div class="grid-col"><div class="day-col">`;
      activeHours.forEach((_,i) => gridHTML += `<div class="day-stripe" style="top:${i*52}px;height:52px"></div>`);
      combo.forEach(s => {
        (s.slots||[]).filter(sl => sl.day === day).forEach(sl => {
          if(sl.end <= gStartH || sl.start >= gEndH) return;
          const st = Math.max(sl.start, gStartH); const en = Math.min(sl.end, gEndH);
          const top = (st - gStartH) * 52 + 2; const height = ((en - st) * 52) - 4;
          gridHTML += `<div class="block" style="top:${top}px;height:${height}px;background:${s.color};border-left:4px solid rgba(0,0,0,0.2);"><div class="block-name">${String(s.name||'')}</div><div class="block-detail">${String(s.course||'')} | ${sl.start}:00–${sl.end}:00</div></div>`;
        });
      });
      gridHTML += `</div></div>`;
    });
    htmlContent += `<div class="schedule-container"><div class="schedule-title">Opción #${index + 1} - ${combo.length} Materias (${totalHours}h, ${gaps}h huecas)</div><div class="grid-wrap">${gridHTML}</div></div>`;
  });
  htmlContent += `</body></html>`;
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'Catalogo_Horarios.html'; link.click();
}

// ── MODAL LOGIC & EDITOR INMUTABLE ──
document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && document.getElementById('overlay').classList.contains('show')) closeModal();
});

document.getElementById('fName').addEventListener('input', function(e) {
  const inputName = String(e.target.value || '').trim().toLowerCase();
  const existingSubject = subjects.find(s => String(s.name || '').trim().toLowerCase() === inputName);
  if (existingSubject) { 
      document.getElementById('fLevel').value = String(existingSubject.level || '').replace(/\D/g, ''); 
      chosenColor = existingSubject.color || COLORS[0];
      renderColorRow();
      if(gMode === 'grid') buildInputGrid();
  }
});

function editSubject(id) { openModal(String(id)); }

function openModal(id) {
  if (id === 'undefined' || id === 'null' || typeof id === 'object') id = null;
  editingId = id || null; slots = []; chosenColor = COLORS[0]; activeGridCells.clear();
  updateDatalist(); 
  
  if(editingId) {
    const s = subjects.find(x => String(x.id) === String(editingId));
    if(!s) { showToast("⚠️ Error: Paralelo no encontrado."); return; }
    
    document.getElementById('modalTitle').textContent = 'Editar Paralelo';
    document.getElementById('fName').value = String(s.name || '');
    document.getElementById('fLevel').value = String(s.level || '').replace(/\D/g, '');
    document.getElementById('fCourse').value = String(s.course || '').replace('P-', '').replace('(Copia)', '').trim();
    document.getElementById('fNote').value = String(s.note || '');
    document.getElementById('fMandatory').checked = s.isMandatory === true;
    chosenColor = s.color || COLORS[0]; 
    slots = (s.slots || []).map(sl => ({...sl}));
    document.getElementById('btnModalDelete').style.display = 'block'; 
  } else {
    document.getElementById('modalTitle').textContent = 'Nueva Materia / Paralelo';
    document.getElementById('fName').value = ''; document.getElementById('fLevel').value = ''; 
    document.getElementById('fCourse').value = ''; document.getElementById('fNote').value = '';
    document.getElementById('fMandatory').checked = false;
    slots = [{day:'LUNES', start:7, end:8}];
    document.getElementById('btnModalDelete').style.display = 'none'; 
  }
  renderColorRow(); 
  
  document.getElementById('lblModeIndicator').textContent = gMode === 'grid' ? '(Modo Cuadrícula)' : '(Modo Lista)';
  document.getElementById('containerGridMode').style.display = gMode === 'grid' ? 'block' : 'none';
  document.getElementById('containerListMode').style.display = gMode === 'list' ? 'block' : 'none';
  
  if (gMode === 'grid') { 
      slots.forEach(sl => { for(let h = sl.start; h < sl.end; h++) activeGridCells.add(`${sl.day}-${h}`); }); 
      buildInputGrid(); 
  } 
  else { renderSlots(slots); }

  document.getElementById('overlay').classList.add('show');
}
function closeModal() { document.getElementById('overlay').classList.remove('show'); editingId = null; }

function renderColorRow() { const row = document.getElementById('colorRow'); row.innerHTML = COLORS.map(c => `<div class="color-dot ${c===chosenColor?'selected':''}" style="background:${c}" onclick="selectColor('${c}')"></div>`).join(''); }
function selectColor(c) { chosenColor = c; renderColorRow(); if(gMode === 'grid') buildInputGrid(); }

function buildInputGrid() {
  const activeDays = getActiveDays();
  let html = '<tr><th>Hora</th>' + activeDays.map(d => `<th>${d.substring(0,3)}</th>`).join('') + '</tr>';
  for(let h = 7; h <= 19; h++) { // Editor siempre abarca de 7 a 20 (el 19 representa 19:00 - 20:00)
    html += `<tr><td class="time-lbl">${h}:00 - ${h+1}:00</td>`;
    activeDays.forEach(d => {
      const cellId = `${d}-${h}`; const isActive = activeGridCells.has(cellId);
      html += `<td style="${isActive ? `background-color: ${chosenColor};` : ''}" class="${isActive?'active':''}" onclick="toggleGridCell('${cellId}')"></td>`;
    });
    html += '</tr>';
  }
  document.getElementById('inputGridTable').innerHTML = html;
}
function toggleGridCell(cellId) { activeGridCells.has(cellId) ? activeGridCells.delete(cellId) : activeGridCells.add(cellId); buildInputGrid(); }

function renderSlots(slotsToRender) {
  const activeDays = getActiveDays();
  const list = document.getElementById('slotList');
  list.innerHTML = (slotsToRender||[]).map(sl => `<div class="slot-row"><select class="s-day">${activeDays.map(d=>`<option ${sl.day===d?'selected':''}>${d}</option>`).join('')}</select><input type="number" min="7" max="19" class="s-start" value="${sl.start}" placeholder="Inicio"><input type="number" min="8" max="20" class="s-end" value="${sl.end}" placeholder="Fin"><button class="rm-btn" onclick="this.closest('.slot-row').remove()">✕</button></div>`).join('');
}
function addSlot() {
  const activeDays = getActiveDays();
  const list = document.getElementById('slotList');
  const lastRow = list.lastElementChild;
  let defaultDay = 'LUNES';
  if (lastRow) { const sel = lastRow.querySelector('.s-day'); if (sel) defaultDay = sel.value; }

  const div = document.createElement('div'); div.className = 'slot-row animate-fade';
  div.innerHTML = `<select class="s-day">${activeDays.map(d=>`<option ${d===defaultDay?'selected':''}>${d}</option>`).join('')}</select><input type="number" min="7" max="19" class="s-start" value="7" placeholder="Inicio"><input type="number" min="8" max="20" class="s-end" value="8" placeholder="Fin"><button class="rm-btn" onclick="this.closest('.slot-row').remove()">✕</button>`;
  list.appendChild(div);
}

function saveSubject() {
  const name = String(document.getElementById('fName').value || '').trim();
  if(!name) { alert('Ingresa el nombre de la materia'); return; }
  
  const courseInput = String(document.getElementById('fCourse').value || '').trim() || '1';
  const formattedCourse = 'P-' + courseInput;
  const levelInput = String(document.getElementById('fLevel').value || '').trim() || '1';
  const formattedLevel = 'Semestre ' + levelInput;
  
  const isDuplicate = subjects.some(s => String(s.id) !== String(editingId) && String(s.name || '').trim().toLowerCase() === name.toLowerCase() && String(s.course || '') === formattedCourse);
  if(isDuplicate) {
      alert(`⚠️ Ya existe "${name}" en el paralelo ${formattedCourse}.\nSi deseas cambiar sus horas, edita el paralelo existente.`);
      return;
  }

  let currentSlots = [];
  if (gMode === 'grid') {
    getActiveDays().forEach(day => {
      let hoursActive = []; for(let h=7; h<=19; h++) { if(activeGridCells.has(`${day}-${h}`)) hoursActive.push(h); }
      if(hoursActive.length === 0) return;
      hoursActive.sort((a,b)=>a-b); let start = hoursActive[0], prev = hoursActive[0];
      for(let i=1; i<hoursActive.length; i++) { if(hoursActive[i] === prev + 1) prev = hoursActive[i]; else { currentSlots.push({day: day, start: start, end: prev + 1}); start = hoursActive[i]; prev = hoursActive[i]; } }
      currentSlots.push({day: day, start: start, end: prev + 1});
    });
  } else {
      const slotRows = document.querySelectorAll('.slot-row');
      let invalidTime = false; let internalConflict = false;
      slotRows.forEach(row => {
        const d = row.querySelector('.s-day').value;
        const st = parseInt(row.querySelector('.s-start').value, 10);
        const en = parseInt(row.querySelector('.s-end').value, 10);
        if(isNaN(st) || isNaN(en) || st < 7 || en > 20 || st >= en) { invalidTime = true; } 
        else {
            currentSlots.forEach(existing => { if(existing.day === d && st < existing.end && en > existing.start) internalConflict = true; });
            currentSlots.push({day: d, start: st, end: en});
        }
      });
      if(invalidTime) { alert('⚠️ Hay horas inválidas. Asegúrate de usar formato 24h (7 a 20), sin decimales, y que la hora de inicio sea menor a la de fin.'); return; }
      if(internalConflict) { alert('⚠️ Hay bloques de horas que se cruzan entre sí en este mismo paralelo. Corrige las horas.'); return; }
  }

  if(currentSlots.length === 0) { alert('Agrega al menos un bloque horario válido'); return; }

  const noteVal = String(document.getElementById('fNote').value || '').trim();
  const isMandatory = document.getElementById('fMandatory').checked;

  const s = {
    id: editingId || getNextId(), name,
    level: formattedLevel,
    course: formattedCourse, color: chosenColor, slots: currentSlots, note: noteVal, isMandatory: isMandatory
  };

  if(editingId) { 
      const idx = subjects.findIndex(x => String(x.id) === String(editingId)); 
      if(idx !== -1) subjects[idx] = s; 
  } else { 
      subjects.push(s); 
  }
  
  saveData(); closeModal(); renderSidebar(); renderGrid(); renderManage(); renderAutoSelection(); updateDatalist(); updateQuickParaleloSelect();
  showToast("✅ Materia guardada con éxito");
}

function deleteSubjectFromModal() {
  if(!editingId) return;
  if(!confirm('¿Eliminar este paralelo permanentemente?')) return;
  subjects = subjects.filter(s => String(s.id) !== String(editingId)); 
  selected.delete(String(editingId)); 
  selected.delete(Number(editingId)); 
  saveData(); closeModal(); renderSidebar(); renderGrid(); renderManage(); renderAutoSelection(); updateDatalist(); updateQuickParaleloSelect();
  showToast("🗑️ Paralelo eliminado");
}

function switchView(v) {
  document.getElementById('viewSchedule').style.display = v==='schedule' ? 'flex' : 'none';
  document.getElementById('viewManage').style.display   = v==='manage'   ? 'flex' : 'none';
  document.getElementById('viewAuto').style.display     = v==='auto'     ? 'flex' : 'none';
  
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (v==='schedule' || v==='auto') { mobileBtn.style.display = window.innerWidth <= 768 ? 'block' : 'none'; } 
  else { mobileBtn.style.display = 'none'; }

  document.querySelectorAll('.tab').forEach((t,i) => { t.classList.toggle('active', (v==='schedule'&&i===0)||(v==='auto'&&i===1)||(v==='manage'&&i===2)); });
  
  if(v==='manage') renderManage();
  if(v==='auto') renderAutoSelection();
  if(v==='schedule') updateTimeLine();
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('mainSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('show'); overlay.classList.toggle('show');
}

window.addEventListener('resize', () => {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const isManageView = document.getElementById('viewManage').style.display === 'flex';
    if (window.innerWidth > 768) { mobileBtn.style.display = 'none'; } 
    else if (!isManageView) { mobileBtn.style.display = 'block'; }
});

document.getElementById('overlay').addEventListener('click', e => { if(e.target === document.getElementById('overlay')) closeModal(); });

// Inicialización
loadData(); renderSidebar(); renderGrid(); updateDatalist(); updateQuickParaleloSelect();

if(window.innerWidth <= 768 && document.getElementById('viewManage').style.display !== 'flex') document.getElementById('mobileMenuBtn').style.display = 'block';
