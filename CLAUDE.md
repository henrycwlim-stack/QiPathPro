# Working on QiPath Pro

## Always start from the latest GitHub version
Before reading or changing any code, fetch `main` from GitHub and move to it:

    git fetch origin main && git status

If `main` on GitHub is ahead and there is no local work, reset to `origin/main`. If there is local work,
rebase it onto `origin/main`. `main` is sometimes pushed from Henry's own computer, so never assume the
local copy is current, and never force-push over GitHub.

## Every code change is a new version
Any change to the app's code (anything under `www/`, `android/`, `tools/`, `package.json`, build scripts)
ships as a new, incrementally numbered version. Do all of the following without being asked:

1. Fetch the latest `main` first (above).
2. Bump the version:
   - `package.json` → `"version"`
   - `android/app/build.gradle` → `versionCode` (+1) and `versionName`
   - Default is a minor bump (10.4.0 → 10.5.0); use a patch bump (10.4.0 → 10.4.1) only for a small fix.
3. Add a README entry at the top of the version history, in the existing style:
   `### X.Y — <title>` then `Version folder X.Y.Z (versionCode N), copied from <previous>.` and what changed.
4. Check that the app still parses (`node build-review.js` if it applies) before committing.
5. Commit with the message `Version X.Y.Z (versionCode N): <summary>`.
6. Tag the commit `vX.Y.Z` — the tag is the version folder on GitHub; every version stays downloadable from
   the repository's Tags page.
7. Push `main` and the tag: `git push origin main && git push origin vX.Y.Z`.
   Pushing `main` triggers the Build APK workflow.

Changes that are not app code (this file, docs only) are committed and pushed without a version bump.
