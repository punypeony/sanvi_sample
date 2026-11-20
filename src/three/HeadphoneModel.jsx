import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DRACO_PATH, MODEL_URL, prepareModel } from './prepareModel';
import { PARTS, PARTS_BY_ID } from './headphoneParts';
import { COLORWAYS, COLORWAYS_BY_ID, DEFAULT_COLORWAY_ID } from './colorways';
import { scrollStore, takeSnap } from '../scroll/scrollStore';
import { retainModel } from './stageSession';
import { modelFocus, paintHighlight, subscribeHighlight } from './modelFocus';

// ---- Assemble intro tuning ----
const INTRO_DELAY = 0.15; // seconds before the first part moves
const INTRO_STAGGER = 0.5; // spread between the first and last part starting
const INTRO_DUR = 1.0; // how long each part takes to fly in
const FLY_DIST = 1.6; // start distance, as a multiple of the part's explode offset
const INTRO_TOTAL = INTRO_DELAY + INTRO_STAGGER + INTRO_DUR;

// ---- Scroll-driven motion tuning ----
// How quickly the model follows the scroll position. Higher = tighter.
const SCROLL_EXPLODE_DAMP = 6;
const SPIN_DAMP = 5;

const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);

// Target colors per colorway, built once so the frame loop never allocates.
const COLOR_TARGETS = Object.fromEntries(
  COLORWAYS.map((c) => [
    c.id,
    Object.fromEntries(Object.entries(c.palette).map(([k, v]) => [k, new THREE.Color(v)])),
  ])
);

