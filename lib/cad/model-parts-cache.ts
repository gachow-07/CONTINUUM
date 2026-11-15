import { LoadingManager } from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { importedParts } from "@/lib/cad/imported-parts.mjs";
import { validateGlb } from "@/lib/cad/validate-glb.mjs";
import { fileUrl } from "@/lib/client";

export type ModelPart = { key: string; name: string };

/**
 * The parts (key and name) of an uploaded GLB, loaded once per page session and shared by every component that needs
 * them, so the parts list and the part details on a component page don't each download and parse the model.
 * A failed load is not cached, so the next caller tries again.
 */
const cache = new Map<string, Promise<ModelPart[]>>();

export function loadModelParts(path: string): Promise<ModelPart[]> {
  const cached = cache.get(path);
  if (cached) return cached;
  const loading = (async () => {
    const manager = new LoadingManager();
    manager.setURLModifier((url) => { if (url.startsWith("blob:") || url.startsWith("data:")) return url; throw new Error("External model resources are not supported."); });
    const draco = new DRACOLoader(); draco.setDecoderPath("/draco/");
    try {
      const response = await fetch(fileUrl(path));
      if (!response.ok) throw new Error("The model could not be opened.");
      const data = await response.arrayBuffer();
      validateGlb(data);
      const gltf = await new GLTFLoader(manager).setDRACOLoader(draco).parseAsync(data, "");
      return importedParts(gltf.scene).map((part: ModelPart) => ({ key: part.key, name: part.name }));
    } finally { draco.dispose(); }
  })();
  cache.set(path, loading);
  loading.catch(() => cache.delete(path));
  return loading;
}
