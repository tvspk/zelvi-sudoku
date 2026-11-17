#!/bin/sh
# Spustí všechny testy. Potřebuje: python3 + playwright (s Chromiem), node, npm.
set -e
cd "$(dirname "$0")"
[ -d fonts/node_modules ] || (mkdir -p fonts && cd fonts && npm init -y >/dev/null && npm i @fontsource/baloo-2 @fontsource/nunito >/dev/null)
python3 priprav_stranku.py
node --check app.js && echo "Syntaxe JS: OK"
python3 test_cela_aplikace.py
python3 test_sady_x_hry.py
python3 test_klavesnice_poznamky.py
python3 test_napoveda.py
python3 test_rozhrani_her.py
python3 test_futoshiki.py
python3 test_binairo.py
python3 test_hashi.py
node test_hashi_node.js
python3 test_kenken.py
node test_kenken_node.js
python3 test_opravy.py
node test_generatory_node.js
python3 test_revize2.py
python3 test_dny.py
python3 test_serie.py
python3 test_texty_her.py
python3 test_zen_zruseni.py
python3 test_jazyky.py
python3 test_synchronizace.py
python3 test_qr.py
python3 test_aktualizace.py
python3 test_nahodne.py 3000 1,2,3,4,5
