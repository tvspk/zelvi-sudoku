# Dvě jazykové verze: překladová tabulka ZS_EN sedí na kód, anglická verze nemá zbytky češtiny, přepínání na uvítací obrazovce i v Nastavení.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, re, subprocess
from playwright.async_api import async_playwright
from fontroute import route
res=[]
def ok(name,cond,extra=''):res.append(('OK ' if cond else 'FAIL ')+name+(' '+str(extra) if extra else ''))
CZ=re.compile('[áčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]')
html=open(os.path.join('..','zelvi-sudoku.html'),encoding='utf-8').read()
# --- tabulka a anglický zdroj (bez prohlížeče) ---
t=html[html.index('window.ZS_EN=')+len('window.ZS_EN='):];t=t[:t.index('];\n/*END I18N*/')+1]
pairs=json.loads(t);keys=[c for c,e in pairs]
main=html[html.index('<script>',html.index('/*END I18N*/'))+8:html.rindex('</script>')]
miss=[c for c in keys if c not in main]
ok('překlady: každý český úsek se v kódu najde',not miss,miss[:3])
ok('překlady: žádný úsek dvakrát',len(set(keys))==len(keys))
ok('překlady: anglické texty bez češtiny',not [e for c,e in pairs if CZ.search(e)])
m=dict(pairs);rx=re.compile('|'.join(re.escape(k) for k in sorted(m,key=len,reverse=True)))
en=rx.sub(lambda x:m[x.group(0)],main)
open('app_en.js','w',encoding='utf-8').write(en)
r=subprocess.run(['node','--check','app_en.js'],capture_output=True,text=True)
ok('anglický skript: syntaxe',r.returncode==0,r.stderr[:200])
code=re.sub(r'/\*.*?\*/','',en,flags=re.S)
left=[l.strip()[:80] for l in code.split('\n') if CZ.search(l) and 'Čeština' not in l and not re.search(r"FEM_CONS|vocWord|eéiíyýoóuůúá|ěe\]k|fix\(2,'če'\)|fix\(1,'ře'\)|sšžčřcjzxľ",l)]
ok('anglický skript: žádná čeština mimo přepínač a 5. pád',not left,left[:3])
async def text(pg):
  return await pg.evaluate("()=>{const a=[document.body.innerText];document.querySelectorAll('[aria-label],[placeholder]').forEach(e=>a.push(e.getAttribute('aria-label')||'',e.getAttribute('placeholder')||''));return a.join('\\n')}")
async def clean(pg):
  t=(await text(pg)).replace('Čeština','').replace('Jana','');return [l for l in t.split('\n') if CZ.search(l)]
