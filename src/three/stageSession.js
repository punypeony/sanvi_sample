import { useGLTF } from '@react-three/drei';
import { MODEL_URL } from './prepareModel';

// The assemble intro plays the first time the stage mounts in this tab.
// Later visits (home, then the flagship page, then home again) show the
// model already assembled. A full reload starts a new session.
let introPlayed = false;
let holders = 0;
let releaseTimer = 0;
let followUpTimer = 0;
let resources = null;

const gone = new WeakSet();

export function playIntroThisVisit() {
  return !introPlayed;
}

// HeadphoneModel keeps the parsed scene and the painted clone so we can
// free them when the canvas actually leaves the page.
export function retainModel(scene, model) {
  resources = { scene, model };
}

function disposeOnce(obj, run) {
  if (!obj || gone.has(obj)) return;
  gone.add(obj);
  run();
}

function disposeTree(root) {
  if (!root) return;
  root.traverse((obj) => {
    disposeOnce(obj.geometry, () => obj.geometry.dispose());
    const mats = obj.material == null ? [] : Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((material) => {
      disposeOnce(material, () => {
        for (const key in material) {
          const value = material[key];
          if (value && value.isTexture) disposeOnce(value, () => value.dispose());
        }
        material.dispose();
      });
    });
  });
}

function releaseModel() {
  const current = resources;
  resources = null;
  if (current) {
    disposeTree(current.model);
    disposeTree(current.scene);
  }
  useGLTF.clear(MODEL_URL);
}

// StrictMode runs this cleanup and then immediately mounts again. The
// timeout is cleared by that second mount, so the intro is not consumed
// and the model is not thrown away. A real navigation leaves holders at 0
// and the timeout runs.
export function holdStage() {
  holders += 1;
  window.clearTimeout(releaseTimer);
  window.clearTimeout(followUpTimer);
  return () => {
    holders -= 1;
    const seen = holders;
    releaseTimer = window.setTimeout(() => {
      if (holders !== seen || holders !== 0) return;
      introPlayed = true;
      releaseModel();
      // A load that was in flight can repopulate the cache after the clear.
      window.clearTimeout(followUpTimer);
      followUpTimer = window.setTimeout(() => {
        if (holders !== 0) return;
        releaseModel();
      }, 1200);
    }, 0);
  };
}
