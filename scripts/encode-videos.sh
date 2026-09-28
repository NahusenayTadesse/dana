#!/usr/bin/env bash
# Encodes the video masters in media-src/ into the renditions the site serves
# from static/videos/<slug>/:
#
#   clip.mp4       1920x1080, desktop
#   clip-720.mp4   1280x720, phones and narrow windows
#   poster.jpg     first frame of clip.mp4, so the poster -> video fade is seamless
#   spin/*.webp    (turntable clips only) stills for the factory-page orbit viewer
#
# Usage: scripts/encode-videos.sh [masters-dir]   (default media-src/2026-09-logo-masters)
# Masters are named <slug>.mp4. Audio is dropped: every clip plays muted.
set -euo pipefail

MASTERS=${1:-media-src/2026-09-logo-masters}
OUT=static/videos

# Clips the factory page lets visitors drag through. The drag seeks the footage,
# so these get a keyframe every 8 frames instead of every 2 seconds.
SCRUBBED="apartment-green"
SPIN_FRAMES=20

encode() { # <in> <out> <width> <crf> <maxrate> <gop>
	ffmpeg -v error -y -i "$1" -an \
		-vf "scale=$3:-2:flags=lanczos" \
		-c:v libx264 -preset slow -crf "$4" -maxrate "$5" -bufsize "$(( ${5%M} * 2 ))M" \
		-profile:v high -pix_fmt yuv420p -g "$6" -keyint_min "$6" -sc_threshold 0 \
		-movflags +faststart "$2"
}

for master in "$MASTERS"/*.mp4; do
	slug=$(basename "$master" .mp4)
	dir="$OUT/$slug"
	mkdir -p "$dir"

	gop=60
	[[ " $SCRUBBED " == *" $slug "* ]] && gop=8

	echo "→ $slug"
	encode "$master" "$dir/clip.mp4" 1920 27 5M "$gop"
	encode "$master" "$dir/clip-720.mp4" 1280 28 2M "$gop"
	ffmpeg -v error -y -i "$dir/clip.mp4" -frames:v 1 -q:v 6 "$dir/poster.jpg"

	if [[ " $SCRUBBED " == *" $slug "* ]]; then
		mkdir -p "$dir/spin/hi"
		duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$dir/clip.mp4")
		for ((i = 0; i < SPIN_FRAMES; i++)); do
			at=$(awk -v d="$duration" -v i="$i" -v n="$SPIN_FRAMES" 'BEGIN { printf "%.3f", d * i / n }')
			name=$(printf '%02d' "$i")
			ffmpeg -v error -y -ss "$at" -i "$dir/clip.mp4" -frames:v 1 -vf "scale=1600:-2:flags=lanczos" \
				-c:v libwebp -quality 80 "$dir/spin/hi/$name.webp"
			ffmpeg -v error -y -ss "$at" -i "$dir/clip.mp4" -frames:v 1 -vf "scale=800:-2:flags=lanczos" \
				-c:v libwebp -quality 78 "$dir/spin/$name.webp"
		done
	fi
done

du -sh "$OUT"/*
