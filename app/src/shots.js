// Fixed scenes for screenshots. Each `?shot=` name picks a layout, a grade,
// a caption and a cover size; the page loads the two kit sample photos and
// paints the scene, then window.__shotReady is set once it is on screen.
const SCENES = {
  '1-cover': {
    layout: 'quad', grade: 'sunset', title: 'Coastal Heat', subtitle: 'Vice City nights',
    size: [1080, 1080], coverOnly: true, panels: ['A', 'B', 'B', 'A'],
  },
  '2-editor': {
    layout: 'hero', grade: 'neon', title: 'Neon Tide', subtitle: 'after dark',
    size: [1080, 1080], coverOnly: false, panels: ['A', 'A', 'B', 'B'],
  },
  '3-cover-wide': {
    layout: 'tilt', grade: 'gold', title: 'Palm Royale', subtitle: 'golden hour',
    size: [1920, 1080], coverOnly: true, panels: ['B', 'A', 'B'],
  },
  '4-export': {
    layout: 'bleed', grade: 'mono', title: 'Sunset Heist', subtitle: 'one last job',
    size: [1080, 1350], coverOnly: true, panels: ['A'],
  },
};

export async function runShot(shot, query, { loadImage, applyScene, markReady }) {
  const scene = SCENES[shot] ?? SCENES['1-cover'];
  const [pier, boulevard] = await Promise.all([
    loadImage('samples/pier.jpg'),
    loadImage('samples/boulevard.jpg'),
  ]);
  applyScene({
    layout: scene.layout,
    grade: scene.grade,
    title: scene.title,
    subtitle: scene.subtitle,
    photos: { A: pier, B: boulevard },
    panels: scene.panels.map((slot) => ({ slot, zoom: 1, ox: 0, oy: 0 })),
    size: scene.size,
    coverOnly: scene.coverOnly,
  });
  markReady();
}
