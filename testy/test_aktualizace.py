# Nabídka nové verze v APK: napodobené rozhraní Androidu (ZSAndroid.version / open) a napodobené API GitHubu (poslední vydání).
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, re
from playwright.async_api import async_playwright
from fontroute import route
fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
TAG = {'v': 'v1.9'}; REQ = []
async def gh(r):
    REQ.append(r.request.url)
    await r.fulfill(status=200, headers={'access-control-allow-origin': '*', 'content-type': 'application/json'}, body=json.dumps({'tag_name': TAG['v']}))
async def device(b, mine='1.8', lang=None, android=True):
    ctx = await b.new_context(viewport={'width': 393, 'height': 820})
    pg = await ctx.new_page(); await route(pg); await pg.route('https://api.github.com/**', gh)
    await pg.clock.install()
    if android: await pg.add_init_script("window._opened=[];window.ZSAndroid={setBars(){},copy(){},version:()=>%s,open:u=>_opened.push(u)}" % json.dumps(mine))
    if lang: await pg.add_init_script("localStorage.getItem('zelvi-lang')||localStorage.setItem('zelvi-lang','%s')" % lang)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    pg.errs = errs
    await pg.goto('file://' + os.path.abspath('p.html'))
    if await pg.locator('[data-act=welcomeGo]').count(): await pg.click('[data-act=welcomeGo]')
    return pg
async def tick(pg, ms=5000):
    await pg.clock.run_for(ms)
    for _ in range(20):
        await asyncio.sleep(0.05)
async def bar(pg): return await pg.locator('#up-bar:visible').count() == 1

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    A = await device(b)
    await tick(A)
    ok('APK 1.8, na GitHubu 1.9: pruh na domovské obrazovce', await bar(A) and 'nová verze 1.9' in await A.inner_text('#up-bar'))
    ok('dotaz jde jen na veřejné API posledního vydání', REQ == ['https://api.github.com/repos/tvspk/zelvi-sudoku/releases/latest'], REQ)
    await A.click('.tab[data-v=awards]'); ok('na jiné záložce pruh není', not await bar(A))
    await A.click('.tab[data-v=home]'); ok('po návratu domů je zpět', await bar(A))
    await A.click('[data-act=upGet]')
    ok('Stáhnout otevře APK v prohlížeči', await A.evaluate('_opened') == ['https://github.com/tvspk/zelvi-sudoku/releases/latest/download/zelvi-sudoku.apk'])
    ok('po Stáhnout se pruh na chvíli schová', not await bar(A))
    await A.clock.run_for(2 * 3600000 + 1000); await A.click('.tab[data-v=map]'); await A.click('.tab[data-v=home]')
    ok('za 2 h se ukáže znovu (instalace se nepovedla)', await bar(A))
    await A.click('[data-act=upLater]'); ok('Později pruh schová', not await bar(A))
    await A.reload(); await tick(A)
    ok('Později platí i po restartu, a bez nového dotazu (jednou za 20 h)', not await bar(A) and len(REQ) == 1, len(REQ))
    await A.clock.run_for(24 * 3600000 + 1000)
    await A.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))"); await tick(A, 2000)
    ok('další den: nový dotaz a pruh znovu', await bar(A) and len(REQ) == 2, len(REQ))
    # stejná verze, starší vydání
    for mine, tag, want, nm in (('1.9', 'v1.9', False, 'stejná verze: nic'), ('1.10', 'v1.9', False, 'novější aplikace než vydání: nic'), ('1.9', 'v1.10', True, '1.10 je novější než 1.9')):
        TAG['v'] = tag; P = await device(b, mine); await tick(P); ok(nm, await bar(P) == want); await P.context.close()
    TAG['v'] = 'nesmysl<script>'; P = await device(b, '1.8'); await tick(P); ok('nesmyslná odpověď: nic', not await bar(P)); await P.context.close()
    # web (bez Androidu): žádný dotaz, žádný pruh
    TAG['v'] = 'v1.9'; n = len(REQ); W = await device(b, android=False); await tick(W)
    ok('web: žádný dotaz ani pruh', not await bar(W) and len(REQ) == n)
    # angličtina
    E = await device(b, lang='en'); await tick(E)
    t = await E.inner_text('#up-bar') if await bar(E) else ''
    ok('EN: pruh anglicky', 'A new version is available: 1.9.' in t and 'Download' in t and 'Later' in t and not re.search('[ěščřžýáíéůú]', t), t)
    # 360 px, největší písmo: nepřetéká
    S = await device(b); await S.set_viewport_size({'width': 360, 'height': 700})
    await S.click('.tab[data-v=settings]'); await S.click('[data-act=set][data-k=fs][data-v="1.3"]'); await S.click('.tab[data-v=home]'); await tick(S)
    ow = await S.evaluate("(()=>{const e=document.getElementById('up-bar');return e&&e.scrollWidth<=e.clientWidth+1&&e.getBoundingClientRect().right<=innerWidth+1})()")
    ok('360 px s největším písmem: pruh se vejde', ow)
    await S.screenshot(path='up_bar.png')
    for nm, pg in (('A', A), ('W', W), ('E', E), ('S', S)):
        print(nm, 'chyby v konzoli:', pg.errs)
        if pg.errs: fails.append('konzole ' + nm)
    await b.close()
  print('VÝSLEDEK: vše prošlo' if not fails else 'VÝSLEDEK: SELHALO ' + ', '.join(fails))
asyncio.run(main())
