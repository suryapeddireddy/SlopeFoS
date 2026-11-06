"use client";

import { useMemo, useState } from "react";
import SlopeVisualizer from "@/components/slope-visualizer";
import {
  calculateBishopsFoS,
  calculateFelleniusFoS,
  calculateSlopeGeometry,
  type StabilityParameters,
  type StabilityResult,
  type SlopeParameters,
} from "@/lib/slope-math";

const INITIAL_PARAMETERS: SlopeParameters = {
  height: 20,
  faceAngle: 60,
  crestWidth: 8,
};

type MaterialParameters = Omit<StabilityParameters, "slices">;
type CalculationMethod = "fellenius" | "bishop";

const INITIAL_MATERIAL: MaterialParameters = {
  cohesion: 10,
  frictionAngle: 30,
  unitWeight: 20,
  porePressure: 0,
};

function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function getStabilityStatus(factorOfSafety: number): {
  label: string;
  className: string;
} {
  if (factorOfSafety < 1) {
    return {
      label: "Unstable",
      className: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    };
  }
  if (factorOfSafety <= 1.3) {
    return {
      label: "Marginal",
      className: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    };
  }
  return {
    label: "Stable",
    className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  };
}

export default function Home() {
  const [parameters, setParameters] =
    useState<SlopeParameters>(INITIAL_PARAMETERS);
  const [material, setMaterial] =
    useState<MaterialParameters>(INITIAL_MATERIAL);
  const [method, setMethod] = useState<CalculationMethod>("fellenius");
  const validationMessage =
    !Number.isFinite(parameters.height) ||
      parameters.height < 1 ||
      parameters.height > 500
      ? "Height must be between 1 and 500 metres."
      : !Number.isFinite(parameters.faceAngle) ||
          parameters.faceAngle < 1 ||
          parameters.faceAngle > 89
        ? "Face angle must be between 1 and 89 degrees."
        : !Number.isFinite(parameters.crestWidth) ||
            parameters.crestWidth < 0.5 ||
            parameters.crestWidth > 200
          ? "Crest width must be between 0.5 and 200 metres."
          : !Number.isFinite(material.cohesion) ||
              material.cohesion < 0 ||
              material.cohesion > 500
            ? "Cohesion must be between 0 and 500 kPa."
            : !Number.isFinite(material.frictionAngle) ||
                material.frictionAngle < 0 ||
                material.frictionAngle >= 90
              ? "Friction angle must be between 0 and 90 degrees."
              : !Number.isFinite(material.unitWeight) ||
                  material.unitWeight < 1 ||
                  material.unitWeight > 50
                ? "Unit weight must be between 1 and 50 kN/m³."
                : !Number.isFinite(material.porePressure) ||
                    material.porePressure < 0 ||
                    material.porePressure > 10000
                  ? "Pore pressure must be between 0 and 10,000 kPa."
                  : null;
  const analysis = useMemo(() => {
    if (validationMessage) {
      return null;
    }

    const geometry = calculateSlopeGeometry(parameters);
    const stabilityParameters: StabilityParameters = {
      ...material,
      slices: geometry.slices,
    };
    try {
      return {
        geometry,
        fellenius: calculateFelleniusFoS(stabilityParameters),
        bishop: calculateBishopsFoS(stabilityParameters),
        calculationError: null,
      };
    } catch (error) {
      if (error instanceof RangeError) {
        return {
          geometry,
          fellenius: null,
          bishop: null,
          calculationError: error.message,
        };
      }
      throw error;
    }
  }, [material, parameters, validationMessage]);
  const geometry = analysis?.geometry ?? null;
  const selectedResult: StabilityResult | null =
    method === "bishop"
      ? (analysis?.bishop ?? null)
      : (analysis?.fellenius ?? null);
  const selectedStatus = selectedResult
    ? getStabilityStatus(selectedResult.factorOfSafety)
    : null;
  const selectedMethodName =
    method === "bishop" ? "Bishop's Simplified" : "Fellenius";
  const comparisonResults = analysis
    ? [
        { method: "Fellenius", result: analysis.fellenius },
        { method: "Bishop's Simplified", result: analysis.bishop },
      ]
    : [];
  const updateParameter = (key: keyof SlopeParameters, value: string) => {
    setParameters((current) => ({ ...current, [key]: Number(value) }));
  };
  const updateMaterial = (key: keyof MaterialParameters, value: string) => {
    setMaterial((current) => ({ ...current, [key]: Number(value) }));
  };

  return (
    <main className="min-h-screen bg-[#080B10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0B0E14]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 font-mono text-sm font-bold text-amber-400"
            >
              SF
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">SlopeFoS</p>
              <p className="text-xs text-slate-500">
                Geotechnical cross-section workspace
              </p>
            </div>
          </div>
          <span className="rounded-full border border-cyan-300/15 bg-cyan-300/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200/75">
            Limit equilibrium
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">
            Trial slope analysis
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Slope stability analysis
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Adjust the slope geometry and material properties to compare the
            Ordinary Method of Slices with Bishop&apos;s Simplified Method.
          </p>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-white/10 bg-[#0B0E14] p-5">
            <div className="mb-5">
              <h2 className="text-sm font-semibold">Slope parameters</h2>
              <p className="mt-1 text-xs text-slate-500">
                Define the section geometry
              </p>
            </div>
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
                  Slope height
                  <span className="font-mono text-slate-500">m</span>
                </span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                  max="500"
                  min="1"
                  onChange={(event) =>
                    updateParameter("height", event.currentTarget.value)
                  }
                  step="0.5"
                  type="number"
                  value={parameters.height}
                />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
                  Face angle
                  <span className="font-mono text-slate-500">degrees</span>
                </span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                  max="89"
                  min="1"
                  onChange={(event) =>
                    updateParameter("faceAngle", event.currentTarget.value)
                  }
                  step="1"
                  type="number"
                  value={parameters.faceAngle}
                />
              </label>
              <label className="block">
                <span className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
                  Crest width
                  <span className="font-mono text-slate-500">m</span>
                </span>
                <input
                  className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                  max="200"
                  min="0.5"
                  onChange={(event) =>
                    updateParameter("crestWidth", event.currentTarget.value)
                  }
                  step="0.5"
                  type="number"
                  value={parameters.crestWidth}
                />
              </label>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Material properties
              </h3>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
                    Cohesion
                    <span className="font-mono text-slate-500">kPa</span>
                  </span>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                    max="500"
                    min="0"
                    onChange={(event) =>
                      updateMaterial("cohesion", event.currentTarget.value)
                    }
                    step="0.5"
                    type="number"
                    value={material.cohesion}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
                    Friction angle
                    <span className="font-mono text-slate-500">degrees</span>
                  </span>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                    max="89"
                    min="0"
                    onChange={(event) =>
                      updateMaterial("frictionAngle", event.currentTarget.value)
                    }
                    step="0.5"
                    type="number"
                    value={material.frictionAngle}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
                    Unit weight
                    <span className="font-mono text-slate-500">kN/m³</span>
                  </span>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                    max="50"
                    min="1"
                    onChange={(event) =>
                      updateMaterial("unitWeight", event.currentTarget.value)
                    }
                    step="0.5"
                    type="number"
                    value={material.unitWeight}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-center justify-between text-xs font-medium text-slate-300">
                    Base pore pressure
                    <span className="font-mono text-slate-500">kPa</span>
                  </span>
                  <input
                    className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 font-mono text-sm text-slate-100 outline-none transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10"
                    max="10000"
                    min="0"
                    onChange={(event) =>
                      updateMaterial("porePressure", event.currentTarget.value)
                    }
                    step="1"
                    type="number"
                    value={material.porePressure}
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Calculation method
              </h3>
              <div
                aria-label="Calculation method"
                className="mt-3 grid grid-cols-2 gap-2"
                role="group"
              >
                <button
                  aria-pressed={method === "fellenius"}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    method === "fellenius"
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-[#080B10] text-slate-400 hover:text-slate-200"
                  }`}
                  onClick={() => setMethod("fellenius")}
                  type="button"
                >
                  Fellenius
                </button>
                <button
                  aria-pressed={method === "bishop"}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    method === "bishop"
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-[#080B10] text-slate-400 hover:text-slate-200"
                  }`}
                  onClick={() => setMethod("bishop")}
                  type="button"
                >
                  Bishop&apos;s
                </button>
              </div>
            </div>

            {validationMessage && (
              <p
                className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs leading-5 text-rose-200"
                role="alert"
              >
                {validationMessage}
              </p>
            )}
            {analysis?.calculationError && (
              <p
                className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs leading-5 text-rose-200"
                role="alert"
              >
                {analysis.calculationError}
              </p>
            )}

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Current section
              </p>
              <dl className="mt-3 space-y-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">Face run</dt>
                  <dd className="font-mono text-slate-200">
                    {geometry ? `${formatNumber(geometry.faceRun)} m` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">Slip radius</dt>
                  <dd className="font-mono text-amber-300">
                    {geometry ? `${formatNumber(geometry.radius)} m` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">Vertical slices</dt>
                  <dd className="font-mono text-slate-200">
                    {geometry ? geometry.slices.length : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>

          <section aria-label="Slope visualization and slices" className="min-w-0">
            {geometry ? (
              <>
                <SlopeVisualizer params={parameters} result={geometry} />

                {selectedResult && selectedStatus ? (
                  <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                    <div className="rounded-xl border border-white/10 bg-[#0B0E14] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Selected method · {selectedMethodName}
                          </p>
                          <p className="mt-2 font-mono text-4xl font-semibold tracking-tight text-slate-50">
                            {formatNumber(selectedResult.factorOfSafety, 3)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Factor of safety
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${selectedStatus.className}`}
                        >
                          {selectedStatus.label}
                        </span>
                      </div>
                      <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
                        <div>
                          <dt className="text-slate-500">Resisting force</dt>
                          <dd className="mt-1 font-mono text-slate-200">
                            {formatNumber(selectedResult.totalResistingForce)}{" "}
                            kN/m
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Driving force</dt>
                          <dd className="mt-1 font-mono text-slate-200">
                            {formatNumber(selectedResult.totalDrivingForce)}{" "}
                            kN/m
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      {comparisonResults.map(({ method: comparisonMethod, result }) => {
                        const status = result
                          ? getStabilityStatus(result.factorOfSafety)
                          : null;
                        return (
                          <div
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0B0E14] px-4 py-3"
                            key={comparisonMethod}
                          >
                            <div>
                              <p className="text-xs text-slate-400">
                                {comparisonMethod}
                              </p>
                              <p className="mt-1 font-mono text-xl text-slate-100">
                                {result
                                  ? formatNumber(result.factorOfSafety, 3)
                                  : "—"}
                              </p>
                            </div>
                            {status && (
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${status.className}`}
                              >
                                {status.label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div
                    className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 text-xs leading-5 text-rose-200"
                    role="alert"
                  >
                    {analysis?.calculationError ??
                      "Enter valid geometry and material properties to calculate stability."}
                  </div>
                )}

                <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14]">
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-4">
                    <div>
                      <h2 className="text-sm font-semibold">
                        {selectedMethodName} slice breakdown
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Per-slice forces and geometry for the selected method
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {geometry.slices.length} slices
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
                      <thead className="bg-white/[0.025] text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-medium">Slice</th>
                          <th className="px-4 py-3 text-right font-medium">
                            X range (m)
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Width (m)
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Avg. height (m)
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Area (m²)
                          </th>
                          <th className="px-5 py-3 text-right font-medium">
                            Base angle
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Weight (kN/m)
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Base normal (kN/m)
                          </th>
                          <th className="px-4 py-3 text-right font-medium">
                            Driving (kN/m)
                          </th>
                          <th className="px-5 py-3 text-right font-medium">
                            Resisting (kN/m)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {selectedResult?.slices.map((slice) => (
                          <tr
                            className="text-slate-300 transition-colors hover:bg-white/[0.025]"
                            key={slice.index}
                          >
                            <td className="px-5 py-3 font-mono text-slate-400">
                              {String(slice.index).padStart(2, "0")}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatNumber(slice.xStart)}–{formatNumber(slice.xEnd)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatNumber(slice.width)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatNumber(slice.averageHeight)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-cyan-200">
                              {formatNumber(slice.area)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono">
                              {formatNumber(slice.baseAngle)}°
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatNumber(slice.weight)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatNumber(slice.baseNormalForce)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {formatNumber(slice.drivingForce)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-cyan-200">
                              {formatNumber(slice.resistingForce)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-slate-500">
                    Forces are per unit slope width. Bishop&apos;s Simplified
                    iterates base normal forces with inter-slice shear set to
                    zero (Xᵢ = 0); both methods use the entered uniform base
                    pore pressure.
                  </p>
                </div>
              </>
            ) : (
              <div
                className="flex min-h-72 items-center justify-center rounded-xl border border-white/10 bg-[#0B0E14] px-6 text-center text-sm text-slate-400"
                role="status"
              >
                Correct the slope parameters to display the cross-section.
              </div>
            )}

            <p className="mt-4 rounded-lg border border-amber-400/15 bg-amber-400/[0.035] px-4 py-3 text-xs leading-5 text-amber-100/70">
              FoS thresholds are indicative screening values only; engineering
              judgment and project-specific design criteria remain necessary.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
