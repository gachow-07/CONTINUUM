"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Box3, Group, Matrix4, PerspectiveCamera, Vector3 } from "three";
import { ModelGrid } from "@/components/hub/fading-grid";

/** Watch the card link so the preview can remain non-interactive and accessible. */
export function useCardHover(container: RefObject<HTMLDivElement | null>) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const card = container.current?.closest("a");
    if (!card) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointerleave", leave);
    return () => { card.removeEventListener("pointerenter", enter); card.removeEventListener("pointerleave", leave); };
  }, [container]);
  return hovered;
}

function setCameraClipping(camera: PerspectiveCamera, distance: number) {
  camera.near = Math.max(distance / 1000, 0.00001);
  camera.far = Math.max(distance * 100, 1);
}

/** Fit the model's bounds, including a complete horizontal rotation, to the card. */
export function ThumbnailStage({ scene, spinning }: { scene: Group; spinning: boolean }) {
  const spin = useRef<Group>(null);
  const { camera, size, invalidate } = useThree();
  const bounds = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(scene);
    return { box, center: box.isEmpty() ? new Vector3() : box.getCenter(new Vector3()) };
  }, [scene]);
  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera) || !size.width || !size.height || bounds.box.isEmpty()) return;
    const direction = new Vector3(1, 0.7, 1).normalize();
    const inverseView = new Matrix4().lookAt(direction, new Vector3(), new Vector3(0, 1, 0)).invert();
    const vertical = Math.tan(camera.fov * Math.PI / 360);
    const horizontal = vertical * size.width / size.height;
    let distance = 0;
    for (let i = 0; i < 72; i++) {
      const angle = i * Math.PI / 36;
      for (const x of [bounds.box.min.x, bounds.box.max.x]) for (const y of [bounds.box.min.y, bounds.box.max.y]) for (const z of [bounds.box.min.z, bounds.box.max.z]) {
        const corner = new Vector3(x, y, z).sub(bounds.center).applyAxisAngle(new Vector3(0, 1, 0), angle).applyMatrix4(inverseView);
        distance = Math.max(distance, Math.abs(corner.x) / horizontal + corner.z, Math.abs(corner.y) / vertical + corner.z);
      }
    }
    distance = Math.max(distance * 1.12, 0.001);
    camera.position.copy(bounds.center).addScaledVector(direction, distance);
    setCameraClipping(camera, distance);
    camera.lookAt(bounds.center);
    camera.updateProjectionMatrix();
    invalidate();
  }, [bounds, camera, size.width, size.height, invalidate]);
  useFrame((_, delta) => { if (spinning && spin.current) spin.current.rotation.y += Math.min(delta, 0.1) * 0.3; });
  const center = bounds.center;
  return <><ambientLight intensity={1.2} /><directionalLight position={[5, 10, 7]} intensity={2.5} /><group position={center} ref={spin}><group position={[-center.x, -center.y, -center.z]}><primitive object={scene} /></group></group><ModelGrid scene={scene} /></>;
}
