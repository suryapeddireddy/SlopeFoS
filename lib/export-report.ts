import type {
  SlopeGeometry,
  SlopeParameters,
  StabilityResult,
} from "@/lib/slope-math";

export type SlopeReportMethod = "fellenius" | "bishop";

export interface SlopeReportParameters {
  slope: SlopeParameters;
  material: {
    cohesion: number;
    frictionAngle: number;
    unitWeight: number;
    porePressure: number;
  };
  geometry: SlopeGeometry;
  criticalSearch?: {
    method: SlopeReportMethod;
    testedCircles: number;
  };
}

function formatNumber(value: number): string {
  return value.toFixed(3);
}

function getStabilityStatus(factorOfSafety: number): string {
  if (factorOfSafety < 1) {
    return "Unstable";
  }
  if (factorOfSafety <= 1.3) {
    return "Marginal";
  }
  return "Stable";
}

function getMethodName(method: SlopeReportMethod): string {
  return method === "bishop" ? "Bishop's Simplified" : "Fellenius";
}

export function generateSlopeReport(
  params: SlopeReportParameters,
  result: StabilityResult,
  method: SlopeReportMethod,
): string {
  const { geometry, material, slope, criticalSearch } = params;
  const arcStart = geometry.slipArc[0];
  const arcEnd = geometry.slipArc[geometry.slipArc.length - 1];
  const methodName = getMethodName(method);
  const reportLines = [
    "SLOPEFOS ENGINEERING REPORT",
    `Generated (UTC): ${new Date().toISOString()}`,
    "",
    "ANALYSIS SUMMARY",
    `Calculation method: ${methodName}`,
    `Factor of safety: ${formatNumber(result.factorOfSafety)}`,
    `Stability assessment: ${getStabilityStatus(result.factorOfSafety)}`,
    `Total resisting force: ${formatNumber(result.totalResistingForce)} kN/m`,
    `Total driving force: ${formatNumber(result.totalDrivingForce)} kN/m`,
    `Calculation iterations: ${result.iterations}`,
    "",
    "SLOPE PARAMETERS",
    `Height: ${formatNumber(slope.height)} m`,
    `Face angle: ${formatNumber(slope.faceAngle)} degrees`,
    `Crest width: ${formatNumber(slope.crestWidth)} m`,
    `Face run: ${formatNumber(geometry.faceRun)} m`,
    "",
    "MATERIAL AND WATER PARAMETERS",
    `Cohesion: ${formatNumber(material.cohesion)} kPa`,
    `Friction angle: ${formatNumber(material.frictionAngle)} degrees`,
    `Unit weight: ${formatNumber(material.unitWeight)} kN/m^3`,
    `Base pore pressure: ${formatNumber(material.porePressure)} kPa`,
    "",
    "SLIP CIRCLE",
    `Circle source: ${criticalSearch ? "Critical slip circle search" : "Current trial circle"}`,
    ...(criticalSearch
      ? [
          `Search method: ${getMethodName(criticalSearch.method)}`,
          `Circles tested: ${criticalSearch.testedCircles}`,
        ]
      : []),
    `Centre: (${formatNumber(geometry.center.x)}, ${formatNumber(geometry.center.y)}) m`,
    `Radius: ${formatNumber(geometry.radius)} m`,
    `Entry point: (${formatNumber(arcStart.x)}, ${formatNumber(arcStart.y)}) m`,
    `Exit point: (${formatNumber(arcEnd.x)}, ${formatNumber(arcEnd.y)}) m`,
    "",
    "SLICE BREAKDOWN (forces per unit width)",
    [
      "Slice",
      "X start (m)",
      "X end (m)",
      "Width (m)",
      "Average height (m)",
      "Area (m^2)",
      "Base angle (degrees)",
      "Weight (kN/m)",
      "Base normal (kN/m)",
      "Driving (kN/m)",
      "Resisting (kN/m)",
    ].join(" | "),
    ...result.slices.map((slice) =>
      [
        String(slice.index),
        formatNumber(slice.xStart),
        formatNumber(slice.xEnd),
        formatNumber(slice.width),
        formatNumber(slice.averageHeight),
        formatNumber(slice.area),
        formatNumber(slice.baseAngle),
        formatNumber(slice.weight),
        formatNumber(slice.baseNormalForce),
        formatNumber(slice.drivingForce),
        formatNumber(slice.resistingForce),
      ].join(" | "),
    ),
    "",
  ];

  return reportLines.join("\n");
}
