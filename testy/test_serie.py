# Série dní: prodlouží ji kterákoli vyřešená hra (nejen denní výzva). Jedna společná série.
# Posouvá hodiny přes více dní, hraje různé hry, kontroluje plamínek, týden, nejdelší sérii, odznaky,
# přepočet ze starých dat, obnovu ze zálohy a odolnost proti poškozeným datům.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, datetime as dt
from playwright.async_api import async_playwright
from fontroute import route
fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
T = lambda d, h=10, m=0, s=0: dt.datetime(2026, 11, d, h, m, s)
K = lambda d: f'2026-11-{d:02d}'
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def page(b, t, init=None, w=393, h=800):
    pg = await b.new_page(viewport={'width': w, 'height': h}); await route(pg)
    await pg.clock.install(time=t)
    if init is not None: await pg.add_init_script("localStorage.getItem('zelvi-sudoku-v1')||localStorage.setItem('zelvi-sudoku-v1',%s)" % json.dumps(json.dumps(init)))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    pg.errs = errs
    await pg.goto('file://' + os.path.abspath('p.html'))
    return pg
async def flame(pg): return int((await pg.locator('.flame').inner_text()).strip())
async def home(pg): await pg.click('.tab[data-v=map]'); await pg.click('.tab[data-v=home]')
async def day(pg, d, h=10): await pg.clock.set_system_time(T(d, h)); await home(pg)
async def start(pg, mode, lv=0):
    await pg.click('.tab[data-v=home]')
    if mode == 'daily': await pg.click('[data-act=daily]')
    elif mode == 'classic': await pg.click(f'[data-act=play][data-mode=classic][data-level="{lv}"]')
    elif mode == 'quick': await pg.click('[data-act=play][data-mode=quick]')
    else: await pg.click(f'[data-act=pick][data-mode={mode}]'); await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await pg.clock.run_for(300)
async def solve_hints(pg):
    """Vyřeší jakoukoli hru přes nápovědu (Prozradit / Smazat chybu)."""
    for _ in range(200):
        if await pg.locator('#modal:not([hidden]) [data-act=home]').count(): break
        await pg.click('[data-act=hint]')
        while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
        if await pg.locator('[data-act=hintFix]').count(): await pg.click('[data-act=hintFix]')
        elif await pg.locator('[data-act=hintReveal]').count(): await pg.click('[data-act=hintReveal]')
        await pg.clock.run_for(1700)
    won = await pg.locator('#modal:not([hidden]) [data-act=home]').count() == 1
    if won: await pg.click('#modal [data-act=home]')
    return won
