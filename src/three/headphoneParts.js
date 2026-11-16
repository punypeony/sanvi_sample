// Part data for the exploded view.
//
// Shaped like an API response on purpose: when you add the Express/Mongo side
// later, replace this import with a fetch('/api/parts') and nothing else
// in the component needs to change.
//
// NOTE: the spec values below are PLACEHOLDERS. Replace them with the real
// numbers for your product.
//
// meshNames / prefixes must match the mesh names inside headphones.glb.
// distance = how far (in scene units) the part flies out when disassembled.

export const PARTS = [
  {
    id: 'headband',
    name: 'Headband',
    meshNames: ['Headband'],
    distance: 1.1,
    description: 'Lightweight arch that keeps clamping force even across long sessions.',
    specs: [
      { label: 'Material', value: 'Steel core, soft-touch coating' },
      { label: 'Adjustment', value: 'Stepped, 12 positions' },
      { label: 'Weight', value: '38 g' },
    ],
  },
  {
    id: 'headband-cushion',
    name: 'Headband Cushion',
    meshNames: ['Headband_cushion'],
    distance: 0.55,
    description: 'Pressure-spreading pad under the headband.',
    specs: [
      { label: 'Material', value: 'Memory foam, vegan leather' },
      { label: 'Thickness', value: '14 mm' },
      { label: 'Replaceable', value: 'Yes' },
    ],
  },
  {
    id: 'earcup-shell',
    name: 'Earcup Shell',
    meshNames: ['outer_cup_1', 'Outer_cup_2'],
    distance: 1.5,
    description: 'Outer housing that seals the acoustic chamber.',
    specs: [
      { label: 'Material', value: 'Matte polycarbonate' },
      { label: 'Finish', value: 'Satin black' },
      { label: 'Weight (each)', value: '92 g' },
    ],
  },
  {
    id: 'inner-cup',
    name: 'Inner Cup & Driver Housing',
    meshNames: ['Inner_cup_1', 'Inner_cup_2'],
    distance: 1.0,
    description: 'Holds the driver and tunes the internal air volume.',
    specs: [
      { label: 'Driver', value: '40 mm dynamic' },
      { label: 'Frequency response', value: '4 Hz – 40 kHz' },
      { label: 'Impedance', value: '32 Ω' },
    ],
  },
  {
    id: 'ear-cushion',
    name: 'Ear Cushions',
    meshNames: ['ear_puff', 'ear_puff001'],
    distance: 0.5,
    description: 'Oval pads that seal around the ear for passive isolation.',
    specs: [
      { label: 'Material', value: 'Protein leather, memory foam' },
      { label: 'Isolation', value: '-22 dB passive' },
      { label: 'Replaceable', value: 'Yes, magnetic' },
    ],
  },
  {
    id: 'slider',
    name: 'Adjustment Sliders',
    meshNames: ['Slider', 'Slider2'],
    distance: 0.8,
    description: 'Telescoping arms that set the fit.',
    specs: [
      { label: 'Material', value: 'Anodized aluminium' },
      { label: 'Travel', value: '28 mm per side' },
      { label: 'Rated cycles', value: '20,000+' },
    ],
  },
  {
    id: 'hinges',
    name: 'Swivel Hinges',
    meshNames: ['Hinges?'],
    distance: 0.9,
    description: 'Lets the cups rotate flat for travel.',
    specs: [
      { label: 'Material', value: 'Zinc alloy' },
      { label: 'Rotation', value: '90° flat-fold' },
      { label: 'Rated cycles', value: '30,000+' },
    ],
  },
  {
    id: 'buttons',
    name: 'Control Buttons',
    meshNames: ['Button_1', 'Button_2'],
    distance: 1.3,
    description: 'Tactile controls for power, volume and ANC.',
    specs: [
      { label: 'Type', value: 'Tactile switch' },
      { label: 'Functions', value: 'Power, volume, ANC' },
      { label: 'Rated presses', value: '100,000' },
    ],
  },
  {
    id: 'holes',
    name: 'Ports & Perforations',
    prefixes: ['Hole_'],
    distance: 1.0,
    description: 'Microphone ports and pressure vents.',
    specs: [
      { label: 'Microphones', value: '4 (ANC + voice)' },
      { label: 'Wind reduction', value: 'Yes' },
      { label: 'Charging', value: 'USB-C' },
    ],
  },
];

export const PARTS_BY_ID = Object.fromEntries(PARTS.map((p) => [p.id, p]));

export function findPartByMeshName(name) {
  return PARTS.find(
    (p) =>
      p.meshNames?.includes(name) || p.prefixes?.some((x) => name.startsWith(x))
  );
}
