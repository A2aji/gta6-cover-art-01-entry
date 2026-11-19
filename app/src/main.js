// Sunset Press editor: photos, layouts, grades, captions, per-panel crop/pan,
// undo/redo and PNG export. Photos stay on the machine; the app makes no network
// request. A `?shot=` query sets up a fixed scene for screenshots (./shots.js).
import { DEFAULT_STATE, EXPORT_SIZES, GRADES, LAYOUTS, defaultPanels, drawCover, ensurePanels, exportCoverPng, layoutPanels } from './cover.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/pier.jpg', name: 'Pier' },
  { src: 'samples/skyline.jpg', name: 'Skyline' },
  { src: 'samples/palms.jpg', name: 'Palms' },
  { src: 'samples/neonstreet.jpg', name: 'Pier dusk' },
];

const preview = document.getElementById('preview');
const status = document.getElementById('status');
const state = structuredClone(DEFAULT_STATE);
state.panels = defaultPanels(state.layout);
let photos = [];
let selectedPanel = 0;
let undoStack = [];
let redoStack = [];
let dragStart = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function pushHistory() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

function restore(snapshot) {
  const parsed = JSON.parse(snapshot);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, parsed);
  ensurePanels(state);
  selectedPanel = 0;
  syncControls();
  redraw();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.stringify(state));
  restore(undoStack.pop());
  status.textContent = 'Undid the last change.';
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.stringify(state));
  restore(redoStack.pop());
  status.textContent = 'Redid the change.';
}

function redraw() {
  drawCover(preview, photos, state);
}

function syncControls() {
  document.querySelectorAll('#layoutBtns button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeBtns button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('taglineInput').value = state.tagline;
  document.getElementById('badgeInput').value = state.badge;
  document.getElementById('grainToggle').checked = state.grain;
  document.getElementById('vignetteToggle').checked = state.vignette;
  document.querySelectorAll('#heatBtns button').forEach((b, i) => b.classList.toggle('lit', i < state.heat));
  const panel = state.panels[selectedPanel];
  const label = document.getElementById('panelLabel');
  label.textContent = `Panel ${selectedPanel + 1} of ${state.panels.length} — ${photos[panel?.photo]?.name ?? 'empty'}`;
  const sel = document.getElementById('panelPhoto');
  sel.innerHTML = photos.map((p, i) => `<option value="${i}">${p.name}</option>`).join('') + '<option value="-1">Empty</option>';
  sel.value = String(panel?.photo ?? -1);
  document.getElementById('panelZoom').value = String(panel?.zoom ?? 1);
  document.querySelectorAll('#tray img').forEach((img, i) => {
    img.classList.toggle('in-use', state.panels.some((p) => p.photo === i));
  });
}

function buildControlButtons() {
  const layoutBox = document.getElementById('layoutBtns');
  layoutBox.innerHTML = '';
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.layout = key; b.textContent = def.label;
    b.addEventListener('click', () => {
      if (state.layout === key) return;
      pushHistory();
      state.layout = key;
      ensurePanels(state);
      selectedPanel = 0;
      syncControls(); redraw();
    });
    layoutBox.appendChild(b);
  }
  const gradeBox = document.getElementById('gradeBtns');
  gradeBox.innerHTML = '';
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.grade = key; b.title = def.label;
    b.className = 'grade-swatch';
    b.style.background = `linear-gradient(135deg, ${def.wash[0].replace(/[\d.]+\)$/, '0.9)')}, ${def.wash[1].replace(/[\d.]+\)$/, '0.9)')})`;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      pushHistory();
      state.grade = key;
      syncControls(); redraw();
    });
    gradeBox.appendChild(b);
  }
  const heatBox = document.getElementById('heatBtns');
  heatBox.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = '★'; b.title = `${i} star${i > 1 ? 's' : ''} of heat`;
    b.addEventListener('click', () => {
      if (state.heat === i) return;
      pushHistory();
      state.heat = i;
      syncControls(); redraw();
    });
    heatBox.appendChild(b);
  }
  const sizeSel = document.getElementById('previewSize');
  sizeSel.innerHTML = EXPORT_SIZES.map((s, i) => `<option value="${i}">${s.label}</option>`).join('');
  sizeSel.addEventListener('change', () => {
    const s = EXPORT_SIZES[Number(sizeSel.value)];
    preview.width = s.w; preview.height = s.h;
    redraw();
  });
  const exportBox = document.getElementById('exportBtns');
  exportBox.innerHTML = '';
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `PNG ${s.w} × ${s.h}`;
    b.addEventListener('click', () => exportOne(s));
    exportBox.appendChild(b);
  });
}

