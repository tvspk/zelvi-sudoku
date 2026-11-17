# Regresní testy oprav z revize kódu (krok 4b): prázdný záznam Zpět, výhra po vrácení tahu, odolnost obnovy ze zálohy.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, base64
from playwright.async_api import async_playwright
from fontroute import route
fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}); await route(pg)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p.html')); await pg.click('[data-act=welcomeGo]')
    # A) plná mřížka s jednou chybou → automatické poznámky → Zpět nesmí spadnout
    await pg.click('[data-act=play][data-mode=quick]'); await pg.wait_for_timeout(400)
    g = (await st(pg))['game']; sol = g['sol']; emp = [i for i, v in enumerate(g['vals']) if not v]
    for k, i in enumerate(emp):
        d = sol[i] if k else (sol[i] % 6) + 1
        await pg.click(f'#board .cell[data-i="{i}"]'); await pg.click(f'.key[data-d="{d}"]')
    await pg.click('[data-act=more]'); await pg.click('[data-act=autonotes]'); n0 = len(errs)
    await pg.click('[data-act=undo]'); await pg.wait_for_timeout(100)
    ok('A: Zpět po poznámkách na plné mřížce bez chyby JS', len(errs) == n0, errs[n0:])
    ok('A: Zpět vrátil poslední zapsané číslo', (await st(pg))['game']['vals'][emp[-1]] == 0)
    # B) poslední číslo a hned Zpět → výhra se nesmí započítat
    await pg.click(f'#board .cell[data-i="{emp[0]}"]'); await pg.click(f'.key[data-d="{sol[emp[0]]}"]')   # oprava chyby
    await pg.click(f'#board .cell[data-i="{emp[-1]}"]'); await pg.click(f'.key[data-d="{sol[emp[-1]]}"]')
    await pg.click('[data-act=undo]'); await pg.wait_for_timeout(900)
    s = await st(pg)
    ok('B: výhra po vrácení posledního tahu se nezapočítá', s['stats']['solved'] == 0 and not s['game']['done'] and await pg.locator('[data-act=again]').count() == 0, s['stats']['solved'])
    await pg.click('[data-act=redo]'); await pg.wait_for_timeout(900)
    ok('B: po Znovu se výhra započítá', (await st(pg))['stats']['solved'] == 1)
    await pg.click('[data-act=home]')
    # C) podvržená záloha: HTML v počtu, neplatná pohlednice a statistika
    d = await st(pg); d['stats']['solved'] = '<img src=x onerror="window.__x=1">'; d['postcards'] = [99, 'x', 2]
    d['stats']['byKey']['zen-9'] = {'n': 1, 'best': 5, 'total': 5}; d['stats']['byKey']['nesmysl-1'] = {'n': 1, 'best': 5, 'total': 5}
    code = 'ZS1-' + base64.b64encode(json.dumps(d).encode()).decode()
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=backupRestore]'); await pg.fill('#bk-in', code); await pg.click('[data-act=backupCheck]')
    await pg.wait_for_timeout(200)
    ok('C: HTML z kódu se nevykreslí', await pg.locator('.sheet img').count() == 0 and not await pg.evaluate('window.__x'))
    await pg.click('[data-act=backupYes]'); n0 = len(errs)
    for t in ['home', 'map', 'awards']: await pg.click(f'.tab[data-v={t}]')
    await pg.click('[data-act=atab][data-t=stats]'); await pg.wait_for_timeout(100)
    ok('C: statistiky bez neplatných řádků', 'nesmysl' not in await pg.inner_text('#v-awards'))
    await pg.click('.tab[data-v=pet]'); await pg.wait_for_timeout(100)
    ok('C: neplatná data ze zálohy nerozbijí obrazovky', len(errs) == n0, errs[n0:])
    ok('C: platná pohlednice zůstala', await pg.locator('.postcard').count() == 1)
    ok('chyby v konzoli', not errs, errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'selhalo: ' + ', '.join(fails))
asyncio.run(main())
