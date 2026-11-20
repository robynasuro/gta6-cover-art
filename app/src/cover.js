// Vice Cover Lab — the cover engine.
// Draws one poster from a state: a layout (how the panels sit), a grade
// (the colour treatment), a title in Anton, a subtitle in Pacifico, and up
// to four photos, each with its own zoom and offset. Everything is drawn
// with the canvas 2D API, no network, no libraries. The grain is seeded,
// so the same state always draws the same bytes.

export const LAYOUTS = [
  { id: 'quad', name: 'Quad Grid', hint: 'Four equal panels' },
  { id: 'hero', name: 'Hero Split', hint: 'One big panel, three small' },
  { id: 'bleed', name: 'Full Bleed', hint: 'One photo, edge to edge' },
  { id: 'tilt', name: 'Tilted Stack', hint: 'Three tilted snapshots' },
];

export const GRADES = [
  {
    id: 'sunset', name: 'Sunset', accent: '#ffd166', scrim: '#1a0b2e',
    skyTop: '#ff9a56', skyBottom: '#c2185b',
    tintTop: 'rgba(255, 122, 60, 0.55)', tintBottom: 'rgba(194, 24, 91, 0.55)',
  },
  {
    id: 'neon', name: 'Neon Night', accent: '#00f0ff', scrim: '#050514',
    skyTop: '#0b1035', skyBottom: '#3b1d8f',
    tintTop: 'rgba(0, 229, 255, 0.45)', tintBottom: 'rgba(123, 47, 247, 0.55)',
  },
  {
    id: 'gold', name: 'Palm Gold', accent: '#ffe9a8', scrim: '#10231f',
    skyTop: '#ffd98a', skyBottom: '#0e5e6b',
    tintTop: 'rgba(255, 201, 77, 0.5)', tintBottom: 'rgba(14, 94, 107, 0.5)',
  },
  {
    id: 'mono', name: 'Mono Vice', accent: '#ff8fb0', scrim: '#12060d',
    skyTop: '#3a3a3a', skyBottom: '#0a0a0a',
    tintTop: 'rgba(255, 94, 138, 0.28)', tintBottom: 'rgba(20, 20, 30, 0.45)',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** Small seeded PRNG (mulberry32) so the grain is identical on every run. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Draws one panel photo into a rect: cover-fit, then the panel's zoom
 * and offset. `filter` is a canvas filter string (used by the mono grade).
 */
function drawPanelPhoto(ctx, img, rect, panel, filter) {
  if (!img) return;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = panel.zoom ?? 1;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const pw = iw * scale;
  const ph = ih * scale;
  const dx = rect.x + (rect.w - pw) / 2 + (panel.ox ?? 0) * rect.w * 0.25;
  const dy = rect.y + (rect.h - ph) / 2 + (panel.oy ?? 0) * rect.h * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (filter) ctx.filter = filter;
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** A warm-to-cool overlay wash that gives a photo its grade. */
function gradeWash(ctx, rect, grade) {
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.tintTop);
  wash.addColorStop(1, grade.tintBottom);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

/** Panel rects for a layout, as fractions of the canvas, plus the title band. */
export function layoutRects(layout, w, h) {
  const gap = Math.round(w * 0.018);
  const band = Math.round(h * 0.24);
  if (layout === 'hero') {
    const left = Math.round(w * 0.58);
    const rightW = w - left - gap;
    const third = Math.round((h - gap * 2) / 3);
    return {
      panels: [
        { x: 0, y: 0, w: left, h },
        { x: left + gap, y: 0, w: rightW, h: third },
        { x: left + gap, y: third + gap, w: rightW, h: third },
        { x: left + gap, y: (third + gap) * 2, w: rightW, h: third },
      ],
      band: { x: 0, y: h - band, w, h: band },
    };
  }
  if (layout === 'bleed') {
    return {
      panels: [{ x: 0, y: 0, w, h }],
      band: { x: 0, y: h - Math.round(h * 0.32), w, h: Math.round(h * 0.32) },
    };
  }
  if (layout === 'tilt') {
    const pw = Math.round(w * 0.52);
    const ph = Math.round(h * 0.52);
    return {
      panels: [
        { x: Math.round(w * 0.06), y: Math.round(h * 0.05), w: pw, h: ph, rot: -0.1 },
        { x: Math.round(w * 0.42), y: Math.round(h * 0.12), w: pw, h: ph, rot: 0.05 },
        { x: Math.round(w * 0.24), y: Math.round(h * 0.3), w: pw, h: ph, rot: 0.12 },
      ],
      band: { x: 0, y: h - Math.round(h * 0.2), w, h: Math.round(h * 0.2) },
    };
  }
  const half = Math.round((w - gap) / 2);
  const halfH = Math.round((h - gap) / 2);
  return {
    panels: [
      { x: 0, y: 0, w: half, h: halfH },
      { x: half + gap, y: 0, w: half, h: halfH },
      { x: 0, y: halfH + gap, w: half, h: halfH },
      { x: half + gap, y: halfH + gap, w: half, h: halfH },
    ],
    band: { x: 0, y: h - band, w, h: band },
  };
}

/** The sky behind the tilted snapshots: gradient, sun disc, horizon glow. */
function drawSky(ctx, w, h, grade) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sunR = w * 0.2;
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.34, sunR * 0.1, w * 0.5, h * 0.34, sunR);
  sun.addColorStop(0, 'rgba(255, 240, 200, 0.95)');
  sun.addColorStop(0.55, 'rgba(255, 190, 110, 0.55)');
  sun.addColorStop(1, 'rgba(255, 150, 80, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
}

/** A tilted snapshot: white frame, photo, grade wash, soft drop shadow. */
function drawSnapshot(ctx, img, rect, panel, grade, filter) {
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(rect.rot ?? 0);
  const frame = Math.round(rect.w * 0.03);
  ctx.fillStyle = '#fdf8f0';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = rect.w * 0.04;
  ctx.shadowOffsetY = rect.w * 0.02;
  ctx.fillRect(-rect.w / 2 - frame, -rect.h / 2 - frame, rect.w + frame * 2, rect.h + frame * 2);
  ctx.shadowColor = 'transparent';
  ctx.restore();
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(rect.rot ?? 0);
  ctx.translate(-rect.w / 2, -rect.h / 2);
  drawPanelPhoto(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, panel, filter);
  gradeWash(ctx, { x: 0, y: 0, w: rect.w, h: rect.h }, grade);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const v = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  v.addColorStop(0, 'rgba(0, 0, 0, 0)');
  v.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

function drawGrain(ctx, w, h, seed) {
  const rand = seededRandom(seed);
  const count = Math.round((w * h) / 900);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.restore();
}

/** Fits the title to the band width, then draws subtitle + title. */
function drawLettering(ctx, band, title, subtitle, grade) {
  const scrim = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
  scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
  scrim.addColorStop(0.45, 'rgba(0, 0, 0, 0.55)');
  scrim.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  const cx = band.x + band.w / 2;
  const text = (title || '').trim().toUpperCase();
  const sub = (subtitle || '').trim();
  const titleBase = band.y + band.h * 0.78;
  if (sub) {
    let subSize = band.h * 0.2;
    ctx.font = `${subSize}px Pacifico, cursive`;
    while (ctx.measureText(sub).width > band.w * 0.8 && subSize > 10) {
      subSize -= 1;
      ctx.font = `${subSize}px Pacifico, cursive`;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = subSize * 0.25;
    ctx.fillText(sub, cx, band.y + band.h * 0.34);
    ctx.shadowBlur = 0;
  }
  if (!text) return;
  let size = band.h * 0.52;
  ctx.font = `${size}px Anton, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.04)}px`; } catch { /* older canvas */ }
  while (ctx.measureText(text).width > band.w * 0.88 && size > 12) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(size * 0.04)}px`; } catch { /* older canvas */ }
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  ctx.fillText(text, cx, titleBase);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/**
 * Draws the whole cover onto the canvas at its own size.
 * state: { layout, grade, title, subtitle, panels: [{ img, zoom, ox, oy }], seed }
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = gradeById(state.grade);
  const filter = state.grade === 'mono' ? 'grayscale(1) contrast(1.18)' : '';
  const panels = state.panels ?? [];
  const rects = layoutRects(state.layout, w, h);

  ctx.fillStyle = grade.scrim;
  ctx.fillRect(0, 0, w, h);
  if (state.layout === 'tilt') drawSky(ctx, w, h, grade);

  rects.panels.forEach((rect, i) => {
    const panel = panels[i] ?? {};
    if (!panel.img) {
      ctx.fillStyle = '#241a30';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }
    if (state.layout === 'tilt') {
      drawSnapshot(ctx, panel.img, rect, panel, grade, filter);
    } else {
      drawPanelPhoto(ctx, panel.img, rect, panel, filter);
      gradeWash(ctx, rect, grade);
    }
  });

  if (state.layout === 'tilt') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 0, w, h);
  }
  drawLettering(ctx, rects.band, state.title, state.subtitle, grade);
  drawVignette(ctx, w, h);
  drawGrain(ctx, w, h, state.seed ?? 7);

  // Poster frame: thick white border, thin inner hairline.
  const frame = Math.max(4, Math.round(w * 0.012));
  ctx.strokeStyle = '#fdf8f0';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(frame * 1.6, frame * 1.6, w - frame * 3.2, h - frame * 3.2);
}
