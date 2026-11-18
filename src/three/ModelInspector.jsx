import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useCursor, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { PARTS, PARTS_BY_ID } from './headphoneParts';
import { COLORWAYS_BY_ID, DEFAULT_COLORWAY_ID } from './colorways';
import HeadphoneModel from './HeadphoneModel';
import CameraRig from './CameraRig';
import { DarkStudio, SafeBoundary } from './Studio';
import {
  HoverTip,
  LoadingBar,
  PartCallouts,
  SpecPanel,
  TourBar,
  calloutCss,
} from './inspectorOverlays';

export default function ModelInspector({ colorId = DEFAULT_COLORWAY_ID }) {
  const palette = (COLORWAYS_BY_ID[colorId] ?? COLORWAYS_BY_ID[DEFAULT_COLORWAY_ID]).palette;

  const [exploded, setExploded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [fitRadius, setFitRadius] = useState(3);
  const [sides, setSides] = useState({});
  const [focus, setFocus] = useState(null);
  const [dragging, setDragging] = useState(false);

  const { progress } = useProgress();
  const ready = progress >= 100;

  const wrapRef = useRef(null);
  const tipRef = useRef(null);
  const lastPartId = useRef(null);
  const calloutEls = useRef({});
  const apiRef = useRef(null);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

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

  const togglePart = useCallback((id) => {
    setSelectedId((cur) => (cur === id ? null : id));
  }, []);

  const onPartClick = useCallback(
    (id) => {
      if (!exploded) {
        setExploded(true);
        return;
      }
      if (!id) return;
      togglePart(id);
    },
    [exploded, togglePart]
  );

  const reassemble = () => {
    setExploded(false);
    setSelectedId(null);
    setHoveredId(null);
  };

  const step = useCallback(
    (dir) => {
      const ids = PARTS.map((p) => p.id);
      const idx = selectedId ? ids.indexOf(selectedId) : dir > 0 ? -1 : 0;
      setSelectedId(ids[(idx + dir + ids.length) % ids.length]);
    },
    [selectedId]
  );

  useEffect(() => {
    if (exploded && selectedId) setFocus(apiRef.current?.getPartFocus(selectedId) ?? null);
    else setFocus(null);
  }, [exploded, selectedId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
      if (!exploded) return;
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exploded, step]);

  useCursor(hovering && (!exploded || !!hoveredId), 'pointer');

  let tipTitle = '';
  let tipSub = '';
  if (hovering && !exploded) tipTitle = 'Click to disassemble';
  else if (hovering && exploded && hoveredId) {
    tipTitle = PARTS_BY_ID[hoveredId].name;
    tipSub = hoveredId === selectedId ? 'Click to close' : 'Click for specs';
  }

  if (selectedId) lastPartId.current = selectedId;
  const panelPart = PARTS_BY_ID[selectedId ?? lastPartId.current];
  const tourIndex = selectedId ? PARTS.findIndex((p) => p.id === selectedId) : -1;
  const idle = !reduceMotion && !exploded && !hovering && !dragging;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <style>{calloutCss}</style>
      <LoadingBar progress={progress} ready={ready} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.9s ease',
        }}
      >
        <Canvas
          camera={{ position: [11.9, 0.1, -1.1], fov: 20 }}
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
              idle={idle}
              hoveredId={exploded ? hoveredId : null}
              selectedId={selectedId}
              onHover={onHover}
              onOut={onOut}
              onMove={onMove}
              onPartClick={onPartClick}
              onMeasure={setFitRadius}
              onSides={setSides}
              apiRef={apiRef}
              calloutEls={calloutEls}
              palette={palette}
            />
            <ContactShadows position={[0, -1.7, 0]} opacity={0.55} scale={10} blur={2.8} far={4} />
          </Suspense>

          <CameraRig
            exploded={exploded}
            fitRadius={fitRadius}
            shiftPx={selectedId ? 170 : 0}
            focus={focus}
          />

          <OrbitControls
            makeDefault
            enableDamping
            enableZoom
            zoomSpeed={0.8}
            minDistance={2.1}
            maxDistance={25}
            enablePan={false}
            enableRotate
            onStart={() => setDragging(true)}
            onEnd={() => setDragging(false)}
          />
        </Canvas>
      </div>

      <PartCallouts
        sides={sides}
        calloutEls={calloutEls}
        onToggle={togglePart}
        onHover={setHoveredId}
        onLeave={() => setHoveredId(null)}
      />
      <HoverTip tipRef={tipRef} title={tipTitle} sub={tipSub} />
      <SpecPanel part={panelPart} open={!!selectedId} onClose={() => setSelectedId(null)} />
      {exploded && (
        <TourBar
          tourIndex={tourIndex}
          partCount={PARTS.length}
          onStep={step}
          onReassemble={reassemble}
        />
      )}
    </div>
  );
}
