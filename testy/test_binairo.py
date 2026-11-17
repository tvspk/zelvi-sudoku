# Binairo: všechny 3 úrovně dohrané klepáním, nápověda dovede hru do konce logikou (bez „zapeklitého místa“),
# chyba podle pravidel (tři stejná) se počítá a ukáže, zadaná kolečka nejdou měnit, zpět/znovu, lekce, statistiky, odznak.
# Snímky bn_*.png ke kontrole očima.
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
    await pg.click('.tab[data-v=home]'); await pg.click('[data-act=pick][data-mode=binairo]')
    await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await pg.wait_for_timeout(400)
async def setv(pg, i, cur, v):
    for _ in range((v - cur) % 3): await pg.click(f'#board .cell[data-i="{i}"]')

def valid(sol, N):
    rows = [sol[r*N:(r+1)*N] for r in range(N)]; cols = [[sol[r*N+c] for r in range(N)] for c in range(N)]
    for L in (rows, cols):
        if len(set(map(tuple, L))) != N: return False
        for x in L:
            if x.count(1) != N // 2 or any(x[k] == x[k+1] == x[k+2] for k in range(N - 2)): return False
    return True

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}); await route(pg)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p.html')); await pg.click('[data-act=welcomeGo]')
    ok('domů: Binairo v Dalších hrách', 'Binairo' in await pg.inner_text('#v-home'))
    await pg.screenshot(path='bn_domov.png', full_page=True)
    for lv, N in [(0, 6), (1, 8), (2, 10)]:
        await start(pg, lv)
        g = (await st(pg))['game']; sol = g['sol']
        ok(f'úroveň {lv}: mřížka {N}×{N}', g['N'] == N and await pg.locator('#board .cell').count() == N * N)
        ok(f'úroveň {lv}: řešení splňuje pravidla', valid(sol, N))
        ok(f'úroveň {lv}: bez Poznámek', await pg.locator('[data-act=notes]').count() == 0)
        ok(f'úroveň {lv}: podtitul', f'{N}×{N}' in await pg.inner_text('#g-level'))
        await pg.screenshot(path=f'bn_hra_{N}.png')
        if lv == 0:
            gi = next(i for i in range(N*N) if g['puzzle'][i])
            await pg.click(f'#board .cell[data-i="{gi}"]')
            ok('zadané kolečko nejde změnit', (await st(pg))['game']['vals'][gi] == g['puzzle'][gi])
            # chyba podle pravidel: prázdné políčko, kde bílé udělá trojici (a černé ne)
            def triple(t, i):
                r, c = divmod(i, N); line = [t[r*N+k] for k in range(N)]; col = [t[k*N+c] for k in range(N)]
                return any(x[k] and x[k] == x[k+1] == x[k+2] for x in (line, col) for k in range(N-2))
            # náhodné zadání nemusí mít vhodné místo: zkusit až 10 nových her
            for attempt in range(10):
                vals = g['vals']; bad = None
                for i in range(N*N):
                    if vals[i]: continue
                    tw = vals[:]; tw[i] = 1; tb = vals[:]; tb[i] = 2
                    if triple(tw, i) and not triple(tb, i): bad = i; break
                if bad is not None: break
                await start(pg, lv); g = (await st(pg))['game']; sol = g['sol']
            if bad is not None:
                i = bad; await setv(pg, i, 0, 2); await pg.wait_for_timeout(1800)
                ok('přeskočení bílé cestou k černé není chyba', (await st(pg))['game']['mistakes'] == 0)
                await setv(pg, i, 2, 1)
                ok('bílá trojice hned nezčervená', 'err' not in await pg.get_attribute(f'#board .cell[data-i="{i}"]', 'class') and (await st(pg))['game']['mistakes'] == 0)
                await pg.wait_for_timeout(1800); g2 = (await st(pg))['game']
                ok('trojice po chvilce = chyba', g2['mistakes'] == 1 and 'err' in await pg.get_attribute(f'#board .cell[data-i="{i}"]', 'class'))
                await pg.screenshot(path='bn_chyba.png')
                await pg.click('[data-act=hint]'); await pg.click('[data-act=hintMore]')
                ok('nápověda najde chybu', await pg.locator('[data-act=hintFix]').count() == 1)
                await pg.click('[data-act=hintFix]')
                ok('chyba smazána', (await st(pg))['game']['vals'][i] == 0)
                await pg.click('[data-act=undo]'); ok('zpět vrátí kolečko', (await st(pg))['game']['vals'][i] == 1)
                await pg.click('[data-act=redo]'); ok('znovu ho smaže', (await st(pg))['game']['vals'][i] == 0)
            else: ok('trojice = chyba (nenašel jsem místo)', False)
            g = (await st(pg))['game']
            for i in range(N*N):
                if g['vals'][i] != sol[i]: await setv(pg, i, g['vals'][i], sol[i])
            await pg.wait_for_timeout(900)
            ok(f'úroveň {lv}: výhra klepáním', await pg.locator('[data-act=again]').count() == 1)
            ok('tlačítko Další binairo', 'Další binairo' in await pg.inner_text('[data-act=again]'))
        else:
            stuck = 0; steps = 0; texts = set()
            while not await pg.locator('[data-act=again]').count() and steps < 120:
                await pg.click('[data-act=hint]')
                while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
                t = await pg.inner_text('#hint-panel p'); texts.add(t[:40])
                if 'zapeklité' in t: stuck += 1
                if steps == 2: await pg.screenshot(path=f'bn_napoveda_{N}.png')
                await pg.click('[data-act=hintReveal]'); steps += 1; await pg.wait_for_timeout(30)
                if 0 not in (await st(pg))['game']['vals']: await pg.wait_for_timeout(900)
            ok(f'úroveň {lv}: nápověda vyřešila hru logikou', stuck == 0 and await pg.locator('[data-act=again]').count() == 1, f'kroků {steps}, zapeklitých {stuck}')
            print('   ukázky textů:', sorted(texts)[:6])
        await pg.click('[data-act=home]')
    s = await st(pg)
    ok('statistiky: 3 binairo', s['stats']['games'].get('binairo') == 3 and all(f'binairo-{k}' in s['stats']['byKey'] for k in range(3)))
    ok('odznak Černá na bílém', 'bn1' in s['ach'])
    # lekce
    await pg.click('[data-act=go][data-v=school]')
    ok('Škola: oddíl Binairo', 'Binairo' in await pg.inner_text('#v-school'))
    await pg.click('[data-act=glesson][data-g=binairo][data-k="0"]'); await pg.screenshot(path='bn_lekce1.png', full_page=True)
    await pg.click('[data-act=gans][data-v="2"]'); ok('lekce 1 špatně', await pg.locator('.feedback.no').count() == 1)
    await pg.click('[data-act=gans][data-v="1"]'); ok('lekce 1', (await st(pg))['lessons'].get('binairo-0'))
    await pg.click('[data-act=glesson][data-k="1"]'); await pg.click('[data-act=gans][data-v="2"]'); ok('lekce 2', (await st(pg))['lessons'].get('binairo-1'))
    await pg.click('[data-act=glesson][data-k="2"]'); await pg.click('[data-act=gans][data-v="2"]'); ok('lekce 3', (await st(pg))['lessons'].get('binairo-2'))
    await pg.screenshot(path='bn_lekce3.png', full_page=True)
    # tmavý vzhled + největší písmo + jiná sada znaků (nesmí nic rozbít, ani vyvolat upozornění na čísla)
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=skin][data-s=noc]'); await pg.click('[data-act=set][data-k=fs][data-v="1.3"]')
    await pg.click('[data-act=set][data-k=symbols][data-v=balls]')
    await start(pg, 0)
    ok('bez upozornění na čísla', await pg.locator('#toast:not([hidden])').count() == 0)
    g = (await st(pg))['game']; e = g['vals'].index(0); await setv(pg, e, 0, 2)
    await pg.screenshot(path='bn_noc_6.png')
    await pg.click('[data-act=leave]'); await start(pg, 2); await pg.screenshot(path='bn_noc_10.png')
    ok('chyby v konzoli', not errs, errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'selhalo: ' + ', '.join(fails))
asyncio.run(main())
