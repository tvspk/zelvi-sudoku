# Želví sudoku

Hravé sudoku a další logické hry (Futoshiki, Binairo, Hashi, KenKen) se želvičkou, která s hraním roste.
Velká čísla a tlačítka, česky i anglicky, bez reklam a bez účtu.

| | |
|---|---|
| Webová verze (počítač, tablet) | https://tvspk.github.io/zelvi-sudoku/ |
| Android – vždy nejnovější APK | https://github.com/tvspk/zelvi-sudoku/releases/latest/download/zelvi-sudoku.apk |

## Data a synchronizace

- Postup se ukládá v zařízení (`localStorage`). Přenést ho jde zálohovacím kódem (Nastavení → Záloha postupu).
- **Synchronizace (nepovinná):** telefon, tablet a počítač si šifrovaně vyměňují postup přes **soukromý** repozitář na GitHubu
  (schránka, např. `zelvi-sudoku-sync`). Nastavení → Synchronizace → token, který smí jen do schránky (Contents: Read and write),
  a 8 slov párovacího kódu. GitHub vidí jen šifrovaná data (AES-256-GCM, klíč z 8 slov). Token a kód zůstávají v zařízení
  a nejsou v zálohovacím kódu.
- Body, vyřešené hry a statistiky se ze všech zařízení sčítají; odznaky, lekce a denní výzvy se spojí; rozehraná hra
  a jména platí naposledy změněné. Nastavení (písmo, vzhled, zvuky) má každé zařízení svoje.
- Jediné síťové spojení aplikace je `api.github.com`, a jen když je synchronizace zapnutá.

## Vývoj

- `zelvi-sudoku.html` – celá aplikace v jednom souboru (zdroj).
- `python3 scripts/build_web.py` – po každé změně: vytvoří `index.html` a `sw.js` pro GitHub Pages.
- `sh android/build.sh` – APK (viz `android/README.md`); na GitHubu ho staví a vydává workflow.
- `sh testy/spust_testy.sh` – automatické testy (Playwright), viz `testy/README.md`.
