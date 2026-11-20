// Compresses models-src/headphones.original.glb -> public/models/headphones.glb
// without touching the node hierarchy or names (part lookup depends on them).
//
//   node scripts/compress-model.mjs
//
// - Drops baseColor textures only: prepareModel.js sets material.map = null,
//   so they are never shown. Normal / occlusion / metal-rough maps are kept.
// - Remaining textures -> WebP, lossless (pixel-identical).
// - Geometry -> Draco. Unlike meshopt/quantize, Draco never rewrites nodes:
//   quantize() moves meshes on parent nodes into new unnamed child nodes.
// Then verifies names, hierarchy, per-mesh world bounds and PARTS lookups.

import { readFileSync, statSync } from 'node:fs';
import { NodeIO, PropertyType, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, prune, textureCompress } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { PropertyBinding } from 'three';
import { PARTS, findPartByMeshName } from '../src/three/headphoneParts.js';

const SRC = 'models-src/headphones.original.glb';
const OUT = 'public/models/headphones.glb';

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});

// Mirrors GLTFLoader's createUniqueName so we check the names three.js will see.
function threeNames(doc) {
  const used = {};
  const unique = (raw) => {
    const s = PropertyBinding.sanitizeNodeName(raw || '');
    if (s in used) return `${s}_${++used[s]}`;
    used[s] = 0;
    return s;
  };
  return new Map(doc.getRoot().listNodes().map((n) => [n, unique(n.getName())]));
}

function describe(doc) {
  const names = threeNames(doc);
  const nodes = [];
  const walk = (node, path) => {
    const mesh = node.getMesh();
    nodes.push({
      path,
      name: names.get(node),
      prims: mesh ? mesh.listPrimitives().length : 0,
      trs: [...node.getTranslation(), ...node.getRotation(), ...node.getScale()].map((v) => +v.toFixed(6)),
      bounds: mesh ? getBounds(node) : null,
    });
    node.listChildren().forEach((c, i) => walk(c, `${path}/${i}`));
  };
  doc.getRoot().listScenes().forEach((s, si) => s.listChildren().forEach((c, i) => walk(c, `${si}:${i}`)));
  return nodes;
}

function checkParts(nodes) {
  // Only single-primitive mesh nodes become a THREE.Mesh carrying the node name.
  const meshNames = nodes.filter((n) => n.prims === 1).map((n) => n.name);
  const problems = [];
  for (const p of PARTS) {
    const hits = meshNames.filter((m) => findPartByMeshName(m)?.id === p.id);
    for (const want of p.meshNames ?? []) {
      if (!meshNames.includes(want)) problems.push(`${p.id}: mesh "${want}" not found`);
    }
    if (!hits.length) problems.push(`${p.id}: matches no mesh`);
  }
  return { problems, matched: meshNames.filter((m) => findPartByMeshName(m)).length };
}

const before = await io.read(SRC);
const nodesBefore = describe(before);

let dropped = 0;
for (const mat of before.getRoot().listMaterials()) {
  if (mat.getBaseColorTexture()) {
    mat.setBaseColorTexture(null);
    dropped++;
  }
}

await before.transform(
  prune({ propertyTypes: [PropertyType.TEXTURE], keepLeaves: true, keepAttributes: true, keepIndices: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', lossless: true }),
  draco({ method: 'edgebreaker' })
);
await io.write(OUT, before);

// ---- verify the written file against the original ----
const after = await io.read(OUT);
const nodesAfter = describe(after);
const errors = [];

if (nodesBefore.length !== nodesAfter.length) errors.push(`node count ${nodesBefore.length} -> ${nodesAfter.length}`);

const box0 = getBounds(before.getRoot().listScenes()[0]);
const diag = Math.hypot(...box0.max.map((v, i) => v - box0.min[i]));
const tol = diag * 1e-3;
let worstDrift = 0;

nodesBefore.forEach((a, i) => {
  const b = nodesAfter[i];
  if (!b) return;
  if (a.path !== b.path || a.name !== b.name || a.prims !== b.prims) {
    errors.push(`node ${a.path} "${a.name}"(${a.prims}) -> ${b.path} "${b.name}"(${b.prims})`);
  }
  if (a.trs.join() !== b.trs.join()) errors.push(`transform changed on "${a.name}"`);
  if (a.bounds && b.bounds) {
    const d = Math.max(
      ...a.bounds.min.map((v, k) => Math.abs(v - b.bounds.min[k])),
      ...a.bounds.max.map((v, k) => Math.abs(v - b.bounds.max[k]))
    );
    worstDrift = Math.max(worstDrift, d);
    if (d > tol) errors.push(`bounds of "${a.name}" moved by ${d.toExponential(2)}`);
  }
});

const partsBefore = checkParts(nodesBefore);
const partsAfter = checkParts(nodesAfter);
errors.push(...partsAfter.problems.map((p) => `after: ${p}`));

const slots = new Set();
for (const t of after.getRoot().listTextures()) {
  for (const p of t.listParents()) {
    if (p.propertyType !== PropertyType.MATERIAL) continue;
    if (p.getBaseColorTexture() === t) slots.add('baseColor');
    if (p.getNormalTexture() === t) slots.add('normal');
    if (p.getOcclusionTexture() === t) slots.add('occlusion');
    if (p.getMetallicRoughnessTexture() === t) slots.add('metallicRoughness');
  }
}

const mb = (f) => (statSync(f).size / 1024 / 1024).toFixed(2);
console.log(`baseColor textures removed from ${dropped} materials`);
console.log(`textures left: ${after.getRoot().listTextures().length} (slots: ${[...slots].join(', ')})`);
console.log(`nodes: ${nodesAfter.length}, part meshes matched: ${partsBefore.matched} -> ${partsAfter.matched}`);
console.log(`worst per-mesh bounds drift: ${worstDrift.toExponential(2)} (tolerance ${tol.toExponential(2)})`);
console.log(`size: ${mb(SRC)} MB -> ${mb(OUT)} MB`);
readFileSync(OUT); // throws if the write somehow failed

if (partsBefore.problems.length) console.warn('original already had part problems:', partsBefore.problems);
if (errors.length) {
  console.error('VERIFY FAILED:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('VERIFY OK: names, hierarchy, transforms, bounds and PARTS lookups all preserved.');
