// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows the cover alone at the export size. Query params:
// layout, grade, photo (comma list of sample names), caption, subtitle, tagline,
// heat, w, h. window.__shotReady is set once painted.
import { defaultPanels, ensurePanels } from './cover.js';

const SAMPLE_INDEX = { boulevard: 0, pier: 1, skyline: 2, palms: 3, neonstreet: 4 };

export function runShot(shot, query, app) {
  const { state, photos, syncControls, redraw } = app;
  const layout = query.get('layout');
  if (layout) state.layout = layout;
  const grade = query.get('grade');
  if (grade) state.grade = grade;
  if (query.get('caption')) state.title = query.get('caption');
  if (query.get('subtitle')) state.subtitle = query.get('subtitle');
  if (query.get('tagline')) state.tagline = query.get('tagline');
  if (query.get('heat')) state.heat = Number(query.get('heat'));
  if (query.get('badge')) state.badge = query.get('badge');
  ensurePanels(state);
  state.panels = defaultPanels(state.layout);
  const names = (query.get('photo') || 'skyline,palms,boulevard,pier').split(',').map((s) => s.trim());
  state.panels.forEach((p, i) => {
    const name = names[i % names.length];
    p.photo = SAMPLE_INDEX[name] ?? i % photos.length;
  });
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const preview = document.getElementById('preview');
    preview.width = Number(query.get('w')) || 1920;
    preview.height = Number(query.get('h')) || 1080;
  }
  syncControls();
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
