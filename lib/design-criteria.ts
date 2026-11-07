export type DesignCriterionId =
  | "temporary-slope"
  | "active-mining-bench"
  | "permanent-civil-low-consequence"
  | "permanent-civil-high-consequence";

export interface DesignCriterion {
  id: DesignCriterionId;
  label: string;
  minimumFactorOfSafety: number;
  consequenceClass: string;
  basis: string;
}

export const DESIGN_CRITERIA = [
  {
    id: "temporary-slope",
    label: "Temporary slope",
    minimumFactorOfSafety: 1.3,
    consequenceClass: "Temporary works",
    basis: "Typical short-term static design target.",
  },
  {
    id: "active-mining-bench",
    label: "Active mining bench",
    minimumFactorOfSafety: 1.1,
    consequenceClass: "Operational bench-scale slope",
    basis: "Typical bench-scale operational screening target.",
  },
  {
    id: "permanent-civil-low-consequence",
    label: "Permanent civil slope — low consequence",
    minimumFactorOfSafety: 1.3,
    consequenceClass: "Low consequence of failure",
    basis: "Typical long-term static design target for low consequences.",
  },
  {
    id: "permanent-civil-high-consequence",
    label: "Permanent civil slope — significant consequence",
    minimumFactorOfSafety: 1.5,
    consequenceClass: "Significant consequence of failure",
    basis: "Typical long-term static design target for significant consequences.",
  },
] as const satisfies readonly DesignCriterion[];

export interface DesignCompliance {
  status: "meets-criterion" | "below-criterion";
  factorOfSafety: number;
  minimumFactorOfSafety: number;
  margin: number;
}

export function isDesignCriterionId(
  value: string,
): value is DesignCriterionId {
  return DESIGN_CRITERIA.some((criterion) => criterion.id === value);
}

export function evaluateDesignCompliance(
  factorOfSafety: number,
  criterion: DesignCriterion,
): DesignCompliance {
  if (!Number.isFinite(factorOfSafety) || factorOfSafety < 0) {
    throw new RangeError("Factor of safety must be a finite, non-negative value.");
  }

  const margin = factorOfSafety - criterion.minimumFactorOfSafety;
  return {
    status: margin >= 0 ? "meets-criterion" : "below-criterion",
    factorOfSafety,
    minimumFactorOfSafety: criterion.minimumFactorOfSafety,
    margin,
  };
}
