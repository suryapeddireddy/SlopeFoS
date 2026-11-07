import {
  calculateBishopsFoS,
  calculateFelleniusFoS,
  calculateSlopeGeometry,
  type Point,
  type SlopeGeometry,
  type SlopeParameters,
  type StabilityParameters,
  type StabilityResult,
} from "@/lib/slope-math";

export type CriticalSearchMethod = "fellenius" | "bishop";

export interface CriticalSlipSearchParameters {
  slope: SlopeParameters;
  material: Omit<StabilityParameters, "slices">;
  method: CriticalSearchMethod;
  signal?: AbortSignal;
}

export interface CriticalSlipSearchResult {
  geometry: SlopeGeometry;
  stability: StabilityResult;
  method: CriticalSearchMethod;
  testedCircles: number;
}

const GRID_SIZE = 17;
const SLICE_COUNT = 8;
const ARC_POINT_COUNT = 96;
const YIELD_INTERVAL = 128;
const ROOT_TOLERANCE = 1e-7;

interface CircleIntersection extends Point {
  segment: "face" | "crest";
}

function getGroundElevation(
  x: number,
  height: number,
  faceRun: number,
): number {
  return x < faceRun ? (x / faceRun) * height : height;
}

function getGroundIntersections(
  center: Point,
  radius: number,
  height: number,
  faceRun: number,
  crestEnd: number,
): CircleIntersection[] {
  const intersections: CircleIntersection[] = [];
  const segments = [
    { start: 0, end: faceRun, slope: height / faceRun, intercept: 0, name: "face" as const },
    { start: faceRun, end: crestEnd, slope: 0, intercept: height, name: "crest" as const },
  ];

  for (const segment of segments) {
    const { slope, intercept } = segment;
    const a = 1 + slope * slope;
    const b =
      2 * (slope * (intercept - center.y) - center.x);
    const c =
      center.x * center.x +
      (intercept - center.y) * (intercept - center.y) -
      radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      continue;
    }

    const root = Math.sqrt(discriminant);
    for (const x of [(-b - root) / (2 * a), (-b + root) / (2 * a)]) {
      if (
        x < segment.start - ROOT_TOLERANCE ||
        x > segment.end + ROOT_TOLERANCE
      ) {
        continue;
      }

      const boundedX = Math.min(segment.end, Math.max(segment.start, x));
      const groundY = slope * boundedX + intercept;
      const radicand = radius * radius - (boundedX - center.x) ** 2;
      if (radicand < 0) {
        continue;
      }
      const circleY = center.y - Math.sqrt(radicand);
      if (Math.abs(circleY - groundY) <= ROOT_TOLERANCE * Math.max(1, height)) {
        intersections.push({
          x: boundedX,
          y: groundY,
          segment: segment.name,
        });
      }
    }
  }

  return intersections.sort((left, right) => left.x - right.x);
}

