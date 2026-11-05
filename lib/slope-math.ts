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

export type SlopeParams = SlopeParameters;
export type CalculationResult = SlopeGeometry;

const SLICE_COUNT = 8;
const ARC_POINT_COUNT = 96;

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