async def main_():
  async with async_playwright() as p:
    b=await p.chromium.launch();ctx=await b.new_context(viewport={'width':390,'height':844})
    pg=await ctx.new_page();await route(pg);errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and 'fonts' not in m.text and 'ERR_' not in m.text else None)
    await pg.goto('file://'+os.path.abspath('p.html'))
    ok('výchozí jazyk je čeština',await pg.locator('h2:has-text("Vítejte")').count()==1)
    ok('uvítání: přepínač jazyka',await pg.locator('#modal [data-act=lang]').count()==2)
    await pg.fill('#w-player','Jana')
    await pg.click('#modal [data-act=lang][data-l=en]');await pg.wait_for_timeout(500)
    ok('uvítání anglicky',await pg.locator('h2:has-text("Welcome to Turtle Sudoku")').count()==1)
    ok('jméno zapsané před přepnutím zůstalo',(await pg.evaluate("JSON.parse(localStorage.getItem('zelvi-sudoku-v1')).settings.player"))=='Jana')
    ok('lang=en a titulek',(await pg.evaluate("[document.documentElement.lang,document.title].join('|')"))=='en|Turtle Sudoku')
    await pg.click('[data-act=welcomeGo]');await pg.wait_for_timeout(200)
    bad=await clean(pg);ok('domů anglicky',('Play today’s sudoku' in await text(pg)) and not bad,bad[:2])
    allbad=[]
    for v in ['map','pet','awards','settings']:
      await pg.click(f'.tab[data-v={v}]');await pg.wait_for_timeout(150);allbad+=await clean(pg)
    ok('karty Cesta, Želvička, Úspěchy, Nastavení anglicky',not allbad,allbad[:3])
    # hra + nápověda + výhra
    await pg.click('.tab[data-v=home]');await pg.click('[data-act=play][data-mode=killer]');await pg.wait_for_timeout(600)
    await pg.click('[data-act=hint]');await pg.click('[data-act=hintMore]')
    ht=await pg.inner_text('#hint-panel');ok('nápověda anglicky',not CZ.search(ht) and ('hint' in ht.lower() or 'square' in ht),ht[:80])
    await pg.click('[data-act=hintClose]')
    g=json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))['game']
    for i,v in enumerate(g['vals']):
      if v!=g['sol'][i]:await pg.click(f'#board .cell[data-i="{i}"]');await pg.click(f'.key[data-d="{g["sol"][i]}"]')
    await pg.wait_for_timeout(1200);t=await text(pg)
    ok('výhra anglicky',('points' in t) and not await clean(pg))
    await pg.click('[data-act=home]')
    # zpět do češtiny v Nastavení
    await pg.click('.tab[data-v=settings]');await pg.click('[data-act=lang][data-l=cs]');await pg.wait_for_timeout(500)
    ok('Nastavení: přepnuto do češtiny',await pg.locator('.tab[data-v=settings]:has-text("Nastavení")').count()==1)
    st=json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
    ok('postup po přepnutí zůstal',st['stats']['solved']==1 and st['settings']['player']=='Jana',st['stats']['solved'])
    await pg.reload();await pg.wait_for_timeout(300)
    ok('čeština zůstane i po novém spuštění',(await pg.evaluate("document.documentElement.lang"))=='cs')
    await pg.click('.tab[data-v=home]');ok('domů česky s oslovením',('Jano' in await pg.inner_text('.bubble b')))
    await pg.click('.tab[data-v=settings]');await pg.click('[data-act=lang][data-l=en]');await pg.wait_for_timeout(500)
    ok('Nastavení: přepnuto do angličtiny',await pg.locator('.tab[data-v=settings]:has-text("Settings")').count()==1)
    await pg.click('.tab[data-v=home]');ok('anglicky oslovení jménem (bez 5. pádu)','Jana!' in await pg.inner_text('.bubble b'))
    ok('mezipaměť překladu uložená',await pg.evaluate("(()=>{try{return JSON.parse(localStorage.getItem('zelvi-en-cache')).t.length>100000}catch(e){return false}})()"))
    await pg.reload();await pg.wait_for_timeout(300)
    ok('druhé spuštění z mezipaměti anglicky',(await pg.evaluate("document.documentElement.lang"))=='en' and await pg.locator('.tab[data-v=settings]:has-text("Settings")').count()==1)
    # záloha nese jazyk: vytvořit v angličtině, přepnout do češtiny, obnovit -> zpět angličtina
    await pg.click('.tab[data-v=settings]');await pg.click('[data-act=backupMake]');await pg.wait_for_timeout(300)
    code=await pg.input_value('#bk-code');await pg.evaluate("document.querySelector('[data-act=close]').click()")
    await pg.click('[data-act=lang][data-l=cs]');await pg.wait_for_timeout(500)
    ok('přepnutí do češtiny smaže mezipaměť',await pg.evaluate("localStorage.getItem('zelvi-en-cache')") is None)
    await pg.click('.tab[data-v=settings]');await pg.click('[data-act=backupRestore]');await pg.fill('#bk-in',code);await pg.click('[data-act=backupCheck]');await pg.wait_for_timeout(300)
    await pg.click('[data-act=backupYes]');await pg.wait_for_timeout(600)
    ok('obnovení zálohy vrátí jazyk zálohy',(await pg.evaluate("document.documentElement.lang"))=='en')
    ok('jazyk se do uloženého stavu nepropsal',(await pg.evaluate("'lang' in JSON.parse(localStorage.getItem('zelvi-sudoku-v1'))")) is False)
    await pg.evaluate("localStorage.setItem('zelvi-lang','cs')")
    ok('chyby v konzoli',not errs,errs[:3]);await b.close()
asyncio.run(main_())
print('\n'.join(res));print('VÝSLEDEK:','vše prošlo' if all(r.startswith('OK') for r in res) else 'SELHALO')
