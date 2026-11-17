# Futoshiki: všechny 3 úrovně dohrané do výhry, nápověda dovede hru do konce jen logickými kroky,
# automatické poznámky nikdy nevyloučí správné číslo, lekce ve Škole, odznak. Snímky fz_*.png ke kontrole očima.
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
    await pg.click('.tab[data-v=home]'); await pg.click('[data-act=pick][data-mode=futoshiki]')
    await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await pg.wait_for_timeout(400)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}); await route(pg)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p.html')); await pg.click('[data-act=welcomeGo]')
    ok('domů: Futoshiki v Dalších hrách', 'Futoshiki' in await pg.inner_text('#v-home'))
    for lv, N in [(0, 4), (1, 5), (2, 6)]:
        await start(pg, lv)
        g = (await st(pg))['game']
        ok(f'úroveň {lv}: mřížka {N}×{N}', g['N'] == N and await pg.locator('#board .cell').count() == N * N)
        rel = g['rel']; sol = g['sol']
        ok(f'úroveň {lv}: znaménka sedí na řešení', all(sol[a] < sol[c] for a, c in rel) and all(abs(a - c) in (1, N) for a, c in rel), len(rel))
        ok(f'úroveň {lv}: znaménka vykreslena', (await pg.get_attribute('#board .fz path', 'd')).count('M') == len(rel))
        ok(f'úroveň {lv}: klávesnice 1–{N}', await pg.locator('#pad .key[data-act=num]').count() == N)
        await pg.screenshot(path=f'fz_hra_{N}.png')
        if lv == 0:
            # automatické poznámky nesmí vyloučit správné číslo
            await pg.click('[data-act=more]'); await pg.click('[data-act=autonotes]'); g = (await st(pg))['game']
            ok('auto poznámky obsahují řešení', all(g['notes'][i] & (1 << sol[i]) for i in range(N * N) if not g['vals'][i]))
            await pg.screenshot(path='fz_poznamky.png')
            await pg.click('[data-act=more]'); await pg.click('[data-act=clearnotes]')
        if lv in (1, 2):
            # nápověda krok za krokem až do konce: nikdy „zapeklité místo“
            stuck = 0; steps = 0; texts = set()
            while not await pg.locator('[data-act=again]').count() and steps < 60:
                await pg.click('[data-act=hint]')
                while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
                t = await pg.inner_text('#hint-panel p'); texts.add(t.split('.')[0])
                if 'zapeklité' in t: stuck += 1
                if steps == 3 and lv == 1: await pg.screenshot(path='fz_napoveda.png')
                await pg.click('[data-act=hintReveal]'); steps += 1; await pg.wait_for_timeout(50)
                if await pg.locator('[data-act=again]').count() == 0: await pg.wait_for_timeout(500)
            ok(f'úroveň {lv}: nápověda vyřešila hru logikou', stuck == 0 and await pg.locator('[data-act=again]').count() == 1, f'kroků {steps}, zapeklitých {stuck}')
            if lv == 1: print('   ukázky textů:', sorted(texts)[:4])
        else:
            for i, v in enumerate(g['vals']):
                if v != sol[i]: await pg.click(f'#board .cell[data-i="{i}"]'); await pg.click(f'.key[data-d="{sol[i]}"]')
            await pg.wait_for_timeout(900)
            ok(f'úroveň {lv}: výhra', await pg.locator('[data-act=again]').count() == 1)
        await pg.click('[data-act=home]')
    s = await st(pg)
    ok('statistiky: 3 futoshiki', s['stats']['games'].get('futoshiki') == 3 and all(f'futoshiki-{k}' in s['stats']['byKey'] for k in range(3)))
    ok('odznak Větší, menší', 'fz1' in s['ach'])
    # chyba a nápověda s chybou
    await start(pg, 0); g = (await st(pg))['game']; e = g['vals'].index(0); wrong = 1 if g['sol'][e] != 1 else 2
    await pg.click(f'#board .cell[data-i="{e}"]'); await pg.click(f'.key[data-d="{wrong}"]')
    ok('chyba označena', 'err' in await pg.get_attribute(f'#board .cell[data-i="{e}"]', 'class'))
    await pg.click('[data-act=hint]'); await pg.click('[data-act=hintMore]'); ok('nápověda najde chybu', await pg.locator('[data-act=hintFix]').count() == 1)
    await pg.click('[data-act=hintFix]'); await pg.click('[data-act=leave]')
    # lekce
    await pg.click('[data-act=go][data-v=school]')
    await pg.click('[data-act=glesson][data-g=futoshiki][data-k="0"]'); await pg.screenshot(path='fz_lekce1.png', full_page=True)
    await pg.click('[data-act=gans][data-v="4"]'); ok('lekce 1', (await st(pg))['lessons'].get('futoshiki-0'))
    await pg.click('[data-act=glesson][data-k="1"]'); await pg.click('[data-act=gans][data-v="3"]'); ok('lekce 2 špatně', await pg.locator('.feedback.no').count() == 1)
    await pg.click('[data-act=gans][data-v="2"]'); ok('lekce 2', (await st(pg))['lessons'].get('futoshiki-1'))
    await pg.screenshot(path='fz_lekce2.png', full_page=True)
    # tmavý vzhled + největší písmo
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=skin][data-s=noc]'); await pg.click('[data-act=set][data-k=fs][data-v="1.3"]')
    await start(pg, 2); await pg.screenshot(path='fz_noc_6.png')
    ok('chyby v konzoli', not errs, errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'selhalo: ' + ', '.join(fails))
asyncio.run(main())
