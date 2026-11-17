# Hashi: všechny 3 úrovně (lehká dohraná klepáním ostrov → soused, střední a těžší nápovědou až do konce bez „zapeklitého místa“),
# řešení splňuje pravidla, klepnutí na mezeru, křížení mostů zakázané, přeplněný ostrov = chyba až po chvilce (cesta přes 2 k 0 není chyba),
# nápověda najde chybu, zpět/znovu, lekce, statistiky, odznak, tmavý vzhled s největším písmem. Snímky hs_*.png ke kontrole očima.
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
    await pg.click('.tab[data-v=home]'); await pg.click('[data-act=pick][data-mode=hashi]')
    await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await pg.wait_for_timeout(400)

def build(N, cells, nums):
    """stejná stavba hran jako hsBuild v aplikaci"""
    at = {c: k for k, c in enumerate(cells)}; edges = []
    for k, c in enumerate(cells):
        r0, c0 = divmod(c, N)
        for h in (1, 0):
            r, cc, between = r0, c0, []
            while True:
                if h: cc += 1
                else: r += 1
                if r >= N or cc >= N: break
                x = r * N + cc
                if x in at: edges.append({'a': k, 'b': at[x], 'h': h, 'cells': between}); break
                between.append(x)
    cross = [[f for f, F in enumerate(edges) if f != e and set(E['cells']) & set(F['cells'])] for e, E in enumerate(edges)]
    return edges, cross

def valid(g):
    N, cells, nums, sol = g['N'], g['cells'], g['nums'], g['sol']
    edges, cross = build(N, cells, nums)
    if len(edges) != len(sol): return False
    if any(v > 2 for v in sol): return False
    for k, n in enumerate(nums):
        if sum(sol[e] for e, E in enumerate(edges) if k in (E['a'], E['b'])) != n: return False
    if any(sol[e] and any(sol[f] for f in cross[e]) for e in range(len(edges))): return False
    seen = {0}; stack = [0]
    while stack:
        i = stack.pop()
        for e, E in enumerate(edges):
            if sol[e] and i in (E['a'], E['b']):
                j = E['b'] if E['a'] == i else E['a']
                if j not in seen: seen.add(j); stack.append(j)
    return len(seen) == len(cells)

