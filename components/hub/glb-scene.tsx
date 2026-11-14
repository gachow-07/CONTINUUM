"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { LoadingManager, MeshStandardMaterial, type Group } from "three";
import { fileUrl } from "@/lib/client";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";
import { importedParts } from "@/lib/cad/imported-parts.mjs";

export type ImportedPart = { key: string; name: string };
function Model({ scene, highlighted, onSelect, onParts }: { scene: Group; highlighted: string[]; onSelect?: (key: string) => void; onParts?: (parts: ImportedPart[]) => void }) {
  const parts = useMemo(() => importedParts(scene), [scene]);
  const highlightMaterial = useMemo(() => new MeshStandardMaterial({ color: "#299fff", emissive: "#074987", emissiveIntensity: 0.5, roughness: 0.5 }), []);
  useEffect(() => { onParts?.(parts.map(({ key, name }) => ({ key, name }))); }, [parts, onParts]);
  useEffect(() => {
    const original = parts.map(({ mesh }) => mesh.material);
    const keys = new Set(highlighted);
    parts.forEach(({ mesh, key }) => { if (keys.has(key)) mesh.material = highlightMaterial; });
    return () => { parts.forEach(({ mesh }, i) => { mesh.material = original[i]; }); };
  }, [parts, highlighted, highlightMaterial]);
  useEffect(() => () => highlightMaterial.dispose(), [highlightMaterial]);
  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const part = parts.find(({ mesh }) => mesh === event.object);
    if (part) onSelect?.(part.key);
  };
  return <primitive object={scene} onClick={click} />;
}
export default function GlbScene({ path, localUrl, highlighted = [], onSelect, onParts }: { path?: string; localUrl?: string; highlighted?: string[]; onSelect?: (key: string) => void; onParts?: (parts: ImportedPart[]) => void }) {
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
        if (!controller.signal.aborted) setScene(model.scene);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Could not load this model.");
      } finally { draco.dispose(); }
    }
    void load();
    return () => controller.abort();
  }, [path, localUrl]);
  if (error) return <div role="alert" className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">Couldn’t display this model: {error}</div>;
  if (!scene) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading model…</div>;
  return <Canvas camera={{ position: [3, 2, 3], fov: 45 }}><ambientLight intensity={1.2} /><directionalLight position={[5, 10, 7]} intensity={2.5} /><Suspense fallback={null}><Bounds fit clip observe margin={1.3}><Model scene={scene} highlighted={highlighted} onSelect={onSelect} onParts={onParts} /></Bounds></Suspense><OrbitControls makeDefault /></Canvas>;
}
