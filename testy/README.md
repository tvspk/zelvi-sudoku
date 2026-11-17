# Testy Želvího sudoku

Automatické testy ovládají aplikaci v prohlížeči Chromium (Playwright) jako skutečný uživatel: klikají na políčka a tlačítka a kontrolují výsledek.

## Spuštění

Potřeba: `python3`, `pip install playwright cryptography` (+ `python3 -m playwright install chromium`), `node` a `npm`.

```sh
sh testy/spust_testy.sh
```

Skript:
1. při prvním spuštění stáhne písma Baloo 2 a Nunito z npm (`@fontsource`) do `testy/fonts/`,
2. z `../zelvi-sudoku.html` vytvoří testovací stránku `p.html` a vytáhne oba skripty (překlady i aplikaci) do `app.js`,
3. zkontroluje syntaxi JS (`node --check`),
4. spustí testy.

Řádky `OK …` a `výhra=True` znamenají úspěch, `FAIL …` chybu. Na konci každého testu je výpis chyb z konzole: má být prázdný (`[]`).

## Soubory

| Soubor | Účel |
|---|---|
| `test_cela_aplikace.py` | 46 kontrol celé aplikace |
| `test_sady_x_hry.py` | 6 sad znaků × 5 druhů her (Zen zrušen), každá kombinace dohraná do výhry |
| `test_klavesnice_poznamky.py` | klávesnice v režimu poznámek u všech sad + snímky `pad_*.png` |
| `test_napoveda.py` | kroky postupné nápovědy + snímky `hint*.png` |
| `test_poznamky_vzhled.py` | snímky poznámek u všech sad `n_*.png` ke kontrole očima |
| `test_futoshiki.py` | Futoshiki: 3 úrovně do výhry, nápověda až do konce, poznámky, lekce + snímky `fz_*.png` |
| `test_binairo.py` | Binairo: 3 úrovně do výhry (klepáním i nápovědou), chyba podle pravidel, zpět/znovu, lekce + snímky `bn_*.png` |
| `test_hashi.py` | Hashi: 3 úrovně do výhry (klepáním i nápovědou), klepnutí na mezeru, zákaz křížení, přeplněný ostrov = chyba až po chvilce, zpět/znovu, lekce + snímky `hs_*.png` |
| `test_hashi_node.js` | generátor Hashi v Node: rychlost, jediné řešení hrubou silou, obtížnost (bez prohlížeče) |
| `test_kenken.py` | KenKen: 3 úrovně do výhry (klepáním i nápovědou), skupinky a výpočty sedí na řešení, poznámky, chyba, zpět, lekce, upozornění „hraje se s čísly“ + snímky `kk_*.png` |
| `test_kenken_node.js` | generátor KenKen v Node: rychlost, jediné řešení hrubou silou, obtížnost, nápověda dohraje i náhodně rozehrané stavy (bez prohlížeče) |
| `test_opravy.py` | regresní testy oprav z revize kódu: Zpět po automatických poznámkách na plné mřížce, výhra po vrácení / znovu provedení tahu, obnova z podvržené zálohy |
| `test_generatory_node.js` | generátory sudoku, součtového sudoku, Futoshiki a Binaira v Node: jediné řešení, řešitelnost logikou, rychlost i v nejhorším případě |
| `test_revize2.py` | regresní testy druhé revize: nápověda se nepočítá dvakrát, panel nápovědy se vejde i s největším písmem (393×780), text „Rozehraná hra“, odložená chyba nepřežije „Začít znovu“, odolnost obnovy ze zálohy |
| `test_zen_zruseni.py` | zrušený Zen: není v nabídce ani odznacích, stará data a zálohy se Zen hrou se převedou na klasické sudoku |
| `test_texty_her.py` | u dalších her (KenKen, Futoshiki, Binairo, Hashi) se nikde nepíše o sudoku: okna výhry, upozornění, odznaky, bubliny želvičky, uvítání, Nastavení |
| `test_serie.py` | série dní za jakoukoli hru: všechny druhy her prodlouží sérii, víc her za den = jeden den, vynechaný den, nedohraná hra, přes půlnoc, odznaky 3/7/30 dní, přepočet ze starých dat, obnova ze zálohy, poškozená data |
| `test_dny.py` | denní výzva přes více dní s posouváním hodin (série, vynechaný den, hra přes půlnoc, stejné zadání pro všechny, Ranní ptáče, Noční sova), 1000. hra (ostrovy, pohlednice, úroveň, odznaky), gramatika čísel („zbývá 1 hra“, „chybějí 3 body“) |
| `test_nahodne.py` | náhodné klepání a klávesy po celé aplikaci (výchozí 1500 kroků × 3 průchody; `python3 test_nahodne.py 3000 1,2,3,4,5`), hlídá chyby JS, změněné zadání, schované nástroje a vodorovné přetečení | Třetí parametr = jazyky (výchozí `cs,en`): každý seed proběhne v obou jazycích; přepínač jazyka se nevolí (stránka by se znovu načetla).
| `test_rozhrani_her.py` | rozhraní dalších her se dvěma zkušebními hrami (vkládá je do kopie `p_rozhrani.html`) + snímky `rozhrani_*.png` |
| `test_jazyky.py` | dvě jazykové verze: každý pár z `ZS_EN` sedí na kód, anglický skript bez češtiny a s platnou syntaxí, přepínání na uvítací obrazovce i v Nastavení, postup se při přepnutí neztratí, anglická nápověda a výhra |
| `fontroute.py` | podstrčí písma místo Google Fonts (ty bývají v testovacím prostředí blokované) |
| `priprav_stranku.py` | vytvoří `p.html` a `app.js` z aplikace |

Testy čtou rozehranou hru (včetně řešení `sol`) z `localStorage['zelvi-sudoku-v1']`, takže umí sudoku dohrát bez hádání.

## Testy proti APK

V `priprav_stranku.py` místo `../zelvi-sudoku.html` s doplněnou hlavičkou zkopírovat do `p.html` rovnou `proj/assets/index.html` ze stavebnice APK (už má hlavičku i písma). Kontroly specifické pro APK jsou ve stavebnici: `scripts/test_apk.py`.
| `test_synchronizace.py` | 75 kontrol synchronizace přes napodobený GitHub (každé zařízení = vlastní kontext prohlížeče): nastavení, šifrování, sčítání postupu ze 2–5 zařízení, souběžné hry, rozehraná hra i na otevřené herní obrazovce, nastavení a jazyk (písmo ne), prázdné jméno z verze 1.7, smazané jméno nepřepíše vyplněné, připojení zařízení s postupem (převzít / přičíst), token, vypnutí, smazání dat, angličtina, záloha bez tokenu, poškozená data, automatické nahrání a stažení. S `ZS_URL=http://…/index.html` totéž proti webové verzi (kontrola CSP). Běží ve skutečném čase (~3,5 min). |
| `test_qr.py` | 19 kontrol párování QR kódem: zobrazení / skrytí, obsah jen `ZELVI:` + 8 slov, skenování falešnou kamerou Chromia (video z obrázku QR, potřebuje `ffmpeg`), cizí QR kód, Zrušit vypne kameru, nepovolená kamera, angličtina |
| `test_aktualizace.py` | 18 kontrol nabídky nové verze v APK (napodobené `ZSAndroid.version/open` a API posledního vydání): pruh jen na domovské obrazovce, Stáhnout otevře APK, Později na den, dotaz nejvýš jednou za 20 h, porovnání verzí (1.10 > 1.9), nesmyslná odpověď, web bez dotazu, angličtina, 360 px s největším písmem + snímek `up_bar.png` |
