import * as THREE from 'three';
import { findPartByMeshName } from './headphoneParts';

export const MODEL_URL = '/models/headphones.glb';

// Surface finish per part group. Colors come from colorways.js.
const SURFACE = {
  shell: { roughness: 0.45, metalness: 0.35, envMapIntensity: 0.9 },
  soft: { roughness: 0.95, metalness: 0.0, envMapIntensity: 0.25 },
  inner: { roughness: 0.7, metalness: 0.2, envMapIntensity: 0.6 },
  metal: { roughness: 0.3, metalness: 0.9, envMapIntensity: 1.2 },
  holes: { roughness: 0.5, metalness: 0.7, envMapIntensity: 0.8 },
};

const SHELL = new Set(['Headband', 'outer_cup_1', 'Outer_cup_2', 'Button_1', 'Button_2']);
const SOFT = new Set(['Headband_cushion', 'ear_puff', 'ear_puff001']);
const INNER = new Set(['Inner_cup_1', 'Inner_cup_2', 'Slider', 'Slider2']);

function surfaceKind(name) {
  if (SHELL.has(name)) return 'shell';
  if (SOFT.has(name)) return 'soft';
  if (INNER.has(name)) return 'inner';
  if (name === 'Hinges?') return 'metal';
  if (name.startsWith('Hole_')) return 'holes';
  return 'inner';
}

function recolorMesh(obj, kind, startPalette, tintables) {
  const recolor = (original) => {
    const material = original.clone();
    if ('map' in material) material.map = null;

    const surface = SURFACE[kind];
    material.color?.set(startPalette[kind]);
    if ('roughness' in material) material.roughness = surface.roughness;
    if ('metalness' in material) material.metalness = surface.metalness;
    if ('envMapIntensity' in material) material.envMapIntensity = surface.envMapIntensity;

    material.needsUpdate = true;
    tintables.push({ material, kind });
    return material;
  };

  obj.material = Array.isArray(obj.material) ? obj.material.map(recolor) : recolor(obj.material);
}

// Vertex that sticks out furthest along `dir` (in mesh-local space).
function farthestPoint(mesh, dir) {
  const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
  const d = dir.clone().transformDirection(inv);
  const pos = mesh.geometry.attributes.position;
  let best = -Infinity;
  let bi = 0;
  for (let v = 0; v < pos.count; v++) {
    const dp = pos.getX(v) * d.x + pos.getY(v) * d.y + pos.getZ(v) * d.z;
    if (dp > best) {
      best = dp;
      bi = v;
    }
  }
  return new THREE.Vector3().fromBufferAttribute(pos, bi);
}

// One label anchor per part. Labels alternate left/right so they spread out.
function buildAnchors(byPart, sizeX) {
  const anchors = [];
  const sides = {};

  Object.entries(byPart).forEach(([id, list], i) => {
    const wantLeft = i % 2 === 1;
    let pick = list[0];
    let side;

    if (list.length > 1) {
      pick = list.find((l) => l.relX < 0 === wantLeft) ?? list[0];
      side = pick.relX < 0 ? 'left' : 'right';
    } else if (Math.abs(pick.relX) > 0.08 * sizeX) {
      side = pick.relX < 0 ? 'left' : 'right';
    } else {
      side = wantLeft ? 'left' : 'right';
    }

    anchors.push({
      id,
      mesh: pick.obj,
      local: farthestPoint(pick.obj, pick.dirN),
    });
    sides[id] = side;
  });

  return { anchors, sides };
}

// Clone the gltf, paint it, and work out where each mesh flies when disassembled.
export function prepareModel(scene, startPalette) {
  const cloned = scene.clone(true);
  const tintables = [];

  cloned.traverse((obj) => {
    if (!obj.isMesh) return;
    recolorMesh(obj, surfaceKind(obj.name), startPalette, tintables);
  });

  const bounds = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const scale = 3.2 / size.y;
  const modelCenter = bounds.getCenter(new THREE.Vector3());

  cloned.updateMatrixWorld(true);
  const items = [];
  const partMeshes = {};
  const byPart = {};

  cloned.traverse((obj) => {
    if (!obj.isMesh) return;
    const part = findPartByMeshName(obj.name);
    obj.userData.partId = part ? part.id : null;
    if (!part) return;

    (partMeshes[part.id] ||= []).push(obj);

    const meshCenter = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    const dir = meshCenter.sub(modelCenter);
    const relX = dir.x;
    if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
    dir.normalize();
    const dirN = dir.clone();

    (byPart[part.id] ||= []).push({ obj, relX, dirN });

    // part.distance is in final scene units; convert to the model's own units.
    const offsetWorld = dir.multiplyScalar(part.distance / scale);
    const parent = obj.parent;
    const p0 = parent.worldToLocal(new THREE.Vector3(0, 0, 0));
    const p1 = parent.worldToLocal(offsetWorld.clone());
    const base = obj.position.clone();
    const target = base.clone().add(p1.sub(p0));

    items.push({ obj, base, target });
  });

  const { anchors, sides } = buildAnchors(byPart, size.x);

  // Measure the fully exploded layout so the camera can frame every part.
  items.forEach(({ obj, target }) => obj.position.copy(target));
  cloned.updateMatrixWorld(true);
  const fitRadius =
    new THREE.Box3().setFromObject(cloned).getBoundingSphere(new THREE.Sphere()).radius * scale;
  items.forEach(({ obj, base }) => obj.position.copy(base));
  cloned.updateMatrixWorld(true);

  return { model: cloned, scale, items, partMeshes, fitRadius, tintables, anchors, sides };
}
