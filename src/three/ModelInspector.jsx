import {
    Component,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
  } from 'react';
  import { Canvas, useFrame, useThree } from '@react-three/fiber';
  import {
    OrbitControls,
    useGLTF,
    Center,
    Environment,
    Lightformer,
    ContactShadows,
    useCursor,
  } from '@react-three/drei';
  import * as THREE from 'three';
  import { PARTS_BY_ID, findPartByMeshName } from './headphoneParts';
  import { COLORWAYS_BY_ID, DEFAULT_COLORWAY_ID } from './colorways';
  
  class SafeBoundary extends Component {
    state = { failed: false };
    static getDerivedStateFromError() {
      return { failed: true };
    }
    componentDidCatch(err) {
      console.warn('Scene part failed to load:', err);
    }
    render() {
      return this.state.failed ? null : this.props.children;
    }
  }
  
  // Surface finish per part group. Colors come from colorways.js.
  const SURFACE = {
    shell: { roughness: 0.45, metalness: 0.35, envMapIntensity: 0.9 },
    soft: { roughness: 0.95, metalness: 0.0, envMapIntensity: 0.25 },
    inner: { roughness: 0.7, metalness: 0.2, envMapIntensity: 0.6 },
    metal: { roughness: 0.3, metalness: 0.9, envMapIntensity: 1.2 },
    holes: { roughness: 0.5, metalness: 0.7, envMapIntensity: 0.8 },
  };
  
  function HeadphoneModel({
    exploded,
    hoveredId,
    selectedId,
    onHover,
    onOut,
    onMove,
    onPartClick,
    onMeasure,
    palette,
  }) {
    const { scene } = useGLTF('/models/headphones.glb');
  
    const { model, scale, items, partMeshes, fitRadius, tintables } = useMemo(() => {
      const cloned = scene.clone(true);
  
      const shellParts = ['Headband', 'outer_cup_1', 'Outer_cup_2', 'Button_1', 'Button_2'];
      const softParts = ['Headband_cushion', 'ear_puff', 'ear_puff001'];
      const innerParts = ['Inner_cup_1', 'Inner_cup_2', 'Slider', 'Slider2'];
  
      const startPalette = COLORWAYS_BY_ID[DEFAULT_COLORWAY_ID].palette;
      const tintables = [];
  
      cloned.traverse((obj) => {
        if (!obj.isMesh) return;
  
        let kind = 'inner';
        if (shellParts.includes(obj.name)) kind = 'shell';
        else if (softParts.includes(obj.name)) kind = 'soft';
        else if (innerParts.includes(obj.name)) kind = 'inner';
        else if (obj.name === 'Hinges?') kind = 'metal';
        else if (obj.name.startsWith('Hole_')) kind = 'holes';
  
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
  
        obj.material = Array.isArray(obj.material)
          ? obj.material.map(recolor)
          : recolor(obj.material);
      });
  
      // Normalize the model to a consistent height.
      const bounds = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const scale = 3.2 / size.y;
      const modelCenter = bounds.getCenter(new THREE.Vector3());
  
      // Work out where each mesh flies to when disassembled.
      cloned.updateMatrixWorld(true);
      const items = [];
      const partMeshes = {};
  
      cloned.traverse((obj) => {
        if (!obj.isMesh) return;
        const part = findPartByMeshName(obj.name);
        obj.userData.partId = part ? part.id : null;
        if (!part) return;
  
        (partMeshes[part.id] ||= []).push(obj);
  
        const meshCenter = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
        const dir = meshCenter.sub(modelCenter);
        if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
        dir.normalize();
  
        // part.distance is in final scene units; convert to the model's own units.
        const offsetWorld = dir.multiplyScalar(part.distance / scale);
        const parent = obj.parent;
        const p0 = parent.worldToLocal(new THREE.Vector3(0, 0, 0));
        const p1 = parent.worldToLocal(offsetWorld.clone());
        const base = obj.position.clone();
        const target = base.clone().add(p1.sub(p0));
  
        items.push({ obj, base, target });
      });
  
      // Measure the fully exploded layout so the camera can frame every part.
      items.forEach(({ obj, target }) => obj.position.copy(target));
      cloned.updateMatrixWorld(true);
      const fitRadius =
        new THREE.Box3()
          .setFromObject(cloned)
          .getBoundingSphere(new THREE.Sphere()).radius * scale;
      items.forEach(({ obj, base }) => obj.position.copy(base));
      cloned.updateMatrixWorld(true);
  
      return { model: cloned, scale, items, partMeshes, fitRadius, tintables };
    }, [scene]);
  
    useEffect(() => {
      onMeasure?.(fitRadius);
    }, [fitRadius, onMeasure]);
  
    // Animate assembled <-> exploded.
    const t = useRef(0);
    const targetColors = useMemo(
      () => Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, new THREE.Color(v)])),
      [palette]
    );
  
    useFrame((_, delta) => {
      t.current = THREE.MathUtils.damp(t.current, exploded ? 1 : 0, 4, delta);
      for (const { obj, base, target } of items) {
        obj.position.lerpVectors(base, target, t.current);
      }
  
      // Fade smoothly to the chosen colorway.
      const k = 1 - Math.exp(-6 * delta);
      for (const { material, kind } of tintables) {
        material.color?.lerp(targetColors[kind], k);
      }
    });
  
    // Highlight hovered / selected part.
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
  
    return (
      <Center>
        <primitive
          object={model}
          scale={scale}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover(e.object.userData.partId ?? null);
            onMove(e.nativeEvent);
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            onHover(e.object.userData.partId ?? null);
            onMove(e.nativeEvent);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onOut();
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPartClick(e.object.userData.partId ?? null);
          }}
        />
      </Center>
    );
  }
  
  const ZERO = new THREE.Vector3();
  
  // How much breathing room the exploded view gets.
  // Lower = parts look bigger / closer. Higher = more space around them.
  const FIT_PADDING = 0.95;
  
  // Pulls the camera back so every exploded part fits on screen, and slides the
  // scene left while the specs panel is open so nothing hides behind it.
  function CameraRig({ exploded, fitRadius, shiftPx }) {
    const camera = useThree((s) => s.camera);
    const controls = useThree((s) => s.controls);
    const size = useThree((s) => s.size);
  
    const home = useRef(camera.position.length());
    const goal = useRef(null);
    const anim = useRef(0);
    const shift = useRef(0);
    const first = useRef(true);
  
    useEffect(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      if (exploded) {
        const vfov = THREE.MathUtils.degToRad(camera.fov);
        const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
        const half = Math.min(vfov, hfov) / 2;
        goal.current = Math.max((fitRadius / Math.tan(half)) * FIT_PADDING, home.current);
      } else {
        goal.current = home.current;
      }
      anim.current = 1.6; // seconds the rig is allowed to steer; after that you're in control
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exploded]);
  
    useFrame((_, delta) => {
      const target = controls?.target ?? ZERO;
  
      if (anim.current > 0 && goal.current != null) {
        anim.current -= delta;
        const dir = camera.position.clone().sub(target);
        const nd = THREE.MathUtils.damp(dir.length(), goal.current, 3, delta);
        camera.position.copy(target).add(dir.setLength(nd));
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
  
  // Studio-style reflections built in code (no HDR download needed).
  function DarkStudio() {
    return (
      <Environment resolution={256} background={false}>
        <color attach="background" args={['#000000']} />
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[6, 0.5, -3]} rotation-y={-Math.PI / 2} scale={[10, 1, 1]} />
        <Lightformer form="ring" intensity={0.6} position={[0, 1, 6]} scale={4} />
      </Environment>
    );
  }
  
  // ---------- DOM overlays ----------
  
  const ui = {
    tip: {
      position: 'absolute',
      top: 0,
      left: 0,
      pointerEvents: 'none',
      padding: '8px 14px',
      borderRadius: 999,
      background: 'rgba(10,11,13,0.82)',
      border: '1px solid rgba(255,255,255,0.14)',
      backdropFilter: 'blur(8px)',
      color: '#f2f2f2',
      fontSize: 13,
      lineHeight: 1.3,
      whiteSpace: 'nowrap',
      transition: 'opacity 160ms ease',
      zIndex: 5,
    },
    panel: {
      position: 'absolute',
      right: 32,
      top: '50%',
      width: 300,
      padding: 22,
      borderRadius: 18,
      background: 'rgba(12,13,15,0.88)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)',
      color: '#f2f2f2',
      transition: 'opacity 220ms ease, transform 220ms ease',
      zIndex: 6,
    },
    pill: {
      padding: '10px 20px',
      borderRadius: 999,
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.35)',
      color: '#fff',
      fontSize: 14,
      cursor: 'pointer',
    },
  };
  
  function SpecPanel({ part, open, onClose }) {
    if (!part) return null;
    return (
      <div
        style={{
          ...ui.panel,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: `translateY(-50%) translateX(${open ? 0 : 16}px)`,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 14,
            background: 'none',
            border: 'none',
            color: '#9a9ea6',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', color: '#8b8f98', textTransform: 'uppercase' }}>
          Specifications
        </div>
        <h3 style={{ margin: '6px 0 8px', fontSize: 22, fontWeight: 600 }}>{part.name}</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.5, color: '#b4b8c0' }}>
          {part.description}
        </p>
        <div>
          {part.specs.map((s) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                padding: '10px 0',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: 13,
              }}
            >
              <span style={{ color: '#8b8f98' }}>{s.label}</span>
              <span style={{ textAlign: 'right' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  export default function ModelInspector({ colorId = DEFAULT_COLORWAY_ID }) {
    const palette = (COLORWAYS_BY_ID[colorId] ?? COLORWAYS_BY_ID[DEFAULT_COLORWAY_ID]).palette;
    const [exploded, setExploded] = useState(false);
    const [hovering, setHovering] = useState(false);
    const [hoveredId, setHoveredId] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [fitRadius, setFitRadius] = useState(3);
  
    const wrapRef = useRef(null);
    const tipRef = useRef(null);
    const lastPartId = useRef(null);
  
    const onMove = useCallback((ev) => {
      if (!wrapRef.current || !tipRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      tipRef.current.style.transform = `translate(${ev.clientX - r.left + 18}px, ${ev.clientY - r.top + 18}px)`;
    }, []);
  
    const onHover = useCallback((id) => {
      setHovering(true);
      setHoveredId(id);
    }, []);
  
    const onOut = useCallback(() => {
      setHovering(false);
      setHoveredId(null);
    }, []);
  
    const onPartClick = useCallback(
      (id) => {
        if (!exploded) setExploded(true);
        else if (id) setSelectedId(id);
      },
      [exploded]
    );
  
    const reassemble = () => {
      setExploded(false);
      setSelectedId(null);
      setHoveredId(null);
    };
  
    useEffect(() => {
      const onKey = (e) => e.key === 'Escape' && setSelectedId(null);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);
  
    // Pointer cursor when the click will do something.
    useCursor(hovering && (!exploded || !!hoveredId), 'pointer');
  
    let tipTitle = '';
    let tipSub = '';
    if (hovering && !exploded) tipTitle = 'Click to disassemble';
    else if (hovering && exploded && hoveredId) {
      tipTitle = PARTS_BY_ID[hoveredId].name;
      tipSub = 'Click for specs';
    }
  
    if (selectedId) lastPartId.current = selectedId;
    const panelPart = PARTS_BY_ID[selectedId ?? lastPartId.current];
  
    return (
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <Canvas
          camera={{ position: [-1.5, 0.3, 5], fov: 45 }}
          gl={{
            alpha: true,
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.95,
          }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <ambientLight intensity={0.12} />
          <directionalLight position={[5, 5, 5]} intensity={1.4} color="#ffffff" />
          <directionalLight position={[-5, 2, -3]} intensity={2.2} color="#ffffff" />
          <directionalLight position={[4, 3, -5]} intensity={1.6} color="#ffffff" />
  
          <Suspense fallback={null}>
            <SafeBoundary>
              <DarkStudio />
            </SafeBoundary>
            <HeadphoneModel
              exploded={exploded}
              hoveredId={exploded ? hoveredId : null}
              selectedId={selectedId}
              onHover={onHover}
              onOut={onOut}
              onMove={onMove}
              onPartClick={onPartClick}
              onMeasure={setFitRadius}
              palette={palette}
            />
            <ContactShadows position={[0, -1.7, 0]} opacity={0.55} scale={10} blur={2.8} far={4} />
          </Suspense>
  
          <CameraRig exploded={exploded} fitRadius={fitRadius} shiftPx={selectedId ? 170 : 0} />
  
          <OrbitControls
            makeDefault
            enableDamping
            enableZoom
            zoomSpeed={0.8}
            minDistance={3}
            maxDistance={12}
            enablePan={false}
            enableRotate
          />
        </Canvas>
  
        {/* Hover tooltip (follows the cursor) */}
        <div ref={tipRef} style={{ ...ui.tip, opacity: tipTitle ? 1 : 0 }}>
          <div style={{ fontWeight: 600 }}>{tipTitle || '\u00A0'}</div>
          {tipSub && <div style={{ fontSize: 11, color: '#9a9ea6' }}>{tipSub}</div>}
        </div>
  
        {/* Specs */}
        <SpecPanel part={panelPart} open={!!selectedId} onClose={() => setSelectedId(null)} />
  
        {/* Reassemble */}
        {exploded && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 28,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              zIndex: 5,
            }}
          >
            <span style={{ fontSize: 13, color: '#9a9ea6' }}>Click a part to see its specs</span>
            <button style={ui.pill} onClick={reassemble}>
              Reassemble
            </button>
          </div>
        )}
      </div>
    );
  }