"use client";

import { useMemo, useRef, useState } from "react";
import SlopeVisualizer from "@/components/slope-visualizer";
import {
  findCriticalSlipCircle,
  type CriticalSlipSearchResult,
} from "@/lib/optimizer";
import {
  calculateBishopsFoS,
  calculateFelleniusFoS,
  calculateSlopeGeometry,
  type StabilityParameters,
  type StabilityResult,
  type SlopeParameters,
  type TrialCircleParameters,
} from "@/lib/slope-math";
import { generateSlopeReport } from "@/lib/export-report";
import {
  REFERENCE_CASES,
  type ReferenceCalculationMethod,
} from "@/lib/reference-cases";
import {
  DESIGN_CRITERIA,
  evaluateDesignCompliance,
  isDesignCriterionId,
  type DesignCriterionId,
} from "@/lib/design-criteria";

const INITIAL_PARAMETERS: SlopeParameters = {
  height: 20,
  faceAngle: 60,
  crestWidth: 8,
};

type MaterialParameters = Omit<StabilityParameters, "slices">;
type CalculationMethod = ReferenceCalculationMethod;

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
  const [selectedReferenceCaseId, setSelectedReferenceCaseId] = useState<
    string | null
  >(null);
  const [selectedDesignCriterionId, setSelectedDesignCriterionId] =
    useState<DesignCriterionId>("active-mining-bench");
  const [trialCircle, setTrialCircle] =
    useState<TrialCircleParameters | null>(null);
  const [method, setMethod] = useState<CalculationMethod>("fellenius");
  const [criticalCircle, setCriticalCircle] =
    useState<CriticalSlipSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchController = useRef<AbortController | null>(null);
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

    const geometry = calculateSlopeGeometry(parameters, trialCircle ?? undefined);
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
  }, [material, parameters, trialCircle, validationMessage]);
  const displayedAnalysis = useMemo(() => {
    if (!criticalCircle) {
      return analysis;
    }

    const stabilityParameters: StabilityParameters = {
      ...material,
      slices: criticalCircle.geometry.slices,
    };
    try {
      return {
        geometry: criticalCircle.geometry,
        fellenius: calculateFelleniusFoS(stabilityParameters),
        bishop: calculateBishopsFoS(stabilityParameters),
        calculationError: null,
      };
    } catch (error) {
      if (error instanceof RangeError) {
        return {
          geometry: criticalCircle.geometry,
          fellenius: null,
          bishop: null,
          calculationError: error.message,
        };
      }
      throw error;
    }
  }, [analysis, criticalCircle, material]);
  const geometry = displayedAnalysis?.geometry ?? null;
  const selectedResult: StabilityResult | null =
    method === "bishop"
      ? (displayedAnalysis?.bishop ?? null)
      : (displayedAnalysis?.fellenius ?? null);
  const selectedDesignCriterion = DESIGN_CRITERIA.find(
    (criterion) => criterion.id === selectedDesignCriterionId,
  );
  const designCompliance =
    selectedResult && selectedDesignCriterion
      ? evaluateDesignCompliance(
          selectedResult.factorOfSafety,
          selectedDesignCriterion,
        )
      : null;
  const selectedStatus = selectedResult
    ? getStabilityStatus(selectedResult.factorOfSafety)
    : null;
  const selectedMethodName =
    method === "bishop" ? "Bishop's Simplified" : "Fellenius";
  const comparisonResults = displayedAnalysis
    ? [
        { method: "Fellenius", result: displayedAnalysis.fellenius },
        { method: "Bishop's Simplified", result: displayedAnalysis.bishop },
      ]
    : [];
  const selectedReferenceCase =
    REFERENCE_CASES.find(
      (referenceCase) => referenceCase.id === selectedReferenceCaseId,
    ) ?? null;
  const selectedReferenceTarget =
    selectedReferenceCase?.targets[method] ?? null;
  const isWithinReferenceTarget =
    selectedResult !== null &&
    selectedReferenceTarget !== null &&
    selectedResult.factorOfSafety >= selectedReferenceTarget.minimum &&
    selectedResult.factorOfSafety <= selectedReferenceTarget.maximum;
  const cancelSearch = () => {
    searchController.current?.abort();
    searchController.current = null;
    setIsSearching(false);
  };
  const updateParameter = (key: keyof SlopeParameters, value: string) => {
    cancelSearch();
    setCriticalCircle(null);
    setSearchError(null);
    setSelectedReferenceCaseId(null);
    setTrialCircle(null);
    setParameters((current) => ({ ...current, [key]: Number(value) }));
  };
  const updateMaterial = (key: keyof MaterialParameters, value: string) => {
    cancelSearch();
    setCriticalCircle(null);
    setSearchError(null);
    setSelectedReferenceCaseId(null);
    setTrialCircle(null);
    setMaterial((current) => ({ ...current, [key]: Number(value) }));
  };
  const loadReferenceCase = (referenceCaseId: string) => {
    cancelSearch();
    setCriticalCircle(null);
    setSearchError(null);
    const referenceCase = REFERENCE_CASES.find(
      (item) => item.id === referenceCaseId,
    );
    setSelectedReferenceCaseId(referenceCase?.id ?? null);
    if (!referenceCase) {
      setTrialCircle(null);
      return;
    }

    setParameters(referenceCase.slope);
    setMaterial({
      ...referenceCase.material,
      porePressure: referenceCase.waterTable.basePorePressure,
    });
    setTrialCircle(referenceCase.trialCircle);
  };
  const runCriticalSearch = async () => {
    if (validationMessage || !analysis?.geometry) {
      return;
    }

    cancelSearch();
    setSelectedReferenceCaseId(null);
    setTrialCircle(null);
    const controller = new AbortController();
    searchController.current = controller;
    setCriticalCircle(null);
    setSearchError(null);
    setIsSearching(true);
    try {
      const result = await findCriticalSlipCircle({
        slope: parameters,
        material,
        method,
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setCriticalCircle(result);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setSearchError(
          error instanceof Error
            ? error.message
            : "Critical slip circle search failed.",
        );
      }
    } finally {
      if (searchController.current === controller) {
        searchController.current = null;
        setIsSearching(false);
      }
    }
  };
  const downloadEngineeringReport = () => {
    if (!geometry || !selectedResult) {
      return;
    }

    const report = generateSlopeReport(
      {
        slope: parameters,
        material,
        geometry,
        ...(criticalCircle
          ? {
              criticalSearch: {
                method: criticalCircle.method,
                testedCircles: criticalCircle.testedCircles,
              },
            }
          : {}),
      },
      selectedResult,
      method,
    );
    const reportBlob = new Blob([report], {
      type: "text/plain;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(reportBlob);
    const downloadLink = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadLink.href = downloadUrl;
    downloadLink.download = `slopefos-engineering-report-${timestamp}.txt`;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
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
            <div className="mb-5 border-b border-white/10 pb-5">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-300">
                  Load Reference Case
                </span>
                <select
                  aria-label="Load Reference Case"
                  className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                  onChange={(event) =>
                    loadReferenceCase(event.currentTarget.value)
                  }
                  value={selectedReferenceCaseId ?? ""}
                >
                  <option value="">Custom analysis</option>
                  {REFERENCE_CASES.map((referenceCase) => (
                    <option key={referenceCase.id} value={referenceCase.id}>
                      {referenceCase.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedReferenceCase && (
                <div className="mt-3 space-y-1.5 text-[11px] leading-5 text-slate-400">
                  <p>{selectedReferenceCase.description}</p>
                  <p>{selectedReferenceCase.waterTable.description}</p>
                  <p className="font-mono text-slate-500">
                    Trial circle · C (
                    {formatNumber(selectedReferenceCase.trialCircle.center.x)},
                    {" "}
                    {formatNumber(selectedReferenceCase.trialCircle.center.y)}
                    ) m · R{" "}
                    {formatNumber(selectedReferenceCase.trialCircle.radius)} m
                  </p>
                </div>
              )}
              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                Water table is represented by uniform base pore pressure in
                this calculation model.
              </p>
            </div>
            <div className="mb-5 border-b border-white/10 pb-5">
              <label className="block">
                <span className="mb-2 block text-xs font-medium text-slate-300">
                  Design criteria
                </span>
                <select
                  aria-label="Design criteria"
                  className="w-full rounded-lg border border-white/10 bg-[#080B10] px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/10"
                  onChange={(event) => {
                    const criterionId = event.currentTarget.value;
                    if (isDesignCriterionId(criterionId)) {
                      setSelectedDesignCriterionId(criterionId);
                    }
                  }}
                  value={selectedDesignCriterionId}
                >
                  {DESIGN_CRITERIA.map((criterion) => (
                    <option key={criterion.id} value={criterion.id}>
                      {criterion.label}
                    </option>
                  ))}
                </select>
              </label>
              {selectedDesignCriterion && (
                <div className="mt-2 space-y-1 text-[10px] leading-4 text-slate-500">
                  <p>
                    Minimum FoS{" "}
                    <span className="font-mono text-slate-300">
                      {formatNumber(
                        selectedDesignCriterion.minimumFactorOfSafety,
                        2,
                      )}
                    </span>{" "}
                    · {selectedDesignCriterion.consequenceClass}
                  </p>
                  <p>
                    {selectedDesignCriterion.basis} Indicative static criteria
                    only; confirm the governing project design basis.
                  </p>
                </div>
              )}
            </div>
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
                  onClick={() => {
                    cancelSearch();
                    setMethod("fellenius");
                  }}
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
                  onClick={() => {
                    cancelSearch();
                    setMethod("bishop");
                  }}
                  type="button"
                >
                  Bishop&apos;s
                </button>
              </div>
            </div>

            <div className="mt-4">
              <button
                className="w-full rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2.5 text-xs font-semibold text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!geometry || Boolean(validationMessage) || isSearching}
                onClick={() => void runCriticalSearch()}
                type="button"
              >
                {isSearching
                  ? "Searching for critical circle..."
                  : "Run Critical Slip Circle Search"}
              </button>
              {criticalCircle && (
                <p className="mt-2 text-xs leading-5 text-rose-200" role="status">
                  {criticalCircle.method === "bishop"
                    ? "Bishop's"
                    : "Fellenius"}{" "}
                  critical FoS{" "}
                  {formatNumber(criticalCircle.stability.factorOfSafety, 3)} ·{" "}
                  {criticalCircle.testedCircles.toLocaleString()} circles tested
                </p>
              )}
              {searchError && (
                <p
                  className="mt-2 text-xs leading-5 text-rose-200"
                  role="alert"
                >
                  {searchError}
                </p>
              )}
            </div>

            {validationMessage && (
              <p
                className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs leading-5 text-rose-200"
                role="alert"
              >
                {validationMessage}
              </p>
            )}
            {displayedAnalysis?.calculationError && (
              <p
                className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs leading-5 text-rose-200"
                role="alert"
              >
                {displayedAnalysis.calculationError}
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
                <SlopeVisualizer
                  isCritical={criticalCircle !== null}
                  params={parameters}
                  result={geometry}
                />

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
                          {designCompliance && selectedDesignCriterion && (
                            <div
                              aria-label="Design criteria compliance"
                              className={`mt-3 rounded-lg border px-3 py-2 ${
                                designCompliance.status === "meets-criterion"
                                  ? "border-emerald-400/25 bg-emerald-400/10"
                                  : "border-rose-400/25 bg-rose-400/10"
                              }`}
                              role="status"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                                    designCompliance.status ===
                                    "meets-criterion"
                                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                                      : "border-rose-400/25 bg-rose-400/10 text-rose-200"
                                  }`}
                                >
                                  {designCompliance.status ===
                                  "meets-criterion"
                                    ? "Meets design criterion"
                                    : "Below design criterion"}
                                </span>
                                <span className="font-mono text-[11px] text-slate-300">
                                  Required ≥{" "}
                                  {formatNumber(
                                    designCompliance.minimumFactorOfSafety,
                                    2,
                                  )}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {selectedDesignCriterion.label} ·{" "}
                                {selectedMethodName} · margin{" "}
                                {designCompliance.margin >= 0 ? "+" : ""}
                                {formatNumber(designCompliance.margin, 3)}
                              </p>
                            </div>
                          )}
                          {selectedReferenceCase &&
                            selectedReferenceTarget && (
                              <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                    Verification Benchmark
                                  </span>
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                      isWithinReferenceTarget
                                        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                                        : "border-amber-400/25 bg-amber-400/10 text-amber-200"
                                    }`}
                                  >
                                    {isWithinReferenceTarget
                                      ? "Within target"
                                      : "Outside target"}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  Reference{" "}
                                  {formatNumber(selectedReferenceTarget.value, 3)}
                                  {" · range "}
                                  {formatNumber(
                                    selectedReferenceTarget.minimum,
                                    3,
                                  )}
                                  –{formatNumber(
                                    selectedReferenceTarget.maximum,
                                    3,
                                  )}
                                  {" · Δ "}
                                  {formatNumber(
                                    Math.abs(
                                      selectedResult.factorOfSafety -
                                        selectedReferenceTarget.value,
                                    ),
                                    3,
                                  )}
                                </p>
                              </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!selectedResult}
                            onClick={downloadEngineeringReport}
                            type="button"
                          >
                            Download Engineering Report
                          </button>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-medium ${selectedStatus.className}`}
                          >
                            {selectedStatus.label}
                          </span>
                        </div>
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
