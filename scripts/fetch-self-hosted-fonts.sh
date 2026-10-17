#!/usr/bin/env bash
# Fetch the Latin and Latin Extended woff2 files the site self-hosts
# (refactor step 3b; Latin Extended added in the step 3b follow-up).
#
# The site used to link the Google Fonts CSS for JetBrains Mono, Lato and
# Montserrat. That CSS declares about 33 @font-face rules across ten subsets,
# blocks the first paint on fonts.googleapis.com, and needs a preconnect to a
# third party. These ten files are exactly the `latin` and `latin-ext` files
# Google serves for the eight faces the site uses, so the glyphs do not change;
# only the delivery does (own origin, hashed URLs, `font-display: swap`,
# preloaded above-the-fold faces).
#
# `latin-ext` carries the letters port and company names use (Gdańsk, İstanbul,
# Constanța, Świnoujście). Nothing preloads those five files: with Google's
# `unicode-range` on each face, the browser fetches one only when a page shows
# a letter from it. The other Google subsets (Cyrillic, Cyrillic Extended,
# Greek, Vietnamese) are deliberately not shipped — the site has no copy in
# those scripts.
#
# The checksums pin the font version: a re-run fails instead of silently
# replacing the shipped glyphs with a newer upstream release. Lato is static
# per weight, so its six files are also byte-identical to the matching
# `@fontsource/lato@5.3.0` files; Montserrat and JetBrains Mono are delivered
# by Google as one variable file per family and subset (checked against
# `@fontsource-variable/montserrat@5.2.8`, which is identical for Montserrat;
# Google's JetBrains Mono build differs from fontsource's, so the checksum
# below is the authority).
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

# Google's `latin` slice of each face.
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

# Google's `latin-ext` slice of each face: the same ten @font-face declarations
# as above, with the `latin-ext` `unicode-range` instead of the `latin` one.
download_font \
  'https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh7USSwaPGR_p.woff2' \
  '5627143aaeb49ba46b4614d4fefb967ad8d163fb0743a2fa9c7e53930e559062' \
  'lato-latin-ext-300-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/lato/v25/S6uyw4BMUTPHjxAwXjeu.woff2' \
  '8b9fc9737043f88c1a9a7195c27a239bd329cc33d928ffb67736c61ae7a1dbbd' \
  'lato-latin-ext-400-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/lato/v25/S6u9w4BMUTPHh6UVSwaPGR_p.woff2' \
  '3a5797f440bc67b59830cad81e59a71011e35cb45ed7f747b61a69b0a9b0d6ae' \
  'lato-latin-ext-700-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wdhyzbi.woff2' \
  '54d9a78b7ff60b689ad9f3017ffac8547b5d871afec733f6c1c3ae36577ee504' \
  'montserrat-latin-ext-500-700-normal.woff2'
download_font \
  'https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPx7cwhsk.woff2' \
  'db5ff4db83e580426280e9337a58dc57d3a83784a1b03ad80914651594441d52' \
  'jetbrains-mono-latin-ext-400-600-normal.woff2'
