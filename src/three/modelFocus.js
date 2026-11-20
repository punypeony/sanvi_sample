import * as THREE from 'three';

// The exploded-view focus point for the part the scroll timeline is on.
// HeadphoneModel writes it (preallocated), CameraRig reads it.
export const modelFocus = {
  index: -1,
  point: new THREE.Vector3(),
  radius: 0,
};

// Fired when the scroll timeline's active part changes, so the highlight
// updates without a React render per scroll tick.
const listeners = new Set();

export function notifyHighlight() {
  listeners.forEach((fn) => fn());
}

export function subscribeHighlight(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Materials only. Called when the highlighted part changes, never per frame.
export function paintHighlight(partMeshes, selectedId, hoveredId) {
  for (const id in partMeshes) {
    const glow = id === selectedId ? 0.35 : id === hoveredId ? 0.18 : 0;
    const meshes = partMeshes[id];
    for (let i = 0; i < meshes.length; i++) {
      const mat = meshes[i].material;
      if (Array.isArray(mat)) {
        for (let j = 0; j < mat.length; j++) {
          if (!mat[j].emissive) continue;
          mat[j].emissive.set('#ffffff');
          mat[j].emissiveIntensity = glow;
        }
      } else if (mat?.emissive) {
        mat.emissive.set('#ffffff');
        mat.emissiveIntensity = glow;
      }
    }
  }
}
