"use client";

import dynamic from "next/dynamic";
import type { Part } from "@/lib/cad/types";

const Viewport = dynamic(() => import("@/components/cad/viewport"), { ssr: false });
const initialView = { preset: "iso" as const, nonce: 0, immediate: true };

/** Non-interactive preview of the same assembly used in the project workspace. */
export function ModelThumbnail({ parts, name }: { parts: Part[]; name: string }) {
  return (
    <div role="img" aria-label={`${name} model preview`} className="pointer-events-none h-full w-full bg-[#0d131c]">
      <Viewport parts={parts} selectedId={null} onSelect={() => undefined} mode="solid" tool="select" showGrid showShadows={false} viewRequest={initialView} onTransform={() => undefined} onReady={() => undefined} pickable={false} showGizmo={false} />
    </div>
  );
}
