# TypeZero Diagnostic & Resolution Plan

Per Global Operating Rule #13 and #1, please review and approve this diagnostic plan before I make any code adjustments.

### 1. Subscription Sync Failed
**Diagnosis**: The `useEffect` startup hook in `App.tsx` reads `useAuthStore.getState().userEmail` synchronously. If Zustand `persist` hasn't fully rehydrated the store from `localStorage` yet (or if the user's `isPro` state is overwritten on rehydration), this sync can misfire. 
**Plan**: I need to modify `App.tsx` to reactively listen to `userEmail` and ensure `validateLicense` forces UI re-renders on mount. I will also check Firestore data mapping for any casing/schema mismatches.

### 2. Manual Key Entry Error
**Diagnosis**: The license collection check `validateFallbackLicense` in `authStore.ts` strictly requires an exact match of string `key` and `email`. If either has white space or Firestore collection is empty, it fails.
**Plan**: I will review `validateFallbackLicense` to trim and normalize inputs, and add extra logging to find out why the Firestore read fails silently.

### 3. Onboarding Email Not Overriding Old Account Email
**Diagnosis**: `EmailOnboarding.tsx` checks `validateLicense(email)` which mutates the store, but `AccountSettings.tsx` may still be hydrating the old email from a separate state, or `setUser` isn't properly triggered to completely overwrite the cache.
**Plan**: Explicitly call `useAuthStore.getState().setUser(newEmail)` inside `EmailOnboarding.tsx` alongside `validateLicense` to guarantee the cache is forcefully updated.

### 4. Windows CMD popup glitch every few minutes
**Diagnosis**: `TtsSettings.tsx` runs `commands.getTtsStatus()` every 5000ms (5 seconds). On Windows, invoking Python or CLI scripts via Rust's `std::process::Command::new` pops up a brief CMD terminal unless a specific window flag is provided.
**Plan**: I will locate `getTtsStatus` and the Python launcher in Rust (`managers/tts.rs` etc) and add `#![cfg(target_os = "windows")]` with `creation_flags(0x08000000)` (CREATE_NO_WINDOW). This completely silences the bug safely without breaking execution.

### 5. Fake Demo Billing and Receipts
**Diagnosis**: `AccountSettings.tsx` contains a static UI block for "Billing & Receipts" which was mocked up and not wired to a real Stripe portal.
**Plan**: Remove this block entirely from `AccountSettings.tsx` to stop user confusion as requested.

### 6. "Failed to check for updates" Error
**Diagnosis**: `AboutSettings.tsx` uses `@tauri-apps/plugin-updater`. Unless you have configured an external update server URL in `tauri.conf.json` and properly signed the build, it throws an error to the UI.
**Plan**: I will catch the error silently or replace the popup with "You are on the latest version" so the scary error doesn't show to users.

### 7. Troubleshooting / Report A Problem section
**Diagnosis**: It currently copies logs to clipboard (`Copy Diagnostics`). The user asked if it can securely send to `Support@dipomdutta.com` or be removed.
**Plan**: I can either replace it with a native `mailto:Support@dipomdutta.com` link or the WP REST API we built. Given the instruction "or remove the section", I propose converting it to open an email link by default or deleting it cleanly. Which do you prefer? For now, I will remove it or switch to `mailto`.

### 8. Sidebar color in light mode
**Diagnosis**: In `App.css` or `Sidebar.tsx`, the `glass-sidebar` defaults to `var(--color-sidebar)` (often white) instead of `var(--color-background)` (blue tinted). 
**Plan**: I will sync the Light Theme sidebar styling so it inherits the exact blue hue from the body, maintaining parity without touching dark mode.

### 9. Remove Grey Color from Translate page
**Diagnosis**: `TranslationScreen.tsx` wraps its sections in `bg-black/5` (grey).
**Plan**: Change the container style back to native or completely transparent without disturbing any states.

### 10. Speech Tab Toggle broken
**Diagnosis**: The "Enable Synthesis" toggle currently triggers, but if the local Python environment isn't bootstrapped or returns an exit code immediately, it visually resets or breaks.
**Plan**: Fix the `onChange` handler inside `TtsSettings.tsx` to accurately bind to the user's TTS service state rather than a silent crash.

### 11. Remove Beta Security Notice
**Diagnosis**: The `BetaSecurityNotice.tsx` component is imported into `App.tsx` unconditionally. 
**Plan**: Simply remove its import and rendering block from `App.tsx`. 

---
**Summary Request**
Are you okay with this diagnostic plan and the targeted files (`App.tsx`, `authStore.ts`, `EmailOnboarding.tsx`, `TtsSettings.tsx`, `AccountSettings.tsx`, `AboutSettings.tsx`, `TranslationScreen.tsx`, and Rust manager files)? 
Let me know if I should proceed with executing these exactly.
