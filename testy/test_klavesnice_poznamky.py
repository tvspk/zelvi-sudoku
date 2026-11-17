import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio,os
from playwright.async_api import async_playwright
from fontroute import route
SETS=['num','roman','fruit','animals','dice','balls']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2);await route(pg)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+os.path.abspath('p.html'));await pg.click('[data-act=welcomeGo]')
    await pg.click('[data-act=play][data-level="2"]');await pg.wait_for_timeout(300)
    for sset in SETS:
      await pg.click('[data-act=leave]');await pg.click('.tab[data-v=settings]');await pg.click(f'[data-act=set][data-v={sset}]');await pg.click('.tab[data-v=home]');await pg.click('[data-act=continue]')
      await pg.locator('#pad').screenshot(path=f'pad_{sset}_0.png')
      await pg.click('[data-act=notes]')
      vis=await pg.evaluate("[...document.querySelectorAll('#pad .key>span')].filter(s=>parseFloat(getComputedStyle(s).fontSize)>0&&['⚀','●'].includes(s.textContent)).length")
      print(sset,'viditelné pomocné znaky:',vis)
      await pg.locator('#pad').screenshot(path=f'pad_{sset}_1.png');await pg.click('[data-act=notes]')
    print(errs);await b.close()
asyncio.run(main())
