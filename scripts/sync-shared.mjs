// Copies the logic shared with the desktop app into src/ at the same paths, so
// their `@/` imports resolve unchanged. Never edit the copies here – change the
// desktop file and run `npm run sync:shared`. `--check` only reports drift.
//
// Desktop repo location: DESKTOP_REPO env var, default ../MealPlanner New.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const desktop = resolve(root, process.env.DESKTOP_REPO ?? "../MealPlanner New");
const check = process.argv.includes("--check");

// Keep in sync with "Shared with the mobile app" in the desktop docs/PLAN.md.
export const SHARED_FILES = [
  "src/lib/nutrition.ts",
  "src/lib/goals.ts",
  "src/lib/dates.ts",
  "src/lib/search.ts",
  "src/lib/labels.ts",
  "src/features/shopping/aggregate.ts",
  "src/features/plan/model.ts",
  "src/features/recipes/filter.ts",
  "src/features/products/categoryOrder.ts",
  "src/types/database.ts",
  // EAN check and Open Food Facts mapping, shared with the import-off-product Edge Function.
  "supabase/functions/_shared/ean.ts",
  "supabase/functions/_shared/off.ts",
  "src/i18n/pl.json",
  "src/i18n/en.json",
];

if (!existsSync(join(desktop, "src"))) {
  console.error(`Desktop repo not found at ${desktop} (set DESKTOP_REPO).`);
  process.exit(1);
}

let drift = 0;
for (const file of SHARED_FILES) {
  const source = readFileSync(join(desktop, file), "utf8");
  const target = join(root, file);
  const current = existsSync(target) ? readFileSync(target, "utf8") : null;
  if (current === source) continue;
  drift++;
  if (check) {
    console.log(`out of date: ${file}`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, source);
    console.log(`updated: ${file}`);
  }
}

if (drift === 0) console.log("Shared files are up to date.");
if (check && drift > 0) process.exit(1);
