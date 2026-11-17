# Stavba APK

```sh
sh android/build.sh          # stáhne nástroje (npm, jednou), postaví android/out/zelvi-sudoku.apk
```

- Na GitHubu staví APK workflow `.github/workflows/apk.yml` při každém pushi do `main`. Když je v `android/verze.txt` nová verze,
  vytvoří vydání `v<verze>` se souborem `zelvi-sudoku.apk`.
- Podpisový klíč není v repozitáři: GitHub Secrets `ZS_KEYSTORE` (base64 souboru .jks) a `ZS_KEYSTORE_PASSWORD`.
  Místně stačí `android/key/zelvi-sudoku.jks` a `android/key/heslo.txt` (složka `key/` je v `.gitignore`).
- **Každá aktualizace musí mít vyšší versionCode a být podepsaná stejným klíčem**, jinak ji Android nenainstaluje přes starou
  verzi (a postup v aplikaci by se ztratil s odinstalováním).
- `scripts/make_index.py` udělá z `zelvi-sudoku.html` samostatný `index.html` (vložená písma, tlačítko Zpět, barvy lišt).
- `scripts/test_apk.py`: kontroly specifické pro APK (zkopírovat `proj/assets/index.html` vedle skriptu jako `p_apk.html`).
