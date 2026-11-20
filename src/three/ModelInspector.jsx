import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import { PARTS, PARTS_BY_ID } from './headphoneParts';
import { COLORWAYS, DEFAULT_COLORWAY_ID } from './colorways';
import HeadphoneModel from './HeadphoneModel';
import CameraRig from './CameraRig';
import { DarkStudio, SafeBoundary } from './Studio';
import { HoverTip, PartCallouts, SpecPanel, TourBar, calloutCss } from './inspectorOverlays';
import AudioRings from '../components/AudioRings';
import { scrollStore, subscribe } from '../scroll/scrollStore';
import { prefersReducedMotion } from '../scroll/gsap';
import { holdStage, playIntroThisVisit } from './stageSession';

// Stops the whole render loop (model, rig, contact shadows) while an opaque
// section covers the canvas, and restarts it the moment it is uncovered.
function FrameGate() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(
    () =>
      subscribe((key, visible) => {
        if (key !== 'visible') return;
        setFrameloop(visible ? 'always' : 'never');
        if (visible) invalidate();
      }),
    [setFrameloop, invalidate]
  );

  return null;
}

// Edge light while Colorways is on screen. Noir's shell is nearly black, and the
// page behind it is black; this is the only thing that draws the silhouette.
// Off everywhere else (scrollStore.rim is 0). No priority: a positive one
// would stop the canvas rendering.
const RIM_INTENSITY = 1.7;
const RIM_COLOR = '#e6e9f0';

function ColorwaysRim() {
  const light = useRef(null);
  const poseSeen = useRef(scrollStore.poseEpoch);

  useFrame((_, delta) => {
    const l = light.current;
    if (!l) return;
    const jumped = scrollStore.poseEpoch !== poseSeen.current;
    poseSeen.current = scrollStore.poseEpoch;
    const goal = scrollStore.rim > 0 ? RIM_INTENSITY : 0;
    l.intensity = jumped || scrollStore.snap ? goal : THREE.MathUtils.damp(l.intensity, goal, 5, delta);
  });

  return <directionalLight ref={light} position={[-6, 1.6, 2]} intensity={0} color={RIM_COLOR} />;
}

