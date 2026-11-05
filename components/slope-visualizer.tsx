"use client";

import type { CalculationResult, SlopeParams } from "@/lib/slope-math";

interface SlopeVisualizerProps {
  params: SlopeParams;
  result: CalculationResult;
}

const SVG_WIDTH = 900;
const SVG_HEIGHT = 500;
const PLOT = { left: 58, right: 28, top: 28, bottom: 56 };

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

export default function SlopeVisualizer({
  params,
  result,
}: SlopeVisualizerProps) {
  const { height, faceAngle } = params;
  const { center, crestEnd, faceRun, radius, slices, slipArc } = result;
  const plotWidth = SVG_WIDTH - PLOT.left - PLOT.right;
  const plotHeight = SVG_HEIGHT - PLOT.top - PLOT.bottom;
  const showCenter = Math.abs(center.x) <= height * 0.65;
  const xMin = showCenter ? Math.min(0, center.x - height * 0.1) : -height * 0.08;
  const xMax = crestEnd + height * 0.12;
  const yMin = Math.min(0, ...slipArc.map((point) => point.y)) - height * 0.08;
  const yMax =
    Math.max(height, ...(showCenter ? [center.y] : [])) + height * 0.12;
  const scale = Math.min(plotWidth / (xMax - xMin), plotHeight / (yMax - yMin));
  const contentWidth = (xMax - xMin) * scale;
  const contentHeight = (yMax - yMin) * scale;
  const offsetX = PLOT.left + (plotWidth - contentWidth) / 2;
  const offsetY = PLOT.top + (plotHeight - contentHeight) / 2;
  const xToSvg = (x: number): number => offsetX + (x - xMin) * scale;
  const yToSvg = (y: number): number => offsetY + (yMax - y) * scale;
  const line = (points: { x: number; y: number }[]): string =>
    points
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${xToSvg(point.x).toFixed(2)} ${yToSvg(point.y).toFixed(2)}`,
      )
      .join(" ");
  const surfacePath = [
    { x: 0, y: 0 },
    { x: faceRun, y: height },
    { x: crestEnd, y: height },
  ];
  const groundFillPath = [
    ...surfacePath,
    { x: crestEnd, y: 0 },
    { x: 0, y: 0 },
  ];
  const gridLines = Array.from(
    { length: Math.floor((SVG_WIDTH - 1) / 32) },
    (_, index) => (index + 1) * 32,
  );
  const horizontalGridLines = Array.from(
    { length: Math.floor((SVG_HEIGHT - 1) / 32) },
    (_, index) => (index + 1) * 32,
  );

  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14]">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Slope cross-section
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Scaled geometry · dimensions in metres
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-slate-100" />
            Ground profile
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 bg-amber-500" />
            Slip circle arc
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 border-t border-dashed border-cyan-300" />
            Slice boundaries
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-4 border-t border-dashed border-rose-400" />
            Alternating slices
          </span>
        </div>
      </figcaption>
      <svg
        aria-label={`Slope cross-section with height ${formatNumber(height)} metres, face angle ${formatNumber(faceAngle)} degrees, crest width ${formatNumber(params.crestWidth)} metres, slip circle centre at ${formatNumber(center.x)}, ${formatNumber(center.y)} metres, and radius ${formatNumber(radius)} metres`}
        className="block h-auto w-full"
        role="img"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      >
        <rect
          fill="#0B0E14"
          height={SVG_HEIGHT}
          width={SVG_WIDTH}
          x="0"
          y="0"
        />
        <g aria-hidden="true" stroke="#1B2431" strokeWidth="1">
          {gridLines.map((x) => (
            <line key={`v-${x}`} x1={x} x2={x} y1="0" y2={SVG_HEIGHT} />
          ))}
          {horizontalGridLines.map((y) => (
            <line key={`h-${y}`} x1="0" x2={SVG_WIDTH} y1={y} y2={y} />
          ))}
        </g>
        <path
          d={line(groundFillPath) + " Z"}
          fill="#17212A"
          fillOpacity="0.84"
        />
        <g>
          {slices.map((slice) => (
            <path
              key={slice.index}
              d={line([
                { x: slice.xStart, y: slice.surfaceStart },
                { x: slice.xEnd, y: slice.surfaceEnd },
                { x: slice.xEnd, y: slice.baseEnd },
                { x: slice.xStart, y: slice.baseStart },
              ]) + " Z"}
              fill={slice.index % 2 === 0 ? "#0E7490" : "#9F1239"}
              fillOpacity="0.13"
              stroke={slice.index % 2 === 0 ? "#67E8F9" : "#FB7185"}
              strokeDasharray="3 5"
              strokeOpacity="0.32"
              strokeWidth="1"
            />
          ))}
        </g>
        <path
          d={line(surfacePath)}
          fill="none"
          stroke="#CBD5E1"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path
          d={line(slipArc)}
          fill="none"
          stroke="#F59E0B"
          strokeLinecap="round"
          strokeWidth="3"
        />
        {showCenter && (
          <line
            stroke="#F59E0B"
            strokeDasharray="4 5"
            strokeOpacity="0.55"
            strokeWidth="1"
            x1={xToSvg(center.x)}
            x2={xToSvg(slipArc[0].x)}
            y1={yToSvg(center.y)}
            y2={yToSvg(slipArc[0].y)}
          />
        )}
        <line
          stroke="#64748B"
          strokeWidth="1"
          x1={xToSvg(0)}
          x2={xToSvg(crestEnd)}
          y1={yToSvg(0)}
          y2={yToSvg(0)}
        />
        {showCenter && (
          <g aria-label="Slip circle center">
            <circle
              cx={xToSvg(center.x)}
              cy={yToSvg(center.y)}
              fill="#0B0E14"
              r="4"
              stroke="#F59E0B"
              strokeWidth="1.5"
            />
            <line
              stroke="#F59E0B"
              strokeWidth="1"
              x1={xToSvg(center.x) - 7}
              x2={xToSvg(center.x) + 7}
              y1={yToSvg(center.y)}
              y2={yToSvg(center.y)}
            />
            <line
              stroke="#F59E0B"
              strokeWidth="1"
              x1={xToSvg(center.x)}
              x2={xToSvg(center.x)}
              y1={yToSvg(center.y) - 7}
              y2={yToSvg(center.y) + 7}
            />
            <text
              fill="#FBBF24"
              fontSize="11"
              x={xToSvg(center.x) + 9}
              y={yToSvg(center.y) - 9}
            >
              Centre ({formatNumber(center.x)}, {formatNumber(center.y)})
            </text>
          </g>
        )}
        <g
          fill="#94A3B8"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="11"
        >
          <text textAnchor="middle" x={xToSvg(0)} y={yToSvg(0) + 22}>
            TOE
          </text>
          <text
            textAnchor="middle"
            x={xToSvg(faceRun)}
            y={yToSvg(height) - 12}
          >
            FACE
          </text>
          <text
            textAnchor="middle"
            x={xToSvg(crestEnd)}
            y={yToSvg(height) - 12}
          >
            CREST
          </text>
          <text x="18" y="24">
            ELEVATION
          </text>
          <text textAnchor="end" x={SVG_WIDTH - 18} y={SVG_HEIGHT - 14}>
            DISTANCE →
          </text>
        </g>
        <text
          fill="#FBBF24"
          fontFamily="var(--font-geist-mono), monospace"
          fontSize="11"
          x={SVG_WIDTH - 18}
          y="24"
          textAnchor="end"
        >
          C = ({formatNumber(center.x)}, {formatNumber(center.y)}) m · R ={" "}
          {formatNumber(radius)} m
        </text>
      </svg>
    </figure>
  );
}
