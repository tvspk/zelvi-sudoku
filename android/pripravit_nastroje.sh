#!/bin/sh
# Stáhne nástroje pro stavbu APK z npm (Google Maven není potřeba). Spustit jednou.
set -e
cd "$(dirname "$0")"
mkdir -p tools && cd tools
for p in @drxiaozhi/minapk@0.4.0 aaptjs3@2.0.2 @fontsource/baloo-2@5.3.0 @fontsource/nunito@5.3.0 @fontsource/vt323@5.3.0; do npm pack "$p" >/dev/null 2>&1; done
for f in *.tgz; do d=${f%.tgz}; mkdir -p "$d" && tar xzf "$f" -C "$d"; done
chmod +x aaptjs3-2.0.2/package/bin/x64/linux/aapt2
echo "Nástroje připravené v tools/"
