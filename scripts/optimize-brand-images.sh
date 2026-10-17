#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ffmpeg_bin=${FFMPEG_BIN:-ffmpeg}
python_bin=${PYTHON_BIN:-python3}
social_font=${SOCIAL_FONT:-/usr/share/fonts/truetype/lato/Lato-Regular.ttf}
curl_bin=${CURL_BIN:-curl}
cwebp_bin=${CWEBP_BIN:-cwebp}

"$ffmpeg_bin" -hide_banner -loglevel error -y \
  -i "$repo_root/public/verdaxis-logo-words-right.png" \
  -vf 'scale=384:-2:flags=lanczos' -frames:v 1 -compression_level 9 \
  "$repo_root/public/verdaxis-logo-words-right-384.png"

"$ffmpeg_bin" -hide_banner -loglevel error -y \
  -i "$repo_root/public/verdaxis-logo-no-words.png" \
  -vf 'scale=96:-2:flags=lanczos' -frames:v 1 -compression_level 9 \
  "$repo_root/public/verdaxis-logo-mark-96.png"

"$ffmpeg_bin" -hide_banner -loglevel error -y \
  -i "$repo_root/public/verdaxis-logo-no-words.png" \
  -vf 'scale=56:-2:flags=lanczos,pad=64:64:(ow-iw)/2:(oh-ih)/2:color=0x00000000' \
  -frames:v 1 -compression_level 9 \
  "$repo_root/public/verdaxis-favicon-64.png"

partner_tmp=$(mktemp -d)
trap 'rm -rf "$partner_tmp"' EXIT

download_partner_logo() {
  local url=$1
  local checksum=$2
  local output=$3
  local source="$partner_tmp/$(basename "$output")"

  "$curl_bin" -fsSL --max-time 30 "$url" -o "$source"
  echo "$checksum  $source" | sha256sum --check --status
  "$ffmpeg_bin" -hide_banner -loglevel error -y \
    -i "$source" -vf 'scale=128:-2:flags=lanczos' \
    -frames:v 1 -compression_level 9 "$repo_root/public/$output"
}

# Exact upstream logos already rendered by the site; checksums prevent silent logo changes.
# Unavailable sources retained for restoration, but not requested by the frontend:
# https://methanol.org/wp-content/themes/methanol/images/logo.png (HTTP 404 on 2026-09-13)
# https://upload.wikimedia.org/wikipedia/en/thumb/0/0f/Maritime_and_Port_Authority_of_Singapore_%28logo%29.png/309px-Maritime_and_Port_Authority_of_Singapore_%28logo%29.png (HTTP 400 on 2026-09-13)
download_partner_logo \
  'https://upload.wikimedia.org/wikipedia/commons/c/c5/S%26P_Global_Platts_Logo.png' \
  '7a2d498224b54ed2664bbcec511bbc8d09ed74f0720b3486b7e77809df9a33c3' \
  'partner-platts-128.png'
download_partner_logo \
  'https://storage.googleapis.com/b2match-as-1/mCCdjrAQutyQ32CXm4PzfPUF' \
  '9ab6450ea166614a1464de1d9ca30c2aca2e0a2ff2d0a57ddcbe82a6a4a1194b' \
  'partner-gena-128.png'

# --- Right-sized WebP for `srcSet` (refactor step 3b) ------------------------
# The components render the wordmark 152 CSS px wide, the square mark 32 and
# the partner logos between 48 and 64, so each place gets a lossless WebP at 1x
# and 2x of that width. These files are what `src/utils/brandImages.ts` imports;
# the PNGs above stay as the `<img src>` fallback and as the public URLs other
# readers use (social card, favicon, structured data, e-mail).
#
# Lossless because the artwork is flat text and shapes: 1x/2x of a flat logo
# compresses to a few kilobytes, and a lossy re-encode of small white text
# would ring against the header background. Needs `cwebp` (libwebp-tools); the
# local ffmpeg build has no libwebp encoder, which is why this is a separate
# binary rather than another ffmpeg call.
build_brand_webp() {
  local source=$1
  local width=$2
  local height=$3
  local name=$4

  "$cwebp_bin" -quiet -lossless -z 9 -resize "$width" "$height" \
    "$repo_root/public/$source" -o "$repo_root/src/assets/brand/$name.webp"
}

mkdir -p "$repo_root/src/assets/brand"

# The wordmark masters are shown at three widths: the 152 px navigation and
# footer, the 180 px mobile gate and the 214 px invitation header.
build_brand_webp 'verdaxis-logo-words-right.png' 152 34 'logo-wordmark-152'
build_brand_webp 'verdaxis-logo-words-right.png' 304 68 'logo-wordmark-304'
build_brand_webp 'verdaxis-logo-words-right.png' 428 96 'logo-wordmark-428'

# The square mark fills the sidebar's 32 px logo tile.
build_brand_webp 'verdaxis-logo-no-words.png' 32 29 'logo-mark-32'
build_brand_webp 'verdaxis-logo-no-words.png' 64 57 'logo-mark-64'

# Partner logos, 1x and 2x of the 64 px tile the three call sites draw them in.
build_brand_webp 'partner-platts-128.png' 64 36 'partner-platts-64'
build_brand_webp 'partner-platts-128.png' 128 72 'partner-platts-128'
build_brand_webp 'partner-gena-128.png' 64 23 'partner-gena-64'
build_brand_webp 'partner-gena-128.png' 128 46 'partner-gena-128'

"$python_bin" - "$repo_root" "$social_font" <<'PY'
from pathlib import Path
import sys

from PIL import Image, ImageDraw, ImageFont

repo_root = Path(sys.argv[1])
font_path = Path(sys.argv[2])
logo = Image.open(repo_root / "public/verdaxis-logo-words-right.png").convert("RGBA")
logo.thumbnail((900, 210), Image.Resampling.LANCZOS)

card = Image.new("RGBA", (1200, 630), "#0F172A")
card.alpha_composite(logo, ((card.width - logo.width) // 2, 155))

descriptor = "Low Carbon Fuels Exchange"
font = ImageFont.truetype(font_path, 36)
draw = ImageDraw.Draw(card)
left, _, right, _ = draw.textbbox((0, 0), descriptor, font=font)
draw.text(((card.width - (right - left)) / 2, 410), descriptor, fill="#AEB7C2", font=font)

card.save(repo_root / "public/verdaxis-social-card.png", optimize=True, compress_level=9)
PY