// The persistent 3D stage: fixed behind the page, shared by every section.
// Layers (see App.css): backdrop (z 0) < transparent sections (z 1) <
// canvas (z 2) < hero controls / opaque sections (z 3+) < overlays (z 20).
export default function ModelInspector({ colorId = DEFAULT_COLORWAY_ID }) {
  const [exploded, setExploded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [fitRadius, setFitRadius] = useState(3);
  const [sides, setSides] = useState({});
  const [focus, setFocus] = useState(null);
  const [dragging, setDragging] = useState(false);

  // Keeps the spec panel filled while it fades out after closing.
  const [lastPartId, setLastPartId] = useState(null);
  if (selectedId && selectedId !== lastPartId) setLastPartId(selectedId);

  const wrapRef = useRef(null);
  const tipRef = useRef(null);
  const calloutEls = useRef({});
  const apiRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const backdropRef = useRef(null);
  const glowEls = useRef({});

  const [reduceMotion] = useState(prefersReducedMotion);
  // First mount of this tab plays the assemble intro. Navigating away and
  // back does not. Reduced motion skips it entirely.
  const [playIntro] = useState(() => !reduceMotion && playIntroThisVisit());

  // DOM writes requested from the frame loop (no React state per frame).
  const getCalloutEl = useCallback((id) => calloutEls.current[id], []);
  const onColorShown = useCallback((id) => {
    const glows = glowEls.current;
    if (!glows[id]) return false;
    for (const key in glows) {
      if (glows[key]) glows[key].style.opacity = key === id ? '1' : '0';
    }
    return true;
  }, []);
  const onShift = useCallback((x, y) => {
    const el = backdropRef.current;
    if (el) el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }, []);

  // The assemble intro starts the moment the model is ready.
  const [modelLoaded, setModelLoaded] = useState(false);
  const [introDone, setIntroDone] = useState(!playIntro);
  const intro = !introDone;
  const onIntroDone = useCallback(() => setIntroDone(true), []);

  useEffect(() => holdStage(), []);

  // Only the hero lets you click / orbit the model. Leaving it hands control
  // to the scroll timeline, so close anything that was open.
  useEffect(() => {
    const setPassive = (passive) => canvasWrapRef.current?.classList.toggle('is-passive', passive);
    setPassive(scrollStore.mode !== 'interactive');
    return subscribe((key, mode) => {
      if (key !== 'mode') return;
      const passive = mode !== 'interactive';
      setPassive(passive);
      if (!passive) return;
      setExploded(false);
      setSelectedId(null);
      setHoveredId(null);
      setHovering(false);
      setDragging(false);
    });
  }, []);

  // Lets the hero copy step back while the parts are spread out.
  useEffect(() => {
    document.documentElement.classList.toggle('is-exploded', exploded);
    return () => document.documentElement.classList.remove('is-exploded');
  }, [exploded]);

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
      if (intro) return; // ignore clicks while the parts are flying in
      if (!exploded) {
        setExploded(true);
        return;
      }
      if (!id) return;
      togglePart(id);
    },
    [exploded, togglePart, intro]
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

  useCursor(hovering && !intro && (!exploded || !!hoveredId), 'pointer');

  let tipTitle = '';
  let tipSub = '';
  if (hovering && !intro && !exploded) tipTitle = 'Click to disassemble';
  else if (hovering && exploded && hoveredId) {
    tipTitle = PARTS_BY_ID[hoveredId].name;
    tipSub = hoveredId === selectedId ? 'Click to close' : 'Click for specs';
  }

  const panelPart = PARTS_BY_ID[selectedId ?? lastPartId];
  const tourIndex = selectedId ? PARTS.findIndex((p) => p.id === selectedId) : -1;
  const idle = !reduceMotion && !exploded && !hovering && !dragging && !intro;

  return (
    <>
      <style>{calloutCss}</style>

      <div className="stage-backdrop" aria-hidden="true">
        {/* Shifted with the model by CameraRig so the glow / rings stay centered on it */}
        <div ref={backdropRef} className="stage-glow">
          {/* Faint rings that pulse with the sample / noise demo */}
          <AudioRings />
          {/* Neutral halo while Colorways is active, so Noir doesn't vanish into the page. */}
          <div className="colorways-rim" />
          {/* One glow per color, cross-faded by HeadphoneModel, so the backdrop follows the headphones */}
          {COLORWAYS.map((c) => (
            <div
              key={c.id}
              ref={(el) => {
                glowEls.current[c.id] = el;
              }}
              className="model-light"
              style={{ background: `radial-gradient(circle, ${c.glow[0]} 0%, ${c.glow[1]} 38%, transparent 72%)` }}
            />
          ))}
        </div>
      </div>

      <div
        ref={canvasWrapRef}
        className="stage-canvas"
        data-intro={playIntro ? 'play' : 'skip'}
        style={{ opacity: modelLoaded ? 1 : 0 }}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [11.9, 0.1, -1.1], fov: 20 }}
          gl={{
            alpha: true,
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 0.95,
          }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <FrameGate />
          <ambientLight intensity={0.12} />
          <ColorwaysRim />
          <directionalLight position={[5, 5, 5]} intensity={1.4} color="#ffffff" />
          <directionalLight position={[-5, 2, -3]} intensity={2.2} color="#ffffff" />
          <directionalLight position={[4, 3, -5]} intensity={1.6} color="#ffffff" />

          <Suspense fallback={null}>
            <SafeBoundary>
              <DarkStudio />
            </SafeBoundary>
            <HeadphoneModel
              exploded={exploded}
              intro={intro}
              onIntroDone={onIntroDone}
              onLoaded={setModelLoaded}
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
              getCalloutEl={getCalloutEl}
              colorId={colorId}
              onColorShown={onColorShown}
              reduceMotion={reduceMotion}
            />
            <ContactShadows position={[0, -1.7, 0]} opacity={0.55} scale={10} blur={2.8} far={4} />
          </Suspense>

          <CameraRig
            exploded={exploded}
            fitRadius={fitRadius}
            shiftPx={selectedId ? 170 : 0}
            focus={focus}
            reduceMotion={reduceMotion}
            onShift={onShift}
          />

          {/* No zoom: the wheel must always scroll the page. */}
          <OrbitControls
            makeDefault
            enableDamping
            enableZoom={false}
            minDistance={2.1}
            maxDistance={60}
            enablePan={false}
            enableRotate
            onStart={() => setDragging(true)}
            onEnd={() => setDragging(false)}
          />
        </Canvas>
      </div>

      <div ref={wrapRef} className="stage-overlays">
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
    </>
  );
}
