#!/usr/bin/env bash
# Runs the data-layer logic tests against the browser-only mock store (no Firebase, no network).
# These check the app's business rules (versioning, publishing, ML-schema lock, registration, data isolation).
# They do NOT test Firebase Auth, Firestore, or the security rules; use the live checklist in docs/SETUP.md for those.
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
cp -r "$ROOT/src" "$TMP/src"
cp "$ROOT"/tests/logic/*.mjs "$TMP/"
cp -r "$ROOT/tests/fixtures" "$TMP/fixtures"
ln -s "$ROOT/node_modules" "$TMP/node_modules"
echo '{"type":"module"}' > "$TMP/package.json"
# Plain Node has no import.meta.env, so pin the mock mode values.
grep -rl "import.meta.env" "$TMP/src" | xargs sed -i "s/import\.meta\.env\.VITE_DATA_MODE/'mock'/g; s/import\.meta\.env\.VITE_API_BASE_URL/undefined/g; s/import\.meta\.env\.VITE_CLASSIFIER_MODE/'local'/g; s/import\.meta\.env\.BASE_URL/'\/'/g; s/import\.meta\.env\.VITE_HERO_[A-Z_]*/''/g"
cd "$TMP"
fail=0
for t in admin respondent ml; do
  echo "== $t"; node --import ./reg.mjs "$t.test.mjs" | tee out.txt; ! grep -q FAIL out.txt || fail=1
done
exit $fail
