// Sunset Press — the cover renderer. Draws a GTA-style multi-panel poster cover
// onto any canvas: photo panels, a colour grade, and a halftone title block with
// Anton lettering and a Pacifico script subtitle. Pure canvas 2D, no network.
export const LAYOUTS = {
  hero: { label: 'Full-bleed hero', panels: 1 },
  grid4: { label: 'Four-panel grid', panels: 4 },
  hero3: { label: 'Hero-and-three', panels: 4 },
  grid9: { label: 'Nine-panel grid', panels: 9 },
  tilted: { label: 'Tilted snapshots', panels: 3 },
  strips: { label: 'Three-strip vertical', panels: 3 },
  diagonal: { label: 'Diagonal split', panels: 2 },
};

export const GRADES = {
  sunset: { label: 'Sunset', filter: 'saturate(1.30) contrast(1.12) brightness(1.02)', wash: ['rgba(255,120,60,0.30)', 'rgba(190,30,120,0.34)'], title: ['#fff7d6', '#ffd166', '#ff5e62'] },
  neon: { label: 'Neon Nights', filter: 'saturate(1.55) contrast(1.16)', wash: ['rgba(255,0,150,0.30)', 'rgba(0,220,255,0.30)'], title: ['#ffffff', '#ff7ad9', '#00e5ff'] },
  vice: { label: 'Vice Pink', filter: 'saturate(1.40) contrast(1.08)', wash: ['rgba(255,90,190,0.34)', 'rgba(120,40,200,0.34)'], title: ['#fff0fa', '#ff9de2', '#c86bfa'] },
  noir: { label: 'Noir', filter: 'grayscale(1) contrast(1.35) brightness(1.06)', wash: ['rgba(255,255,255,0.10)', 'rgba(0,0,0,0.30)'], title: ['#ffffff', '#e8e8e8', '#9a9a9a'] },
  golden: { label: 'Golden Hour', filter: 'sepia(0.35) saturate(1.45) contrast(1.10) brightness(1.05)', wash: ['rgba(255,190,60,0.30)', 'rgba(200,110,20,0.28)'], title: ['#fffbe8', '#ffe066', '#ff9f1c'] },
  teal: { label: 'Teal Heat', filter: 'saturate(1.28) contrast(1.14)', wash: ['rgba(0,200,190,0.30)', 'rgba(255,110,40,0.30)'], title: ['#eafffb', '#7df9d4', '#ff8c42'] },
};

