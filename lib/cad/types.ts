// Parametric primitive model. Geometry is a mesh built from box / cylinder / sphere primitives in millimetres.
// This is NOT a B-rep CAD kernel: there are no booleans, fillets, sketches or exact solids.
export type PartKind = "group" | "box" | "cylinder" | "sphere";
export type Vec3 = [number, number, number];
export interface Material { color: string; metalness: number; roughness: number; opacity: number }
export interface Part {
  id: string;
  parentId: string | null;
  name: string;
  kind: PartKind;
  params: Record<string, number>;   // box {w,h,d}  cylinder {r,h}  sphere {r}   (mm)
  position: Vec3;                   // mm, relative to parent
  rotation: Vec3;                   // degrees (XYZ), relative to parent
  material: Material;
  visible: boolean;
  subsystemId: string | null;
  subsystemName?: string;           // only on the built-in sample, resolved to an id when the project has that subsystem
}

export type DisplayMode = "solid" | "wireframe" | "edges";
export type Tool = "select" | "move" | "rotate";
export type ViewPreset = "front" | "side" | "top" | "iso";
export type Unit = "mm" | "cm" | "in";
