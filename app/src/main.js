// Vice Cover Lab — the editor.
// Two photo slots (A and B), four panels that each show one slot with its
// own zoom and offset, four layouts, four grades, a title and a subtitle,
// and PNG export in the three common post sizes. A `?shot=` query sets up
// a fixed scene for a screenshot instead (./shots.js).
import { drawCover, layoutRects, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const panelSel = document.getElementById('panelSel');
const panelSlot = document.getElementById('panelSlot');
const zoomInput = document.getElementById('zoom');
const offXInput = document.getElementById('offX');
const offYInput = document.getElementById('offY');
const sizeSel = document.getElementById('sizeSel');

/** Two photo slots; each panel shows slot A or B. */
const photos = { A: null, B: null };

const state = {
  layout: 'quad',
  grade: 'sunset',
  title: 'Coastal Heat',
  subtitle: 'Vice City nights',
  panels: [
    { slot: 'A', zoom: 1, ox: 0, oy: 0 },
    { slot: 'B', zoom: 1, ox: 0, oy: 0 },
    { slot: 'B', zoom: 1, ox: 0, oy: 0 },
    { slot: 'A', zoom: 1, ox: 0, oy: 0 },
  ],
  selectedPanel: 0,
  seed: 7,
};

function currentPanels() {
  return state.panels.map((p) => ({
    img: photos[p.slot],
    zoom: p.zoom,
    ox: p.ox,
    oy: p.oy,
  }));
}

function redraw() {
  drawCover(canvas, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    panels: currentPanels(),
    seed: state.seed,
  });
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Renders the current state at w x h and returns a PNG data URL. */
function renderDataURL(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    panels: currentPanels(),
    seed: state.seed,
  });
  return off.toDataURL('image/png');
}

/** Synchronous export hook the test driver calls for every post size. */
window.__exportDataURL = (w, h) => renderDataURL(w, h);

function fitPreviewToViewport() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / canvas.width, vh / canvas.height, 1);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}

function syncPanelControls() {
  const p = state.panels[state.selectedPanel];
  panelSel.value = String(state.selectedPanel);
  panelSlot.value = p.slot;
  zoomInput.value = String(p.zoom);
  offXInput.value = String(p.ox);
  offYInput.value = String(p.oy);
}

function setStatus(text) {
  status.textContent = text;
}

/** Applies a whole scene (used by the screenshot driver). */
export function applyScene(scene) {
  state.layout = scene.layout;
  state.grade = scene.grade;
  state.title = scene.title;
  state.subtitle = scene.subtitle ?? '';
  if (scene.photos) {
    for (const [slot, img] of Object.entries(scene.photos)) photos[slot] = img;
  }
  if (scene.panels) {
    scene.panels.forEach((p, i) => {
      if (i < state.panels.length) state.panels[i] = { ...state.panels[i], ...p };
    });
  }
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  document.querySelectorAll('input[name="layout"]').forEach((r) => {
    r.checked = r.value === state.layout;
  });
  document.querySelectorAll('input[name="grade"]').forEach((r) => {
    r.checked = r.value === state.grade;
  });
  if (scene.size) {
    canvas.width = scene.size[0];
    canvas.height = scene.size[1];
  }
  if (scene.coverOnly) {
    document.body.classList.add('shot-cover');
    fitPreviewToViewport();
  }
  syncPanelControls();
  redraw();
}

async function loadSlot(slot, fileOrUrl) {
  const img = typeof fileOrUrl === 'string'
    ? await loadImage(fileOrUrl)
    : await loadImage(URL.createObjectURL(fileOrUrl));
  photos[slot] = img;
  redraw();
  setStatus(`Photo ${slot} loaded.`);
}

document.getElementById('photoA').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await loadSlot('A', file);
});
document.getElementById('photoB').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) await loadSlot('B', file);
});
for (const slot of ['A', 'B']) {
  for (const sample of ['pier', 'boulevard']) {
    document.getElementById(`sample${slot}-${sample}`).addEventListener('click', async () => {
      await loadSlot(slot, `samples/${sample}.jpg`);
    });
  }
}

document.querySelectorAll('input[name="layout"]').forEach((r) => {
  r.addEventListener('change', () => {
    state.layout = r.value;
    syncPanelControls();
    redraw();
  });
});
document.querySelectorAll('input[name="grade"]').forEach((r) => {
  r.addEventListener('change', () => {
    state.grade = r.value;
    redraw();
  });
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

panelSel.addEventListener('change', () => {
  state.selectedPanel = Number(panelSel.value);
  syncPanelControls();
});
panelSlot.addEventListener('change', () => {
  state.panels[state.selectedPanel].slot = panelSlot.value;
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[state.selectedPanel].zoom = Number(zoomInput.value);
  redraw();
});
offXInput.addEventListener('input', () => {
  state.panels[state.selectedPanel].ox = Number(offXInput.value);
  redraw();
});
offYInput.addEventListener('input', () => {
  state.panels[state.selectedPanel].oy = Number(offYInput.value);
  redraw();
});

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  const hit = rects.panels.findIndex(
    (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
  );
  if (hit >= 0) {
    state.selectedPanel = hit;
    syncPanelControls();
    setStatus(`Panel ${hit + 1} selected — adjust its photo, zoom and position.`);
  }
});

document.getElementById('export').addEventListener('click', () => {
  const [w, h] = sizeSel.value.split('x').map(Number);
  const dataUrl = renderDataURL(w, h);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `vice-cover-${w}x${h}.png`;
  a.click();
  setStatus(`Saved vice-cover-${w}x${h}.png`);
});

/** Marks the page ready once fonts are in and the first paint is done. */
function markReady() {
  document.fonts.ready.then(() => {
    redraw();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.__shotReady = true;
    }));
  });
}

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), { loadImage, applyScene, markReady });
} else {
  Promise.all([loadImage('samples/pier.jpg'), loadImage('samples/boulevard.jpg')])
    .then(([pier, boulevard]) => {
      photos.A = pier;
      photos.B = boulevard;
      redraw();
      markReady();
    })
    .catch(() => markReady());
}
