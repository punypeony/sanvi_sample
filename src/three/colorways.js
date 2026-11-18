// Headphone colorways.
// `swatch` is the dot shown in the UI; `palette` tints each group of parts.
// shell = cups, headband, buttons | soft = ear cushions & headband pad
// inner = inner cups & sliders   | metal = hinges | holes = ports
// Order here = the order of the dots on screen.

export const COLORWAYS = [
  {
    id: 'maroon',
    name: 'Maroon',
    swatch: '#7a1426',
    glow: ['#b0243c44', '#7a142628'],
    palette: { shell: '#7a1426', soft: '#6e1425', inner: '#661222', metal: '#8f2c3d', holes: '#4d0c19' },
  },
  {
    id: 'sky',
    name: 'Sky Blue',
    swatch: '#87ceea',
    glow: ['#87ceea3a', '#87ceea1c'],
    palette: { shell: '#87ceea', soft: '#74b9d4', inner: '#7ec4de', metal: '#a9dff2', holes: '#5f9fb8' },
  },
  {
    id: 'noir',
    name: 'Noir',
    swatch: '#0b0b0c',
    glow: ['#85858535', '#45454520'],
    palette: { shell: '#050608', soft: '#0d0e11', inner: '#14161a', metal: '#22262d', holes: '#0a0b0d' },
  },
  {
    id: 'ivory',
    name: 'Ivory',
    swatch: '#f2f0ea',
    glow: ['#f2f0ea30', '#f2f0ea18'],
    palette: { shell: '#f1efe9', soft: '#d8d5ce', inner: '#c2bfb8', metal: '#8e9198', holes: '#9d9a94' },
  },
];

export const DEFAULT_COLORWAY_ID = 'noir';
export const COLORWAYS_BY_ID = Object.fromEntries(COLORWAYS.map((c) => [c.id, c]));