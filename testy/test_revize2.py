# Regresní testy druhé revize (před APK): nápověda se nepočítá dvakrát, kompaktní panel nápovědy, text při ukončení jiné hry,
# odložená chyba se nepřenese přes „Začít znovu“, odolnost obnovy ze zálohy (neplatná úroveň, HTML ve štítku skupinky).
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, base64
from playwright.async_api import async_playwright
from fontroute import route
fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def start(pg, mode, lv):
    await pg.click('.tab[data-v=home]')
    sel = f'#v-home [data-mode={mode}]'
    await pg.locator(sel).first.click(); await pg.wait_for_timeout(150)
    if await pg.locator(f'#modal [data-act=play][data-mode={mode}][data-level="{lv}"]').count():
        await pg.click(f'#modal [data-act=play][data-mode={mode}][data-level="{lv}"]'); await pg.wait_for_timeout(150)
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await pg.wait_for_timeout(450)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 393, 'height': 780}); await route(pg)
    await pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='body{margin:0}';document.head.appendChild(s)})")
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p.html')); await pg.click('[data-act=welcomeGo]')
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=set][data-k=fs][data-v="1.3"]')
    # A) nápověda: opakované klepnutí se nepočítá, nástroje se během nápovědy schovají
    await start(pg, 'classic', 2)
    await pg.click('[data-act=hint]')
    ok('A: během nápovědy jsou nástroje schované', await pg.locator('#tools').is_hidden())
    m = await pg.evaluate("()=>[Math.round(document.querySelector('#board').getBoundingClientRect().width),document.documentElement.scrollHeight-innerHeight]")
    ok('A: 393×780, největší písmo: mřížka s nápovědou aspoň 250 px a nic nepřetéká', m[0] >= 250 and m[1] <= 0, m)
    await pg.click('[data-act=hintMore]'); await pg.click('[data-act=hintMore]')
    m = await pg.evaluate("()=>[Math.round(document.querySelector('#board').getBoundingClientRect().width),document.documentElement.scrollHeight-innerHeight]")
    ok('A: poslední krok nápovědy se vejde na obrazovku', m[1] <= 0, m)
    await pg.click('[data-act=hintClose]')
    ok('A: po zavření nápovědy jsou nástroje zpět', await pg.locator('#tools').is_visible())
    h0 = (await st(pg))['game']['hints']
    await pg.click('[data-act=hint]'); await pg.evaluate("()=>{const b=document.querySelector('[data-act=hint]');b.click();b.click()}")
    s = await st(pg); ok('A: trojí klepnutí na Nápovědu = 1 nápověda', s['game']['hints'] == h0 + 1, (h0, s['game']['hints']))
    await pg.click('[data-act=hintClose]'); await pg.click('[data-act=leave]')
    # B) text při ukončení rozehrané jiné hry
    await start(pg, 'hashi', 0)
    await pg.locator('.hs-isl').first.click(); await pg.locator('.hs-isl.nb').first.click(); await pg.wait_for_timeout(1700)
    await pg.click('[data-act=leave]'); await pg.click('#v-home [data-act=play][data-mode=classic][data-level="0"]'); await pg.wait_for_timeout(150)
    t = await pg.locator('#modal p').first.inner_text()
    ok('B: „Rozehraná hra (Hashi)“, ne „sudoku“', t.startswith('Rozehraná hra (Hashi)'), t)
    await pg.click('[data-act=close]')
    # C) Binairo: tři stejná a hned „Začít znovu“ → chyba se nezapočítá
    await start(pg, 'binairo', 0)
    g = (await st(pg))['game']; N = g['N']; pz = g['puzzle']
    trip = None
    for r in range(N):
        for c in range(N - 2):
            ii = [r*N+c, r*N+c+1, r*N+c+2]
            if all(pz[i] == 0 for i in ii): trip = ii; break
        if trip: break
    for i in trip:
        await pg.click(f'#board .cell[data-i="{i}"]')
    await pg.click('[data-act=more]'); await pg.click('[data-act=restartAsk]'); await pg.click('[data-act=restart]')
    await pg.wait_for_timeout(1800)
    s = await st(pg); ok('C: odložená chyba nepřežije „Začít znovu“', s['game']['mistakes'] == 0, s['game']['mistakes'])
    for i in trip: await pg.click(f'#board .cell[data-i="{i}"]')
    await pg.wait_for_timeout(1800)
    s = await st(pg); ok('C: bez „Začít znovu“ se tatáž chyba započítá', s['game']['mistakes'] >= 1, s['game']['mistakes'])
    await pg.click('[data-act=leave]')
    # D) podvržená záloha: rozehraná hra s neexistující úrovní, HTML ve štítku skupinky
    await start(pg, 'kenken', 0)
    await pg.click('[data-act=leave]')
    d = await st(pg); d['game']['cages'][0]['label'] = '<img src=x onerror="window.__x=1">'; d['game']['cages'][0]['op'] = '+'
    code = 'ZS1-' + base64.b64encode(json.dumps(d).encode()).decode()
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=backupRestore]'); await pg.fill('#bk-in', code)
    await pg.click('[data-act=backupCheck]'); await pg.wait_for_timeout(200); await pg.click('[data-act=backupYes]'); await pg.wait_for_timeout(200)
    await pg.click('[data-act=continue]'); await pg.wait_for_timeout(300)
    x = await pg.evaluate("window.__x||0"); lab = [t for t in await pg.locator('#board .sum').all_inner_texts() if '<img' in t]
    ok('D: HTML ve štítku skupinky se nevykoná', x == 0 and len(lab) == 1, lab)
    await pg.click('[data-act=leave]')
    d = await st(pg); d['game']['level'] = 9
    code = 'ZS1-' + base64.b64encode(json.dumps(d).encode()).decode()
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=backupRestore]'); await pg.fill('#bk-in', code)
    n0 = len(errs); await pg.click('[data-act=backupCheck]'); await pg.wait_for_timeout(200); await pg.click('[data-act=backupYes]'); await pg.wait_for_timeout(300)
    ok('D: rozehraná hra s neplatnou úrovní se zahodí bez chyby', (await st(pg))['game'] is None and len(errs) == n0 and await pg.locator('[data-act=continue]').count() == 0, errs[n0:])
    # E) tmavé vzhledy: Binairo má světlou desku, černé kolečko má kontrast
    def lum(c):
        import re
        r, g, b_ = [int(x) / 255 for x in re.findall(r'[\d.]+', c)[:3]]
        f = lambda v: v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
        return .2126 * f(r) + .7152 * f(g) + .0722 * f(b_)
    for sk in ['noc', 'neon']:
        await start(pg, 'binairo', 0); await pg.evaluate(f"document.documentElement.dataset.skin='{sk}'")
        bg = await pg.evaluate("getComputedStyle(document.querySelector('#board')).backgroundColor")
        L = lum(bg); ok(f'E: {sk}: deska Binaira je světlá, černé kolečko má kontrast aspoň 7:1', (L + .05) / (lum('rgb(35,39,45)') + .05) >= 7, (bg, round((L + .05) / (lum('rgb(35,39,45)') + .05), 1)))
        await pg.click('[data-act=leave]')
    await start(pg, 'binairo', 0); await pg.evaluate("document.documentElement.dataset.skin='laguna'")
    ok('E: světlý vzhled: deska Binaira beze změny (bílá)', await pg.evaluate("getComputedStyle(document.querySelector('#board')).backgroundColor") == 'rgb(255, 255, 255)')
    await pg.click('[data-act=leave]')
    ok('chyby v konzoli', not errs, errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'SELHALO: ' + ', '.join(fails))
asyncio.run(main())
