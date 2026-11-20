// Shared scroll -> 3D state. ScrollTriggers write it, useFrame reads it.
//
// A plain mutable object on purpose: writing it never re-renders React.
// Continuous fields are assigned directly (scrollStore.rotationY = x) from
// ScrollTrigger onUpdate. Only `mode` and `visible`, which flip at section
// boundaries, go through setMode / setVisible and notify subscribers.

export const scrollStore = {
  mode: 'interactive', // 'interactive' = hero (click / orbit) | 'scroll' = scroll drives the model
  explodeProgress: 0, // 0..1, target for the explode amount while mode === 'scroll'
  activePartIndex: -1, // index into PARTS, -1 = none
  rotationY: 0, // radians, added to the model's own rotation
  colorId: null, // colorway override; null = the color the user picked
  cameraDistance: 1, // multiplier on the base framing distance
  framing: 'home', // 'home' | 'exploded': which base distance cameraDistance multiplies
  shiftX: 0, // move the model right by this fraction of the viewport width
  shiftY: 0, // move the model down by this fraction of the viewport height
  rim: 0, // 1 while Colorways is on screen: an extra edge light so Noir still reads
  sound: 0, // 1 while the Sound section is the active one: rings and glow lean in
  visible: true, // false while an opaque section fully covers the canvas
  resumeId: 0, // bumps when rendering resumes; frame loops snap to their targets once
  poseEpoch: 0, // bumps on a scroll jump; frame loops snap instead of damping across it
  snap: false, // one-shot: the next frame copies every damped value straight to its goal
  snapSeen: 0, // how many frame loops have already honored the current snap
};

// Both frame loops call this once. The second one clears the flag, so a jump
// snaps in a single frame without the first reader hiding it from the second.
export function takeSnap() {
  if (!scrollStore.snap) return false;
  scrollStore.snapSeen += 1;
  if (scrollStore.snapSeen >= 2) {
    scrollStore.snap = false;
    scrollStore.snapSeen = 0;
  }
  return true;
}

export function requestSnap() {
  scrollStore.snap = true;
  scrollStore.snapSeen = 0;
}

// Back to the hero pose. Called when a route unmounts, after that route's
// ScrollTriggers are gone, so a later page cannot inherit a pin, a color
// override, or a paused canvas.
export function resetPose() {
  scrollStore.explodeProgress = 0;
  scrollStore.activePartIndex = -1;
  scrollStore.rotationY = 0;
  scrollStore.colorId = null;
  scrollStore.cameraDistance = 1;
  scrollStore.framing = 'home';
  scrollStore.shiftX = 0;
  scrollStore.shiftY = 0;
  scrollStore.rim = 0;
  scrollStore.sound = 0;
  scrollStore.resumeId++;
  scrollStore.poseEpoch++;
  requestSnap();
  setMode('interactive');
  setVisible(true);
}

const listeners = new Set();

function notify(key) {
  listeners.forEach((fn) => fn(key, scrollStore[key]));
}

export function setMode(mode) {
  if (scrollStore.mode === mode) return;
  scrollStore.mode = mode;
  notify('mode');
}

export function setVisible(visible) {
  if (scrollStore.visible === visible) return;
  scrollStore.visible = visible;
  if (visible) scrollStore.resumeId++;
  notify('visible');
}

// fn(key, value) runs when mode or visible changes. Returns an unsubscribe.
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
