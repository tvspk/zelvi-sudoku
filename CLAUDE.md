# Pravidla pro práci na Želvím sudoku

- **Žádné osobní údaje** v repozitáři (je veřejný): žádná skutečná jména uživatelů, věk, rodinné vztahy. V ukázkách a testech
  používej obecná jména (Jana, Rozárka). Podpisový klíč, heslo, tokeny ani párovací kód sem nikdy nepatří.
- Zdroj je `zelvi-sudoku.html`. **Po každé změně spusť `python3 scripts/build_web.py`** (index.html a sw.js pro web);
  workflow jinak skončí chybou „Neaktuální“.
- Nový český text v aplikaci = nový pár v tabulce `ZS_EN` (anglická verze vzniká nahrazením přesných úseků). Texty
  synchronizace jsou ve slovníku `SYT` (obě jazykové verze přímo v kódu).
- Nová verze APK: zvyš `android/verze.txt` („versionCode versionName“, versionCode vždy o 1 výš). Push do `main` → Actions
  postaví a vydá `v<verze>`. Klíč je v Secrets `ZELVI_KEYSTORE` (base64 .jks, alias `zelvi`) a `ZELVI_KEYSTORE_PASSWORD`.
  Jiný klíč = aktualizace nejde nainstalovat a postup v telefonu by se ztratil.
- Při změně struktury stavu `S` zvyš `v` a přidej migraci; `migrate1` a `tidy` nemazat (chrání stará data a zálohy).
- Synchronizace (blok „synchronizace“ v `zelvi-sudoku.html`): počítadla se sčítají přes vlastní příspěvek zařízení
  (`own = stav − součet ostatních`, `SY.dev`), proto se stav `S` a `localStorage['zelvi-sync']` vždy ukládají spolu.
  Nové počítadlo ve statistikách = doplnit `SY_CNT` (a regulární výraz `SY_RE_CNT`), nová množina = `sySets`/`syUnion`,
  nová hodnota „naposledy změněné vyhrává“ = `SY_LW` (nastavení přes `SY_SET`, velikost písma `fs` záměrně ne; výchozí
  hodnota má váhu 0, takže nikdy nepřepíše vyplněnou – `syDef`). Formát ve schránce má `v:1`; při nekompatibilní změně ho zvyš.
- QR párování: knihovna `window.ZSQR` (samostatný `<script>` před překlady, převzatá z MemoChatu), QR = `ZELVI:` + 8 slov velkými
  písmeny, bez tokenu. Kamera v APK přes `WebChromeClient.onPermissionRequest` + oprávnění CAMERA (ptá se až při skenování).
- Nabídka nové verze (jen APK): jednou za 20 h `GET /repos/tvspk/zelvi-sudoku/releases/latest` (bez tokenu), porovná s
  `ZSAndroid.version()`, pruh na domovské obrazovce; `ZSAndroid.open` otevře jen adresy vydání tohoto repozitáře. Tag vydání = `v<versionName>`.
- Testy: `sh testy/spust_testy.sh`; synchronizace `python3 testy/test_synchronizace.py` (napodobený GitHub, ~3,5 min), QR `testy/test_qr.py`,
  APK `android/scripts/test_apk.py`. Skutečné API GitHubu z prostředí netestuj.
