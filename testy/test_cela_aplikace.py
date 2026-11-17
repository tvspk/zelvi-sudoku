import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio,json,os
from playwright.async_api import async_playwright
from fontroute import route
html=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','zelvi-sudoku.html')).read()
open('p.html','w').write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+html+'</body></html>')
URL='file://'+os.path.abspath('p.html')
res=[]
def ok(name,cond,extra=''):res.append(('OK ' if cond else 'FAIL ')+name+(' '+str(extra) if extra else ''))
async def state(pg):return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def solve(pg,skip_last=False):
  g=(await state(pg))['game'];todo=[i for i,v in enumerate(g['vals']) if v!=g['sol'][i]]
  if skip_last:todo=todo[:-1]
  for i in todo:
    await pg.click(f'#board .cell[data-i="{i}"]');await pg.click(f'.key[data-d="{g["sol"][i]}"]')
  return g
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844});await ctx.grant_permissions(['clipboard-read','clipboard-write'])
    pg=await ctx.new_page();await route(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    await pg.goto(URL)
    await pg.fill('#w-player','Jana');await pg.fill('#w-pet','Rozárka');await pg.click('[data-act=welcomeGo]')
    t=await pg.inner_text('.bubble b');ok('oslovení',('Jano' in t),t)
    # each classic level: generate, clue count, solve -> win
    for lv in range(6):
      await pg.click('.tab[data-v=home]');await pg.click(f'[data-act=play][data-mode=classic][data-level="{lv}"]')
      if await pg.locator('[data-act=pendingGo]').count():await pg.click('[data-act=pendingGo]')
      await pg.wait_for_timeout(400)
      g=await solve(pg);await pg.wait_for_timeout(900)
      clues=sum(1 for v in g['puzzle'] if v)
      ok(f'úroveň {lv} výhra',await pg.locator('[data-act=again]').count()==1,f'nápověd {clues}')
      await pg.click('[data-act=home]')
    # other modes
    for mode,lv in [('quick',0),('killer',2)]:
      await pg.click(f'[data-act=play][data-mode={mode}]');await pg.wait_for_timeout(400);await solve(pg);await pg.wait_for_timeout(900)
      ok(f'{mode} výhra',await pg.locator('[data-act=again]').count()==1);await pg.click('[data-act=home]')
    for mode in ['diag']:  # Zen zrušen v kroku 8
      await pg.click(f'[data-act=pick][data-mode={mode}]');await pg.click('.sheet [data-act=play][data-level="1"]');await pg.wait_for_timeout(400);await solve(pg);await pg.wait_for_timeout(900)
      ok(f'{mode} výhra',await pg.locator('[data-act=again]').count()==1);await pg.click('[data-act=home]')
    await pg.click('[data-act=daily]');await pg.wait_for_timeout(400);await solve(pg);await pg.wait_for_timeout(900)
    ok('denní výzva výhra',await pg.locator('.sheet [data-act=home]').count()==1);await pg.click('[data-act=home]')
    ok('denní výzva označena',await pg.locator('.done-note').count()==1)
    st=await state(pg);ok('statistiky',st['stats']['solved']==10,st['stats']['solved'])
    # gameplay tools
    await pg.click('[data-act=play][data-mode=classic][data-level="3"]');await pg.wait_for_timeout(400)
    g=(await state(pg))['game'];e=[i for i,v in enumerate(g['puzzle']) if not v][0];wrong=[d for d in range(1,10) if d!=g['sol'][e]][0]
    await pg.click(f'#board .cell[data-i="{e}"]');await pg.click(f'.key[data-d="{wrong}"]')
    ok('chyba označena','err' in await pg.get_attribute(f'#board .cell[data-i="{e}"]','class'))
    await pg.click('[data-act=undo]');ok('zpět',(await state(pg))['game']['vals'][e]==0)
    await pg.click('[data-act=redo]');ok('znovu',(await state(pg))['game']['vals'][e]==wrong)
    await pg.click('[data-act=hint]');await pg.click('[data-act=hintMore]');ok('nápověda našla chybu',await pg.locator('[data-act=hintFix]').count()==1);await pg.click('[data-act=hintFix]')
    await pg.click('[data-act=hint]')
    while await pg.locator('[data-act=hintMore]').count():await pg.click('[data-act=hintMore]')
    await pg.click('[data-act=hintReveal]');ok('nápověda prozradila',sum(1 for v in (await state(pg))['game']['vals'] if v)==sum(1 for v in g['puzzle'] if v)+1)
    await pg.click('[data-act=notes]');ok('poznámky text',('poznámky' in await pg.inner_text('#g-status')))
    e2=[i for i,v in enumerate((await state(pg))['game']['vals']) if not v][0]
    await pg.click(f'#board .cell[data-i="{e2}"]');await pg.click('.key[data-d="4"]');ok('poznámka zapsána',(await state(pg))['game']['notes'][e2]==16)
    await pg.click('[data-act=notes]')
    await pg.click('[data-act=more]');await pg.click('[data-act=autonotes]');ok('auto poznámky',sum(1 for n in (await state(pg))['game']['notes'] if n)>20)
    await pg.click('#g-timer');ok('pauza',await pg.locator('#pause-cover:not([hidden])').count()==1);await pg.click('[data-act=resume]')
    await pg.click('[data-act=more]');await pg.click('[data-act=restartAsk]');await pg.click('[data-act=restart]');ok('začít znovu',(await state(pg))['game']['vals']==g['puzzle'])
    await pg.click('[data-act=leave]');ok('pokračovat karta',await pg.locator('[data-act=continue]').count()==1)
    # symbol sets
    for sset in ['num','roman','fruit','animals','dice','balls']:
      await pg.click('.tab[data-v=settings]');await pg.click(f'[data-act=set][data-v={sset}]')
      await pg.click('.tab[data-v=home]');await pg.click('[data-act=continue]');await pg.wait_for_timeout(200)
      g=(await state(pg))['game'];todo=[i for i,v in enumerate(g['vals']) if not v][:3]
      for i in todo:await pg.click(f'#board .cell[data-i="{i}"]');await pg.click(f'.key[data-d="{g["sol"][i]}"]')
      await pg.click('[data-act=notes]');await pg.click(f'#board .cell[data-i="{[i for i,v in enumerate(g["vals"]) if not v][5]}"]')
      for d in (1,5,9):await pg.click(f'.key[data-d="{d}"]')
      await pg.click('[data-act=notes]')
      await pg.screenshot(path=f'sym_{sset}.png');ok(f'znaky {sset}',True)
      await pg.click('[data-act=leave]')
    await pg.click('.tab[data-v=settings]');await pg.click('[data-act=set][data-v=num]')
    # settings toggles
    await pg.click('[data-act=toggle][data-k=notesBtn]');await pg.click('.tab[data-v=home]');await pg.click('[data-act=continue]')
    ok('skrytí poznámek',await pg.locator('[data-act=notes]').count()==0);await pg.click('[data-act=leave]')
    await pg.click('.tab[data-v=settings]');await pg.click('[data-act=toggle][data-k=notesBtn]')
    await pg.fill('#call-in','babičko');ok('vlastní oslovení','babičko' in await pg.inner_text('#call-prev'))
    await pg.click('[data-act=set][data-k=fs][data-v="1.3"]');await pg.click('[data-act=skin][data-s=noc]')
    # other views
    for v in ['map','pet','awards']:await pg.click(f'.tab[data-v={v}]');ok(f'stránka {v}',True)
    await pg.click('[data-act=atab][data-t=stats]');ok('graf',await pg.locator('.ch-line').count()==1)
    await pg.click('.tab[data-v=settings]');await pg.fill('#pet-in','Žofka');await pg.click('.tab[data-v=pet]');await pg.click('.pet-stage')
    ok('přejmenování','Žofka' in await pg.inner_text('.pet-name'))
    # lessons
    await pg.click('.tab[data-v=home]');await pg.click('[data-act=go][data-v=school]')
    for k in range(4):
      await pg.click(f'[data-act=lesson][data-k="{k}"]') if k==0 else None
      ld=await pg.evaluate("1");  # placeholder
      if k==3:
        done=False
        for j in range(81):
          c=pg.locator(f'.mini .cell[data-act=lcell] >> nth={j}')
          if not await c.count():break
          if 'given' in (await c.get_attribute('class')):continue
          await c.click()
          if await pg.locator('.feedback.ok').count():done=True;break
      else:
        for d in range(1,10):
          if await pg.locator('.feedback.ok').count():break
          await pg.click(f'[data-act=lans][data-d="{d}"]')
        done=await pg.locator('.feedback.ok').count()==1
      ok(f'lekce {k+1}',done)
      await pg.click(f'[data-act=lesson][data-k="{k+1}"]')
    await pg.click('[data-act=lessonOk]');ok('lekce 5',(await state(pg))['lessons'].get('4'))
    # backup round trip
    await pg.click('.tab[data-v=settings]');await pg.click('[data-act=backupMake]');await pg.wait_for_timeout(300);code=await pg.input_value('#bk-code');await pg.click('[data-act=close]')
    pg2=await (await b.new_context(viewport={'width':390,'height':844})).new_page();pg2.on('pageerror',lambda e:errs.append(str(e)))
    await pg2.goto(URL);await pg2.click('[data-act=welcomeGo]');await pg2.click('.tab[data-v=settings]');await pg2.click('[data-act=backupRestore]')
    await pg2.fill('#bk-in','nesmysl');await pg2.click('[data-act=backupCheck]');ok('špatný kód odmítnut',await pg2.locator('#bk-err:not([hidden])').count()==1)
    await pg2.fill('#bk-in',code);await pg2.click('[data-act=backupCheck]');await pg2.wait_for_timeout(300);await pg2.click('[data-act=backupYes]')
    s2=await state(pg2);ok('záloha obnovena',s2['stats']['solved']==10 and s2['pet']['name']=='Žofka')
    # old v1 data migration
    pg3=await (await b.new_context()).new_page();pg3.on('pageerror',lambda e:errs.append(str(e)))
    await pg3.add_init_script("""if(!sessionStorage.x){sessionStorage.x=1;localStorage.setItem('zelvi-sudoku-v1',JSON.stringify({v:1,welcomed:true,settings:{player:'Jana'},stats:{solved:3,byKey:{'classic-0':{n:3,best:300,total:900}},times:[]},xp:60}))}""")
    await pg3.goto(URL)
    ok('převod starých dat','Rekord 5:00' in await pg3.inner_text('.levels'))
    await pg.screenshot(path='end.png',full_page=True)
    print('\n'.join(res));print('chyby v konzoli:',errs);await b.close()
asyncio.run(main())
