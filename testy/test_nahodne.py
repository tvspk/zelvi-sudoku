# Náhodné klepání (monkey test): tisíce náhodných akcí po všech obrazovkách a hrách. Hlídá chyby JS a rozbitý stav.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, random
from playwright.async_api import async_playwright
from fontroute import route
STEPS = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
SEEDS = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else [1, 2, 3]
LANGS = sys.argv[3].split(',') if len(sys.argv) > 3 else ['cs', 'en']  # každý seed v každém jazyce
SKIP = "backupCopy"  # schránka v testu nejde
JS_PICK = """(r)=>{
  const vis=e=>{if(e.closest('[hidden]'))return false;const b=e.getBoundingClientRect();return b.width>0&&b.height>0};
  const modal=!document.getElementById('modal').hidden;
  let els=[...document.querySelectorAll(modal?'#modal [data-act]':'[data-act],#board [data-i]')].filter(vis).filter(e=>e.dataset.act!=='%s'&&e.dataset.act!=='lang'&&!e.disabled);
  if(!els.length)return 'none';
  const e=els[Math.floor(r*els.length)];
  const d=e.dataset.act||('cell '+e.dataset.i);e.click();return d}""" % SKIP
JS_CHECK = """()=>{const s=JSON.parse(localStorage.getItem('zelvi-sudoku-v1')||'null');if(!s)return '';
  const bad=[];if(!Number.isFinite(s.xp)||s.xp<0)bad.push('xp '+s.xp);if(!Number.isInteger(s.stats.solved))bad.push('solved');
  const g=s.game;if(g){if(!Array.isArray(g.vals)||g.vals.length!==g.puzzle.length||g.vals.length!==g.sol.length||g.notes.length!==g.vals.length)bad.push('délky');
    if(g.vals.some((v,i)=>g.puzzle[i]&&g.mode!=='hashi'&&v!==g.puzzle[i]))bad.push('změněné zadání');
    if(!(g.mistakes>=0)||!(g.hints>=0)||!(g.time>=0))bad.push('počítadla');}
  const t=document.getElementById('tools'),hp=document.getElementById('hint-panel');
  if(!document.getElementById('v-game').hidden&&t.hidden&&hp.hidden)bad.push('schované nástroje bez nápovědy');
  const W=document.documentElement.clientWidth;if(document.documentElement.scrollWidth>W+1)bad.push('vodorovné přetečení: '+[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>W+1&&!e.closest('[hidden]')}).slice(0,4).map(e=>e.tagName+'#'+e.id+'.'+String(e.className).slice(0,30)+' '+Math.round(e.getBoundingClientRect().right)).join(' ; ')+' fs='+getComputedStyle(document.documentElement).getPropertyValue('--fs')+' W='+W);
  return bad.join(', ')}"""
async def run(b, seed, lang='cs'):
    rnd = random.Random(seed)
    pg = await b.new_page(viewport={'width': rnd.choice([360, 393, 412]), 'height': rnd.choice([700, 800])}); await route(pg)
    await pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='body{margin:0}';document.head.appendChild(s)})")
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto('file://' + os.path.abspath('p.html'))
    if lang != 'cs': await pg.evaluate(f"localStorage.setItem('zelvi-lang','{lang}')"); await pg.reload()
    acts = {}; probs = []; last = []
    for k in range(STEPS):
        if rnd.random() < .12 and await pg.locator('#v-game').is_visible():
            key = rnd.choice(['1','2','3','4','5','6','7','8','9','0','Backspace','ArrowUp','ArrowLeft','ArrowRight','ArrowDown','n','b','c',' ','Escape'])
            if rnd.random() < .1: await pg.keyboard.press('Shift+ArrowRight')
            elif rnd.random() < .1: await pg.keyboard.press('Control+z')
            else: await pg.keyboard.press(key)
            a = 'key ' + key
        elif rnd.random() < .04:
            a = 'wait'; await pg.wait_for_timeout(rnd.choice([600, 1600]))
        else:
            a = await pg.evaluate(JS_PICK, rnd.random())
            if a == 'play' or a == 'pendingGo' or a == 'again': await pg.wait_for_timeout(150)
        acts[a.split(' ')[0]] = acts.get(a.split(' ')[0], 0) + 1
        last = (last + [a])[-12:]
        if k % 10 == 0 or errs:
            c = await pg.evaluate(JS_CHECK)
            if c and c not in [p[0] for p in probs]: probs.append((c, list(last)))
        if errs: break
    await pg.wait_for_timeout(1700)
    s = json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
    print(f'seed {seed} ({lang}): {STEPS} kroků, různých akcí {len(acts)}, vyřešeno {s["stats"]["solved"]}, chyb JS {len(errs)}')
    for e in errs: print('   CHYBA JS:', e, '| poslední akce:', last)
    for p in probs: print('   PROBLÉM:', p[0], '| poslední akce:', p[1])
    await pg.close()
    return acts, (not errs and not probs)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(); allacts = {}; good = True
    for sd in SEEDS:
      for lg in LANGS:
        a, okk = await run(b, sd, lg); good &= okk
        for k, v in a.items(): allacts[k] = allacts.get(k, 0) + v
    print('pokryté akce:', ' '.join(sorted(allacts)))
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if good else 'SELHALO')
asyncio.run(main())