async def tap(pg, x): await pg.click(f'#board .hc[data-i="{x}"]')
async def bridge(pg, g, edges, e, times):
    """klepne na ostrov a, pak times× na souseda b a nakonec znovu na a (zruší výběr)"""
    a = g['cells'][edges[e]['a']]; b = g['cells'][edges[e]['b']]
    await tap(pg, a)
    for _ in range(times): await tap(pg, b)
    await tap(pg, a)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}); await route(pg)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p.html')); await pg.click('[data-act=welcomeGo]')
    ok('domů: Hashi v Dalších hrách', 'Hashi' in await pg.inner_text('#v-home'))
    await pg.screenshot(path='hs_domov.png', full_page=True)
    await pg.click('[data-act=pick][data-mode=hashi]'); await pg.screenshot(path='hs_vyber.png'); await pg.click('.sheet [data-act=close]')
    for lv, N, nI in [(0, 7, 9), (1, 8, 14), (2, 9, 20)]:
        await start(pg, lv)
        g = (await st(pg))['game']; sol = g['sol']; edges, cross = build(N, g['cells'], g['nums'])
        ok(f'úroveň {lv}: mřížka {N}×{N}, {nI} ostrovů', g['N'] == N and len(g['cells']) == nI and await pg.locator('#board .hs-isl').count() == nI)
        ok(f'úroveň {lv}: řešení splňuje pravidla', valid(g))
        ok(f'úroveň {lv}: bez Poznámek', await pg.locator('[data-act=notes]').count() == 0)
        ok(f'úroveň {lv}: podtitul', f'{N}×{N}' in await pg.inner_text('#g-level'))
        await pg.screenshot(path=f'hs_hra_{N}.png')
        if lv == 0:
            # klepnutí na ostrov ho vybere a zvýrazní sousedy
            a0 = g['cells'][edges[0]['a']]
            await tap(pg, a0)
            ok('výběr ostrova a sousedů', await pg.locator('#board .hs-isl.sel').count() == 1 and await pg.locator('#board .hs-isl.nb').count() >= 1)
            await pg.screenshot(path='hs_vyber_ostrova.png')
            await tap(pg, a0); ok('druhé klepnutí výběr zruší', await pg.locator('#board .hs-isl.sel').count() == 0)
            # klepnutí na mezeru mezi ostrovy
            gap = next((e for e, E in enumerate(edges) if E['cells'] and not cross[e]), None)
            if gap is not None:
                await tap(pg, edges[gap]['cells'][0])
                ok('klepnutí na mezeru postaví most', (await st(pg))['game']['vals'][gap] == 1)
                await pg.wait_for_timeout(1700)
                for _ in range(2 if min(2, g['nums'][edges[gap]['a']], g['nums'][edges[gap]['b']]) == 2 else 1): await tap(pg, edges[gap]['cells'][0])
                ok('další klepnutí most zase smažou', (await st(pg))['game']['vals'][gap] == 0)
            # přeplnění: ostrov se dvěma hranami, na jedné most, na druhé 0→1→2→0 rychle = žádná chyba; pak trvalé přeplnění = chyba
            await pg.wait_for_timeout(1700)
            mist0 = (await st(pg))['game']['mistakes']
            cand = None
            capf = lambda e: min(2, g['nums'][edges[e]['a']], g['nums'][edges[e]['b']])
            for k, n in enumerate(g['nums']):
                es = [e for e, E in enumerate(edges) if k in (E['a'], E['b']) and not cross[e]]
                pr = next(((e1, e2) for e1 in es for e2 in es if e1 != e2 and capf(e1) + capf(e2) > n), None)
                if pr: cand = (k, pr[0], pr[1]); break
            if cand:
                k, e1, e2 = cand; n = g['nums'][k]
                await bridge(pg, g, edges, e1, capf(e1)); await pg.wait_for_timeout(1700)
                await bridge(pg, g, edges, e2, capf(e2) + 1); await pg.wait_for_timeout(1800)
                s2 = (await st(pg))['game']
                ok('cesta přes přeplnění zpět k nule není chyba', s2['mistakes'] == mist0 and s2['vals'][e2] == 0)
                await bridge(pg, g, edges, e2, n - capf(e1) + 1)
                isl = f'#board .hc[data-i="{g["cells"][k]}"] .hs-isl'
                ok('přeplněný ostrov hned nezčervená', 'err' not in await pg.get_attribute(isl, 'class') and (await st(pg))['game']['mistakes'] == mist0)
                await pg.wait_for_timeout(1800)
                ok('přeplnění po chvilce = chyba', (await st(pg))['game']['mistakes'] == mist0 + 1 and 'err' in await pg.get_attribute(isl, 'class'))
                await pg.screenshot(path='hs_chyba.png')
                await pg.click('[data-act=hint]'); await pg.click('[data-act=hintMore]')
                ok('nápověda najde chybný most', await pg.locator('[data-act=hintFix]').count() == 1)
                await pg.screenshot(path='hs_napoveda_chyba.png')
                await pg.click('[data-act=hintFix]'); vv = (await st(pg))['game']['vals']
                ok('oprava chyby nastaví správný počet', all(vv[e] <= sol[e] for e in range(len(sol))))
                await pg.click('[data-act=undo]'); u = (await st(pg))['game']['vals']
                ok('zpět vrátí stav před opravou', any(u[e] > sol[e] for e in range(len(sol))))
                await pg.click('[data-act=redo]'); r = (await st(pg))['game']['vals']
                ok('znovu opravu zopakuje', all(r[e] <= sol[e] for e in range(len(sol))))
            else: ok('přeplnění (nenašel jsem ostrov)', False)
            # křížení: na prázdnou kopii stavu nehledíme, najdeme křižující se hrany a zkusíme to
            g = (await st(pg))['game']
            pair = next(((e, f) for e in range(len(edges)) for f in cross[e] if g['vals'][e] == 0 and g['vals'][f] == 0 and not any(g['vals'][x] for x in cross[e] + cross[f])), None)
            if pair:
                e, f = pair
                await bridge(pg, g, edges, e, 1); await bridge(pg, g, edges, f, 1)
                s3 = (await st(pg))['game']
                ok('mosty se nesmí křížit', s3['vals'][f] == 0 and 'křížit' in await pg.inner_text('#toast'))
                await bridge(pg, g, edges, e, 2 if min(2, g['nums'][edges[e]['a']], g['nums'][edges[e]['b']]) == 2 else 1)
            else: print('   (v této hře se žádné hrany nekříží, křížení vyzkouším v těžší)')
            await pg.wait_for_timeout(1700)
            g = (await st(pg))['game']
            for e in range(len(sol)):
                cap = min(2, g['nums'][edges[e]['a']], g['nums'][edges[e]['b']])
                t = (sol[e] - g['vals'][e]) % (cap + 1)
                if t: await bridge(pg, g, edges, e, t)
            await pg.wait_for_timeout(900)
            ok(f'úroveň {lv}: výhra klepáním', await pg.locator('[data-act=again]').count() == 1)
            ok('tlačítko Další hashi', 'Další hashi' in await pg.inner_text('[data-act=again]'))
            await pg.screenshot(path='hs_vyhra.png')
        else:
            if lv == 2:
                pair = next(((e, f) for e in range(len(edges)) for f in cross[e]), None)
                if pair:
                    e, f = pair; await bridge(pg, g, edges, e, 1); await bridge(pg, g, edges, f, 1)
                    s3 = (await st(pg))['game']
                    ok('těžší: mosty se nesmí křížit', s3['vals'][f] == 0 and s3['vals'][e] == 1)
                    await pg.click('[data-act=undo]'); ok('zpět most smaže', (await st(pg))['game']['vals'][e] == 0)
            stuck = 0; steps = 0; texts = []
            while not await pg.locator('[data-act=again]').count() and steps < 150:
                await pg.click('[data-act=hint]')
                while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
                t = await pg.inner_text('#hint-panel p'); texts.append(t)
                if 'zapeklité' in t: stuck += 1
                if steps == 3: await pg.screenshot(path=f'hs_napoveda_{N}.png')
                if await pg.locator('[data-act=hintFix]').count(): await pg.click('[data-act=hintFix]')
                else: await pg.click('[data-act=hintReveal]')
                steps += 1; await pg.wait_for_timeout(30)
                gg = (await st(pg))['game']
                if gg['vals'] == gg['sol']: await pg.wait_for_timeout(900)
            ok(f'úroveň {lv}: nápověda vyřešila hru logikou', stuck == 0 and await pg.locator('[data-act=again]').count() == 1, f'kroků {steps}, zapeklitých {stuck}')
            for t in sorted(set(texts), key=len)[-3:]: print('   ukázka:', t)
        await pg.click('[data-act=home]')
    s = await st(pg)
    ok('statistiky: 3 hashi', s['stats']['games'].get('hashi') == 3 and all(f'hashi-{k}' in s['stats']['byKey'] for k in range(3)))
    ok('odznak První most', 'hs1' in s['ach'])
    # lekce
    await pg.click('[data-act=go][data-v=school]')
    ok('Škola: oddíl Hashi', 'Hashi' in await pg.inner_text('#v-school'))
    await pg.click('[data-act=glesson][data-g=hashi][data-k="0"]'); await pg.screenshot(path='hs_lekce1.png', full_page=True)
    await pg.click('[data-act=gans][data-v="1"]'); ok('lekce 1 špatně', await pg.locator('.feedback.no').count() == 1)
    await pg.click('[data-act=gans][data-v="2"]'); ok('lekce 1', (await st(pg))['lessons'].get('hashi-0'))
    await pg.click('[data-act=glesson][data-k="1"]'); await pg.screenshot(path='hs_lekce2.png', full_page=True)
    await pg.click('[data-act=gans][data-v="2"]'); ok('lekce 2', (await st(pg))['lessons'].get('hashi-1'))
    await pg.click('[data-act=glesson][data-k="2"]'); await pg.click('[data-act=gans][data-v="ne"]'); ok('lekce 3', (await st(pg))['lessons'].get('hashi-2'))
    await pg.screenshot(path='hs_lekce3.png', full_page=True)
    # tmavý vzhled + největší písmo + jiná sada znaků: upozornění, že se hraje s čísly
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=skin][data-s=noc]'); await pg.click('[data-act=set][data-k=fs][data-v="1.3"]')
    await pg.click('[data-act=set][data-k=symbols][data-v=fruit]')
    await start(pg, 1)
    ok('upozornění: hraje se s čísly', 'Hashi se hraje s čísly' in await pg.inner_text('#toast'))
    g = (await st(pg))['game']; edges, cross = build(g['N'], g['cells'], g['nums'])
    e = next(e for e in range(len(edges)) if g['sol'][e] == 2); await bridge(pg, g, edges, e, 2)
    e = next(e for e in range(len(edges)) if g['sol'][e] == 1); await bridge(pg, g, edges, e, 1)
    await tap(pg, g['cells'][0]); await pg.wait_for_timeout(300)
    await pg.screenshot(path='hs_noc_8.png')
    await pg.click('[data-act=leave]'); await start(pg, 2); await pg.screenshot(path='hs_noc_9.png')
    ok('chyby v konzoli', not errs, errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'selhalo: ' + ', '.join(fails))
asyncio.run(main())
