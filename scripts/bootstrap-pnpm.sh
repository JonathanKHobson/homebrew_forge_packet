#!/usr/bin/env bash
set -euo pipefail

PNPM_VERSION="${PNPM_VERSION:-11.5.0}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARBALL="${TMPDIR:-/tmp}/homebrew-forge-pnpm-${PNPM_VERSION}.tgz"

mkdir -p "${ROOT_DIR}/.tools/pnpm"
curl -fsSL "https://registry.npmjs.org/pnpm/-/pnpm-${PNPM_VERSION}.tgz" -o "${TARBALL}"
tar -xzf "${TARBALL}" -C "${ROOT_DIR}/.tools/pnpm" --strip-components=1
node "${ROOT_DIR}/.tools/pnpm/bin/pnpm.cjs" --version

