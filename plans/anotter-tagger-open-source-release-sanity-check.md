# Anotter Tagger - Open Source Release Sanity Check

## Summary

The plugin is in solid shape architecturally -- clean provider pattern, good separation of concerns, sensible defaults. However, there are several issues ranging from critical metadata problems to minor polish items that should be addressed before submitting to the Obsidian community plugin registry.

Issues are grouped by severity.

---

## Critical: Must Fix Before Release

### 1. Placeholder author in `manifest.json`

**File:** `manifest.json` line 7-8

The `author` field is literally `"Your Name"` and `authorUrl` is empty. This is the default from the Obsidian sample plugin template. The community plugin validator will flag this, and users will see "Your Name" in the plugin list.

**Fix:**
- Set `author` to `"Stefan Kern"` (matching the LICENSE copyright)
- Set `authorUrl` to the GitHub profile URL or personal site

### 2. Stale `ollamaEnabled` setting still referenced in migration code

**File:** `src/settings.ts` and `src/main.ts` line 120-123

The `ollamaEnabled` boolean still exists in the settings interface and is used in a migration path in `loadSettings()`. However, the new provider selection system (`primaryProvider`/`secondaryProvider`) has replaced it. The migration code references `this.settings.ollamaEnabled` but never clears it after migrating, meaning:
- It runs every single load for users who once enabled Ollama
- The setting is never saved back after migration, so it migrates repeatedly

**Fix:**
- After the migration block, set `this.settings.ollamaEnabled = false` and call `await this.saveData(this.settings)` to persist the migration
- Consider removing `ollamaEnabled` from the interface entirely in a future version, or at minimum document it as deprecated

### 3. `versions.json` is incomplete and inconsistent

**File:** `versions.json`

Currently contains:
```json
{ "1.0.0": "1.9.0", "1.0.8": "0.15.0" }
```

Problems:
- Version `1.0.0` maps to `minAppVersion` `1.9.0`, which doesn't exist (Obsidian's latest stable is ~1.7.x as of early 2025). This looks like a typo -- should probably be `0.15.0` or whatever was correct at the time.
- The current version is `1.0.12` but `versions.json` only goes up to `1.0.8`
- The `version-bump.mjs` script has a bug: it checks `if (!Object.values(versions).includes(minAppVersion))` which means it only adds a new entry when the `minAppVersion` changes, not when the plugin version bumps. This is why `1.0.12` is missing.

**Fix:**
- Correct the `1.0.0` entry (likely should be `"1.0.0": "0.15.0"`)
- Add `"1.0.12": "0.15.0"` (or whatever the current release maps to)
- Fix `version-bump.mjs` to always ensure the current version is present in the map

### 4. `description` only mentions TF-IDF, not Ollama

**File:** `manifest.json` line 7, `package.json` line 4

The description says *"Automatically tags notes using TF-IDF"* but the plugin also supports Ollama AI tagging. This undersells the plugin for the community listing.

**Fix:** Update to something like `"Automatically tags notes using TF-IDF keyword extraction or local AI via Ollama."`

---

## High: Should Fix Before Release

### 5. No `onunload()` and no cleanup of the debounce timer

**File:** `src/main.ts`

The plugin registers a debounce timer (`this.debounceTimer`) via raw `setTimeout`, but:
- There is no `onunload()` method to clear it
- `setTimeout` is used instead of `window.setTimeout` with `this.registerInterval()`

Per Obsidian guidelines, all intervals/timeouts should be registered for cleanup.

**Fix:**
- Add an `onunload()` method that calls `clearTimeout(this.debounceTimer)`
- Alternatively, refactor to use `window.setTimeout` and track it properly. Note: `registerInterval` is for `setInterval`, not `setTimeout`, so manual cleanup in `onunload` is the right approach here.

### 6. `pdf-parse` dependency is unused or problematic

**File:** `package.json` line 26-27

`pdf-parse` is listed as a runtime dependency and `@types/pdf-parse` as a dev dependency, but there is zero usage of PDF parsing anywhere in the source code. This adds unnecessary bundle weight and potential security surface.

**Fix:** Remove both `pdf-parse` and `@types/pdf-parse` from `package.json` unless PDF support is planned for a near-term release.

### 7. Settings input validation is missing

**File:** `src/ui/SettingTab.ts` lines 111-117, 137-143

Numeric settings (`existingTagPriority`, `numTags`) use `parseInt` without validation. If a user types `"abc"`, `parseInt` returns `NaN` and it gets saved to settings, which could cause runtime errors.

**Fix:**
- Add `isNaN` checks (like the temperature field already does)
- Clamp values to sensible ranges (e.g., `numTags` between 1-20, `existingTagPriority` between 1-100)

### 8. Provider settings are stale after save

**File:** `src/main.ts` lines 126-133

`saveSettings()` calls `this.rebuildCortex(true)` but doesn't update the Ollama provider's settings object. Since the providers receive settings by value (plain objects) during construction, changing `this.settings.ollamaModel` in the plugin won't propagate to the `OllamaProvider` instance.

**Fix:** Either:
- Pass settings by reference (pass `this.settings` directly and have providers read from it), or
- Recreate/update providers in `saveSettings()` when relevant settings change

### 9. `styles.css` is just boilerplate comments

**File:** `styles.css`

The file contains only the template comment and no actual CSS, yet the release workflow attaches it to every GitHub release. The settings tab uses class `otter-quote` but no styles are defined for it.

