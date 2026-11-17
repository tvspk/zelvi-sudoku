#!/bin/sh
# Stavba APK Želví sudoku:  sh android/build.sh
# Verze je v android/verze.txt („versionCode versionName“). versionCode musí být u každé aktualizace vyšší.
# Podpisový klíč: v GitHub Actions z tajemství ZS_KEYSTORE (base64 .jks) a ZS_KEYSTORE_PASSWORD,
# místně ze souborů key/zelvi-sudoku.jks a key/heslo.txt (nejsou v repozitáři). Bez klíče se APK podepíše
# jednorázovým klíčem jen na zkoušku (release=no, nejde nainstalovat přes vydanou verzi).
set -e
cd "$(dirname "$0")"
read VC VN < verze.txt
[ -d tools ] || sh pripravit_nastroje.sh
T=tools; AJ=$T/drxiaozhi-minapk-0.4.0/package/tools; AAPT=$T/aaptjs3-2.0.2/package/bin/x64/linux/aapt2
rm -rf build && mkdir -p build/classes build/dex build/key out proj/assets
if [ -n "$ZS_KEYSTORE" ] && [ -n "$ZS_KEYSTORE_PASSWORD" ]; then
  printf %s "$ZS_KEYSTORE" | tr -d ' \r\n' | base64 -d > build/key/ks.jks; PW="$ZS_KEYSTORE_PASSWORD"; KS=build/key/ks.jks; REL=yes
elif [ -f key/zelvi-sudoku.jks ]; then
  PW=$(head -n1 key/heslo.txt | tr -d '\r'); KS=key/zelvi-sudoku.jks; REL=yes
else
  PW=zkusebni-heslo; KS=build/key/test.jks; REL=no
  keytool -genkeypair -keystore $KS -alias zelvi -keyalg RSA -keysize 2048 -validity 30 -storepass $PW -keypass $PW -dname "CN=test" >/dev/null 2>&1
fi
python3 -I scripts/make_index.py ../zelvi-sudoku.html proj/assets/index.html tools
$AAPT compile --dir proj/res -o build/res.zip
$AAPT link -o build/base.apk -I $AJ/android.jar --manifest proj/AndroidManifest.xml -A proj/assets build/res.zip \
  --min-sdk-version 26 --target-sdk-version 34 --version-code "$VC" --version-name "$VN" --replace-version
java -jar $AJ/ecj-3.45.0.jar -8 -nowarn -encoding UTF-8 -cp $AJ/android.jar -d build/classes proj/src
java -cp $AJ/d8.jar com.android.tools.r8.D8 --lib $AJ/android.jar --min-api 26 --release --output build/dex $(find build/classes -name '*.class')
(cd build/dex && zip -q ../base.apk classes.dex)
python3 -I scripts/zipalign.py build/base.apk build/aligned.apk
java -jar $AJ/apksigner.jar sign --ks $KS --ks-key-alias zelvi --ks-pass pass:"$PW" --key-pass pass:"$PW" \
  --min-sdk-version 26 --out out/zelvi-sudoku.apk build/aligned.apk
rm -rf build/key
java -jar $AJ/apksigner.jar verify -v --print-certs out/zelvi-sudoku.apk | grep -E "Verified|SHA-256|DN"
echo "$VN" > build/version; echo "$REL" > build/release
echo "HOTOVO: android/out/zelvi-sudoku.apk (verze $VN, versionCode $VC, vydání: $REL)"