function bindTextInputs() {
  const bind = (id, key) => {
    document.getElementById(id).addEventListener('input', (e) => {
      state[key] = e.target.value;
      redraw();
    });
    document.getElementById(id).addEventListener('change', () => pushHistory());
  };
  bind('titleInput', 'title');
  bind('subtitleInput', 'subtitle');
  bind('taglineInput', 'tagline');
  bind('badgeInput', 'badge');
  document.getElementById('grainToggle').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
  document.getElementById('vignetteToggle').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; redraw(); });
  document.getElementById('panelPhoto').addEventListener('change', (e) => {
    pushHistory();
    state.panels[selectedPanel].photo = Number(e.target.value);
    syncControls(); redraw();
  });
  document.getElementById('panelZoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    redraw();
  });
  document.getElementById('panelZoom').addEventListener('change', () => pushHistory());
  document.getElementById('swapBtn').addEventListener('click', () => {
    if (state.panels.length < 2) return;
    pushHistory();
    const next = (selectedPanel + 1) % state.panels.length;
    const a = state.panels[selectedPanel].photo;
    state.panels[selectedPanel].photo = state.panels[next].photo;
    state.panels[next].photo = a;
    syncControls(); redraw();
    status.textContent = `Swapped photos between panel ${selectedPanel + 1} and panel ${next + 1}.`;
  });
  document.getElementById('resetPanBtn').addEventListener('click', () => {
    pushHistory();
    const p = state.panels[selectedPanel];
    p.ox = 0; p.oy = 0; p.zoom = 1;
    syncControls(); redraw();
  });
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  document.getElementById('exportAll').addEventListener('click', exportAll);
}

/** Hit-tests the preview canvas: returns the panel index under a canvas point. */
export function panelAtPoint(px, py) {
  const rects = layoutPanels(state.layout, preview.width, preview.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    const dx = px - cx, dy = py - cy;
    const cos = Math.cos(-(r.rot || 0)), sin = Math.sin(-(r.rot || 0));
    const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
    if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
  }
  return -1;
}

function canvasPoint(e) {
  const box = preview.getBoundingClientRect();
  return {
    x: (e.clientX - box.left) * (preview.width / box.width),
    y: (e.clientY - box.top) * (preview.height / box.height),
  };
}

function bindPreviewDrag() {
  preview.addEventListener('pointerdown', (e) => {
    const pt = canvasPoint(e);
    const idx = panelAtPoint(pt.x, pt.y);
    if (idx === -1) return;
    pushHistory();
    selectedPanel = idx;
    syncControls();
    dragStart = { ...pt, ox: state.panels[idx].ox || 0, oy: state.panels[idx].oy || 0 };
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    const pt = canvasPoint(e);
    const rects = layoutPanels(state.layout, preview.width, preview.height);
    const r = rects[selectedPanel];
    const panel = state.panels[selectedPanel];
    panel.ox = dragStart.ox + (pt.x - dragStart.x) / r.w;
    panel.oy = dragStart.oy + (pt.y - dragStart.y) / r.h;
    redraw();
  });
  const endDrag = () => { dragStart = null; };
  preview.addEventListener('pointerup', endDrag);
  preview.addEventListener('pointercancel', endDrag);
}

async function addFiles(files) {
  const room = Math.max(0, 9 - photos.length);
  const picked = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room);
  for (const file of picked) {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    photos.push({ img, name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Photo' });
  }
  if (picked.length) {
    buildTray();
    syncControls();
    redraw();
    status.textContent = `Added ${picked.length} photo${picked.length > 1 ? 's' : ''}. Click a panel, then pick a photo for it.`;
  }
}

function buildTray() {
  const tray = document.getElementById('tray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const img = document.createElement('img');
    img.src = p.img.src;
    img.alt = p.name;
    img.title = p.name;
    img.addEventListener('click', () => {
      pushHistory();
      state.panels[selectedPanel].photo = i;
      syncControls(); redraw();
      status.textContent = `Panel ${selectedPanel + 1} now shows “${p.name}”.`;
    });
    tray.appendChild(img);
  });
}

function bindUploads() {
  document.getElementById('photoInput').addEventListener('change', (e) => {
    addFiles(e.target.files);
    e.target.value = '';
  });
  const zone = document.getElementById('dropZone');
  ['dragenter', 'dragover'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function exportOne(size) {
  const blob = await exportCoverPng(photos, state, size.w, size.h);
  if (!blob) { status.textContent = 'Export failed — try again.'; return; }
  downloadBlob(blob, `sunset-press-${size.w}x${size.h}.png`);
  status.textContent = `Saved sunset-press-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KiB).`;
}

async function exportAll() {
  for (const size of EXPORT_SIZES) {
    const blob = await exportCoverPng(photos, state, size.w, size.h);
    if (blob) downloadBlob(blob, `sunset-press-${size.w}x${size.h}.png`);
    await new Promise((r) => setTimeout(r, 120));
  }
  status.textContent = `Exported all 4 sizes as PNG.`;
}

async function init() {
  buildControlButtons();
  bindTextInputs();
  bindPreviewDrag();
  bindUploads();
  photos = [];
  for (const s of SAMPLES) {
    photos.push({ img: await loadImage(s.src), name: s.name });
  }
  buildTray();
  // Wait for the vendored OFL fonts so the first paint already uses them.
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('20px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system fonts */ }
  syncControls();
  redraw();
  const params = new URLSearchParams(location.search);
  if (params.get('shot')) {
    runShot(params.get('shot'), params, { state, photos, syncControls, redraw, loadImage, pushHistory });
  }
}

// Debug/testing hook used by the screenshot script: renders a real export PNG.
window.__sunsetPress = {
  get state() { return state; },
  get photos() { return photos; },
  async exportPngDataUrl(w, h) {
    const blob = await exportCoverPng(photos, state, w, h);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },
};

init();
