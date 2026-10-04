// Shared with the mobile app – keep free of React, DOM and Tauri imports.
// Daily goals (docs/PLAN.md 3.6): calories ±10 %, protein minimum, fat as a
// share of calories (min–max %), carbohydrates without a target.
import type { Macros } from "@/lib/nutrition";

export type Goals = {
  kcal: number;
  proteinMin: number;
  fatMinPct: number;
  fatMaxPct: number;
};

export type Status = "none" | "under" | "ok" | "over";

export const KCAL_PER_GRAM = { protein: 4, fat: 9, carbs: 4 } as const;
const KCAL_TOLERANCE = 0.1;

/** Share of calories coming from a macro, in % (0 when there are no calories). */
export function energyPct(grams: number, kcalPerGram: number, totalKcal: number): number {
  return totalKcal > 0 ? ((grams * kcalPerGram) / totalKcal) * 100 : 0;
}

export function kcalStatus(kcal: number, target: number): Status {
  if (target <= 0 || kcal <= 0) return "none";
  if (kcal > target * (1 + KCAL_TOLERANCE)) return "over";
  if (kcal < target * (1 - KCAL_TOLERANCE)) return "under";
  return "ok";
}

export function proteinStatus(protein: number, min: number): Status {
  if (min <= 0) return "none";
  return protein >= min ? "ok" : "under";
}

export function rangeStatus(value: number, min: number, max: number): Status {
  if (value < min) return "under";
  if (value > max) return "over";
  return "ok";
}

export type DayEvaluation = {
  kcal: { value: number; target: number; status: Status };
  protein: { value: number; min: number; status: Status };
  fat: { grams: number; pct: number; minPct: number; maxPct: number; status: Status };
  carbs: { grams: number; pct: number };
};

export function evaluateDay(m: Macros, goals: Goals): DayEvaluation {
  const fatPct = energyPct(m.fat, KCAL_PER_GRAM.fat, m.kcal);
  return {
    kcal: { value: m.kcal, target: goals.kcal, status: kcalStatus(m.kcal, goals.kcal) },
    protein: {
      value: m.protein,
      min: goals.proteinMin,
      status: m.kcal > 0 ? proteinStatus(m.protein, goals.proteinMin) : "none",
    },
    fat: {
      grams: m.fat,
      pct: fatPct,
      minPct: goals.fatMinPct,
      maxPct: goals.fatMaxPct,
      // Nothing planned yet: no verdict on the fat share.
      status: m.kcal > 0 ? rangeStatus(fatPct, goals.fatMinPct, goals.fatMaxPct) : "none",
    },
    carbs: { grams: m.carbs, pct: energyPct(m.carbs, KCAL_PER_GRAM.carbs, m.kcal) },
  };
}

/**
 * Carbohydrates left once calories, the protein minimum and the fat range are fixed.
 * More fat → fewer carbs, so the max fat % gives the lower carb bound.
 * Returns null when the goals leave no room for carbs.
 */
export function carbRange(goals: Goals): { minGrams: number; maxGrams: number; minPct: number; maxPct: number } | null {
  const { kcal, proteinMin, fatMinPct, fatMaxPct } = goals;
  if (kcal <= 0) return null;
  const rest = (fatPct: number) => kcal - proteinMin * KCAL_PER_GRAM.protein - (fatPct / 100) * kcal;
  const minKcal = Math.max(0, rest(fatMaxPct));
  const maxKcal = rest(fatMinPct);
  if (maxKcal <= 0) return null;
  return {
    minGrams: minKcal / KCAL_PER_GRAM.carbs,
    maxGrams: maxKcal / KCAL_PER_GRAM.carbs,
    minPct: (minKcal / kcal) * 100,
    maxPct: (maxKcal / kcal) * 100,
  };
}

/** Profile row → goals. */
export function goalsFromProfile(p: {
  target_kcal: number;
  target_protein: number;
  fat_min_pct: number;
  fat_max_pct: number;
}): Goals {
  return { kcal: p.target_kcal, proteinMin: p.target_protein, fatMinPct: p.fat_min_pct, fatMaxPct: p.fat_max_pct };
}
