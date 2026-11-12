#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$(cd "$ROOT/.." && pwd)/ai-interview-practice}"
cd "$ROOT"
git diff --quiet || { echo 'Main checkout is dirty. Commit or stash changes first.' >&2; exit 1; }
[ ! -e "$DEST" ] || { echo "Destination already exists: $DEST" >&2; exit 1; }
git worktree add --detach "$DEST" HEAD
cp "$ROOT/exercise/starter/QuoteCalculator.cs" "$DEST/src/Practice.Domain/QuoteCalculator.cs"
cd "$DEST"
dotnet build
printf '\nPractice worktree created: %s\n' "$DEST"
printf 'Expected: the build is green; behavior tests are red.\n'
printf 'Run: dotnet run --project src/Practice.Api --urls http://127.0.0.1:5187\n'
