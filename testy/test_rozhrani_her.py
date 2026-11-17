# Ověří společné rozhraní pro další hry (krok 0): do aplikace vloží dvě zkušební hry
# (mřížkovou „tlat“ a vlastní „tcus“) a projde s nimi celou cestu: domů, výběr, hra, nápověda, výhra, statistiky, škola.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json
from playwright.async_api import async_playwright
from fontroute import route

DUMMY = r"""
GAMES.tlat={name:'Testovací čtverec',desc:'Zkušební mřížková hra',tile:'4',why:' a nic dalšího',numNote:'Testovací čtverec se hraje s čísly.',
 levels:[{name:'Lehká',desc:'a',xp:11,dots:1},{name:'Těžší',desc:'b',xp:22,dots:2}],
 create(level,seed){const rng=mulberry32(seed),geo=getGeo(4,0,0,false),sol=search(new Array(16).fill(0),geo,1,rng).sol,puzzle=sol.slice();[0,5,10,15,3].forEach(i=>puzzle[i]=0);return{N:4,puzzle,sol}},
 cand(gm,g,i,m){window.__cand=(window.__cand||0)+1;return m},
 deco(gm){return '<i class="t-deco"></i>'},
 lessons:[{t:'Otázka',text:['Text A'],ask:'Kolik je 2?',choices:[[1,'1'],[2,'2']],answer:2,tip:'Tip'},{t:'Bez otázky',text:['Text B'],mini:()=>'<div class="t-mini">M</div>'}]};
GAMES.tcus={name:'Testovací přepínačka',desc:'Zkušební vlastní hra',tile:'T',notes:false,levels:[{name:'Jediná',xp:7,dots:1}],
 create(level,seed){return{N:3,puzzle:new Array(9).fill(0),sol:[1,2,1,2,2,1,1,1,2]}},
 build(gm,b){b.innerHTML=gm.vals.map((v,i)=>`<div class="cell tc" data-i="${i}"><span class="v"></span></div>`).join('')},
 update(gm){const hs=hintStep();document.querySelectorAll('#board .tc').forEach((el,i)=>{el.querySelector('.v').textContent=['','○','●'][gm.vals[i]];el.classList.toggle('ht',!!(hs&&hs.show&&UI.hint.target===i))})},
 pad(gm){return '<button class="key erase" data-act="erase">Smazat vše</button>'},
 tap(gm,i){record([i]);gm.vals[i]=(gm.vals[i]+1)%3;hideHint();refresh();checkWin()},
 key(gm,e){window.__key=e.key},
 erase(gm){const ch=gm.vals.map((v,i)=>i).filter(i=>gm.vals[i]);if(!ch.length)return;record(ch);ch.forEach(i=>gm.vals[i]=0);refresh()},
 hint(gm){const i=gm.vals.findIndex((v,k)=>v!==gm.sol[k]);return{type:'x',target:i,steps:[{text:'Krok jedna'},{text:'Krok dva',show:true}]}},
 reveal(gm,h){record([h.target]);gm.vals[h.target]=gm.sol[h.target]},
 progress(gm){return gm.vals.filter((v,i)=>v===gm.sol[i]).length/9}};
"""
src = open('p.html', encoding='utf-8').read()
assert src.count('/*END GAMES*/') == 1
open('p_rozhrani.html', 'w', encoding='utf-8').write(src.replace('/*END GAMES*/', DUMMY + '/*END GAMES*/'))

fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x else ''))
    if not c: fails.append(n)
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 390, 'height': 844}); await route(pg)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p_rozhrani.html')); await pg.click('[data-act=welcomeGo]')
    home = await pg.inner_text('#v-home')
    ok('domů: sekce Další hry', 'Další hry' in home and 'Testovací čtverec' in home and 'Testovací přepínačka' in home)
    ok('domů: Škola pod dalšími hrami', 'Krátké lekce, jak hrát' in home)
    # sady znaků: mřížková hra se hraje s čísly
    await pg.click('.tab[data-v=settings]'); await pg.click('[data-act=set][data-v=fruit]'); await pg.click('.tab[data-v=home]')
    # mřížková hra
    await pg.click('[data-act=pick][data-mode=tlat]')
    ok('výběr obtížnosti: 2 úrovně', await pg.locator('.sheet [data-act=play]').count() == 2)
    await pg.click('.sheet [data-act=play][data-level="1"]'); await pg.wait_for_timeout(400)
    ok('upozornění na čísla', 'hraje s čísly' in await pg.inner_text('#toast'))
    ok('název a obtížnost', await pg.inner_text('#g-mode') == 'Testovací čtverec' and await pg.inner_text('#g-level') == 'Těžší')
    ok('mřížka 4×4 + dekorace', await pg.locator('#board .cell').count() == 16 and await pg.locator('#board .t-deco').count() == 1)
    ok('třída num', 'num' in await pg.get_attribute('#board', 'class'))
    ok('poznámky dostupné', await pg.locator('[data-act=notes]').count() == 1)
    ok('klávesnice 4 čísla', await pg.locator('#pad .key[data-act=num]').count() == 4)
    await pg.click('[data-act=more]'); await pg.click('[data-act=autonotes]')
    ok('auto poznámky přes cand()', await pg.evaluate('window.__cand||0') > 0)
    await pg.click('[data-act=hint]')
    while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
    txt = await pg.inner_text('#hint-panel p')
    ok('nápověda bez čtverců', 'čtver' not in txt and 'obdélník' not in txt, txt)
    await pg.click('[data-act=hintReveal]')
    g = (await st(pg))['game']
    for i, v in enumerate(g['vals']):
        if v != g['sol'][i]:
            await pg.click(f'#board .cell[data-i="{i}"]'); await pg.click(f'.key[data-d="{g["sol"][i]}"]')
    await pg.wait_for_timeout(900)
    ok('výhra mřížkové hry', await pg.locator('[data-act=again]').count() == 1)
    ok('tlačítko Další hra', 'Další hra' in await pg.inner_text('[data-act=again]'))
    s = await st(pg)
    ok('statistiky', s['stats']['games'].get('tlat') == 1 and 'tlat-1' in s['stats']['byKey'] and s['stats']['solved'] == 1)
    ok('body podle úrovně hry (22 + 10 bez chyby)', s['xp'] == 32, s['xp'])
    await pg.click('[data-act=home]')
    # vlastní hra
    await pg.click('[data-act=play][data-mode=tcus]'); await pg.wait_for_timeout(400)
    ok('vlastní plocha', await pg.locator('#board .tc').count() == 9)
    ok('bez poznámek', await pg.locator('[data-act=notes]').count() == 0)
    ok('vlastní klávesnice', await pg.locator('#pad .erase').count() == 1)
    await pg.click('#board .tc[data-i="0"]')
    ok('klepnutí', (await st(pg))['game']['vals'][0] == 1)
    await pg.click('[data-act=undo]'); ok('zpět', (await st(pg))['game']['vals'][0] == 0)
    await pg.click('[data-act=redo]'); ok('znovu', (await st(pg))['game']['vals'][0] == 1)
    await pg.keyboard.press('x'); ok('klávesnice předána hře', await pg.evaluate('window.__key') == 'x')
    await pg.click('#pad .erase'); ok('smazat', sum((await st(pg))['game']['vals']) == 0)
    await pg.click('[data-act=hint]'); ok('nápověda krok 1', 'Krok jedna' in await pg.inner_text('#hint-panel'))
    await pg.click('[data-act=hintMore]'); ok('nápověda krok 2 označí', await pg.locator('#board .tc.ht').count() == 1)
    await pg.click('[data-act=hintReveal]'); ok('prozrazení', (await st(pg))['game']['vals'][0] == 1)
    await pg.click('[data-act=leave]')
    ok('karta Pokračovat', 'Testovací přepínačka' in await pg.inner_text('[data-act=continue]'))
    await pg.click('[data-act=continue]')
    g = (await st(pg))['game']
    for i in range(9):
        for _ in range((g['sol'][i] - g['vals'][i]) % 3): await pg.click(f'#board .tc[data-i="{i}"]')
    await pg.wait_for_timeout(900)
    ok('výhra vlastní hry', await pg.locator('[data-act=again]').count() == 1)
    s = await st(pg); ok('statistiky vlastní hry', s['stats']['games'].get('tcus') == 1 and s['stats']['solved'] == 2)
    await pg.click('[data-act=home]')
    # texty počítající všechny hry
    await pg.click('.tab[data-v=map]'); ok('cesta: hry', 'Každá vyřešená hra' in await pg.inner_text('#v-map'))
    await pg.click('.tab[data-v=awards]'); ok('odznak: hry', 'Vyřešte 10 her' in await pg.inner_text('#v-awards'))
    await pg.click('[data-act=atab][data-t=stats]'); t = await pg.inner_text('#v-awards')
    ok('tabulka časů', 'Testovací čtverec · Těžší' in t and 'Testovací přepínačka' in t and 'Vyřešených her' in t)
    # škola
    await pg.click('.tab[data-v=home]'); await pg.click('[data-act=go][data-v=school]')
    sc = await pg.inner_text('#v-school'); ok('škola: oddíly', 'Sudoku' in sc and 'Testovací čtverec' in sc)
    await pg.click('[data-act=glesson][data-g=tlat][data-k="0"]')
    await pg.click('[data-act=gans][data-v="1"]'); ok('lekce: špatně', await pg.locator('.feedback.no').count() == 1)
    await pg.click('[data-act=gans][data-v="2"]'); ok('lekce: správně', await pg.locator('.feedback.ok').count() == 1 and (await st(pg))['lessons'].get('tlat-0'))
    await pg.click('[data-act=glesson][data-k="1"]'); ok('lekce s obrázkem', await pg.locator('.g-mini .t-mini').count() == 1)
    await pg.click('[data-act=gok]'); ok('lekce: rozumím', (await st(pg))['lessons'].get('tlat-1') and await pg.locator('[data-act=play][data-mode=tlat]').count() == 1)
    await pg.click('[data-act=lessonBack]'); ok('zpět na lekce', await pg.locator('[data-act=glesson][data-g=tlat]').count() == 2)
    ok('odznak Škola nepočítá lekce her', 'school' not in (await st(pg))['ach'])
    await pg.screenshot(path='rozhrani_skola.png', full_page=True)
    await pg.click('[data-act=go][data-v=home]'); await pg.screenshot(path='rozhrani_domu.png', full_page=True)
    ok('chyby v konzoli', not errs, errs)
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'selhalo: ' + ', '.join(fails))
asyncio.run(main())
