"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Bounds, OrbitControls, GizmoHelper, GizmoViewport, useBounds } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { Box3, LoadingManager, MeshStandardMaterial, MOUSE, Vector3, type Group } from "three";
import { fileUrl } from "@/lib/client";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";
import { importedParts } from "@/lib/cad/imported-parts.mjs";

export type ImportedPart = { key: string; name: string };
type Marker = { id: string; name: string; partKeys: string[] };
function Model({ scene, highlighted, isolate, onSelect, onParts }: { scene: Group; highlighted: string[]; isolate: boolean; onSelect?: (key: string) => void; onParts?: (parts: ImportedPart[]) => void }) {
  const parts = useMemo(() => importedParts(scene), [scene]);
  const highlightMaterial = useMemo(() => new MeshStandardMaterial({ color: "#299fff", emissive: "#074987", emissiveIntensity: 0.5, roughness: 0.5 }), []);
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
function GroundGrid({ scene }: { scene: Group }) {
  const grid = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.01) * 2;
    return { span, position: [center.x, box.min.y - span * 0.003, center.z] as [number, number, number] };
  }, [scene]);
  return <gridHelper args={[grid.span, 20, "#3a5886", "#243a5a"]} position={grid.position} />;
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
  return <>{positions.map((marker) => <mesh key={marker.id} position={marker.position} renderOrder={10} onClick={(event) => { event.stopPropagation(); onMarker?.(marker.id); }}><sphereGeometry args={[marker.radius, 16, 12]} /><meshBasicMaterial color="#3d8bff" depthTest={false} /></mesh>)}</>;
}
export default function GlbScene({ path, localUrl, highlighted = [], onSelect, onParts, pan = false, isolate = false, fitRequest = 0, markers = [], onMarker, upright = false, showGrid = true }: { path?: string; localUrl?: string; highlighted?: string[]; onSelect?: (key: string) => void; onParts?: (parts: ImportedPart[]) => void; pan?: boolean; isolate?: boolean; fitRequest?: number; markers?: Marker[]; onMarker?: (id: string) => void; upright?: boolean; showGrid?: boolean }) {
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
  return <Canvas camera={{ position: [3, 2, 3], fov: 45 }}><ambientLight intensity={1.2} /><directionalLight position={[5, 10, 7]} intensity={2.5} /><Suspense fallback={null}><Bounds fit clip observe margin={1.3}><Model scene={scene} highlighted={highlighted} isolate={isolate} onSelect={onSelect} onParts={onParts} /><FitView scene={scene} request={fitRequest} /></Bounds>{showGrid && <GroundGrid scene={scene} />}<Markers scene={scene} markers={markers} onMarker={onMarker} /></Suspense><OrbitControls makeDefault mouseButtons={{ LEFT: pan ? MOUSE.PAN : MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: pan ? MOUSE.ROTATE : MOUSE.PAN }} /><GizmoHelper alignment="bottom-right" margin={[50, 50]}><GizmoViewport /></GizmoHelper></Canvas>;
}