export const EXPORT_SIZES = [
  { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
  { label: 'Story 1080 x 1920', w: 1080, h: 1920 },
];

export const DEFAULT_STATE = {
  layout: 'hero3',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'one last score in Sunset City',
  tagline: 'EVERY SUNSET HAS A PRICE',
  heat: 4,
  badge: 'SUNSET PRESS',
  grain: true,
  vignette: true,
  panels: [],
};

export function defaultPanels(layout) {
  const n = LAYOUTS[layout].panels;
  return Array.from({ length: n }, (_, i) => ({ photo: i, zoom: 1, ox: 0, oy: 0 }));
}

export function ensurePanels(state) {
  const want = LAYOUTS[state.layout].panels;
  if (!state.panels || state.panels.length !== want) {
    const old = state.panels || [];
    state.panels = Array.from({ length: want }, (_, i) => old[i] || { photo: i, zoom: 1, ox: 0, oy: 0 });
  }
}

/** Panel rectangles for a layout, in cover pixels. Cover area is the top 78%;
 * the bottom 22% is the title block. Returns [{x,y,w,h,rot,border}]. */
export function layoutPanels(layout, W, H) {
  const CH = H * 0.78;
  const g = Math.max(4, Math.round(W * 0.008)); // gutter
  const P = [];
  if (layout === 'hero') {
    P.push({ x: 0, y: 0, w: W, h: CH, rot: 0, border: 0 });
  } else if (layout === 'grid4') {
    const cw = (W - g) / 2, ch = (CH - g) / 2;
    P.push({ x: 0, y: 0, w: cw, h: ch, rot: 0, border: 0 });
    P.push({ x: cw + g, y: 0, w: cw, h: ch, rot: 0, border: 0 });
    P.push({ x: 0, y: ch + g, w: cw, h: ch, rot: 0, border: 0 });
    P.push({ x: cw + g, y: ch + g, w: cw, h: ch, rot: 0, border: 0 });
  } else if (layout === 'hero3') {
    const lw = W * 0.62, rw = W - lw - g;
    const rh = (CH - 2 * g) / 3;
    P.push({ x: 0, y: 0, w: lw, h: CH, rot: 0, border: 0 });
    for (let i = 0; i < 3; i++) P.push({ x: lw + g, y: i * (rh + g), w: rw, h: rh, rot: 0, border: 0 });
  } else if (layout === 'grid9') {
    const cw = (W - 2 * g) / 3, ch = (CH - 2 * g) / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      P.push({ x: c * (cw + g), y: r * (ch + g), w: cw, h: ch, rot: 0, border: 0 });
  } else if (layout === 'tilted') {
    const pw = W * 0.46, ph = CH * 0.30, bw = Math.round(W * 0.022);
    P.push({ x: W * 0.03, y: CH * 0.05, w: pw, h: ph, rot: -0.10, border: bw });
    P.push({ x: W * 0.51, y: CH * 0.34, w: pw, h: ph, rot: 0.07, border: bw });
    P.push({ x: W * 0.27, y: CH * 0.63, w: pw, h: ph, rot: -0.03, border: bw });
  } else if (layout === 'strips') {
    const cw = (W - 2 * g) / 3;
    for (let i = 0; i < 3; i++) P.push({ x: i * (cw + g), y: 0, w: cw, h: CH, rot: 0, border: 0 });
  } else if (layout === 'diagonal') {
    P.push({ x: 0, y: 0, w: W, h: CH, rot: 0, border: 0, clip: 'diagA' });
    P.push({ x: 0, y: 0, w: W, h: CH, rot: 0, border: 0, clip: 'diagB' });
  }
  return P;
}

/** Draws one photo into a panel rect, cover-fit, with per-panel zoom and pan.
 * ox/oy are fractions of the panel size; they are clamped so the photo still covers. */
export function drawPanelPhoto(ctx, photo, rect, panel) {
  const { x, y, w, h } = rect;
  if (!photo) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#3a2350');
    grad.addColorStop(1, '#1c1030');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.setLineDash([w * 0.02, w * 0.02]);
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect(x + w * 0.04, y + h * 0.04, w * 0.92, h * 0.92);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = `${Math.max(14, h * 0.055)}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DROP A PHOTO HERE', x + w / 2, y + h / 2);
    return;
  }
  const zoom = panel.zoom || 1;
  const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
  const pw = photo.naturalWidth * base;
  const ph = photo.naturalHeight * base;
  const maxOx = Math.max(0, (pw - w) / 2);
  const maxOy = Math.max(0, (ph - h) / 2);
  const ox = Math.max(-maxOx, Math.min(maxOx, (panel.ox || 0) * w));
  const oy = Math.max(-maxOy, Math.min(maxOy, (panel.oy || 0) * h));
  ctx.drawImage(photo, x + (w - pw) / 2 + ox, y + (h - ph) / 2 + oy, pw, ph);
}

/** Applies the grade: a CSS filter on the photos plus a coloured wash. */
export function applyGradeWash(ctx, grade, W, CH) {
  const g = GRADES[grade] || GRADES.sunset;
  const wash = ctx.createLinearGradient(0, 0, W, CH);
  wash.addColorStop(0, g.wash[0]);
  wash.addColorStop(1, g.wash[1]);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, CH);
  ctx.globalCompositeOperation = 'source-over';
  return g;
}

function halftonePattern(ctx, size, dot, color) {
  const p = document.createElement('canvas');
  p.width = size * 2; p.height = size * 2;
  const c = p.getContext('2d');
  c.fillStyle = color;
  for (const [cx, cy, r] of [[size * 0.5, size * 0.5, dot], [size * 1.5, size * 0.5, dot * 0.7], [size * 0.5, size * 1.5, dot * 0.7], [size * 1.5, size * 1.5, dot]]) {
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  }
  return ctx.createPattern(p, 'repeat');
}

/** The halftone title block: gradient + dots, Anton title, Pacifico subtitle,
 * tagline, star heat meter and a badge ribbon. */
export function drawTitleBlock(ctx, state, W, H) {
  const CH = H * 0.78, TY = CH, TH = H - CH;
  const g = GRADES[state.grade] || GRADES.sunset;
  const bg = ctx.createLinearGradient(0, TY, 0, H);
  bg.addColorStop(0, '#241233');
  bg.addColorStop(0.55, '#3d1445');
  bg.addColorStop(1, '#12081f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, TY, W, TH);
  const dots = halftonePattern(ctx, Math.max(10, TH * 0.09), Math.max(2.5, TH * 0.028), 'rgba(255,255,255,0.10)');
  ctx.fillStyle = dots;
  ctx.fillRect(0, TY, W, TH);
  ctx.fillStyle = 'rgba(255,94,140,0.55)';
  ctx.fillRect(0, TY, W, Math.max(3, TH * 0.03));

  const pad = W * 0.045;
  const cx = W / 2;
  // Badge ribbon, top-right of the title block.
  const badge = (state.badge || '').trim().toUpperCase();
  if (badge) {
    ctx.save();
    ctx.font = `${Math.max(12, TH * 0.115)}px 'Bebas Neue', sans-serif`;
    const bw = ctx.measureText(badge).width + W * 0.04;
    const bh = TH * 0.20;
    ctx.translate(W - pad - bw / 2, TY + TH * 0.16);
    ctx.rotate(0.06);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh * 0.16);
    ctx.fillRect(-bw / 2, bh / 2 - bh * 0.16, bw, bh * 0.16);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(badge, 0, 1);
    ctx.restore();
  }
  // Star heat meter, top-left.
  const stars = Math.max(1, Math.min(5, state.heat || 3));
  const ss = TH * 0.15;
  ctx.font = `${ss}px sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', pad + i * ss * 1.15, TY + TH * 0.16);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `${Math.max(11, TH * 0.10)}px 'Bebas Neue', sans-serif`;
  ctx.fillText('HEAT', pad + 5 * ss * 1.15 + W * 0.012, TY + TH * 0.16);

  // Main title in Anton, sunset-gradient fill, dark outline, fitted to width.
  const title = (state.title || '').trim().toUpperCase() || 'SUNSET';
  let size = TH * 0.42;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fit = () => {
    ctx.font = `${size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(1, size * 0.02)}px`; } catch { /* older canvas */ }
    return ctx.measureText(title).width;
  };
  while (fit() > W - pad * 2 && size > 16) size -= 2;
  const titleGrad = ctx.createLinearGradient(0, TY + TH * 0.30, 0, TY + TH * 0.72);
  titleGrad.addColorStop(0, g.title[0]);
  titleGrad.addColorStop(0.55, g.title[1]);
  titleGrad.addColorStop(1, g.title[2]);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(20,5,30,0.85)';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.strokeText(title, cx, TY + TH * 0.48);
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, cx, TY + TH * 0.48);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }

  // Pacifico script subtitle.
  const sub = (state.subtitle || '').trim();
  if (sub) {
    ctx.font = `${Math.max(13, TH * 0.155)}px Pacifico, cursive`;
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = 'rgba(0,229,255,0.7)';
    ctx.shadowBlur = TH * 0.08;
    ctx.fillText(sub, cx, TY + TH * 0.76);
    ctx.shadowBlur = 0;
  }
  // Tagline in Bebas Neue with side rules.
  const tag = (state.tagline || '').trim().toUpperCase();
  if (tag) {
    ctx.font = `${Math.max(11, TH * 0.105)}px 'Bebas Neue', sans-serif`;
    const tw = ctx.measureText(tag).width;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(tag, cx, TY + TH * 0.90);
    ctx.fillStyle = 'rgba(255,209,102,0.8)';
    ctx.fillRect(cx - tw / 2 - W * 0.05, TY + TH * 0.90 - 1, W * 0.035, 2);
    ctx.fillRect(cx + tw / 2 + W * 0.015, TY + TH * 0.90 - 1, W * 0.035, 2);
  }
}

