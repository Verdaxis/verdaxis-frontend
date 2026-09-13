#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ffmpeg_bin=${FFMPEG_BIN:-ffmpeg}
python_bin=${PYTHON_BIN:-python3}
social_font=${SOCIAL_FONT:-/usr/share/fonts/truetype/lato/Lato-Regular.ttf}
curl_bin=${CURL_BIN:-curl}

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
