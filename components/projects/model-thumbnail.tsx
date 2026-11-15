"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BoxGeometry, CylinderGeometry, Group, MathUtils, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import type { Part } from "@/lib/cad/types";
import { ThumbnailStage, useCardHover } from "./thumbnail-scene";
import { FadingGrid } from "@/components/hub/fading-grid";

function createModel(parts: Part[]) {
  const root = new Group();
  const groups = new Map<string, Group>();
  for (const part of parts) {
    const group = new Group();
    group.position.set(...part.position);
    group.rotation.set(...part.rotation.map(MathUtils.degToRad) as [number, number, number]);
    group.visible = part.visible;
    if (part.kind !== "group") {
      const p = part.params;
      const geometry = part.kind === "box" ? new BoxGeometry(p.w, p.h, p.d) : part.kind === "cylinder" ? new CylinderGeometry(p.r, p.r, p.h, 32) : new SphereGeometry(p.r, 32, 24);
      const material = new MeshStandardMaterial({ color: part.material.color, metalness: Math.min(part.material.metalness, 0.2), roughness: part.material.roughness, opacity: part.material.opacity, transparent: part.material.opacity < 1 });
      group.add(new Mesh(geometry, material));
    }
    groups.set(part.id, group);
  }
  for (const part of parts) {
    const group = groups.get(part.id)!;
    (part.parentId ? groups.get(part.parentId) : root)?.add(group);
  }
  return root;
}

/** Render the saved assembly using the same stage as uploaded model previews. */
export function ModelThumbnail({ parts, name }: { parts: Part[]; name: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const hovered = useCardHover(container);
  useEffect(() => {
    const target = container.current;
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") { queueMicrotask(() => setVisible(true)); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "150px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} role="img" aria-label={`${name} model preview`} className="pointer-events-none h-full w-full bg-[#0d131c]">{visible && <NativeModel parts={parts} hovered={hovered} />}</div>;
}

function NativeModel({ parts, hovered }: { parts: Part[]; hovered: boolean }) {
  const scene = useMemo(() => createModel(parts), [parts]);
  useEffect(() => () => { scene.traverse((object) => { if (object instanceof Mesh) { object.geometry.dispose(); object.material.dispose(); } }); }, [scene]);
  return <Canvas frameloop={hovered ? "always" : "demand"} dpr={1} camera={{ position: [3, 2, 3], fov: 45 }}><ThumbnailStage scene={scene} spinning={hovered} /></Canvas>;
}

/** Match the model previews while clearly indicating that there is no model to display. */
export function EmptyModelThumbnail({ name }: { name: string }) {
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
  return <div ref={container} role="img" aria-label={`${name}: no model yet`} className="pointer-events-none relative h-full w-full bg-[#0d131c]">{visible && <Canvas frameloop="demand" dpr={1} camera={{ position: [6, 4.2, 6], fov: 45 }}><FadingGrid span={10} /><OrbitControls enabled={false} /></Canvas>}<span className="absolute bottom-3 left-3 text-xs text-muted-foreground">No model yet</span></div>;
}
