# Denní výzva přes více dní (posouvání hodin): série, zmeškaný den, hra přes půlnoc, stejné zadání pro všechny,
# Ranní ptáče / Noční sova; dlouhodobé hraní: 1000. hra, ostrovy, pohlednice, úroveň a odznaky.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, datetime as dt
from playwright.async_api import async_playwright
from fontroute import route
fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
T = lambda d, h=10, m=0, s=0: dt.datetime(2026, 11, d, h, m, s)
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def solve(pg, leave_last=False):
    g = (await st(pg))['game']; emp = [i for i, v in enumerate(g['vals']) if not v]
    if leave_last: emp = emp[:-1]
    for i in emp:
        await pg.click(f'#board .cell[data-i="{i}"]'); await pg.keyboard.press(str(g['sol'][i]))
    return g
async def page(b, t, init=None):
    pg = await b.new_page(viewport={'width': 393, 'height': 800}); await route(pg)
    await pg.clock.install(time=t)
    if init: await pg.add_init_script("localStorage.getItem('zelvi-sudoku-v1')||localStorage.setItem('zelvi-sudoku-v1',%s)" % json.dumps(json.dumps(init)))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.errs = errs
    await pg.goto('file://' + os.path.abspath('p.html'))
    return pg
async def win_daily(pg):
    await pg.click('[data-act=daily]'); await pg.clock.run_for(200); await solve(pg); await pg.clock.run_for(1500)
    ok_ = await pg.locator('[data-act=home]').count() == 1
    if ok_: await pg.click('[data-act=home]')
    return ok_
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    # stejné zadání denní výzvy pro všechny
    a = await page(b, T(2)); await a.click('[data-act=welcomeGo]'); await a.click('[data-act=daily]'); await a.clock.run_for(200)
    c = await page(b, T(2, 18)); await c.click('[data-act=welcomeGo]'); await c.click('[data-act=daily]'); await c.clock.run_for(200)
    ok('stejné zadání denní výzvy pro dva hráče téhož dne', (await st(a))['game']['puzzle'] == (await st(c))['game']['puzzle'])
    await c.close()
    pg = a; await pg.click('[data-act=leave]')
    # den 2, 3, 4 v řadě
    ok('2. 11.: výhra', await win_daily(pg))
    s = await st(pg); ok('2. 11.: série 1, splněno', s['daily']['done'].get('2026-11-02') and s['daily']['best'] == 1)
    ok('2. 11.: tlačítko nahradí „máte vyřešené“', await pg.locator('[data-act=daily]').count() == 0 and 'máte vyřešené' in await pg.locator('.done-note').inner_text())
    for d in (3, 4):
        await pg.clock.set_system_time(T(d)); await pg.click('.tab[data-v=map]'); await pg.click('.tab[data-v=home]')
        ok(f'{d}. 11.: nový den nabídne novou výzvu', await pg.locator('[data-act=daily]').count() == 1)
        ok(f'{d}. 11.: výhra', await win_daily(pg))
    s = await st(pg); ok('3 dny v řadě: série 3 a odznak „Tři dny v řadě“', s['daily']['best'] == 3 and 'd3' in s['ach'], s['daily']['best'])
    ok('na domovské obrazovce série 3', (await pg.locator('.flame').inner_text()).strip() == '3')
    # vynechaný den 5 → den 6
    await pg.clock.set_system_time(T(6)); await pg.click('.tab[data-v=map]'); await pg.click('.tab[data-v=home]')
    ok('po vynechaném dni série 0', (await pg.locator('.flame').inner_text()).strip() == '0')
    ok('zmeškaný den nejde dohrát (jen dnešní výzva)', await pg.locator('[data-act=daily]').count() == 1)
    ok('6. 11.: výhra', await win_daily(pg))
    s = await st(pg); ok('po vynechání: série 1, nejdelší zůstává 3', (await pg.locator('.flame').inner_text()).strip() == '1' and s['daily']['best'] == 3)
    # přes půlnoc: začne 7. 11. ve 23:59, dohraje 8. 11.
    await pg.clock.set_system_time(T(7, 23, 59, 0)); await pg.click('.tab[data-v=map]'); await pg.click('.tab[data-v=home]')
    await pg.click('[data-act=daily]'); await pg.clock.run_for(200); seed7 = (await st(pg))['game']['dateKey']
    await solve(pg, leave_last=True); await pg.clock.set_system_time(T(8, 0, 1)); await solve(pg); await pg.clock.run_for(1500)
    s = await st(pg); ok('výzva začatá před půlnocí se připíše svému dni', seed7 == '2026-11-07' and s['daily']['done'].get('2026-11-07') and not s['daily']['done'].get('2026-11-08'))
    ok('po půlnoci časně ráno: Ranní ptáče', 'early' in s['ach'])
    await pg.click('[data-act=home]')
    ok('8. 11.: dnešní výzva je nová, série 3 (6., 7. výzva a 8. dohráno)', await pg.locator('[data-act=daily]').count() == 1 and (await pg.locator('.flame').inner_text()).strip() == '3')
    await pg.clock.set_system_time(T(8, 22, 30)); ok('8. 11. ve 22:30: výhra', await win_daily(pg))
    s = await st(pg); ok('Noční sova', 'owl' in s['ach'])
    ok('statistiky dní: hraní zapsané v kalendáři', all(s['stats']['days'].get(f'2026-11-0{d}') for d in (2, 3, 4, 6, 8)))
    await pg.click('.tab[data-v=awards]'); await pg.click('[data-act=atab][data-t=stats]')
    ok('kalendář: 5 týdnů, dnešek označený', await pg.locator('.cal i').count() == 35 and await pg.locator('.cal i.t').count() == 1)
    ok('chyby v konzoli (dny)', not pg.errs, pg.errs); await pg.close()
    # dlouhodobé hraní: 999 vyřešených → 1000. hra
    init = {'v': 2, 'welcomed': True, 'xp': 61000, 'stats': {'solved': 999, 'byKey': {}, 'times': [], 'perfect': 30, 'nohint': 30, 'zen': 0, 'quick': 0, 'diag': 0, 'killer': 0, 'expert': 0, 'early': 0, 'owl': 0, 'fastEasy': 0, 'fastMed': 0, 'days': {}, 'games': {}}, 'postcards': list(range(10)) * 8 + [0, 1], 'pet': {'name': 'Rozárka', 'pets': 0, 'wear': {'head': 'crown', 'face': None, 'neck': None}}}
    pg = await page(b, T(10), init)
    await pg.click('.tab[data-v=map]'); m = await pg.locator('.mapinfo').inner_text()
    ok('999 her: 9. kolo, ostrov 4 (Majákový), krok 3 z 12', 'kolo 9' in m.lower() and 'ostrov 4 z 10' in m.lower() and 'Majákový' in m and 'Krok 3 z 12' in m, m.replace('\n', ' / '))
    await pg.click('.tab[data-v=home]'); await pg.click('#v-home [data-act=play][data-mode=quick]'); await pg.clock.run_for(200); await solve(pg); await pg.clock.run_for(1500)
    w = await pg.locator('#modal').inner_text(); s = await st(pg)
    ok('1000. hra: odznak Tisícovka', s['stats']['solved'] == 1000 and 's1000' in s['ach'] and 'Tisícovka' in w)
    ok('úroveň a stádium želvy dávají smysl', 'Úroveň' in w, [l for l in w.split('\n') if 'Úroveň' in l])
    await pg.click('[data-act=home]'); await pg.click('.tab[data-v=pet]'); pt = await pg.locator('#v-pet').inner_text()
    ok('Pradávná želva s korunkou, 82 pohlednic se vykreslí', 'Pradávná želva' in pt and await pg.locator('.postcard').count() == 82, [l for l in pt.split('\n') if 'úroveň' in l])
    await pg.click('.tab[data-v=awards]'); await pg.click('[data-act=atab][data-t=stats]'); await pg.click('.tab[data-v=settings]')
    ok('vzhledy odemčené (Retro herna)', await pg.locator('.skin[data-s=retro]:not([disabled])').count() == 1)
    ok('chyby v konzoli (dlouhé hraní)', not pg.errs, pg.errs)
    await pg.close()
    # gramatika čísel: 11 vyřešených (1 krok do ostrova), 97 bodů (do úrovně 2 chybějí 3 body)
    init2 = dict(init); init2['xp'] = 97; init2['postcards'] = []; init2['stats'] = dict(init['stats'], solved=11)
    pg = await page(b, T(10), init2)
    await pg.click('.tab[data-v=map]'); m = await pg.locator('#v-map').inner_text()
    ok('„zbývá 1 hra“ a „Doplujete po 1 další hře“', 'zbývá 1 hra.' in m and 'po 1 další hře' in m and 'po 13 dalších hrách' in m)
    await pg.click('.tab[data-v=pet]'); t = await pg.locator('#v-pet').inner_text()
    ok('„chybějí 3 body“', 'Do další úrovně chybějí 3 body.' in t, [l for l in t.split('\n') if 'chyb' in l])
    ok('chyby v konzoli (gramatika)', not pg.errs, pg.errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'SELHALO: ' + ', '.join(fails))
asyncio.run(main())
