import type { Point, SlopeParameters } from "@/lib/slope-math";

export type ReferenceCalculationMethod = "fellenius" | "bishop";

export interface FoSTarget {
  value: number;
  minimum: number;
  maximum: number;
}

export interface ReferenceCase {
  id: string;
  name: string;
  description: string;
  slope: SlopeParameters;
  material: {
    cohesion: number;
    frictionAngle: number;
    unitWeight: number;
  };
  waterTable: {
    description: string;
    basePorePressure: number;
  };
  trialCircle: {
    center: Point;
    radius: number;
  };
  targets: Record<ReferenceCalculationMethod, FoSTarget>;
}

export const REFERENCE_CASES: readonly ReferenceCase[] = [
  {
    id: "undrained-clay",
    name: "Homogeneous Undrained Clay Slope",
    description:
      "Homogeneous total-stress clay with zero friction angle and a dry slope.",
    slope: { height: 10, faceAngle: 45, crestWidth: 5 },
    material: { cohesion: 40, frictionAngle: 0, unitWeight: 18 },
    waterTable: {
      description: "Dry; no pore pressure at the slip surface.",
      basePorePressure: 0,
    },
    trialCircle: {
      center: { x: -5, y: 23.75 },
      radius: 24.270609798684504,
    },
    targets: {
      fellenius: { value: 1.6465, minimum: 1.6265, maximum: 1.6665 },
      bishop: { value: 1.6465, minimum: 1.6265, maximum: 1.6665 },
    },
  },
  {
    id: "drained-friction-cohesion",
    name: "Drained Friction-Cohesion Slope",
    description:
      "Drained soil with both effective cohesion and friction, without pore pressure.",
    slope: { height: 15, faceAngle: 45, crestWidth: 8 },
    material: { cohesion: 10, frictionAngle: 30, unitWeight: 20 },
    waterTable: {
      description: "Dry; no pore pressure at the slip surface.",
      basePorePressure: 0,
    },
    trialCircle: {
      center: { x: -7.5, y: 36.63333333333333 },
      radius: 37.393196053708905,
    },
    targets: {
      fellenius: { value: 1.146, minimum: 1.126, maximum: 1.166 },
      bishop: { value: 1.1786, minimum: 1.1586, maximum: 1.1986 },
    },
  },
  {
    id: "high-water-table",
    name: "High Water Table / Pore-Pressure Slope",
    description:
      "Drained soil with elevated uniform pore pressure acting along the trial base.",
    slope: { height: 12, faceAngle: 50, crestWidth: 6 },
    material: { cohesion: 12, frictionAngle: 28, unitWeight: 19 },
    waterTable: {
      description:
        "High water table represented by 8 kPa uniform base pore pressure.",
      basePorePressure: 8,
    },
    trialCircle: {
      center: { x: -6, y: 24.793724720378446 },
      radius: 25.509386223700197,
    },
    targets: {
      fellenius: { value: 0.9724, minimum: 0.9524, maximum: 0.9924 },
      bishop: { value: 1.0033, minimum: 0.9833, maximum: 1.0233 },
    },
  },
];
