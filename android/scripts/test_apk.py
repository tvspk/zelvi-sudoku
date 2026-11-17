# Kontroly specifické pro APK: offline (žádné síťové požadavky), vložená písma, tlačítko Zpět (zsBack), barvy lišt
import asyncio, os, json
from playwright.async_api import async_playwright
P='file://'+os.path.join(os.path.dirname(os.path.abspath(__file__)),'p_apk.html')  # kopie proj/assets/index.html vedle tohoto skriptu
ok=0;bad=0
def chk(c,msg):
    global ok,bad
    if c: ok+=1;print('OK',msg)
    else: bad+=1;print('FAIL',msg)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for w,h in [(360,640),(393,780)]:
            ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=2)
            pg=await ctx.new_page();net=[];errs=[]
            pg.on('request',lambda r:net.append(r.url) if not r.url.startswith(('file:','data:','blob:')) else None)
            pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
            await pg.add_init_script("window._bars=[];window.ZSAndroid={setBars:(a,b)=>_bars.push([a,b])}")
            await pg.goto(P);await pg.wait_for_timeout(600)
            fonts=await pg.evaluate("""async()=>{await document.fonts.ready;const L=['500 20px "Baloo 2"','600 20px "Baloo 2"','700 20px "Baloo 2"','500 20px Nunito','800 20px Nunito','20px VT323'];;const t='ěščřžýáíéůťďňĚŠČŘŽÝÁÍÉŮ';const r=[];for(const f of L){const x=await document.fonts.load(f,t);r.push(x.length>=2)}return r}""")
            loaded=await pg.evaluate("[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family+' '+f.weight)")
            chk(all(fonts),f'{w}px písma k dispozici {fonts}');chk(len(loaded)>=4,f'načtená písma: {sorted(set(loaded))}')
            chk(await pg.evaluate("zsBack()")==False,'uvítací okno: Zpět aplikaci jen schová (okno zůstane)')
            await pg.fill('#w-player','Jana');await pg.click('[data-act=welcomeGo]')
            chk(await pg.evaluate("zsBack()")==False,'domovská obrazovka: Zpět = schovat aplikaci')
            bars=await pg.evaluate("_bars.slice(-1)[0]");chk(bars and bars[0].startswith('#'),f'barvy lišt předány: {bars}')
            await pg.click('[data-act=go][data-v=settings]');chk(await pg.evaluate("zsBack()")==True,'Nastavení → Zpět')
            chk(await pg.evaluate("!document.querySelector('#v-home').hidden"),'po Zpět je domovská obrazovka')
            # hra
            await pg.click('[data-act=go][data-v=home]')
            btn=pg.locator('[data-act=daily], [data-act=play]').first
            await btn.click();await pg.wait_for_timeout(300)
            if await pg.locator('#modal:not([hidden]) [data-act=play]').count():await pg.locator('#modal [data-act=play]').first.click()
            await pg.wait_for_timeout(1500)
            chk(await pg.evaluate("!document.querySelector('#v-game').hidden"),'hra spuštěna')
            nb=await pg.evaluate("_bars.slice(-1)[0]");chk(nb[0]==nb[1],f've hře je navigační lišta v barvě pozadí {nb}')
            await pg.click('[data-act=hint]');await pg.wait_for_timeout(200)
            chk(await pg.evaluate("zsBack()")==True and await pg.evaluate("document.querySelector('#hint-panel').hidden"),'Zpět zavře nápovědu')
            chk(await pg.evaluate("!document.querySelector('#v-game').hidden"),'…a zůstane ve hře')
            await pg.click('[data-act=more]') if await pg.locator('[data-act=more]').count() else None
            await pg.wait_for_timeout(200)
            if await pg.evaluate("!document.querySelector('#modal').hidden"):
                chk(await pg.evaluate("zsBack()")==True and await pg.evaluate("document.querySelector('#modal').hidden"),'Zpět zavře okno Více')
            chk(await pg.evaluate("zsBack()")==True and await pg.evaluate("!document.querySelector('#v-home').hidden"),'Zpět ze hry → domů')
            chk(await pg.locator('[data-act=continue]').count()>0,'rozehraná hra jde dohrát')
            # škola
            await pg.evaluate("document.querySelector('[data-act=go][data-v=school]')?.click()")
            await pg.wait_for_timeout(200)
            if await pg.evaluate("!document.querySelector('#v-school').hidden"):
                await pg.locator('[data-act=lesson]').first.click()
                chk(await pg.evaluate("zsBack()")==True and await pg.locator('[data-act=lesson]').count()>=5,'Zpět z lekce → seznam lekcí')
                chk(await pg.evaluate("zsBack()")==True and await pg.evaluate("!document.querySelector('#v-home').hidden"),'Zpět ze Školy → domů')
            # vzhledy → barvy lišt
            # záloha: kopírování přes nativní schránku
            await pg.evaluate("window._copied=null;ZSAndroid.copy=t=>{_copied=t}")
            await pg.click('[data-act=go][data-v=settings]');await pg.click('[data-act=backupMake]');await pg.wait_for_timeout(300)
            await pg.click('[data-act=backupCopy]');cp=await pg.evaluate("_copied")
            chk(bool(cp) and cp.startswith('ZS'),f'záloha zkopírovaná přes Android ({(cp or "")[:8]}…)')
            chk(await pg.evaluate("zsBack()")==True and await pg.evaluate("document.querySelector('#modal').hidden"),'Zpět zavře okno zálohy')
            await pg.evaluate("zsBack()")
            ov=await pg.evaluate("document.documentElement.scrollWidth-innerWidth");chk(ov<=0,f'{w}px bez vodorovného přetečení ({ov})')
            chk(not net,f'žádné síťové požadavky {net[:3]}');chk(not errs,f'konzole bez chyb {errs[:3]}')
            await ctx.close()
        await b.close()
    print(f'\nAPK: {ok} OK, {bad} FAIL')
asyncio.run(main())
