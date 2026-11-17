# Párování QR kódem: první zařízení ukáže QR (jen 8 slov), druhé ho naskenuje falešnou kamerou Chromia
# (video z obrázku QR kódu) a připojí se. Dále: QR se dá skrýt, špatný QR kód, zakázaná kamera, Zrušit, angličtina.
# Potřebuje ffmpeg (obrázek → video pro falešnou kameru).
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, subprocess, tempfile, re
from playwright.async_api import async_playwright
import test_synchronizace as T     # napodobený GitHub a pomocné funkce
ok = T.ok
TMP = tempfile.mkdtemp()

def y4m(png, out):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-loop', '1', '-i', png, '-t', '2', '-r', '10',
                    '-vf', 'scale=640:480:force_original_aspect_ratio=decrease,pad=640:480:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p', out], check=True)
async def qr_png(pg, text, path):
    """Vykreslí QR kód přes ZSQR aplikace do PNG."""
    await pg.evaluate("t=>{const d=document.createElement('div');d.id='qrt';d.style.cssText='position:fixed;left:0;top:0;width:420px;height:420px;background:#fff;padding:40px;z-index:9999';d.innerHTML=ZSQR.svg(t,'M');d.firstElementChild.style.cssText='width:340px;height:340px;display:block';document.body.appendChild(d)}", text)
    await pg.locator('#qrt').screenshot(path=path); await pg.evaluate("document.getElementById('qrt').remove()")
async def cam_browser(p, video):
    return await p.chromium.launch(args=['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', f'--use-file-for-fake-video-capture={video}'])
async def device_cam(b, perm=True, lang=None):
    ctx = await b.new_context(viewport={'width': 393, 'height': 820}, permissions=['camera'] if perm else [])
    pg = await ctx.new_page(); await T.route(pg); await pg.route('https://api.github.com/**', T.G.handle)
    if lang: await pg.add_init_script("localStorage.setItem('zelvi-lang','%s')" % lang)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.errs = errs
    await pg.goto(os.environ.get('ZS_URL') or 'file://' + os.path.abspath('p.html'))
    if await pg.locator('[data-act=welcomeGo]').count(): await pg.click('[data-act=welcomeGo]')
    return pg