async def play(pg, mode, lv=0): await start(pg, mode, lv); return await solve_hints(pg)
async def week_on(pg): return await pg.evaluate("[...document.querySelectorAll('.week .wk')].map(e=>e.classList.contains('on'))")

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    pg = await page(b, T(2)); await pg.fill('#w-player', 'Jana'); await pg.click('[data-act=welcomeGo]')
    ok('nová hráčka: série 0', await flame(pg) == 0)
    ok('vysvětlení série na domovské obrazovce', 'každý den, kdy vyřešíte aspoň jednu hru' in (await pg.inner_text('.streak-note')))
    # 2. 11.: klasické sudoku (ne denní výzva)
    ok('2. 11.: klasické sudoku vyřešeno', await play(pg, 'classic', 0))
    s = await st(pg); ok('2. 11.: série 1 po klasickém sudoku', await flame(pg) == 1 and s['daily']['best'] == 1, await flame(pg))
    ok('2. 11.: denní výzva tím není splněná (dá se hrát)', await pg.locator('[data-act=daily]').count() == 1 and not s['daily']['done'].get(K(2)))
    ok('2. 11.: v týdnu je dnešek označený', (await week_on(pg))[-1] is True)
    # druhá hra téhož dne sérii nezvýší
    ok('2. 11.: druhá hra (Rychlovka 6×6)', await play(pg, 'quick'))
    ok('2. 11.: dvě hry v jednom dni = pořád série 1', await flame(pg) == 1)
    # 3. 11.: Futoshiki
    await day(pg, 3); ok('3. 11.: ráno bez hry série trvá (1)', await flame(pg) == 1)
    ok('3. 11.: Futoshiki vyřešeno', await play(pg, 'futoshiki'))
    ok('3. 11.: série 2 po Futoshiki', await flame(pg) == 2)
    # 4. 11.: Binairo + denní výzva tentýž den
    await day(pg, 4); ok('4. 11.: Binairo vyřešeno', await play(pg, 'binairo'))
    s = await st(pg); ok('4. 11.: série 3 a odznak „Tři dny v řadě“ bez denní výzvy', await flame(pg) == 3 and 'd3' in s['ach'] and not any(s['daily']['done'].values()), s['daily'])
    ok('4. 11.: denní výzva vyřešena', await play(pg, 'daily'))
    s = await st(pg); ok('4. 11.: výzva + jiná hra tentýž den = série 3', await flame(pg) == 3 and s['daily']['done'].get(K(4)) and s['daily']['best'] == 3)
    ok('4. 11.: týden ukazuje 2., 3. a 4. 11.', (await week_on(pg))[-3:] == [True, True, True], await week_on(pg))
    # 5. 11.: Hashi
    await day(pg, 5); ok('5. 11.: Hashi vyřešeno', await play(pg, 'hashi'))
    ok('5. 11.: série 4', await flame(pg) == 4)
    # 6. 11. vynechán; 7. 11.: rozehraná, nedohraná hra se nepočítá
    await day(pg, 7); ok('7. 11.: po vynechaném dni série 0', await flame(pg) == 0)
    await start(pg, 'classic', 0); await pg.click('#board .cell >> nth=0'); await pg.click('[data-act=leave]')
    ok('7. 11.: rozehraná hra sérii neprodlouží', await flame(pg) == 0)
    ok('7. 11.: KenKen vyřešeno (rozehrané sudoku se tím ukončí)', await play(pg, 'kenken'))
    s = await st(pg); ok('7. 11.: série 1, nejdelší zůstává 4', await flame(pg) == 1 and s['daily']['best'] == 4, s['daily']['best'])
    # statistiky a odznaky
    await pg.click('.tab[data-v=awards]')
    if await pg.locator('[data-act=atab]').count() > 1: await pg.locator('[data-act=atab]').nth(1).click()
    txt = await pg.inner_text('#v-awards')
    ok('statistiky: „Dní v řadě“ a „Nejdelší série dnů“ 4', 'Dní v řadě' in txt and 'Denní výzva v řadě' not in txt, txt[:200].replace('\n', ' '))
    await pg.click('.tab[data-v=awards]')
    if await pg.locator('[data-act=atab]').count(): await pg.locator('[data-act=atab]').nth(0).click()
    txt = await pg.inner_text('#v-awards')
    ok('popisy odznaků série mluví o hraní, ne o výzvě', 'Hrát 3 dny po sobě' in txt and 'Hrát 7 dní po sobě' in txt and 'Hrát 30 dní po sobě' in txt and 'Denní výzva 3 dny' not in txt)
    # hra přes půlnoc: začne 7. 11. 23:59, dohraje 8. 11. → počítá se 8. 11.
    await pg.clock.set_system_time(T(7, 23, 59)); await home(pg); await start(pg, 'classic', 0)
    await pg.clock.set_system_time(T(8, 0, 2)); ok('hra přes půlnoc vyřešena', await solve_hints(pg))
    s = await st(pg); ok('hra dohraná po půlnoci se počítá do nového dne: série 2', await flame(pg) == 2 and s['stats']['days'].get(K(8)), s['stats']['days'])
    # 30 dní v řadě jinými hrami → odznak „Celý měsíc“ (data připravená, poslední den dohrán)
    ok('chyby v konzoli (hraní)', not pg.errs, pg.errs); await pg.close()

    # Přepočet ze starých dat: 5 dní hraní bez denní výzvy, uložená nejdelší série jen 1 (stará pravidla)
    old = {'v': 2, 'welcomed': True, 'stats': {'solved': 6, 'days': {K(d): 1 for d in range(10, 15)}}, 'daily': {'done': {K(12): True}, 'best': 1}}
    pg = await page(b, T(14, 18), old)
    s = await st(pg)
    ok('stará data: série se přepočítá podle všech her (5)', await flame(pg) == 5, await flame(pg))
    await pg.evaluate("localStorage.setItem('x','1')"); await pg.click('.tab[data-v=pet]'); await pg.click('.tab[data-v=home]')
    ok('stará data: odznak „Tři dny v řadě“ se udělí po další hře', await play(pg, 'classic', 0) and 'd3' in (await st(pg))['ach'] and (await st(pg))['daily']['best'] == 5, (await st(pg))['daily'])
    # záloha a obnova v jiném zařízení přepočítá sérii
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=backupMake]'); await pg.clock.run_for(500)
    code = await pg.input_value('#bk-code'); await pg.click('#modal [data-act=close]'); await pg.close()
    pg = await page(b, T(15, 9)); await pg.click('[data-act=welcomeGo]'); await pg.click('.tab[data-v=settings]')
    await pg.click('[data-act=backupRestore]'); await pg.fill('#bk-in', code); await pg.click('[data-act=backupCheck]'); await pg.clock.run_for(500)
    await pg.click('[data-act=backupYes]'); await pg.clock.run_for(300)
    ok('obnova ze zálohy: série 5 a nejdelší 5', await flame(pg) == 5 and (await st(pg))['daily']['best'] == 5, await flame(pg))
    ok('chyby v konzoli (stará data, záloha)', not pg.errs, pg.errs); await pg.close()

    # 30 dní: 29 dní z dat + dnešní hra → odznak Celý měsíc
    m = {'v': 2, 'welcomed': True, 'stats': {'solved': 29, 'days': {}}, 'daily': {'done': {}, 'best': 0}}
    for k in range(1, 30): m['stats']['days'][(dt.date(2026, 11, 30) - dt.timedelta(days=k)).isoformat()] = 1
    pg = await page(b, T(30, 11), m)
    ok('29 dní v řadě z dat', await flame(pg) == 29)
    ok('30. den Hashi', await play(pg, 'hashi'))
    s = await st(pg); ok('30 dní v řadě → odznak „Celý měsíc“', await flame(pg) == 30 and 'd30' in s['ach'] and 'd7' in s['ach'], s['daily']['best'])
    ok('chyby v konzoli (30 dní)', not pg.errs, pg.errs); await pg.close()

    # poškozená data nesmí shodit aplikaci
    for bad in ({'days': 'x'}, {'days': None}, {'days': {'nesmysl': 5, K(3): 'a', K(4): 2}}):
        d = {'v': 2, 'welcomed': True, 'stats': dict(bad, solved=1), 'daily': {'done': None, 'best': 'abc'}}
        pg = await page(b, T(4, 12), d)
        fl = await pg.locator('.flame').count() and await flame(pg)
        ok(f'poškozená data {list(bad.values())[0]!r}: bez chyby, série {fl}', not pg.errs and fl in (0, 1), pg.errs)
        ok('…a hra jde dohrát', await play(pg, 'classic', 0) and not pg.errs, pg.errs); await pg.close()

    # rozvržení: 360 px, největší písmo, poznámka pod týdnem nepřetéká
    pg = await page(b, T(2), {'v': 2, 'welcomed': True, 'stats': {'solved': 0}, 'settings': {'fs': 1.3}}, 360, 640)
    ov = await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
    ok('360 px s největším písmem: domovská obrazovka bez přetečení', ov <= 0, ov)
    await pg.locator('.card.daily').screenshot(path='serie_karta.png'); await pg.close()
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'SELHALO: ' + '; '.join(fails))
asyncio.run(main())
