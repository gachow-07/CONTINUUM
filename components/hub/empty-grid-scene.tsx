"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FadingGrid } from "./fading-grid";

export default function EmptyGridScene({ showGrid }: { showGrid: boolean }) {
  return <Canvas camera={{ position: [6, 5, 7], fov: 45 }}>
    {showGrid && <FadingGrid span={10} />}
    <OrbitControls makeDefault enableZoom enablePan />
  </Canvas>;
}
