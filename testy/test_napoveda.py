import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio,os,json
from playwright.async_api import async_playwright
from fontroute import route
async def st(pg):return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();pg=await b.new_page(viewport={'width':390,'height':844});await route(pg)
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto('file://'+os.path.abspath('p.html'));await pg.click('[data-act=welcomeGo]')
    await pg.click('[data-act=play][data-level="3"]');await pg.wait_for_timeout(500)
    # hidden/naked hint sequence
    await pg.click('[data-act=hint]');n=0
    while True:
      n+=1;txt=await pg.inner_text('#hint-panel p');marked=await pg.locator('#board .cell.ht').count();sel=await pg.locator('#board .cell.sel').count();house=await pg.locator('#board .cell.hh').count()
      print(f'krok {n}: označené políčko={marked} vybrané={sel} zvýrazněno={house} | {txt}')
      await pg.screenshot(path=f'hint{n}.png')
      if await pg.locator('[data-act=hintMore]').count():await pg.click('[data-act=hintMore]')
      else:break
    before=sum(1 for v in (await st(pg))['game']['vals'] if v);await pg.click('[data-act=hintReveal]')
    print('prozrazeno:',sum(1 for v in (await st(pg))['game']['vals'] if v)==before+1,'nápověd:',(await st(pg))['game']['hints'])
    # wrong-entry hint
    g=(await st(pg))['game'];e=[i for i,v in enumerate(g['vals']) if not v][3];w=[d for d in range(1,10) if d!=g['sol'][e]][0]
    await pg.click(f'#board .cell[data-i="{e}"]');await pg.click(f'.key[data-d="{w}"]');await pg.click('#board .cell[data-i="0"]')
    await pg.click('[data-act=hint]');print('chyba krok 1:',await pg.inner_text('#hint-panel p'),'| označeno',await pg.locator('#board .cell.ht').count())
    await pg.click('[data-act=hintMore]');print('chyba krok 2:',await pg.inner_text('#hint-panel p'),'| označeno',await pg.locator(f'#board .cell[data-i="{e}"].ht').count())
    await pg.click('[data-act=hintFix]');print('chyba smazána:',(await st(pg))['game']['vals'][e]==0)
    # balls wording
    await pg.click('[data-act=leave]');await pg.click('.tab[data-v=settings]');await pg.click('[data-act=set][data-v=balls]');await pg.click('.tab[data-v=home]');await pg.click('[data-act=continue]')
    for k in range(6):
      await pg.click('[data-act=hint]')
      if await pg.locator('[data-act=hintMore]').count():
        await pg.click('[data-act=hintMore]');t=await pg.inner_text('#hint-panel p')
        if 'kuličku' in t:print('kuličky:',t);break
      await pg.click('[data-act=hintClose]')
    print(errs);await b.close()
asyncio.run(main())
