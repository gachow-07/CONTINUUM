import { newId } from "./ops";
import type { Material, Part, PartKind, Vec3 } from "./types";

// Demonstration assembly: a 1/10-scale RC buggy built from primitives. Nose points along +Z, right side is +X, up is +Y (millimetres).
// It is illustrative geometry, not a real design or verified dimensions.
const M: Record<string, Material> = {
  carbon: { color: "#343a44", metalness: 0.35, roughness: 0.5, opacity: 1 },
  alu: { color: "#b9c2cd", metalness: 0.9, roughness: 0.3, opacity: 1 },
  steel: { color: "#8b95a3", metalness: 0.95, roughness: 0.38, opacity: 1 },
  anod: { color: "#3b78c4", metalness: 0.8, roughness: 0.34, opacity: 1 },
  rubber: { color: "#272b31", metalness: 0, roughness: 0.9, opacity: 1 },
  plastic: { color: "#454d5a", metalness: 0.1, roughness: 0.6, opacity: 1 },
  copper: { color: "#b87333", metalness: 0.85, roughness: 0.4, opacity: 1 },
  shell: { color: "#dfe7f1", metalness: 0.1, roughness: 0.3, opacity: 0.22 },
};

export function createSampleAssembly(): Part[] {
  const parts: Part[] = [];
  const add = (name: string, kind: PartKind, parentId: string | null, params: Record<string, number>, position: Vec3, mat: Material, opts: { rotation?: Vec3; subsystem?: string; visible?: boolean } = {}) => {
    const p: Part = { id: newId(), parentId, name, kind, params, position, rotation: opts.rotation ?? [0, 0, 0], material: { ...mat }, visible: opts.visible ?? true, subsystemId: null, subsystemName: opts.subsystem };
    parts.push(p);
    return p.id;
  };
  const group = (name: string, parentId: string | null, position: Vec3, subsystem?: string, visible = true) => add(name, "group", parentId, {}, position, M.plastic, { subsystem, visible });
  const LAT: Vec3 = [0, 0, 90]; // cylinder axis along X
  const LONG: Vec3 = [90, 0, 0]; // cylinder axis along Z

  const chassis = group("Chassis", null, [0, 0, 0], "Chassis");
  add("Chassis plate", "box", chassis, { w: 120, h: 4, d: 330 }, [0, 32, 0], M.carbon);
  add("Battery tray", "box", chassis, { w: 52, h: 22, d: 110 }, [0, 45, -10], M.plastic);
  add("Side rail (left)", "box", chassis, { w: 4, h: 14, d: 300 }, [-62, 40, 0], M.alu);
  add("Side rail (right)", "box", chassis, { w: 4, h: 14, d: 300 }, [62, 40, 0], M.alu);
  add("Front bumper", "box", chassis, { w: 150, h: 18, d: 12 }, [0, 34, 178], M.plastic);
  add("Rear brace", "box", chassis, { w: 140, h: 22, d: 10 }, [0, 38, -175], M.plastic);
  add("Front shock tower", "box", chassis, { w: 110, h: 40, d: 8 }, [0, 52, 110], M.carbon);
  add("Rear shock tower", "box", chassis, { w: 110, h: 40, d: 8 }, [0, 52, -120], M.carbon);

  const susp = group("Suspension", null, [0, 0, 0], "Suspension");
  const wheels = group("Wheels", null, [0, 0, 0]);
  for (const sf of [1, -1]) for (const sl of [-1, 1]) {
    const corner = `${sf > 0 ? "Front" : "Rear"} ${sl < 0 ? "left" : "right"}`;
    const z = sf * 135;
    const g = group(`${corner} corner`, susp, [0, 0, 0], "Suspension");
    add("Lower arm", "box", g, { w: 60, h: 6, d: 10 }, [sl * 88, 36, z], M.alu);
    add("Upper arm", "box", g, { w: 50, h: 5, d: 8 }, [sl * 84, 70, z], M.alu, { rotation: [0, 0, -sl * 10] });
    add("Hub carrier", "box", g, { w: 10, h: 40, d: 16 }, [sl * 100, 52, z], M.anod);
    add("Coil-over shock", "cylinder", g, { r: 6, h: 55 }, [sl * 72, 62, z - sf * 7], M.anod, { rotation: [0, 0, sl * 25] });
    const w = group(`${corner} wheel`, wheels, [sl * 105, 55, z]);
    add("Tire", "cylinder", w, { r: 55, h: 45 }, [0, 0, 0], M.rubber, { rotation: LAT });
    add("Rim", "cylinder", w, { r: 36, h: 47 }, [0, 0, 0], M.alu, { rotation: LAT });
    add("Hub cap", "cylinder", w, { r: 10, h: 50 }, [0, 0, 0], M.steel, { rotation: LAT });
  }

  const steer = group("Steering", null, [0, 0, 0], "Steering");
  add("Servo", "box", steer, { w: 38, h: 20, d: 40 }, [0, 46, 138], M.carbon);
  add("Servo saver", "cylinder", steer, { r: 10, h: 6 }, [0, 58, 138], M.anod);
  add("Steering rack", "box", steer, { w: 150, h: 8, d: 10 }, [0, 40, 158], M.alu);
  add("Tie rod (left)", "cylinder", steer, { r: 2, h: 40 }, [-95, 42, 152], M.steel, { rotation: LAT });
  add("Tie rod (right)", "cylinder", steer, { r: 2, h: 40 }, [95, 42, 152], M.steel, { rotation: LAT });

  const drive = group("Drivetrain", null, [0, 0, 0], "Drivetrain");
  add("Motor", "cylinder", drive, { r: 18, h: 55 }, [30, 52, -60], M.copper, { rotation: LAT });
  add("Spur gear", "cylinder", drive, { r: 26, h: 6 }, [62, 52, -60], M.steel, { rotation: LAT });
  add("Center driveshaft", "cylinder", drive, { r: 5, h: 260 }, [0, 24, 0], M.steel, { rotation: LONG });
  add("Front differential", "sphere", drive, { r: 16 }, [0, 26, 118], M.anod);
  add("Rear differential", "sphere", drive, { r: 16 }, [0, 26, -118], M.anod);
  for (const sf of [1, -1]) for (const sl of [-1, 1]) add(`Axle shaft (${sf > 0 ? "front" : "rear"} ${sl < 0 ? "left" : "right"})`, "cylinder", drive, { r: 3, h: 70 }, [sl * 68, 53, sf * 135], M.steel, { rotation: LAT });

  const body = group("Body shell (hidden)", null, [0, 0, 0], undefined, false);
  add("Shell", "box", body, { w: 140, h: 40, d: 270 }, [0, 86, 0], M.shell);
  return parts;
}