let noisePattern = null;
function getNoise(ctx) {
  if (noisePattern) return noisePattern;
  const n = document.createElement('canvas');
  n.width = 128; n.height = 128;
  const c = n.getContext('2d');
  const img = c.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(n, 'repeat');
  return noisePattern;
}

/** Grain + vignette finish over the whole cover. */
export function applyFinish(ctx, state, W, H) {
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = getNoise(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette) {
    const v = ctx.createRadialGradient(W / 2, H * 0.39, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,0,20,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Draws the full cover: background, panels with grade, title block, finish. */
export function drawCover(canvas, photos, state) {
  ensurePanels(state);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const CH = H * 0.78;
  const g = GRADES[state.grade] || GRADES.sunset;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  // Backdrop for the tilted layout: sunset gradient + sun + stripes.
  if (state.layout === 'tilted') {
    const bg = ctx.createLinearGradient(0, 0, 0, CH);
    bg.addColorStop(0, '#ff7a5c'); bg.addColorStop(0.5, '#ff9e7d'); bg.addColorStop(1, '#7a2d8f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, CH);
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath(); ctx.arc(W * 0.78, CH * 0.30, Math.min(W, H) * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let i = 0; i < 5; i++) ctx.fillRect(0, CH * (0.12 + i * 0.16), W, CH * 0.02);
  } else {
    ctx.fillStyle = '#160a24'; ctx.fillRect(0, 0, W, CH);
  }
  const rects = layoutPanels(state.layout, W, H);
  ctx.filter = g.filter;
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const panel = state.panels[i] || { photo: i, zoom: 1, ox: 0, oy: 0 };
    // Photos are {img, name} entries; accept a bare image too.
    const entry = photos[panel.photo];
    const photo = entry && typeof entry === 'object' && 'img' in entry ? entry.img : (entry || null);
    ctx.save();
    ctx.beginPath();
    if (rect.clip === 'diagA') {
      ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(0, CH); ctx.closePath();
    } else if (rect.clip === 'diagB') {
      ctx.moveTo(W, 0); ctx.lineTo(W, CH); ctx.lineTo(0, CH); ctx.closePath();
    } else {
      ctx.rect(rect.x, rect.y, rect.w, rect.h);
    }
    ctx.clip();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      if (rect.border) {
        ctx.fillStyle = '#fdf8ef';
        ctx.fillRect(-rect.border, -rect.border, rect.w + rect.border * 2, rect.h + rect.border * 2);
      }
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.max(8, W * 0.02);
      ctx.shadowOffsetY = Math.max(4, W * 0.008);
      drawPanelPhoto(ctx, photo, { x: 0, y: 0, w: rect.w, h: rect.h }, panel);
    } else {
      drawPanelPhoto(ctx, photo, rect, panel);
    }
    ctx.restore();
  }
  ctx.filter = 'none';
  applyGradeWash(ctx, state.grade, W, CH);
  // Diagonal split seam.
  if (state.layout === 'diagonal') {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(3, W * 0.005);
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(0, CH); ctx.stroke();
  }
  drawTitleBlock(ctx, state, W, H);
  applyFinish(ctx, state, W, H);
  ctx.restore();
}

/** Renders the cover at an export size and returns a PNG blob. */
export function exportCoverPng(photos, state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  drawCover(canvas, photos, state);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
