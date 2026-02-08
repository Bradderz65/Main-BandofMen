# Favicon Runbook

This repo serves favicons from the `favicon/` folder and references them from:
- `index.html`
- `account.html`
- `favicon/site.webmanifest`

## Source Image

Use a single square-ish PNG source (with transparency if possible), e.g.:
- `simplelogo.png`
- `favicon1.png`
- `favicon2.png`

## Generate Favicon Set (Crop-To-Fill)

This method scales the source to fill each target size, then crops to an exact square.
It keeps transparency (RGBA) for the PNG outputs.

Requirements:
- `ffmpeg`
- `ImageMagick` (`magick`) for building a multi-resolution `.ico`

From the project root:

```bash
set -euo pipefail

SRC="favicon2.png"      # change this to your source file
OUTDIR="favicon"

mk_fill() {
  local size="$1"
  local out="$2"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$SRC" \
    -vf "scale=${size}:${size}:force_original_aspect_ratio=increase:flags=lanczos,crop=${size}:${size},format=rgba" \
    -frames:v 1 "$OUTDIR/$out"
}

mk_fill 16  favicon-16x16.png
mk_fill 32  favicon-32x32.png
mk_fill 48  favicon-48x48.png
mk_fill 180 apple-touch-icon.png
mk_fill 192 android-chrome-192x192.png
mk_fill 512 android-chrome-512x512.png

# Build favicon.ico containing multiple sizes.
magick \
  "$OUTDIR/favicon-16x16.png" \
  "$OUTDIR/favicon-32x32.png" \
  "$OUTDIR/favicon-48x48.png" \
  "$OUTDIR/favicon.ico"

rm -f "$OUTDIR/favicon-48x48.png"
```

## Generate Favicon Set (Fit-Inside + Pad)

If you want the logo to never crop, use fit-inside + transparent padding:

```bash
set -euo pipefail

SRC="simplelogo.png"
OUTDIR="favicon"

mk_pad() {
  local size="$1"
  local out="$2"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$SRC" \
    -vf "scale=${size}:${size}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba" \
    -frames:v 1 "$OUTDIR/$out"
}

mk_pad 16  favicon-16x16.png
mk_pad 32  favicon-32x32.png
mk_pad 48  favicon-48x48.png
mk_pad 180 apple-touch-icon.png
mk_pad 192 android-chrome-192x192.png
mk_pad 512 android-chrome-512x512.png

magick \
  "$OUTDIR/favicon-16x16.png" \
  "$OUTDIR/favicon-32x32.png" \
  "$OUTDIR/favicon-48x48.png" \
  "$OUTDIR/favicon.ico"

rm -f "$OUTDIR/favicon-48x48.png"
```

## Verify Outputs

```bash
file favicon/favicon.ico \
     favicon/favicon-16x16.png \
     favicon/favicon-32x32.png \
     favicon/apple-touch-icon.png \
     favicon/android-chrome-192x192.png \
     favicon/android-chrome-512x512.png
```

Optional: compare checksums before/after deploy:
```bash
sha256sum favicon/favicon-32x32.png
curl -sS -o /tmp/live_favicon32.png "https://bandofmen.uk/favicon/favicon-32x32.png"
sha256sum /tmp/live_favicon32.png
```

## Deploy

```bash
npx -y netlify-cli deploy --prod --dir . --functions netlify/functions --message "Update favicons"
```

## Notes

- Browsers and Google cache favicons aggressively. You may need a hard refresh or time for caches to update.
- Keep `favicon/site.webmanifest` pointing at the correct icon files.

