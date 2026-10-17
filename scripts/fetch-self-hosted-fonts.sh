#!/usr/bin/env bash
# Fetch the Latin-subset woff2 files the site self-hosts (refactor step 3b).
#
# The site used to link the Google Fonts CSS for JetBrains Mono, Lato and
# Montserrat. That CSS declares about 33 @font-face rules across ten subsets,
# blocks the first paint on fonts.googleapis.com, and needs a preconnect to a
# third party. These five files are exactly the Latin-subset files Google
# serves for the eight faces the site uses, so the glyphs do not change; only
# the delivery does (own origin, hashed URLs, `font-display: swap`, preloaded
# above-the-fold faces).
#
# The checksums pin the font version: a re-run fails instead of silently
# replacing the shipped glyphs with a newer upstream release. Lato is static
# per weight, so those three files are also byte-identical to the matching
# `@fontsource/lato@5.3.0` files; Montserrat and JetBrains Mono are delivered
# by Google as one variable file per family (checked against
# `@fontsource-variable/montserrat@5.2.8`, which is identical for Montserrat).
#
# Usage: bash scripts/fetch-self-hosted-fonts.sh   (needs network access)
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
out_dir="$repo_root/src/assets/fonts"
curl_bin=${CURL_BIN:-curl}

# GNU coreutils on the build hosts, `shasum` on macOS.
if command -v sha256sum >/dev/null 2>&1; then
  check_sha256() { sha256sum --check --status; }
else
  check_sha256() { shasum -a 256 --check --status; }
fi

mkdir -p "$out_dir"

download_font() {
  local url=$1
  local checksum=$2
  local name=$3
  local tmp
  tmp=$(mktemp)
  trap 'rm -f "$tmp"' RETURN

  "$curl_bin" -fsSL --max-time 60 "$url" -o "$tmp"
  echo "$checksum  $tmp" | check_sha256
  mv "$tmp" "$out_dir/$name"
  echo "fetched $name ($(wc -c <"$out_dir/$name") bytes)"
}

download_font \
  'https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh7USSwiPGQ.woff2' \
  '115f6a626ca115d4ad5581b59275327e0e860b30330a52b0f785561332dd2429' \
  'lato-latin-300-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/lato/v25/S6uyw4BMUTPHjx4wXg.woff2' \
  '918b7dc3e2e2d015c16ce08b57bcb64d2253bafc1707658f361e72865498e537' \
  'lato-latin-400-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh6UVSwiPGQ.woff2' \
  'c447dd7677b419db7b21dbdfc6277c7816a913ffda76fd2e52702df538de0e49' \
  'lato-latin-700-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2' \
  '06b16db7a969135d48d38c49183be7fb88d4452e2a3011957c7851941f4e4879' \
  'montserrat-latin-500-700-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2' \
  '83c005d49d8a6a50474c73a5a36ac0468076e9c4a29da7bdb14995d80560a5be' \
  'jetbrains-mono-latin-400-600-normal.woff2'
