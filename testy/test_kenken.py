# KenKen: všechny 3 úrovně dohrané do výhry, skupinky pokrývají mřížku a sedí na řešení, nápověda dovede hru do konce
# jen logickými kroky, automatické poznámky nikdy nevyloučí správné číslo, chyba, lekce, odznak. Snímky kk_*.png ke kontrole očima.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json
from playwright.async_api import async_playwright
from fontroute import route

fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def start(pg, lv):
    await pg.click('.tab[data-v=home]'); await pg.click('[data-act=pick][data-mode=kenken]')
    await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await pg.wait_for_timeout(400)
def cage_ok(cg, sol, N):
    v = [sol[i] for i in cg['cells']]; op = cg['op']; t = cg['t']
    if op == '=': return len(v) == 1 and v[0] == t and cg['label'] == ''
    if op == '+': r = sum(v) == t
    elif op == '*':
        p = 1
        for x in v: p *= x
        r = p == t
    elif op == '-': r = len(v) == 2 and abs(v[0] - v[1]) == t
    else: r = len(v) == 2 and max(v) == t * min(v)
    return r and cg['label'] == str(t) + {'+': '+', '-': '−', '*': '×', '/': '÷'}[op]
OPS = {0: {'+', '='}, 1: {'+', '-', '='}, 2: {'+', '-', '*', '/', '='}}

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}); await route(pg)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p.html')); await pg.click('[data-act=welcomeGo]')
    ok('domů: KenKen v Dalších hrách', 'KenKen' in await pg.inner_text('#v-home'))
    await pg.screenshot(path='kk_domu.png', full_page=True)
    texts = set()
    for lv, N in [(0, 4), (1, 5), (2, 6)]:
        await start(pg, lv)
        g = (await st(pg))['game']; sol = g['sol']; cages = g['cages']
        ok(f'úroveň {lv}: mřížka {N}×{N}', g['N'] == N and await pg.locator('#board .cell').count() == N * N)
        cover = sorted(i for c in cages for i in c['cells'])
        ok(f'úroveň {lv}: skupinky pokrývají mřížku', cover == list(range(N * N)) and all(g['cage'][i] == k for k, c in enumerate(cages) for i in c['cells']))
        ok(f'úroveň {lv}: výpočty sedí na řešení', all(cage_ok(c, sol, N) for c in cages), len(cages))
        ok(f'úroveň {lv}: povolené počty', {c['op'] for c in cages} <= OPS[lv], sorted({c['op'] for c in cages}))
        ok(f'úroveň {lv}: zadaná čísla = skupinky s jedním políčkem', all((g['puzzle'][i] != 0) == (cages[g['cage'][i]]['op'] == '=') for i in range(N * N)))
        labels = await pg.locator('#board .sum').count()
        ok(f'úroveň {lv}: štítky skupinek', labels == sum(1 for c in cages if c['op'] != '='), labels)
        ok(f'úroveň {lv}: okraje skupinek vykresleny', await pg.locator('#board svg.cages path').count() == 1)
        ok(f'úroveň {lv}: klávesnice 1–{N}', await pg.locator('#pad .key[data-act=num]').count() == N)
        await pg.screenshot(path=f'kk_hra_{N}.png')
        if lv == 0:
            await pg.click('[data-act=more]'); await pg.click('[data-act=autonotes]'); g2 = (await st(pg))['game']
            ok('auto poznámky obsahují řešení', all(g2['notes'][i] & (1 << sol[i]) for i in range(N * N) if not g2['vals'][i]))
            ok('auto poznámky něco vyloučí', any(g2['notes'][i] != ((1 << (N + 1)) - 2) for i in range(N * N) if not g2['vals'][i]))
            await pg.screenshot(path='kk_poznamky.png')
            await pg.click('[data-act=more]'); await pg.click('[data-act=clearnotes]')
            for i, v in enumerate(g['vals']):
                if v != sol[i]: await pg.click(f'#board .cell[data-i="{i}"]'); await pg.click(f'.key[data-d="{sol[i]}"]')
            await pg.wait_for_timeout(900)
            ok(f'úroveň {lv}: výhra', await pg.locator('[data-act=again]').count() == 1)
        else:
            stuck = 0; steps = 0
            while not await pg.locator('[data-act=again]').count() and steps < 60:
                await pg.click('[data-act=hint]')
                first = await pg.inner_text('#hint-panel p')
                ok_target = True
                while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
                t = await pg.inner_text('#hint-panel p'); texts.add(t)
                if 'zapeklité' in t: stuck += 1
                if steps == 2: await pg.screenshot(path=f'kk_napoveda_{N}.png')
                await pg.click('[data-act=hintReveal]'); steps += 1; await pg.wait_for_timeout(50)
                if await pg.locator('[data-act=again]').count() == 0: await pg.wait_for_timeout(500)
            ok(f'úroveň {lv}: nápověda vyřešila hru logikou', stuck == 0 and await pg.locator('[data-act=again]').count() == 1, f'kroků {steps}, zapeklitých {stuck}')
        await pg.click('[data-act=home]')
    print('   ukázky textů nápovědy:'); [print('    -', t) for t in sorted(texts)[:12]]
    ok('nápověda: žádné nedosazené ${…} ani undefined', not any('undefined' in t or '${' in t or 'NaN' in t for t in texts))
    s = await st(pg)
    ok('statistiky: 3 kenken', s['stats']['games'].get('kenken') == 3 and all(f'kenken-{k}' in s['stats']['byKey'] for k in range(3)))
    ok('odznak První počty', 'kk1' in s['ach'])
    # chyba, nápověda s chybou, zpět
    await start(pg, 0); g = (await st(pg))['game']; e = g['vals'].index(0); wrong = 1 if g['sol'][e] != 1 else 2
    await pg.click(f'#board .cell[data-i="{e}"]'); await pg.click(f'.key[data-d="{wrong}"]')
    ok('chyba označena', 'err' in await pg.get_attribute(f'#board .cell[data-i="{e}"]', 'class'))
    ok('chyba započtena', (await st(pg))['game']['mistakes'] == 1)
    await pg.click('[data-act=hint]'); await pg.click('[data-act=hintMore]'); ok('nápověda najde chybu', await pg.locator('[data-act=hintFix]').count() == 1)
    await pg.click('[data-act=hintFix]'); ok('chyba smazána', (await st(pg))['game']['vals'][e] == 0)
    await pg.click('[data-act=undo]'); ok('zpět vrátí číslo', (await st(pg))['game']['vals'][e] == wrong)
    # první krok nápovědy na čerstvé hře: zvýrazní, ale ještě neoznačí políčko
    await pg.click('[data-act=undo]'); await pg.click('[data-act=hint]')
    ok('nápověda krok 1 zvýrazní oblast', await pg.locator('#board .cell.hh').count() > 0 and await pg.locator('#board .cell.ht').count() == 0)
    await pg.click('[data-act=hintMore]')
    while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
    ok('nápověda poslední krok označí políčko', await pg.locator('#board .cell.ht').count() == 1)
    await pg.click('[data-act=hintClose]'); await pg.click('[data-act=leave]')
    # lekce
    await pg.click('[data-act=go][data-v=school]')
    ok('Škola: oddíl KenKen', 'KenKen' in await pg.inner_text('#v-school'))
    await pg.click('[data-act=glesson][data-g=kenken][data-k="0"]'); await pg.screenshot(path='kk_lekce1.png', full_page=True)
    ok('lekce 1: štítky a okraje', await pg.locator('.g-mini .sum').count() == 2 and await pg.locator('.g-mini svg.cages').count() == 1)
    await pg.click('[data-act=gans][data-v="4"]'); ok('lekce 1', (await st(pg))['lessons'].get('kenken-0'))
    await pg.click('[data-act=glesson][data-k="1"]'); await pg.click('[data-act=gans][data-v="1"]'); ok('lekce 2 špatně', await pg.locator('.feedback.no').count() == 1)
    await pg.click('[data-act=gans][data-v="2"]'); ok('lekce 2', (await st(pg))['lessons'].get('kenken-1'))
    await pg.screenshot(path='kk_lekce2.png', full_page=True)
    await pg.click('[data-act=glesson][data-k="2"]'); await pg.click('[data-act=gans][data-v="14"]'); ok('lekce 3', (await st(pg))['lessons'].get('kenken-2'))
    await pg.screenshot(path='kk_lekce3.png', full_page=True)
    ok('po lekci tlačítko Vyzkoušet hru', await pg.locator('[data-act=play][data-mode=kenken]').count() == 1)
    # upozornění „hraje se s čísly“ při jiné sadě znaků
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=set][data-k=symbols][data-v=fruit]')
    await start(pg, 0); ok('upozornění: hraje se s čísly', 'počítá' in await pg.inner_text('#toast'))
    ok('ovoce se v KenKenu neukáže', '🍎' not in await pg.inner_text('#board') and '🍎' not in await pg.inner_text('#pad'))
    # tmavý vzhled + největší písmo
    await pg.click('[data-act=leave]'); await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=set][data-k=symbols][data-v=num]')
    await pg.click('[data-act=skin][data-s=noc]'); await pg.click('[data-act=set][data-k=fs][data-v="1.3"]')
    await start(pg, 2); await pg.screenshot(path='kk_noc_6.png')
    ok('chyby v konzoli', not errs, errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'selhalo: ' + ', '.join(fails))
asyncio.run(main())