**Fix:**
- Either add actual styles for `.otter-quote` (and any other custom classes), or
- Remove `styles.css` from the release workflow if truly unused
- If keeping it, at minimum add the `.otter-quote` styling

### 10. Release workflow auto-bumps on every push to master

**File:** `.github/workflows/release.yml`

The workflow runs `npm version patch` on every push to master/main, creating a release automatically. This means:
- Every merged PR creates a release, even for docs/CI changes
- There's no way to do a minor or major bump
- The workflow pushes back to master, which could re-trigger itself (though GitHub Actions token pushes typically don't)

**Fix:**
- Change the trigger to only run on tag pushes (`on: push: tags: ['*']`) and bump versions manually before pushing a tag, or
- Add a path filter to skip non-code changes, or
- Switch to a manual workflow dispatch trigger for releases

---

## Medium: Nice to Have

### 11. `package.json` metadata is sparse

**File:** `package.json`

Missing `keywords`, `author`, `repository`, `bugs`, and `homepage` fields. While not strictly required for Obsidian, these are standard for open-source npm packages and help with discoverability.

**Fix:** Fill in:
```json
"keywords": ["obsidian", "plugin", "tags", "tfidf", "ollama", "ai"],
"author": "Stefan Kern",
"repository": { "type": "git", "url": "https://github.com/blackwolf244/anotter_tagger" },
"bugs": { "url": "https://github.com/blackwolf244/anotter_tagger/issues" },
"homepage": "https://github.com/blackwolf244/anotter_tagger#readme"
```

### 12. TypeScript strict mode is not fully enabled

**File:** `tsconfig.json`

`strictNullChecks` is on but full `"strict": true` is not set. The Obsidian guidelines recommend `"strict": true`.

**Fix:** Replace the individual strict flags with `"strict": true` and fix any resulting type errors.

### 13. `(this.app.metadataCache as any).getTags()` unsafe cast

**Files:** `src/providers/ollama/OllamaProvider.ts` line 58, `src/providers/tfidf/TfidfProvider.ts` line 64

Both providers cast `metadataCache` to `any` to call `getTags()`. This is a known Obsidian API gap, but the `as any` cast suppresses all type checking.

**Fix:** Create a typed utility function in a shared location:
```typescript
function getVaultTags(app: App): Record<string, number> {
    return (app.metadataCache as any).getTags?.() ?? {};
}
```
This centralizes the unsafe cast and adds optional chaining for safety.

### 14. PR check workflow only targets `main`, not `master`

**File:** `.github/workflows/pr-check.yml` line 5

The PR check only runs for PRs targeting `main`, but the release workflow triggers on both `master` and `main`. The default branch appears to be `master` based on the git status. This means PRs against `master` skip the build check.

**Fix:** Add `master` to the PR check branches list, or standardize on one branch name.

### 15. README lacks installation instructions

**File:** `README.md`

The README has no section explaining how to install the plugin -- neither from the community plugin browser nor manually. For an open-source release, this is important.

**Fix:** Add an "Installation" section covering:
- Community plugin browser installation (once published)
- Manual installation (copy `main.js`, `manifest.json`, `styles.css` to vault)
- BRAT installation (popular for beta testing)

### 16. No CONTRIBUTING.md or issue templates

For open-source projects, having a `CONTRIBUTING.md` and GitHub issue/PR templates helps set expectations for contributors.

**Fix:** Add basic `CONTRIBUTING.md` and `.github/ISSUE_TEMPLATE/` files.

---

## Low: Polish

### 17. `stopwords-iso.json` is bundled at the repo root

This is a large data file sitting at the project root. It works fine but is unconventional.

**Fix (optional):** Move to `src/data/stopwords-iso.json` or `assets/` for cleaner organization.

### 18. Class name `TfidfTagger` vs plugin name "Anotter Tagger"

**File:** `src/main.ts` line 14

The main plugin class is `TfidfTagger` which reflects the original single-engine design. Now that Ollama is supported, this name is slightly misleading.

**Fix (optional):** Rename to `AnotterTagger` for consistency with the plugin's identity.

---

## Checklist Summary

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | Placeholder author in manifest.json | Critical | Metadata |
| 2 | Stale ollamaEnabled migration loop | Critical | Code |
| 3 | versions.json incomplete/incorrect | Critical | Release |
| 4 | Description undersells the plugin | Critical | Metadata |
| 5 | No onunload / debounce timer leak | High | Code quality |
| 6 | Unused pdf-parse dependency | High | Dependencies |
| 7 | Missing input validation on settings | High | UX/Stability |
| 8 | Provider settings not updating after save | High | Bug |
| 9 | Empty styles.css / missing .otter-quote styles | High | Release |
| 10 | Release workflow auto-bumps every push | High | CI/CD |
| 11 | Sparse package.json metadata | Medium | Metadata |
| 12 | TypeScript strict mode not fully enabled | Medium | Code quality |
| 13 | Unsafe metadataCache cast duplicated | Medium | Code quality |
| 14 | PR check misses master branch | Medium | CI/CD |
| 15 | README lacks installation instructions | Medium | Documentation |
| 16 | No CONTRIBUTING.md or issue templates | Medium | Documentation |
| 17 | stopwords-iso.json at repo root | Low | Organization |
| 18 | Class name doesn't match plugin name | Low | Naming |
