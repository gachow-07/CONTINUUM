"use client";
import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { LoadingManager, type Group } from "three";
import { fileUrl } from "@/lib/client";

import { validateGlb } from "@/lib/cad/validate-glb.mjs";

export default function GlbScene({ path }: { path: string }) {
  const [scene, setScene] = useState<Group | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      // Use a separate manager: model resources remain restricted to embedded
      // data while the decoder is loaded from our own bundled decoder assets.
      const draco = new DRACOLoader();
      draco.setDecoderPath("/draco/");
      try {
        const response = await fetch(fileUrl(path), { signal: controller.signal });
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
      } finally {
        draco.dispose();
      }
    }
    void load();
    return () => controller.abort();
  }, [path]);
  if (error) return <div role="alert" className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">Couldn’t display this model: {error}</div>;
  if (!scene) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading model…</div>;
  return <Canvas camera={{ position: [3, 2, 3], fov: 45 }}><ambientLight intensity={1.2} /><directionalLight position={[5, 10, 7]} intensity={2.5} /><Suspense fallback={null}><Bounds fit clip observe margin={1.3}><primitive object={scene} /></Bounds></Suspense><OrbitControls makeDefault /></Canvas>;
}
