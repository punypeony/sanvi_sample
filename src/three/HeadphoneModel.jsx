import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_URL, prepareModel } from './prepareModel';
import { PARTS_BY_ID } from './headphoneParts';

// ---- Assemble intro tuning ----
const INTRO_DELAY = 0.15; // seconds before the first part moves
const INTRO_STAGGER = 0.5; // spread between the first and last part starting
const INTRO_DUR = 1.0; // how long each part takes to fly in
const FLY_DIST = 1.6; // start distance, as a multiple of the part's explode offset
const INTRO_TOTAL = INTRO_DELAY + INTRO_STAGGER + INTRO_DUR;

const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);

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
  calloutEls,
  palette,
}) {
  const { scene } = useGLTF(MODEL_URL);

  // Start in the chosen color so a saved choice doesn't flash black first.
  const startPalette = useRef(palette).current;

  const { model, scale, items, partMeshes, fitRadius, tintables, anchors, sides } = useMemo(
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
  const idleAmt = useRef(0);
  const floatRef = useRef(null);
  const lastVis = useRef(-1);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const targetColors = useMemo(
    () => Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, new THREE.Color(v)])),
    [palette]
  );

  useFrame((state, delta) => {
    // Clamp dt so a hitchy first frame (shader compile) can't skip the intro.
    const dt = Math.min(delta, 1 / 30);

    if (introT.current < INTRO_TOTAL) {
      introT.current = Math.min(INTRO_TOTAL, introT.current + dt);
      if (introT.current >= INTRO_TOTAL) {
        pulse.current = 1; // small impact bump when everything lands
        onIntroDone?.();
      }
    }

    t.current = THREE.MathUtils.damp(t.current, exploded ? 1 : 0, 4, delta);
    items.forEach(({ obj, base, target }, i) => {
      obj.position.lerpVectors(base, target, t.current);
      const f = flights[i];
      const e = easeOutQuart(THREE.MathUtils.clamp((introT.current - f.delay) / INTRO_DUR, 0, 1));
      if (e < 1) obj.position.addScaledVector(f.offset, 1 - e);
    });

    const k = 1 - Math.exp(-6 * delta);
    for (const { material, kind } of tintables) {
      material.color?.lerp(targetColors[kind], k);
    }

    idleAmt.current = THREE.MathUtils.damp(idleAmt.current, idle ? 1 : 0, 1.5, delta);
    pulse.current = THREE.MathUtils.damp(pulse.current, 0, 7, delta);
    const g = floatRef.current;
    if (g) {
      const time = state.clock.elapsedTime;
      g.position.y = Math.sin(time * 0.9) * 0.06 * idleAmt.current;
      g.rotation.y = Math.sin(time * 0.4) * 0.12 * idleAmt.current;
      g.scale.setScalar(1 + 0.018 * pulse.current);
    }

    // Callout labels: project each anchor to the screen.
    const vis = THREE.MathUtils.clamp((t.current - 0.8) / 0.2, 0, 1);
    if (vis > 0 || lastVis.current !== 0) {
      const { camera, size } = state;
      for (const a of anchors) {
        const el = calloutEls?.current?.[a.id];
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
        el.style.opacity = String(vis);
        el.style.pointerEvents = vis > 0.95 ? 'auto' : 'none';
      }
      lastVis.current = vis;
    }
  });

  useEffect(() => {
    Object.entries(partMeshes).forEach(([id, meshes]) => {
      const glow = id === selectedId ? 0.35 : id === hoveredId ? 0.18 : 0;
      meshes.forEach((m) => {
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          if (!mat.emissive) return;
          mat.emissive.set('#ffffff');
          mat.emissiveIntensity = glow;
        });
      });
    });
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

useGLTF.preload(MODEL_URL);

export default HeadphoneModel;