"use client";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Edges, Environment, GizmoHelper, GizmoViewcube, Grid, Lightformer, OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { descendantIds } from "@/lib/cad/ops";
import type { DisplayMode, Part, Tool, Vec3, ViewPreset } from "@/lib/cad/types";

export const ACCENT = "#3d8bff";
export type ViewRequest = { preset: ViewPreset | "fit"; nonce: number; immediate?: boolean };

// Camera directions in world space. Model nose is +Z (matches the view cube's "Front"), right is +X.
const DIRS: Record<ViewPreset, THREE.Vector3> = {
  front: new THREE.Vector3(0, 0.12, 1), side: new THREE.Vector3(1, 0.12, 0), top: new THREE.Vector3(0, 1, 0.0001), iso: new THREE.Vector3(1, 0.7, 1),
};
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface ViewerMarker { id: string; name: string; position: Vec3; summary: string; active: boolean }

interface Props {
  parts: Part[]; selectedId: string | null; onSelect: (id: string | null) => void; mode: DisplayMode; tool: Tool;
  showGrid: boolean; showShadows: boolean; viewRequest: ViewRequest;
  onTransform: (id: string, position: Vec3, rotation: Vec3) => void; onReady: () => void;
  // Optional, used by the project hub (read-only viewer with component markers):
  pickable?: boolean; highlightIds?: Set<string>; leftMouse?: "rotate" | "pan"; showGizmo?: boolean;
  markers?: ViewerMarker[]; showMarkers?: boolean; onMarker?: (id: string) => void;
}

export default function Viewport(props: Props) {
  const markerLayer = useRef<HTMLDivElement>(null);
  return (
    <ViewportBoundary>
      <div className="relative h-full w-full">
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 35, near: 1, far: 20000, position: [600, 420, 600] }} gl={{ antialias: true, alpha: true }}
        onCreated={props.onReady} onPointerMissed={(e) => { if (e.button === 0) props.onSelect(null); }}>
        <Scene {...props} markerLayer={markerLayer} />
      </Canvas>
      <div ref={markerLayer} className="pointer-events-none absolute inset-0 overflow-hidden">
        {props.markers?.map((m) => (
          <button key={m.id} data-marker-id={m.id} type="button" onClick={() => props.onMarker?.(m.id)} aria-pressed={m.active} aria-label={`${m.name}: ${m.summary}. Select component`}
            className="group pointer-events-auto absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full outline-none" style={{ visibility: "hidden" }}>
            <span className={`absolute inset-0 rounded-full border-2 transition-all ${m.active ? "scale-110 border-[#3d8bff] bg-[#3d8bff]/25" : "border-[#3d8bff]/70 bg-[#0b0f16]/55 group-hover:border-[#3d8bff] group-focus-visible:border-[#3d8bff]"}`} />
            <span className={`relative h-2.5 w-2.5 rounded-full ${m.active ? "bg-white" : "bg-[#3d8bff]"}`} />
            <span className="absolute inset-[-3px] rounded-full ring-2 ring-white/0 group-focus-visible:ring-white/90" />
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#2b3649] bg-[#090c12]/95 px-2 py-1 text-[11px] font-medium text-[#e4e9f2] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{m.name}</span>
          </button>
        ))}
      </div>
      </div>
    </ViewportBoundary>
  );
}

