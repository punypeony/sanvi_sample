import { COLORWAYS } from '../three/colorways';

const EXTRA = {
  black: '#1c1c1c',
  sand: '#c4b39a',
  bone: '#e4ddd2',
  graphite: '#3c4046',
  fog: '#b7c0c7',
  clay: '#a78468',
  oat: '#d7c7b2',
  ink: '#16181d',
};

const FROM_MODEL = Object.fromEntries(COLORWAYS.map((item) => [item.id, item.swatch]));

export function swatchColor(id) {
  return FROM_MODEL[id] || EXTRA[id] || '#8b8f98';
}
