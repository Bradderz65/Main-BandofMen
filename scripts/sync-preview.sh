#!/usr/bin/env bash
set -euo pipefail

# Sync current branch to preview repo Pages main branch without production CNAME.
# Usage:
#   scripts/sync-preview.sh [source-branch]
# Defaults to current branch.

PREVIEW_REPO="Bradderz65/Main-BandofMen-updates"
SOURCE_BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI not installed." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh CLI is not authenticated." >&2
  exit 1
fi

if ! git rev-parse --verify "$SOURCE_BRANCH" >/dev/null 2>&1; then
  echo "Error: source branch '$SOURCE_BRANCH' not found." >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

# Prepare isolated copy from selected branch
git clone . "$tmpdir/repo" >/dev/null 2>&1
cd "$tmpdir/repo"
git checkout "$SOURCE_BRANCH" >/dev/null 2>&1

# Ensure preview deployment does not hijack production domain
if [[ -f CNAME ]]; then
  git rm -f CNAME >/dev/null 2>&1
  git -c user.name='Clawd' -c user.email='clawd@local' commit -m 'Remove CNAME for preview deployment' >/dev/null 2>&1 || true
fi

# Push to preview repo main
if git remote | grep -q '^preview$'; then
  git remote remove preview
fi
git remote add preview "https://github.com/${PREVIEW_REPO}.git"
git push -f preview "${SOURCE_BRANCH}:main" >/dev/null

# Ensure Pages source is configured on preview repo
(gh api -X POST "repos/${PREVIEW_REPO}/pages" -f source[branch]=main -f source[path]="/" >/dev/null 2>&1) || true

url="$(gh api "repos/${PREVIEW_REPO}/pages" --jq '.html_url' 2>/dev/null || true)"
echo "Preview sync complete."
echo "Repo: ${PREVIEW_REPO}"
echo "Source branch: ${SOURCE_BRANCH}"
echo "Preview URL: ${url:-https://bradderz65.github.io/Main-BandofMen-updates/}"