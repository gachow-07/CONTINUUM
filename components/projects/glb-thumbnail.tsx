"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { LoadingManager, type Group, type Material, type Mesh, type Texture } from "three";
import { fileUrl } from "@/lib/client";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";
import { ProjectCover } from "./cover";

/** Render only visible cards so projects with many models don't exhaust WebGL contexts. */
export function GlbThumbnail({ path, filename, name, cover }: { path: string; filename: string; name: string; cover: string | null }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") { queueMicrotask(() => setVisible(true)); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "150px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} role="img" aria-label={`${name} model preview`} className="pointer-events-none h-full w-full bg-[#0d131c]">
    {visible && <LoadedGlb path={path} filename={filename} name={name} cover={cover} />}
  </div>;
}

function disposeScene(scene: Group) {
  scene.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    for (const material of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean) as Material[]) {
      for (const value of Object.values(material)) if ((value as Texture | null)?.isTexture) (value as Texture).dispose();
      material.dispose();
    }
  });
}

function LoadedGlb({ path, filename, name, cover }: { path: string; filename: string; name: string; cover: string | null }) {
  const [scene, setScene] = useState<Group | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const draco = new DRACOLoader(); draco.setDecoderPath("/draco/");
    let loaded: Group | null = null;
    (async () => {
      try {
        const response = await fetch(fileUrl(path), { signal: controller.signal });
        if (!response.ok) throw new Error("Model unavailable");
        const data = await response.arrayBuffer(); validateGlb(data);
        const manager = new LoadingManager();
        manager.setURLModifier((url) => { if (url.startsWith("blob:") || url.startsWith("data:")) return url; throw new Error("External resources are not supported"); });
        const result = await new GLTFLoader(manager).setDRACOLoader(draco).parseAsync(data, "");
        loaded = result.scene;
        if (filename.toLowerCase() === "f26-aer-0000-501.glb") loaded.rotation.x += Math.PI / 2;
        if (!controller.signal.aborted) { setFailed(false); setScene(loaded); } else { disposeScene(loaded); loaded = null; }
      } catch { if (!controller.signal.aborted) setFailed(true); }
      finally { draco.dispose(); }
    })();
    return () => {
      controller.abort();
      if (loaded) disposeScene(loaded);
    };
  }, [path, filename]);
  return failed ? <ProjectCover path={cover} name={name} /> : scene ? <Canvas frameloop="demand" dpr={1} camera={{ position: [3, 2, 3], fov: 45 }}><ambientLight intensity={1.2} /><directionalLight position={[5, 10, 7]} intensity={2.5} /><Suspense fallback={null}><Bounds fit clip observe margin={1.3}><primitive object={scene} /></Bounds></Suspense></Canvas> : null;
}