function Scene({ parts, selectedId, onSelect, mode, tool, showGrid, showShadows, viewRequest, onTransform, pickable = true, highlightIds, leftMouse = "rotate", showGizmo = true, markers, showMarkers = true, markerLayer }: Props & { markerLayer: React.RefObject<HTMLDivElement | null> }) {
  const modelRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  useFrame(() => {
    if (!markerLayer.current || !modelRef.current) return;
    for (const marker of markers ?? []) {
      const button = Array.from(markerLayer.current.children).find((el) => (el as HTMLElement).dataset.markerId === marker.id) as HTMLElement | undefined;
      if (!button) continue;
      const point = new THREE.Vector3(...marker.position);
      const projected = point.clone().project(camera);
      raycaster.setFromCamera(new THREE.Vector2(projected.x, projected.y), camera);
      const intersection = raycaster.intersectObject(modelRef.current, true)[0];
      const hidden = !showMarkers || projected.z < -1 || projected.z > 1 || (intersection && intersection.distance < camera.position.distanceTo(point));
      button.style.visibility = hidden ? "hidden" : "visible";
      button.style.transform = `translate(${(projected.x * 0.5 + 0.5) * size.width - 14}px, ${(-projected.y * 0.5 + 0.5) * size.height - 14}px)`;
    }
  });
  const [hover, setHover] = useState<string | null>(null);
  const selectedSet = useMemo(() => highlightIds ?? (selectedId ? descendantIds(parts, selectedId) : new Set<string>()), [parts, selectedId, highlightIds]);
  const byParent = useMemo(() => {
    const m = new Map<string | null, Part[]>();
    parts.forEach((p) => m.set(p.parentId, [...(m.get(p.parentId) ?? []), p]));
    return m;
  }, [parts]);

  const render = (p: Part): ReactNode => {
    if (!p.visible) return null;
    const kids = byParent.get(p.id) ?? [];
    const highlighted = selectedSet.has(p.id);
    const transform = { position: p.position, rotation: [rad(p.rotation[0]), rad(p.rotation[1]), rad(p.rotation[2])] as [number, number, number] };
    const inner = (<>
        {p.kind !== "group" && (
          <mesh key={`${p.kind}-${JSON.stringify(p.params)}`} castShadow={showShadows && p.material.opacity >= 1} receiveShadow={showShadows}
            {...(pickable ? {
              onClick: (e: ThreeEvent<MouseEvent>) => { if (e.delta > 4) return; e.stopPropagation(); onSelect(p.id); },
              onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(p.id); (e.nativeEvent.target as HTMLElement).style.cursor = "pointer"; },
              onPointerOut: () => { setHover((h) => (h === p.id ? null : h)); document.querySelector("canvas")?.style.removeProperty("cursor"); },
            } : {})}>
            {p.kind === "box" && <boxGeometry args={[p.params.w, p.params.h, p.params.d]} />}
            {p.kind === "cylinder" && <cylinderGeometry args={[p.params.r, p.params.r, p.params.h, 56]} />}
            {p.kind === "sphere" && <sphereGeometry args={[p.params.r, 56, 36]} />}
            {mode === "wireframe" ? <meshBasicMaterial color={highlighted ? ACCENT : p.material.color} wireframe /> : (
              <meshStandardMaterial color={p.material.color} metalness={p.material.metalness} roughness={p.material.roughness}
                transparent={p.material.opacity < 1} opacity={p.material.opacity} depthWrite={p.material.opacity >= 1}
                emissive={ACCENT} emissiveIntensity={highlighted ? 0.2 : hover === p.id ? 0.1 : 0} />
            )}
            {mode === "edges" && !highlighted && <Edges threshold={20} color="#0a0d12" />}
            {highlighted && mode !== "wireframe" && <Edges threshold={20} color={ACCENT} />}
          </mesh>
        )}
        {kids.map(render)}
    </>);
    // The selected part is wrapped by the transform gizmo, which edits that wrapper's local position/rotation.
    if (p.id === selectedId && tool !== "select") {
      return (
        <TransformControls key={p.id} mode={tool === "move" ? "translate" : "rotate"} size={0.8} {...transform}
          onMouseUp={(e) => { const o = (e?.target as unknown as { object?: THREE.Object3D } | undefined)?.object; if (o) onTransform(p.id, [o.position.x, o.position.y, o.position.z], [deg(o.rotation.x), deg(o.rotation.y), deg(o.rotation.z)]); }}>
          {inner}
        </TransformControls>
      );
    }
    return <group key={p.id} {...transform}>{inner}</group>;
  };

  return (
    <>
      <hemisphereLight args={["#dbe9ff", "#2a313c", 1.1]} />
      <directionalLight position={[320, 520, 260]} intensity={3.2} castShadow={showShadows} shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
        shadow-camera-left={-420} shadow-camera-right={420} shadow-camera-top={420} shadow-camera-bottom={-420} shadow-camera-near={10} shadow-camera-far={1600} />
      <Environment resolution={256} frames={1} environmentIntensity={1.15}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer form="rect" intensity={4} position={[0, 6, -8]} scale={[12, 6, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={2.5} position={[-8, 3, 2]} scale={[2, 8, 1]} color="#cfe3ff" />
          <Lightformer form="rect" intensity={2} position={[8, 2, 4]} scale={[2, 8, 1]} color="#ffffff" />
          <Lightformer form="ring" intensity={1.5} position={[0, 8, 4]} scale={5} color="#a8d8ff" />
        </group>
      </Environment>

      <group ref={modelRef}>{(byParent.get(null) ?? []).map(render)}</group>

      {showShadows && <ContactShadows position={[0, 0.1, 0]} opacity={0.55} scale={900} blur={2.4} far={140} resolution={1024} color="#000000" />}
      {showGrid && <Grid position={[0, -0.2, 0]} args={[10, 10]} cellSize={10} cellThickness={0.6} cellColor="#1e2a38" sectionSize={50} sectionThickness={1} sectionColor="#2d3d52" fadeDistance={1500} fadeStrength={1.6} infiniteGrid />}

      <OrbitControls makeDefault enableDamping dampingFactor={0.12} minDistance={25} maxDistance={4000} zoomToCursor
        mouseButtons={{ LEFT: leftMouse === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: leftMouse === "pan" ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN }} />
      <CameraRig request={viewRequest} modelRef={modelRef} />
      {showGizmo && (
        <GizmoHelper alignment="bottom-right" margin={[76, 76]}>
          <GizmoViewcube color="#161c25" textColor="#cfd8e6" strokeColor="#3a4658" hoverColor={ACCENT} opacity={1} />
        </GizmoHelper>
      )}
    </>
  );
}

function CameraRig({ request, modelRef }: { request: ViewRequest; modelRef: React.RefObject<THREE.Group | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null;
  const anim = useRef<{ fp: THREE.Vector3; tp: THREE.Vector3; ft: THREE.Vector3; tt: THREE.Vector3; t: number } | null>(null);
  const done = useRef(-1);

  useEffect(() => {
    if (!controls || !modelRef.current || done.current === request.nonce) return;
    done.current = request.nonce;
    modelRef.current.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(modelRef.current);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const dir = (request.preset === "fit" ? camera.position.clone().sub(controls.target) : DIRS[request.preset].clone()).normalize();
    // Fit the actual box: look from `dir`, project each corner into that view and take the distance that keeps all of them in frame.
    const view = new THREE.Matrix4().lookAt(dir, new THREE.Vector3(), Math.abs(dir.y) > 0.99 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0));
    const inv = view.clone().invert();
    const tanV = Math.tan(rad(camera.fov) / 2), tanH = tanV * camera.aspect;
    let dist = 0;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const c = new THREE.Vector3(x, y, z).sub(center).applyMatrix4(inv);   // camera space: +z points toward the camera
      dist = Math.max(dist, Math.abs(c.x) / tanH + c.z, Math.abs(c.y) / tanV + c.z);
    }
    dist *= 1.1;
    const tp = center.clone().add(dir.multiplyScalar(dist));
    if (request.immediate) { camera.position.copy(tp); controls.target.copy(center); controls.update(); return; }
    anim.current = { fp: camera.position.clone(), tp, ft: controls.target.clone(), tt: center.clone(), t: 0 };
  }, [request, controls, camera, modelRef]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / 0.5);
    const k = 1 - Math.pow(1 - a.t, 3);
    camera.position.lerpVectors(a.fp, a.tp, k);
    controls.target.lerpVectors(a.ft, a.tt, k);
    controls.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}

class ViewportBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message || "The 3D viewport failed to start." }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-center">
          <div className="max-w-sm">
            <p className="text-sm font-semibold text-[var(--c-text)]">The 3D viewport couldn&apos;t start</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--c-muted)]">This usually means WebGL is disabled or unsupported in this browser or GPU. Enable hardware acceleration or try another browser. Your project data is unaffected.</p>
            <p className="mt-2 font-mono text-[11px] text-[var(--c-muted)]/70">{this.state.error}</p>
          </div>
        </div>
      );
    }
    return <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}
