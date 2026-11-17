# Zen byl zrušen (krok 8). Kontroluje, že po něm nic nezůstalo v nabídce a že stará data se Zenem nic nerozbijí:
# rozehraná hra Zen pokračuje jako Klasické sudoku, statistiky, graf, odznaky, záloha, data z verze 1.
import os, sys, re; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json
from playwright.async_api import async_playwright
from fontroute import route
fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def page(b, init=None, w=393, h=800):
    pg = await b.new_page(viewport={'width': w, 'height': h}); await route(pg)
    if init is not None: await pg.add_init_script("localStorage.getItem('zelvi-sudoku-v1')||localStorage.setItem('zelvi-sudoku-v1',%s)" % json.dumps(json.dumps(init)))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    pg.errs = errs
    await pg.goto('file://' + os.path.abspath('p.html')); await pg.wait_for_timeout(300)
    return pg
async def solve(pg):
    g = (await st(pg))['game']
    for i, v in enumerate(g['vals']):
        if not v: await pg.click(f'#board .cell[data-i="{i}"]'); await pg.keyboard.press(str(g['sol'][i]))
    await pg.wait_for_timeout(1000)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    # 1) čistá aplikace: Zen nikde
    pg = await page(b); await pg.click('[data-act=welcomeGo]')
    home = await pg.inner_text('#v-home')
    ok('domov: žádná dlaždice Zen', await pg.locator('[data-mode=zen]').count() == 0 and not re.search(r'\bZen\b', home))
    ok('domov: ostatní způsoby hry zůstaly (Úhlopříčky, 6×6, Součtové)', all(x in home for x in ['Úhlopříčky', 'Rychlovka 6×6', 'Součtové sudoku']))
    await pg.click('.tab[data-v=awards]'); aw = await pg.inner_text('#v-awards')
    ok('Úspěchy: odznak Klidná mysl zmizel, počet odznaků 32 (dřív 33)', 'Klidná mysl' not in aw and 'z 32 odznaků' in aw, re.search(r'z \d+ odznaků', aw).group(0))
    for v in ['settings', 'map', 'pet']:
        await pg.click(f'.tab[data-v={v}]'); ok(f'záložka {v}: bez Zenu', not re.search(r'\bZen\b', await pg.inner_text(f'#v-{v}')))
    # klasické sudoku teď ukazuje hodiny a chyby normálně
    await pg.click('.tab[data-v=home]'); await pg.click('[data-act=play][data-mode=classic][data-level="0"]'); await pg.wait_for_timeout(500)
    ok('hra: stavový řádek s chybami a nápovědami', 'Chyby: 0' in await pg.inner_text('#g-status'))
    await solve(pg); win = await pg.inner_text('#modal')
    ok('výhra: čas a chyby se ukazují', '—' not in win.split('Nápovědy')[0] and 'Čas' in win)
    ok('chyby v konzoli (čistá aplikace)', not pg.errs, pg.errs); await pg.close()

    # 2) stará data: rozehraná Zen hra, Zen statistiky, časy, odznak
    pg = await page(b); await pg.click('[data-act=welcomeGo]')
    await pg.click('[data-act=play][data-mode=classic][data-level="1"]'); await pg.wait_for_timeout(500)
    await pg.click('#board .cell >> nth=0'); await pg.click('[data-act=leave]')
    d = await st(pg); g = d['game']
    g['mode'] = 'zen'; g['time'] = 777; g['mistakes'] = 4
    d['stats']['zen'] = 7; d['stats']['solved'] = 9
    d['stats']['byKey'].update({'zen-1': {'n': 5, 'best': 200, 'total': 1500}, 'zen-3': {'n': 2, 'best': 600, 'total': 1300}, 'classic-0': {'n': 2, 'best': 100, 'total': 250}})
    d['stats']['times'] = [{'t': 300, 'k': 'zen-1', 'd': '2026-10-20'}, {'t': 100, 'k': 'classic-0', 'd': '2026-10-21'}, {'t': 150, 'k': 'classic-0', 'd': '2026-10-22'}, {'t': 400, 'k': 'zen-3', 'd': '2026-10-22'}]
    d['ach']['zen'] = '2026-10-20'; d['ach']['first'] = '2026-10-01'
    puzzle = g['puzzle']
    await pg.close()
    pg = await page(b, d)
    home = await pg.inner_text('#v-home')
    ok('stará rozehraná Zen hra: nabídnuta jako Klasické sudoku · Velmi lehká', 'Klasické sudoku · Velmi lehká' in home and 'Zen' not in home, home[:200].replace('\n', ' '))
    s = await st(pg)
    ok('převod: čas a chyby od nuly, zadání a vyplněná čísla zůstala', s['game']['mode'] == 'classic' and s['game']['time'] == 0 and s['game']['mistakes'] == 0 and s['game']['puzzle'] == puzzle and s['game']['vals'][:] == g['vals'])
    ok('převod: statistiky Zenu pryč, klasické zůstaly', not any(k.startswith('zen') for k in s['stats']['byKey']) and s['stats']['byKey']['classic-0']['n'] == 2 and 'zen' not in s['stats'])
    ok('převod: časy Zenu z grafu pryč', [x['k'] for x in s['stats']['times']] == ['classic-0', 'classic-0'])
    ok('převod: odznak Zenu smazán, ostatní zůstaly', 'zen' not in s['ach'] and 'first' in s['ach'])
    ok('převod: počet vyřešených her zůstal (9)', s['stats']['solved'] == 9)
    await pg.click('[data-act=continue]'); await pg.wait_for_timeout(500)
    ok('pokračování: hra běží jako klasická (hodiny, chyby)', 'Chyby: 0' in await pg.inner_text('#g-status') and 'Klasické sudoku' in await pg.inner_text('.g-title'))
    await solve(pg); s = await st(pg)
    ok('převedená hra jde dohrát a započítá se jako klasická', await pg.locator('[data-act=again]').count() == 1 and s['stats']['solved'] == 10 and s['stats']['byKey']['classic-1']['n'] == 1)
    await pg.click('#modal [data-act=home]'); await pg.click('.tab[data-v=awards]')
    if await pg.locator('[data-act=atab]').count() > 1: await pg.locator('[data-act=atab]').nth(1).click()
    t = await pg.inner_text('#v-awards')
    ok('statistiky: tabulka bez řádků Zen, graf se vykreslí', 'Zen' not in t and await pg.locator('#v-awards svg').count() >= 1)
    ok('chyby v konzoli (stará data)', not pg.errs, pg.errs)
    # 3) záloha se Zen hrou z jiného zařízení
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=backupMake]'); await pg.wait_for_timeout(400)
    await pg.close()
    zd = dict(d); zd['game'] = dict(g, mode='zen', time=50, mistakes=2)
    import base64
    code = 'ZS1-' + base64.b64encode(json.dumps(zd).encode('utf-8')).decode()
    pg = await page(b); await pg.click('[data-act=welcomeGo]'); await pg.click('.tab[data-v=settings]')
    await pg.click('[data-act=backupRestore]'); await pg.fill('#bk-in', code); await pg.click('[data-act=backupCheck]'); await pg.wait_for_timeout(400)
    restored = False
    if await pg.locator('[data-act=backupYes]').count(): await pg.click('[data-act=backupYes]'); await pg.wait_for_timeout(300); restored = True
    s = await st(pg)
    ok('obnova zálohy se Zen hrou: hra převedena na klasickou, Zen statistiky pryč', restored and s['game'] and s['game']['mode'] == 'classic' and not any(k.startswith('zen') for k in s['stats']['byKey']) and 'zen' not in s['ach'])
    await pg.click('[data-act=continue]'); await pg.wait_for_timeout(400)
    ok('…a jde dohrát', (await solve(pg)) is None and await pg.locator('[data-act=again]').count() == 1)
    ok('chyby v konzoli (záloha)', not pg.errs, pg.errs); await pg.close()
    # 4) data z verze 1 (4 obtížnosti) s rozehranou Zen hrou
    v1 = {'v': 1, 'welcomed': True, 'stats': {'solved': 3, 'byKey': {'zen-0': {'n': 3, 'best': 300, 'total': 900}, 'classic-1': {'n': 1, 'best': 400, 'total': 400}}, 'times': []},
          'game': dict(g, mode='zen', level=1), 'xp': 60}
    pg = await page(b, v1); s = await st(pg)
    ok('verze 1 se Zenem: převedeno (klasická, obtížnost +2), statistiky klasické zůstaly', s['game'] and s['game']['mode'] == 'classic' and s['game']['level'] == 3 and 'classic-3' in s['stats']['byKey'] and not any(k.startswith('zen') for k in s['stats']['byKey']), s.get('game') and (s['game']['mode'], s['game']['level']))
    ok('chyby v konzoli (verze 1)', not pg.errs, pg.errs); await pg.close()
    # 5) rozvržení domovské obrazovky bez Zenu na 360 px s největším písmem
    pg = await page(b, {'v': 2, 'welcomed': True, 'stats': {'solved': 0}, 'settings': {'fs': 1.3}}, 360, 640)
    ok('360 px, největší písmo: bez přetečení', await pg.evaluate("document.documentElement.scrollWidth-innerWidth") <= 0)
    await pg.locator('#v-home').screenshot(path='zen_domov.png'); await pg.close()
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'SELHALO: ' + '; '.join(fails))
asyncio.run(main())
