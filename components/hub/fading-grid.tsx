"use client";

import { useMemo } from "react";
import { Grid } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";

/** An apparently endless ground plane that fades with distance from the camera. */
export function FadingGrid({ span, position = [0, 0, 0] }: { span: number; position?: [number, number, number] }) {
  const scale = Math.max(span, 0.001);
  return <Grid position={position} args={[2, 2]} infiniteGrid followCamera cellSize={scale / 20} sectionSize={scale / 4} cellThickness={0.6} sectionThickness={0.9} cellColor="#1d3a40" sectionColor="#2c5c66" fadeDistance={Math.max(scale * 5, 0.01)} fadeStrength={1.8} />;
}

export function ModelGrid({ scene }: { scene: Group }) {
  const grid = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(scene);
    if (box.isEmpty()) return { span: 1, position: [0, 0, 0] as [number, number, number] };
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const span = Math.max(size.x, size.y, size.z, 0.001);
    return { span, position: [center.x, box.min.y - span * 0.003, center.z] as [number, number, number] };
  }, [scene]);
  return <FadingGrid {...grid} />;
}
