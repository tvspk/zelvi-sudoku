import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio,os,json
from playwright.async_api import async_playwright
from fontroute import route
SETS=['num','roman','fruit','animals','dice','balls']
MODES=[('classic','play','2'),('daily',None,None),('quick','play','0'),('diag','pick','1'),('killer','play','2')]
async def st(pg):return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();res=[];errs=[]
    for sset in SETS:
      pg=await b.new_page(viewport={'width':390,'height':844});await route(pg);pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto('file://'+os.path.abspath('p.html'));await pg.click('[data-act=welcomeGo]')
      await pg.click('.tab[data-v=settings]');await pg.click(f'[data-act=set][data-v={sset}]');await pg.click('.tab[data-v=home]')
      for mode,act,lv in MODES:
        if mode=='daily':await pg.click('[data-act=daily]')
        elif act=='pick':await pg.click(f'[data-act=pick][data-mode={mode}]');await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
        else:await pg.click(f'[data-act=play][data-mode={mode}]')
        if await pg.locator('[data-act=pendingGo]').count():await pg.click('[data-act=pendingGo]')
        await pg.wait_for_timeout(300)
        g=(await st(pg))['game'];N=g['N']
        cls=await pg.get_attribute('#board','class')
        # place 2 values, notes in one cell, hint steps, then finish
        empty=[i for i,v in enumerate(g['vals']) if not v]
        await pg.click('[data-act=notes]');await pg.click(f'#board .cell[data-i="{empty[0]}"]')
        for d in (1,2,N):await pg.click(f'.key[data-d="{d}"]')
        notes=await pg.evaluate(f"[...document.querySelectorAll('#board .cell[data-i=\"{empty[0]}\"] .notes span')].map(s=>s.textContent).filter(Boolean).join(' ')")
        await pg.click('[data-act=notes]')
        await pg.click('[data-act=hint]')
        while await pg.locator('[data-act=hintMore]').count():await pg.click('[data-act=hintMore]')
        htxt=await pg.inner_text('#hint-panel p');await pg.click('[data-act=hintClose]')
        if mode in('quick','killer','diag'):await pg.screenshot(path=f'm_{sset}_{mode}.png')
        cell=await pg.inner_text(f'#board .cell[data-i="{[i for i,v in enumerate(g["puzzle"]) if v][0]}"] .v')
        g=(await st(pg))['game']
        for i,v in enumerate(g['vals']):
          if v!=g['sol'][i]:await pg.click(f'#board .cell[data-i="{i}"]');await pg.click(f'.key[data-d="{g["sol"][i]}"]')
        await pg.wait_for_timeout(800);won=await pg.locator('.sheet [data-act=home]').count()==1
        res.append(f"{sset:8} {mode:8} třída={cls.split()[-1]:8} znak={cell!r:6} poznámky={notes!r:14} výhra={won} | {htxt[:60]}")
        await pg.click('.sheet [data-act=home]')
      await pg.close()
    print('\n'.join(res));print('chyby:',errs);await b.close()
asyncio.run(main())
