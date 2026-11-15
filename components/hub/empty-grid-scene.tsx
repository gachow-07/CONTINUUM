"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

export default function EmptyGridScene({ showGrid }: { showGrid: boolean }) {
  return <Canvas camera={{ position: [6, 5, 7], fov: 45 }}>
    {showGrid && <gridHelper args={[20, 20, "#3a5886", "#243a5a"]} />}
    <OrbitControls makeDefault enableZoom enablePan />
  </Canvas>;
}
