import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_URL, prepareModel } from './prepareModel';

function HeadphoneModel({
  exploded,
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

  useEffect(() => {
    onMeasure?.(fitRadius);
  }, [fitRadius, onMeasure]);

  useEffect(() => {
    onSides?.(sides);
  }, [sides, onSides]);

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
    t.current = THREE.MathUtils.damp(t.current, exploded ? 1 : 0, 4, delta);
    for (const { obj, base, target } of items) {
      obj.position.lerpVectors(base, target, t.current);
    }

    const k = 1 - Math.exp(-6 * delta);
    for (const { material, kind } of tintables) {
      material.color?.lerp(targetColors[kind], k);
    }

    idleAmt.current = THREE.MathUtils.damp(idleAmt.current, idle ? 1 : 0, 1.5, delta);
    const g = floatRef.current;
    if (g) {
      const time = state.clock.elapsedTime;
      g.position.y = Math.sin(time * 0.9) * 0.06 * idleAmt.current;
      g.rotation.y = Math.sin(time * 0.4) * 0.12 * idleAmt.current;
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
