import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio,os,json
from playwright.async_api import async_playwright
from fontroute import route
SETS=['num','roman','fruit','animals','dice','balls']
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844},device_scale_factor=2);await route(pg)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+os.path.abspath('p.html'));await pg.click('[data-act=welcomeGo]')
    await pg.click('[data-act=play][data-level="4"]');await pg.wait_for_timeout(500)
    g=json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))['game']
    empty=[i for i,v in enumerate(g['puzzle']) if not v]
    # manual notes in first empty cell: 1,4,8 ; second: all 9
    await pg.click('[data-act=notes]')
    await pg.click(f'#board .cell[data-i="{empty[0]}"]')
    for d in (1,4,8):await pg.click(f'.key[data-d="{d}"]')
    await pg.click(f'#board .cell[data-i="{empty[1]}"]')
    for d in range(1,10):await pg.click(f'.key[data-d="{d}"]')
    await pg.click('[data-act=notes]')
    await pg.click('[data-act=more]');await pg.click('[data-act=autonotes]')
    # select a given 8 to trigger hit highlight
    g8=[i for i,v in enumerate(g['puzzle']) if v==8][0]
    for sset in SETS:
      await pg.click('[data-act=leave]');await pg.click('.tab[data-v=settings]');await pg.click(f'[data-act=set][data-v={sset}]')
      await pg.click('.tab[data-v=home]');await pg.click('[data-act=continue]');await pg.wait_for_timeout(200)
      await pg.click(f'#board .cell[data-i="{g8}"]');await pg.wait_for_timeout(100)
      txt=await pg.evaluate(f"[...document.querySelectorAll('#board .cell[data-i=\"{empty[0]}\"] .notes span')].map(s=>s.textContent).filter(Boolean).join(' ')")
      print(sset,'poznámky v 1. políčku:',txt)
      await pg.locator('#board').screenshot(path=f'n_{sset}.png')
    print(errs);await b.close()
asyncio.run(main())
