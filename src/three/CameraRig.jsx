import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ZERO = new THREE.Vector3();

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

function framingDistance(camera, radius, padding) {
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const half = Math.min(vfov, hfov) / 2;
  return { dist: (radius / Math.tan(half)) * padding, half };
}

// Pulls the camera back so every exploded part fits, moves in on the selected
// part, and slides the scene left while the specs panel is open.
export default function CameraRig({ exploded, fitRadius, shiftPx, focus }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const size = useThree((s) => s.size);

  const home = useRef(camera.position.length());
  const goalDist = useRef(null);
  const goalTarget = useRef(new THREE.Vector3());
  const anim = useRef(0);
  const shift = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }

    // Never aim for a distance OrbitControls will refuse. If the two disagree
    // the controls clamp the camera every frame and the rig pushes it back,
    // which shows up as a jitter / zoom pulse.
    const lo = controls?.minDistance ?? 0;
    const hi = controls?.maxDistance ?? Infinity;
    const clampDist = (d) => THREE.MathUtils.clamp(d, lo, hi);

    const fitDist = Math.max(framingDistance(camera, fitRadius, FIT_PADDING).dist, home.current);

    if (exploded && focus) {
      const { dist } = framingDistance(camera, focus.radius, FOCUS_PADDING);
      goalTarget.current.copy(focus.point);
      goalDist.current = clampDist(THREE.MathUtils.clamp(dist, FOCUS_MIN_DIST, fitDist));
    } else {
      goalTarget.current.set(0, 0, 0);
      goalDist.current = clampDist(exploded ? fitDist : home.current);
    }
    anim.current = 1.6; // seconds the rig may steer; after that you're in control
    // camera aspect is read live; the rig only retargets when the view changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploded, focus]);

  useFrame((_, delta) => {
    const target = controls?.target ?? ZERO;

    if (anim.current > 0 && goalDist.current != null) {
      anim.current -= delta;
      const offset = camera.position.clone().sub(target);
      if (controls) target.lerp(goalTarget.current, 1 - Math.exp(-3 * delta));
      const nd = THREE.MathUtils.damp(offset.length(), goalDist.current, 3, delta);
      camera.position.copy(target).add(offset.setLength(nd));
    }

    const wanted = size.width > 700 ? shiftPx : 0;
    shift.current = THREE.MathUtils.damp(shift.current, wanted, 5, delta);
    if (Math.abs(shift.current) > 0.5) {
      camera.setViewOffset(size.width, size.height, shift.current, 0, size.width, size.height);
    } else if (camera.view?.enabled) {
      camera.clearViewOffset();
    }
  });

  return null;
}