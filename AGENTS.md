This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project: Meal Planner – Android companion

Companion to the desktop app (Tauri + React, repo `../MealPlanner New`). Same Supabase project and publishable key (`.env.local`, see `.env.example`); Row Level Security scopes every query to the signed-in user. Spec: the "Meal Planner – app summary for the Android companion" doc; desktop-side changes: `../MealPlanner New/docs/MOBILE_COMPANION_UPDATE.md`.

**Scope v1:** read-only. Plan (one day at a time, opens on today) → cooking view; recipes (Moje / Inspiracje with bookmarks in `saved_shared_recipes`); shopping lists stored **on the phone only**, built from the plan with the desktop rules. Plan editing comes later in the same Plan screen.

**Shared code:** `npm run sync:shared` copies the desktop's pure logic, `types/database.ts` and `i18n/pl.json`/`en.json` into `src/` at the same paths (list in `scripts/sync-shared.mjs`). Never edit those copies – change the desktop file and sync. Phone-only texts go in `src/i18n/mobile.*.json` under the `mobile` key.

**UI:** React Native Paper (Material 3) with the "Szałwia" palette in `src/theme/palette.ts`; use `useAppTheme()` for colours, never hard-coded hex. Three tabs (Plan, Przepisy, Zakupy); profile and settings open from the avatar in the header. Polish is the default language; language and theme come from the profile, keep-awake and wallpaper colours are phone-only (`src/lib/preferences.ts`). Cooking view: no checkboxes on ingredients, portions stepper, screen stays on.

**Rules from the desktop:** dates are local `YYYY-MM-DD` (`@/lib/dates`, never `toISOString`); macros unrounded until display; Polish decimal comma and plurals via i18next; goal status = icon + word, never colour alone.

Package name `com.archont.mealplanner`. Build and run on a device: `npm run android`.
