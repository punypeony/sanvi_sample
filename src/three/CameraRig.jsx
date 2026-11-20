import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollStore, takeSnap } from '../scroll/scrollStore';
import { modelFocus } from './modelFocus';

// How much breathing room the exploded view gets.
// Lower = parts look bigger / closer. Higher = more space around them.
const FIT_PADDING = 0.95;

// How close the camera gets when focusing one part (tour / click).
// Lower = the part fills more of the frame.
const FOCUS_PADDING = 1.35;

// Closest the focus zoom is allowed to go. Small lower parts (cushions,
// buttons, hinges, ports) would otherwise sit at the old floor and look tiny.
// NOTE: OrbitControls' minDistance must be <= this, or the controls will
// push the camera back out and the two will fight.
const FOCUS_MIN_DIST = 2.35;

// Narrowest screen (width / height) where the assembled model still fits at
// the home distance. Taller screens (phones) pull the camera back instead of
// cropping the cups.
const MIN_HOME_ASPECT = 0.75;

// How quickly the camera follows the scroll timeline. Higher = tighter.
const SCROLL_CAM_DAMP = 3.5;

// Scroll-timeline focus (the teardown). A bit wider than the click tour so
// the part sits clear of the text column. Lower = the part fills more.
const SCROLL_FOCUS_PADDING = 1.6;

function framingDistance(camera, radius, padding) {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * Math.max(camera.aspect, 0.05));
  const half = Math.min(vfov, hfov) / 2;
  return (radius / Math.tan(half)) * padding;
}

// Hero: pulls the camera back so every exploded part fits, moves in on the
// selected part, and slides the scene left while the specs panel is open.
// Scroll mode: follows scrollStore (distance, framing, shift) and eases back
// to the home angle. Zoom is off, so the distance is always the rig's to set.
export default function CameraRig({ exploded, fitRadius, shiftPx, focus, reduceMotion, onShift }) {
  const camera = useThree((s) => s.camera);

  const home = useRef(camera.position.length());
  const homeDir = useRef(camera.position.clone().normalize());
  const goalTarget = useRef(new THREE.Vector3());
  const fallbackTarget = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  const qFull = useRef(new THREE.Quaternion());
  const qStep = useRef(new THREE.Quaternion());
  const shift = useRef({ x: 0, y: 0 });
  const backdropShift = useRef({ x: NaN, y: NaN });
  const resumeSeen = useRef(scrollStore.resumeId);
  const poseSeen = useRef(scrollStore.poseEpoch);

  useFrame((state, delta) => {
    const { camera, controls, size } = state;
    const scroll = scrollStore.mode === 'scroll';
    if (controls) controls.enabled = !scroll;
    const target = controls?.target ?? fallbackTarget.current;

    const resumed = scrollStore.resumeId !== resumeSeen.current;
    resumeSeen.current = scrollStore.resumeId;
    const jumped = scrollStore.poseEpoch !== poseSeen.current;
    poseSeen.current = scrollStore.poseEpoch;
    const snap = resumed || jumped || takeSnap() || (scroll && reduceMotion);

    const aspect = camera.aspect > 0.05 ? camera.aspect : 1;
    const homeDist = home.current * Math.max(1, MIN_HOME_ASPECT / aspect);
    const fitDist = Math.max(framingDistance(camera, fitRadius, FIT_PADDING), homeDist);

    const partFocused =
      scroll &&
      scrollStore.activePartIndex >= 0 &&
      modelFocus.index === scrollStore.activePartIndex &&
      modelFocus.radius > 0;

    let goalDist;
    if (partFocused) {
      goalTarget.current.copy(modelFocus.point);
      goalDist = THREE.MathUtils.clamp(
        framingDistance(camera, modelFocus.radius, SCROLL_FOCUS_PADDING),
        FOCUS_MIN_DIST,
        fitDist
      );
    } else if (scroll) {
      goalTarget.current.set(0, 0, 0);
      goalDist = (scrollStore.framing === 'exploded' ? fitDist : homeDist) * scrollStore.cameraDistance;
    } else if (exploded && focus) {
      goalTarget.current.copy(focus.point);
      goalDist = THREE.MathUtils.clamp(
        framingDistance(camera, focus.radius, FOCUS_PADDING),
        FOCUS_MIN_DIST,
        fitDist
      );
    } else {
      goalTarget.current.set(0, 0, 0);
      goalDist = exploded ? fitDist : homeDist;
    }
    // Never aim for a distance OrbitControls will refuse, or the two fight
    // every frame (shows up as a jitter / zoom pulse).
    if (!scroll && controls) {
      goalDist = THREE.MathUtils.clamp(goalDist, controls.minDistance, controls.maxDistance);
    }

    const lambda = scroll ? SCROLL_CAM_DAMP : 3;
    const k = snap ? 1 : 1 - Math.exp(-lambda * delta);

    target.lerp(goalTarget.current, k);
    const o = offset.current.copy(camera.position).sub(target);
    const dist = snap ? goalDist : THREE.MathUtils.damp(o.length(), goalDist, lambda, delta);
    if (o.lengthSq() < 1e-8) o.copy(homeDir.current);
    else o.normalize();
    if (scroll) {
      // Rotate back toward the home angle, undoing any orbit from the hero.
      qFull.current.setFromUnitVectors(o, homeDir.current);
      qStep.current.identity().slerp(qFull.current, k);
      o.applyQuaternion(qStep.current);
    }
    camera.position.copy(target).addScaledVector(o, dist);
    if (scroll || !controls) camera.lookAt(target);

    const wantX = scroll ? -scrollStore.shiftX * size.width : size.width > 700 ? shiftPx : 0;
    const wantY = scroll ? -scrollStore.shiftY * size.height : 0;
    const s = shift.current;
    s.x = snap ? wantX : THREE.MathUtils.damp(s.x, wantX, 5, delta);
    s.y = snap ? wantY : THREE.MathUtils.damp(s.y, wantY, 5, delta);
    if (Math.abs(s.x) > 0.5 || Math.abs(s.y) > 0.5) {
      camera.setViewOffset(size.width, size.height, s.x, s.y, size.width, size.height);
    } else if (camera.view?.enabled) {
      camera.clearViewOffset();
    }

    // Tell the page how far the model moved on screen (keeps the glow / rings centered on it).
    const b = backdropShift.current;
    if (Math.abs(b.x + s.x) > 0.5 || Math.abs(b.y + s.y) > 0.5 || Number.isNaN(b.x)) {
      b.x = -s.x;
      b.y = -s.y;
      onShift?.(b.x, b.y);
    }
  });

  return null;
}