async def to_ask(pg, token=T.TOK_A):
    await pg.click('.tab[data-v=settings]'); await pg.click('#sy-box [data-act=sySetup]')
    await pg.fill('#sy-tok', token); await pg.click('[data-act=syConnect]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if await pg.locator('#sy-code').count(): return True
    return False
async def wait_text(pg, sel, s, n=150):
    for _ in range(n):
        await asyncio.sleep(0.1)
        if await pg.locator(sel).count() and s in await pg.inner_text(sel): return True
    return False

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    # ---------- A: první zařízení, nový kód s QR ----------
    A = await T.device(b, name='Jana')
    await A.click('.tab[data-v=settings]'); await A.click('#sy-box [data-act=sySetup]')
    await A.fill('#sy-tok', T.TOK_A); await A.click('[data-act=syConnect]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if await A.locator('.sy-words li').count(): break
    code = ' '.join(await A.locator('.sy-words li').all_inner_texts())
    ok('nový kód: tlačítko Zobrazit QR kód', await A.locator('[data-act=syQr]').count() == 1 and await A.locator('#sy-qr[hidden]').count() == 1)
    await A.click('[data-act=syQr]')
    ok('QR kód se ukáže, tlačítko Skrýt', await A.locator('#sy-qr:not([hidden]) svg').count() == 1 and 'Skrýt QR kód' in await A.inner_text('[data-act=syQr]'))
    txt = await A.evaluate("(()=>{const s=document.querySelector('#sy-qr svg'),i=new Image(),c=document.createElement('canvas');return new Promise(r=>{i.onload=()=>{c.width=c.height=400;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,400,400);x.drawImage(i,40,40,320,320);r(ZSQR.decode(x.getImageData(0,0,400,400),500))};i.src='data:image/svg+xml;base64,'+btoa(s.outerHTML)})})()")
    ok('QR obsahuje jen ZELVI: + 8 slov (bez tokenu)', txt == 'ZELVI:' + code.upper() and 'github' not in (txt or '').lower(), txt)
    await A.click('[data-act=syQr]')
    ok('QR kód jde skrýt', await A.locator('#sy-qr[hidden]').count() == 1 and await A.locator('#sy-qr svg').count() == 0)
    await A.click('[data-act=syNewGo]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if (await T.cfg(A) or {}).get('lastSync'): break
    await T.settle(A)
    await A.click('#sy-box [data-act=syCode]')
    ok('Párovací kód v Nastavení: i QR kód', await A.locator('#modal [data-act=syQr]').count() == 1)
    await A.click('#modal [data-act=syQr]')
    ok('QR v Nastavení se ukáže', await A.locator('#sy-qr:not([hidden]) svg').count() == 1)
    good = os.path.join(TMP, 'good.png'); await A.locator('#sy-qr svg').screenshot(path=good)
    await A.click('#modal [data-act=close]')
    bad = os.path.join(TMP, 'bad.png'); await qr_png(A, 'MEMOCHAT:' + code.upper(), bad)
    y4m(good, os.path.join(TMP, 'good.y4m')); y4m(bad, os.path.join(TMP, 'bad.y4m'))

    # ---------- B: naskenuje QR falešnou kamerou ----------
    bc = await cam_browser(p, os.path.join(TMP, 'good.y4m'))
    B = await device_cam(bc)
    ok('B: zadání kódu', await to_ask(B))
    ok('B: tlačítko Naskenovat QR kód', await B.locator('[data-act=syScan]').count() == 1 and 'naskenujte jako QR kód' in await B.inner_text('#modal'))
    await B.click('[data-act=syScan]')
    ok('B: okno kamery s náhledem', await B.locator('#modal video').count() == 1 and 'Zobrazit QR kód' in await B.inner_text('#modal'))
    for _ in range(150):
        await asyncio.sleep(0.1)
        if (await T.cfg(B) or {}).get('lastSync'): break
    await T.settle(B)
    c = await T.cfg(B)
    ok('B: naskenováno a připojeno', c and c.get('code') == code and c.get('lastSync') and not c.get('lastError'), c and c.get('lastError'))
    ok('B: převzal postup z A', (await T.st(B))['settings']['player'] == 'Jana')
    ok('B: kamera vypnutá (žádné video)', await B.locator('video').count() == 0)
    await bc.close()

    # ---------- špatný QR kód ----------
    bb = await cam_browser(p, os.path.join(TMP, 'bad.y4m'))
    W = await device_cam(bb)
    await to_ask(W); await W.click('[data-act=syScan]')
    ok('cizí QR kód: hláška a skenuje dál', await wait_text(W, '#sy-cst', 'není párovací kód Želvího sudoku') and await W.locator('#modal video').count() == 1)
    ok('cizí QR kód: nepřipojí se', await T.cfg(W) is None)
    await W.click('[data-act=syScanBack]')
    ok('Zrušit ve skenování → zpět na zadání kódu, kamera vypnutá', await W.locator('#sy-code').count() == 1 and await W.locator('video').count() == 0)
    await W.click('[data-act=syScan]'); await asyncio.sleep(0.5); await W.click('[data-act=syScanBack]'); await W.click('#modal [data-act=close]')
    ok('zavřené okno: žádná kamera', await W.locator('video').count() == 0 and await T.cfg(W) is None)
    await bb.close()

    # ---------- kamera nepovolená ----------
    bn = await p.chromium.launch(args=['--use-fake-device-for-media-stream'])
    N = await device_cam(bn, perm=False)
    await to_ask(N); await N.click('[data-act=syScan]')
    ok('zakázaná kamera: srozumitelná hláška', await wait_text(N, '#sy-cst', 'nemá povolený fotoaparát') or await wait_text(N, '#sy-cst', 'není dostupný', 5), await N.inner_text('#sy-cst'))
    await bn.close()

    # ---------- angličtina ----------
    be = await cam_browser(p, os.path.join(TMP, 'good.y4m'))
    E = await device_cam(be, lang='en')
    await to_ask(E)
    t1 = await E.inner_text('#modal'); await E.click('[data-act=syScan]'); t2 = await E.inner_text('#modal')
    ok('EN: texty QR anglicky', 'Scan QR code' in t1 and 'scan it as a QR code' in t1 and 'Show QR code' in t2 and not re.search('[ěščřžýáíéůú]', t1 + t2))
    for _ in range(150):
        await asyncio.sleep(0.1)
        if (await T.cfg(E) or {}).get('lastSync'): break
    ok('EN: naskenováno a připojeno', (await T.cfg(E) or {}).get('code') == code)
    await be.close()

    for nm, pg in (('A', A), ('B', B), ('W', W), ('N', N), ('E', E)):
        errs = [e for e in pg.errs if 'camera' not in e.lower() and 'Requested device not found' not in e]
        print(nm, 'chyby v konzoli:', errs)
        if errs: T.fails.append('konzole ' + nm)
    await b.close()
  print('HOTOVO' if not T.fails else 'SELHALO: ' + ', '.join(T.fails))
asyncio.run(main())
