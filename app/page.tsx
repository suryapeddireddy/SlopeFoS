"use client";

import { useMemo, useState } from "react";
import SlopeVisualizer from "@/components/slope-visualizer";
import {
  calculateSlopeGeometry,
  type SlopeParameters,
} from "@/lib/slope-math";

const INITIAL_PARAMETERS: SlopeParameters = {
  height: 20,
  faceAngle: 60,
  crestWidth: 8,
};

function formatNumber(value: number, digits = 1): string {
  return value.toFixed(digits);
}

export default function Home() {
  const [parameters, setParameters] =
    useState<SlopeParameters>(INITIAL_PARAMETERS);
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
          : null;
  const geometry = useMemo(
    () => (validationMessage ? null : calculateSlopeGeometry(parameters)),
    [parameters, validationMessage],
  );
  const updateParameter = (key: keyof SlopeParameters, value: string) => {
    setParameters((current) => ({ ...current, [key]: Number(value) }));
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
            Geometry preview
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">
            Trial slope analysis
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Cross-section visualizer
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Adjust the slope geometry to inspect a scaled trial slip surface
            and its vertical slice breakdown.
          </p>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
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

            {validationMessage && (
              <p
                className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs leading-5 text-rose-200"
                role="alert"
              >
                {validationMessage}
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

                <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14]">
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-5 py-4">
                    <div>
                      <h2 className="text-sm font-semibold">
                        Slice breakdown
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Geometric areas between the ground profile and trial
                        arc
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {geometry.slices.length} slices
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] border-collapse text-left text-xs">
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
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {geometry.slices.map((slice) => (
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-slate-500">
                    Slice areas use Simpson&apos;s rule on the section geometry;
                    they are not a factor-of-safety calculation.
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
              Geometry preview only. No material strength analysis, factor of
              safety, or stability conclusion is produced.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