function HeadphoneModel({
  exploded,
  intro,
  onIntroDone,
  onLoaded,
  idle,
  hoveredId,
  selectedId,
  onHover,
  onOut,
  onMove,
  onPartClick,
  onMeasure,
  onSides,
  apiRef,
  getCalloutEl,
  colorId,
  onColorShown,
  reduceMotion,
}) {
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  // Start in the chosen color so a saved choice doesn't flash black first.
  const [startPalette] = useState(
    () => (COLORWAYS_BY_ID[colorId] ?? COLORWAYS_BY_ID[DEFAULT_COLORWAY_ID]).palette
  );

  const { model, scale, items, partMeshes, partFocus, fitRadius, tintables, anchors, sides } = useMemo(
    () => prepareModel(scene, startPalette),
    // palette is captured once via startPalette; later changes fade in useFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene]
  );

  // Per-mesh flight plan: where it starts, and when. Parts of the same group
  // (e.g. both ear cups) share a delay so they land together. Core parts land
  // first, outer shell and buttons last.
  const flights = useMemo(() => {
    const distOf = (it) => PARTS_BY_ID[it.obj.userData.partId]?.distance ?? 1;
    const ids = [...new Set(items.map((it) => it.obj.userData.partId))].sort(
      (a, b) => (PARTS_BY_ID[a]?.distance ?? 1) - (PARTS_BY_ID[b]?.distance ?? 1)
    );
    const rankOf = Object.fromEntries(ids.map((id, i) => [id, i]));
    return items.map((it) => ({
      delay:
        INTRO_DELAY + (rankOf[it.obj.userData.partId] / Math.max(1, ids.length - 1)) * INTRO_STAGGER,
      offset: it.target.clone().sub(it.base).multiplyScalar(FLY_DIST * (distOf(it) > 0 ? 1 : 0)),
    }));
  }, [items]);

  const introT = useRef(intro ? 0 : INTRO_TOTAL);
  const pulse = useRef(0);

  // Park every part at its start position before the first paint so the
  // assembled headphones never flash.
  useLayoutEffect(() => {
    if (!intro) return;
    items.forEach(({ obj, base }, i) => obj.position.copy(base).add(flights[i].offset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onMeasure?.(fitRadius);
  }, [fitRadius, onMeasure]);

  useEffect(() => {
    onSides?.(sides);
  }, [sides, onSides]);

  // Tell the page the model is ready so it can fade the canvas in.
  useEffect(() => {
    onLoaded?.(true);
  }, [onLoaded]);

  useEffect(() => {
    retainModel(scene, model);
  }, [scene, model]);

  // Lets the page ask where a part is (for the camera to focus on it).
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      getPartFocus(id) {
        const meshes = partMeshes[id];
        if (!meshes?.length) return null;
        model.updateWorldMatrix(true, true);
        const box = new THREE.Box3();
        meshes.forEach((m) => box.expandByObject(m));
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        return { point: sphere.center.clone(), radius: sphere.radius };
      },
    };
  }, [apiRef, model, partMeshes]);

  const t = useRef(0);
  const spin = useRef(0);
  const idleAmt = useRef(0);
  const floatRef = useRef(null);
  const lastVis = useRef(-1);
  const resumeSeen = useRef(scrollStore.resumeId);
  const poseSeen = useRef(scrollStore.poseEpoch);
  const shownGlow = useRef(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const focusScale = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const interactive = scrollStore.mode === 'interactive';
    // After a render pause the pose may be far off; jump straight to it while
    // the canvas is still covered instead of animating from a stale state.
    const resumed = scrollStore.resumeId !== resumeSeen.current;
    resumeSeen.current = scrollStore.resumeId;
    // A scroll jump (navbar, fast flick) bumps poseEpoch so we land on the
    // pose instead of damping across everything in between.
    const jumped = scrollStore.poseEpoch !== poseSeen.current;
    poseSeen.current = scrollStore.poseEpoch;
    const snap = resumed || jumped || takeSnap() || (reduceMotion && !interactive);

    // Clamp dt so a hitchy first frame (shader compile) can't skip the intro.
    const dt = Math.min(delta, 1 / 30);

    if (introT.current < INTRO_TOTAL) {
      introT.current = Math.min(INTRO_TOTAL, introT.current + dt);
      if (introT.current >= INTRO_TOTAL) {
        pulse.current = 1; // small impact bump when everything lands
        onIntroDone?.();
      }
    }

    // Hero: the click toggle. Everywhere else: the scroll timeline.
    const goalT = interactive ? (exploded ? 1 : 0) : scrollStore.explodeProgress;
    t.current = snap
      ? goalT
      : THREE.MathUtils.damp(t.current, goalT, interactive ? 4 : SCROLL_EXPLODE_DAMP, delta);
    for (let i = 0; i < items.length; i++) {
      const { obj, base, target } = items[i];
      obj.position.lerpVectors(base, target, t.current);
      const f = flights[i];
      const e = easeOutQuart(THREE.MathUtils.clamp((introT.current - f.delay) / INTRO_DUR, 0, 1));
      if (e < 1) obj.position.addScaledVector(f.offset, 1 - e);
    }

    // The scroll can override the color (colorways section); otherwise the user's pick.
    const activeColor = COLOR_TARGETS[scrollStore.colorId] ? scrollStore.colorId : colorId;
    const targetColors = COLOR_TARGETS[activeColor] ?? COLOR_TARGETS[DEFAULT_COLORWAY_ID];
    const k = snap ? 1 : 1 - Math.exp(-6 * delta);
    for (const { material, kind } of tintables) {
      material.color?.lerp(targetColors[kind], k);
    }

    // Backdrop glow follows the same color (only told when it changes).
    if (activeColor !== shownGlow.current && onColorShown?.(activeColor)) {
      shownGlow.current = activeColor;
    }

    spin.current = snap || reduceMotion
      ? scrollStore.rotationY
      : THREE.MathUtils.damp(spin.current, scrollStore.rotationY, SPIN_DAMP, delta);

    // Idle float is a hero-only thing; the scroll owns the pose elsewhere.
    idleAmt.current = THREE.MathUtils.damp(idleAmt.current, idle && interactive ? 1 : 0, 1.5, delta);
    pulse.current = THREE.MathUtils.damp(pulse.current, 0, 7, delta);
    const g = floatRef.current;
    if (g) {
      const time = state.clock.elapsedTime;
      g.position.y = Math.sin(time * 0.9) * 0.06 * idleAmt.current;
      g.rotation.y = Math.sin(time * 0.4) * 0.12 * idleAmt.current + spin.current;
      g.scale.setScalar(1 + 0.018 * pulse.current);
    }

    // Part focus for the scroll timeline, in world space. Only once the parts
    // are actually open: the cached sphere is the exploded position.
    const focusIndex = interactive ? -1 : scrollStore.activePartIndex;
    const focusPart = focusIndex >= 0 ? PARTS[focusIndex] : null;
    const focusLocal = focusPart ? partFocus[focusPart.id] : null;
    if (focusLocal && t.current > 0.85) {
      model.updateWorldMatrix(true, false);
      modelFocus.point.copy(focusLocal.center).applyMatrix4(model.matrixWorld);
      modelFocus.radius = focusLocal.radius * Math.abs(model.getWorldScale(focusScale).x);
      modelFocus.index = focusIndex;
    } else if (modelFocus.index !== -1) {
      modelFocus.index = -1;
    }

    // Callout labels: project each anchor to the screen. Hero only.
    const vis = interactive ? THREE.MathUtils.clamp((t.current - 0.8) / 0.2, 0, 1) : 0;
    if (vis > 0 || lastVis.current !== 0) {
      const { camera, size } = state;
      for (const a of anchors) {
        const el = getCalloutEl?.(a.id);
        if (!el) continue;
        if (vis > 0) {
          a.mesh.updateWorldMatrix(true, false);
          tmp.copy(a.local);
          a.mesh.localToWorld(tmp);
          tmp.project(camera);
          const x = (tmp.x * 0.5 + 0.5) * size.width;
          const y = (-tmp.y * 0.5 + 0.5) * size.height;
          el.style.transform = `translate(${x}px, ${y}px)`;
        }
        const active = vis > 0.95;
        el.style.opacity = String(vis);
        el.style.pointerEvents = active ? 'auto' : 'none';
        // Hidden callouts must not be reachable with Tab either.
        if (el.inert === active) el.inert = !active;
      }
      lastVis.current = vis;
    }
    // Runs before CameraRig (this component mounts first, same priority).
    // A positive priority would make R3F skip its own render and blank the canvas.
  });

  // Highlight: the hero's hover/selection, or the timeline's part. The scroll
  // side calls notifyHighlight() only when the part index changes.
  useEffect(() => {
    const apply = () => {
      const onTimeline = scrollStore.mode === 'scroll' && scrollStore.activePartIndex >= 0;
      const sel = onTimeline ? PARTS[scrollStore.activePartIndex].id : selectedId;
      const hov = onTimeline ? null : hoveredId;
      paintHighlight(partMeshes, sel, hov);
    };
    apply();
    return subscribeHighlight(apply);
  }, [hoveredId, selectedId, partMeshes]);

  const hit = (e, fn) => {
    e.stopPropagation();
    fn(e.object.userData.partId ?? null, e.nativeEvent);
  };

  return (
    <group ref={floatRef}>
      <Center>
        <primitive
          object={model}
          scale={scale}
          onPointerOver={(e) => hit(e, (id, ev) => { onHover(id); onMove(ev); })}
          onPointerMove={(e) => hit(e, (id, ev) => { onHover(id); onMove(ev); })}
          onPointerOut={(e) => {
            e.stopPropagation();
            onOut();
          }}
          onClick={(e) => hit(e, onPartClick)}
        />
      </Center>
    </group>
  );
}

useGLTF.preload(MODEL_URL, DRACO_PATH);

export default HeadphoneModel;