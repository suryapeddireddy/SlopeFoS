export interface SlopeParameters {
  height: number;
  faceAngle: number;
  crestWidth: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SlopeSlice {
  index: number;
  xStart: number;
  xEnd: number;
  surfaceStart: number;
  surfaceEnd: number;
  baseStart: number;
  baseEnd: number;
  width: number;
  area: number;
  averageHeight: number;
  baseAngle: number;
}

export interface SlopeGeometry {
  faceRun: number;
  crestEnd: number;
  center: Point;
  radius: number;
  slipArc: Point[];
  slices: SlopeSlice[];
}

export interface StabilityParameters {
  slices: readonly SlopeSlice[];
  cohesion: number;
  frictionAngle: number;
  unitWeight: number;
  porePressure: number;
}

export interface StabilitySlice extends SlopeSlice {
  weight: number;
  baseNormalForce: number;
  drivingForce: number;
  resistingForce: number;
}

export interface StabilityResult {
  factorOfSafety: number;
  totalDrivingForce: number;
  totalResistingForce: number;
  iterations: number;
  slices: StabilitySlice[];
}

export type SlopeParams = SlopeParameters;
export type CalculationResult = SlopeGeometry;

const SLICE_COUNT = 8;
const ARC_POINT_COUNT = 96;
const BISHOP_MAX_ITERATIONS = 1000;
const BISHOP_TOLERANCE = 1e-8;

function surfaceElevation(x: number, height: number, faceRun: number): number {
  return x < faceRun ? (x / faceRun) * height : height;
}

export function calculateSlopeGeometry(
  parameters: SlopeParameters,
): SlopeGeometry {
  const { height, faceAngle, crestWidth } = parameters;
  if (
    !Number.isFinite(height) ||
    !Number.isFinite(faceAngle) ||
    !Number.isFinite(crestWidth) ||
    height <= 0 ||
    faceAngle <= 0 ||
    faceAngle >= 90 ||
    crestWidth <= 0
  ) {
    throw new RangeError(
      "Height and crest width must be positive, and face angle must be between 0 and 90 degrees.",
    );
  }

  const faceRun = height / Math.tan((faceAngle * Math.PI) / 180);
  const crestEnd = faceRun + crestWidth;
  if (!Number.isFinite(faceRun) || !Number.isFinite(crestEnd) || crestEnd <= 0) {
    throw new RangeError("Slope dimensions exceed the supported numeric range.");
  }

  const centerX = Math.min(
    -height * 0.5,
    (crestEnd * crestEnd - height * height) / (2 * crestEnd) -
      height * 0.05,
  );
  const centerY =
    (crestEnd * crestEnd - 2 * crestEnd * centerX + height * height) /
    (2 * height);
  const center = { x: centerX, y: centerY };
  const radius = Math.hypot(centerX, centerY);
  if (
    !Number.isFinite(centerY) ||
    !Number.isFinite(radius) ||
    !Number.isFinite(radius * radius)
  ) {
    throw new RangeError("Slope dimensions exceed the supported numeric range.");
  }

  const startAngle = Math.atan2(-centerY, -centerX);
  const endAngle = Math.atan2(height - centerY, crestEnd - centerX);
  const angleSweep = (endAngle - startAngle + 2 * Math.PI) % (2 * Math.PI);

  const slipArc = Array.from({ length: ARC_POINT_COUNT + 1 }, (_, index) => {
    const angle = startAngle + (angleSweep * index) / ARC_POINT_COUNT;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const slipElevation = (x: number): number => {
    const radicand = radius * radius - (x - centerX) ** 2;
    return centerY - Math.sqrt(Math.max(0, radicand));
  };
  const sliceWidth = crestEnd / SLICE_COUNT;
  const slices = Array.from({ length: SLICE_COUNT }, (_, index) => {
    const xStart = index * sliceWidth;
    const xEnd = (index + 1) * sliceWidth;
    const midpoint = (xStart + xEnd) / 2;
    const surfaceStart = surfaceElevation(xStart, height, faceRun);
    const surfaceMidpoint = surfaceElevation(midpoint, height, faceRun);
    const surfaceEnd = surfaceElevation(xEnd, height, faceRun);
    const baseStart = slipElevation(xStart);
    const baseMidpoint = slipElevation(midpoint);
    const baseEnd = slipElevation(xEnd);
    const midpointHeight = surfaceMidpoint - baseMidpoint;
    const area =
      (sliceWidth / 6) *
      ((surfaceStart - baseStart) +
        4 * midpointHeight +
        (surfaceEnd - baseEnd));
    const tangent = Math.sqrt(
      Math.max(0, radius * radius - (midpoint - centerX) ** 2),
    );

    return {
      index: index + 1,
      xStart,
      xEnd,
      surfaceStart,
      surfaceEnd,
      baseStart,
      baseEnd,
      width: sliceWidth,
      area,
      averageHeight: area / sliceWidth,
      baseAngle: (Math.atan2(midpoint - centerX, tangent) * 180) / Math.PI,
    };
  });

  return { faceRun, crestEnd, center, radius, slipArc, slices };
}

function validateStabilityParameters(parameters: StabilityParameters): void {
  const { slices, cohesion, frictionAngle, unitWeight, porePressure } =
    parameters;
  if (
    !Number.isFinite(cohesion) ||
    cohesion < 0 ||
    !Number.isFinite(frictionAngle) ||
    frictionAngle < 0 ||
    frictionAngle >= 90 ||
    !Number.isFinite(unitWeight) ||
    unitWeight <= 0 ||
    !Number.isFinite(porePressure) ||
    porePressure < 0 ||
    slices.length === 0
  ) {
    throw new RangeError("Material parameters and slices must be valid.");
  }

  for (const slice of slices) {
    if (
      !Number.isFinite(slice.area) ||
      slice.area < 0 ||
      !Number.isFinite(slice.width) ||
      slice.width <= 0 ||
      !Number.isFinite(slice.baseAngle)
    ) {
      throw new RangeError("Slice geometry must contain valid dimensions.");
    }
  }
}

function getSliceForces(
  parameters: StabilityParameters,
): Array<{
  slice: SlopeSlice;
  weight: number;
  baseLength: number;
  baseAngleRadians: number;
  effectiveNormalForce: number;
  drivingForce: number;
}> {
  return parameters.slices.map((slice) => {
    const baseAngleRadians = (slice.baseAngle * Math.PI) / 180;
    const weight = slice.area * parameters.unitWeight;
    const baseLength = slice.width / Math.cos(baseAngleRadians);
    const effectiveNormalForce =
      weight * Math.cos(baseAngleRadians) -
      parameters.porePressure * baseLength;

    if (effectiveNormalForce < 0) {
      throw new RangeError(
        "Pore pressure exceeds the slice base normal force.",
      );
    }

    return {
      slice,
      weight,
      baseLength,
      baseAngleRadians,
      effectiveNormalForce,
      drivingForce: weight * Math.sin(baseAngleRadians),
    };
  });
}

function getDrivingForce(
  sliceForces: ReturnType<typeof getSliceForces>,
): number {
  const drivingForce = sliceForces.reduce(
    (total, slice) => total + slice.drivingForce,
    0,
  );
  if (!Number.isFinite(drivingForce) || drivingForce <= 0) {
    throw new RangeError("The slices must produce a positive driving force.");
  }
  return drivingForce;
}

export function calculateFelleniusFoS(
  parameters: StabilityParameters,
): StabilityResult {
  validateStabilityParameters(parameters);
  const sliceForces = getSliceForces(parameters);
  const totalDrivingForce = getDrivingForce(sliceForces);
  const frictionRadians = (parameters.frictionAngle * Math.PI) / 180;
  const slices = sliceForces.map(
    ({ slice, weight, baseLength, effectiveNormalForce, drivingForce }) => {
      const resistingForce =
        parameters.cohesion * baseLength +
        effectiveNormalForce * Math.tan(frictionRadians);

      return {
        ...slice,
        weight,
        baseNormalForce: effectiveNormalForce,
        drivingForce,
        resistingForce,
      };
    },
  );
  const totalResistingForce = slices.reduce(
    (total, slice) => total + slice.resistingForce,
    0,
  );
  const factorOfSafety = totalResistingForce / totalDrivingForce;
  if (!Number.isFinite(factorOfSafety) || factorOfSafety < 0) {
    throw new RangeError("The Fellenius factor of safety is invalid.");
  }

  return {
    factorOfSafety,
    totalDrivingForce,
    totalResistingForce,
    iterations: 0,
    slices,
  };
}

export function calculateBishopsFoS(
  parameters: StabilityParameters,
): StabilityResult {
  validateStabilityParameters(parameters);
  const sliceForces = getSliceForces(parameters);
  const totalDrivingForce = getDrivingForce(sliceForces);
  const tangentFriction = Math.tan(
    (parameters.frictionAngle * Math.PI) / 180,
  );
  const felleniusResult = calculateFelleniusFoS(parameters);
  if (felleniusResult.factorOfSafety === 0) {
    return felleniusResult;
  }
  let factorOfSafety = felleniusResult.factorOfSafety;
  let iterations = 0;
  let converged = false;

  for (iterations = 1; iterations <= BISHOP_MAX_ITERATIONS; iterations += 1) {
    const totalResistingForce = sliceForces.reduce((total, sliceForce) => {
      const mAlpha =
        Math.cos(sliceForce.baseAngleRadians) +
        (Math.sin(sliceForce.baseAngleRadians) * tangentFriction) /
          factorOfSafety;
      if (!Number.isFinite(mAlpha) || mAlpha <= 0) {
        throw new RangeError(
          "Bishop's method produced a non-positive slice equilibrium factor.",
        );
      }

      const effectiveWeight =
        sliceForce.weight -
        parameters.porePressure * sliceForce.slice.width;
      return (
        total +
        (parameters.cohesion * sliceForce.slice.width +
          effectiveWeight * tangentFriction) /
          mAlpha
      );
    }, 0);
    const nextFactorOfSafety = totalResistingForce / totalDrivingForce;
    if (!Number.isFinite(nextFactorOfSafety) || nextFactorOfSafety <= 0) {
      throw new RangeError("Bishop's factor of safety is not positive.");
    }
    if (
      Math.abs(nextFactorOfSafety - factorOfSafety) <=
      BISHOP_TOLERANCE * Math.max(1, Math.abs(nextFactorOfSafety))
    ) {
      factorOfSafety = nextFactorOfSafety;
      converged = true;
      break;
    }
    factorOfSafety = nextFactorOfSafety;
  }

  if (!converged) {
    throw new RangeError(
      "Bishop's method did not converge for the supplied parameters.",
    );
  }

  const slices = sliceForces.map(
    ({ slice, weight, baseAngleRadians, drivingForce }) => {
      const mAlpha =
        Math.cos(baseAngleRadians) +
        (Math.sin(baseAngleRadians) * tangentFriction) / factorOfSafety;
      const effectiveWeight =
        weight - parameters.porePressure * slice.width;
      const baseNormalForce = effectiveWeight / mAlpha;
      const resistingForce =
        (parameters.cohesion * slice.width +
          effectiveWeight * tangentFriction) /
        mAlpha;

      return {
        ...slice,
        weight,
        baseNormalForce,
        drivingForce,
        resistingForce,
      };
    },
  );
  const totalResistingForce = slices.reduce(
    (total, slice) => total + slice.resistingForce,
    0,
  );

  return {
    factorOfSafety,
    totalDrivingForce,
    totalResistingForce,
    iterations,
    slices,
  };
}
