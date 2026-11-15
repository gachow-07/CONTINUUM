"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, events, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bounds, OrbitControls, GizmoHelper, GizmoViewport, useBounds } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Box3, Color, LoadingManager, MeshStandardMaterial, MOUSE, Vector3, type Group, type PerspectiveCamera } from "three";
import { fileUrl } from "@/lib/client";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";
import { importedParts } from "@/lib/cad/imported-parts.mjs";
import { ModelGrid } from "./fading-grid";

export type ImportedPart = { key: string; name: string };
/** A clickable dot at the centre of its parts. `color` matches the component it belongs to. */
type Marker = { id: string; name: string; partKeys: string[]; color?: string };
const DEFAULT_ACCENT = "#22d3ee";
const markerFirstEvents = (store: Parameters<typeof events>[0]) => ({ ...events(store), filter: (hits: import("three").Intersection[]) => [...hits].sort((a, b) => Number(Boolean(b.object.userData.continuumMarker)) - Number(Boolean(a.object.userData.continuumMarker))) });
function Model({ scene, highlighted, highlightColor, isolate, onSelect, onParts }: { scene: Group; highlighted: string[]; highlightColor: string; isolate: boolean; onSelect?: (key: string) => void; onParts?: (parts: ImportedPart[]) => void }) {
  const parts = useMemo(() => importedParts(scene), [scene]);
  // Highlighted parts take the colour of their component, with a darker glow of the same hue.
  const highlightMaterial = useMemo(() => new MeshStandardMaterial({ color: highlightColor, emissive: new Color(highlightColor).multiplyScalar(0.35), emissiveIntensity: 0.5, roughness: 0.5 }), [highlightColor]);
  useEffect(() => { onParts?.(parts.map(({ key, name }) => ({ key, name }))); }, [parts, onParts]);
  useEffect(() => {
    const original = parts.map(({ mesh }) => mesh.material);
    const keys = new Set(highlighted);
    parts.forEach(({ mesh, key }) => { if (keys.has(key)) mesh.material = highlightMaterial; });
    return () => { parts.forEach(({ mesh }, i) => { mesh.material = original[i]; }); };
  }, [parts, highlighted, highlightMaterial]);
  useEffect(() => {
    const original = parts.map(({ mesh }) => mesh.visible);
    const keys = new Set(highlighted);
    if (isolate && keys.size) parts.forEach(({ mesh, key }) => { if (!keys.has(key)) mesh.visible = false; });
    return () => { parts.forEach(({ mesh }, i) => { mesh.visible = original[i]; }); };
  }, [parts, highlighted, isolate]);
  useEffect(() => () => highlightMaterial.dispose(), [highlightMaterial]);
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const part = parts.find(({ mesh }) => mesh === event.object);
    if (part) onSelect?.(part.key);
  };
  return <primitive object={scene} onClick={click} />;
}
function FitView({ scene, request }: { scene: Group; request: number }) {
  const bounds = useBounds();
  useEffect(() => { if (request > 0) bounds.refresh(scene).clip().fit(); }, [request, scene, bounds]);
  return null;
}
function Markers({ scene, markers, onMarker }: { scene: Group; markers: Marker[]; onMarker?: (id: string) => void }) {
  const positions = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const parts = importedParts(scene);
    const overall = new Box3().setFromObject(scene);
    const radius = Math.max(overall.getSize(new Vector3()).length() * 0.008, 0.001);
    return markers.flatMap((marker) => {
      const box = new Box3();
      for (const part of parts) if (marker.partKeys.includes(part.key)) box.union(new Box3().setFromObject(part.mesh));
      return box.isEmpty() ? [] : [{ ...marker, position: box.getCenter(new Vector3()), radius }];
    });
  }, [scene, markers]);
  return <>{positions.map((marker) => <mesh key={marker.id} position={marker.position} userData={{ continuumMarker: true }} renderOrder={10} onClick={(event) => { event.stopPropagation(); onMarker?.(marker.id); }}><sphereGeometry args={[marker.radius, 16, 12]} /><meshBasicMaterial color={marker.color ?? DEFAULT_ACCENT} depthTest={false} /></mesh>)}</>;
}
/** Shifts the rendered image so the model is centred in the open area between overlay panels, not the canvas centre. */
function ViewOffset({ x, y }: { x: number; y: number }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (!x && !y) return;
    camera.setViewOffset(width, height, -x, -y, width, height);
    invalidate();
    return () => { camera.clearViewOffset(); invalidate(); };
  }, [camera, width, height, x, y, invalidate]);
  return null;
}
export type GizmoPlacement = { alignment: "bottom-left" | "bottom-right"; margin: [number, number] };
export default function GlbScene({ path, localUrl, highlighted = [], highlightColor = DEFAULT_ACCENT, onSelect, onParts, pan = false, isolate = false, fitRequest = 0, markers = [], onMarker, upright = false, showGrid = true, eventSource, viewOffset = [0, 0], fitMargin = 1.3, gizmo = { alignment: "bottom-right", margin: [50, 50] } }: {
  path?: string; localUrl?: string; highlighted?: string[]; highlightColor?: string; onSelect?: (key: string) => void; onParts?: (parts: ImportedPart[]) => void; pan?: boolean; isolate?: boolean; fitRequest?: number; markers?: Marker[]; onMarker?: (id: string) => void; upright?: boolean; showGrid?: boolean;
  /** Element that receives pointer input instead of the canvas (used when the canvas sits behind page content). */
  eventSource?: HTMLElement | null;
  /** Pixel offset of the model from the canvas centre. */
  viewOffset?: [number, number];
  fitMargin?: number;
  gizmo?: GizmoPlacement | null;
}) {
  const [scene, setScene] = useState<Group | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const draco = new DRACOLoader();
      draco.setDecoderPath("/draco/");
      try {
        const response = await fetch(localUrl ?? fileUrl(path!), { signal: controller.signal });
        if (!response.ok) throw new Error("The model could not be opened. Check your project access.");
        const data = await response.arrayBuffer();
        validateGlb(data);
        const manager = new LoadingManager();
        manager.setURLModifier((url) => {
          if (url.startsWith("blob:") || url.startsWith("data:")) return url;
          throw new Error("External model resources are not supported.");
        });
        const model = await new GLTFLoader(manager).setDRACOLoader(draco).parseAsync(data, "");
        // This model was exported with its vertical direction along negative Z.
        if (upright) model.scene.rotation.x += Math.PI / 2;
        if (!controller.signal.aborted) setScene(model.scene);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load this model.");
      } finally { draco.dispose(); }
    }
    void load();
    return () => controller.abort();
  }, [path, localUrl, upright]);
  if (error) return <div role="alert" className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">Couldn’t display this model: {error}</div>;
  if (!scene) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading model…</div>;
  return <Canvas events={markerFirstEvents} camera={{ position: [3, 2, 3], fov: 45 }} {...(eventSource ? { eventSource, eventPrefix: "client" as const } : {})}><ambientLight intensity={1.2} /><directionalLight position={[5, 10, 7]} intensity={2.5} /><ViewOffset x={viewOffset[0]} y={viewOffset[1]} /><Suspense fallback={null}><Bounds fit clip observe margin={fitMargin}><Model scene={scene} highlighted={highlighted} highlightColor={highlightColor} isolate={isolate} onSelect={onSelect} onParts={onParts} /><FitView scene={scene} request={fitRequest} /></Bounds>{showGrid && <ModelGrid scene={scene} />}<Markers scene={scene} markers={markers} onMarker={onMarker} /></Suspense><OrbitControls makeDefault mouseButtons={{ LEFT: pan ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: pan ? MOUSE.ROTATE : MOUSE.PAN }} />{gizmo && <GizmoHelper alignment={gizmo.alignment} margin={gizmo.margin}><GizmoViewport /></GizmoHelper>}</Canvas>;
}