function buildCandidateGeometry(
  slope: SlopeParameters,
  faceRun: number,
  crestEnd: number,
  center: Point,
  radius: number,
): SlopeGeometry | null {
  const intersections = getGroundIntersections(
    center,
    radius,
    slope.height,
    faceRun,
    crestEnd,
  );
  const left = intersections.find((point) => point.segment === "face");
  const right = intersections.findLast((point) => point.segment === "crest");
  if (!left || !right || right.x - left.x <= ROOT_TOLERANCE) {
    return null;
  }

  const slipElevation = (x: number): number => {
    const radicand = radius * radius - (x - center.x) ** 2;
    return center.y - Math.sqrt(Math.max(0, radicand));
  };
  const sliceWidth = (right.x - left.x) / SLICE_COUNT;
  const slices = Array.from({ length: SLICE_COUNT }, (_, index) => {
    const xStart = left.x + index * sliceWidth;
    const xEnd = index === SLICE_COUNT - 1 ? right.x : xStart + sliceWidth;
    const midpoint = (xStart + xEnd) / 2;
    const surfaceStart = getGroundElevation(xStart, slope.height, faceRun);
    const surfaceMidpoint = getGroundElevation(
      midpoint,
      slope.height,
      faceRun,
    );
    const surfaceEnd = getGroundElevation(xEnd, slope.height, faceRun);
    const baseStart = slipElevation(xStart);
    const baseMidpoint = slipElevation(midpoint);
    const baseEnd = slipElevation(xEnd);
    const startHeight = surfaceStart - baseStart;
    const midpointHeight = surfaceMidpoint - baseMidpoint;
    const endHeight = surfaceEnd - baseEnd;
    if (
      startHeight < -ROOT_TOLERANCE ||
      midpointHeight <= 0 ||
      endHeight < -ROOT_TOLERANCE
    ) {
      return null;
    }

    const width = xEnd - xStart;
    const area =
      (width / 6) *
      (Math.max(0, startHeight) +
        4 * midpointHeight +
        Math.max(0, endHeight));
    const tangent = Math.sqrt(
      Math.max(0, radius * radius - (midpoint - center.x) ** 2),
    );

    return {
      index: index + 1,
      xStart,
      xEnd,
      surfaceStart,
      surfaceEnd,
      baseStart,
      baseEnd,
      width,
      area,
      averageHeight: area / width,
      baseAngle: (Math.atan2(midpoint - center.x, tangent) * 180) / Math.PI,
    };
  });
  if (slices.some((slice) => slice === null)) {
    return null;
  }

  const slipArc = Array.from({ length: ARC_POINT_COUNT + 1 }, (_, index) => {
    const x = left.x + ((right.x - left.x) * index) / ARC_POINT_COUNT;
    return { x, y: slipElevation(x) };
  });

  return {
    faceRun,
    crestEnd,
    center,
    radius,
    slipArc,
    slices: slices.filter((slice) => slice !== null),
  };
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function validateMaterial(
  material: CriticalSlipSearchParameters["material"],
): void {
  if (
    !Number.isFinite(material.cohesion) ||
    material.cohesion < 0 ||
    !Number.isFinite(material.frictionAngle) ||
    material.frictionAngle < 0 ||
    material.frictionAngle >= 90 ||
    !Number.isFinite(material.unitWeight) ||
    material.unitWeight <= 0 ||
    !Number.isFinite(material.porePressure) ||
    material.porePressure < 0
  ) {
    throw new RangeError("Material parameters must be valid for the search.");
  }
}

export async function findCriticalSlipCircle(
  params: CriticalSlipSearchParameters,
): Promise<CriticalSlipSearchResult> {
  const { slope, material, method } = params;
  const baseGeometry = calculateSlopeGeometry(slope);
  validateMaterial(material);

  const xMin = -slope.height;
  const xMax = baseGeometry.crestEnd + slope.height;
  const yMin = slope.height * 0.5;
  const yMax = slope.height * 2.5;
  const radiusMin = slope.height * 0.5;
  const radiusMax = Math.hypot(xMax - xMin, yMax);
  const gridValues = (minimum: number, maximum: number): number[] =>
    Array.from(
      { length: GRID_SIZE },
      (_, index) => minimum + ((maximum - minimum) * index) / (GRID_SIZE - 1),
    );
  const centerXs = gridValues(xMin, xMax);
  const centerYs = gridValues(yMin, yMax);
  const radii = gridValues(radiusMin, radiusMax);
  let testedCircles = 0;
  let bestResult: Omit<CriticalSlipSearchResult, "testedCircles"> | null = null;

  for (const centerX of centerXs) {
    for (const centerY of centerYs) {
      for (const radius of radii) {
        testedCircles += 1;
        if (testedCircles % YIELD_INTERVAL === 0) {
          await yieldToBrowser();
          if (params.signal?.aborted) {
            throw new Error("Critical slip circle search was cancelled.");
          }
        }

        const center = { x: centerX, y: centerY };
        const geometry = buildCandidateGeometry(
          slope,
          baseGeometry.faceRun,
          baseGeometry.crestEnd,
          center,
          radius,
        );
        if (!geometry) {
          continue;
        }

        try {
          const stabilityParameters: StabilityParameters = {
            ...material,
            slices: geometry.slices,
          };
          const stability =
            method === "bishop"
              ? calculateBishopsFoS(stabilityParameters)
              : calculateFelleniusFoS(stabilityParameters);
          if (
            !bestResult ||
            stability.factorOfSafety < bestResult.stability.factorOfSafety
          ) {
            bestResult = { geometry, stability, method };
          }
        } catch (error) {
          if (!(error instanceof RangeError)) {
            throw error;
          }
        }
      }
    }
  }

  if (!bestResult) {
    throw new RangeError(
      "No valid slip circles were found for the current slope and material inputs.",
    );
  }
  return { ...bestResult, testedCircles };
}
