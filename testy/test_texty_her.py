# Texty u dalších her nesmí mluvit o sudoku (reklamace: po KenKenu „Nový úspěch … Sudoku bez jediné chyby“).
# Zachytí všechna okna a upozornění během hraní Futoshiki, Binaira, Hashi a KenKenu (každé jako první hra
# v čisté aplikaci, takže padnou odznaky První krůček, Bez chybičky, Vlastní hlavou…), projde Úspěchy,
# bubliny želvičky, uvítání a Nastavení.
import os, sys, re; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json
from playwright.async_api import async_playwright
from fontroute import route
fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)
# povolené zmínky: název aplikace a věci, které opravdu jsou sudoku
ALLOW = re.compile(r'Želví(m)? sudoku|Klasické sudoku|Součtové sudoku|součtové sudoku|Expertní sudoku|Lehké sudoku|Střední sudoku|dnešní sudoku|Dnešní sudoku|Škola sudoku|lehké sudoku|v režimu Zen|sudoku 6×6|Sudoku s úhlopříčkami', re.I)
def bad_mentions(t):
    t = ALLOW.sub('', t)
    return [m.group(0) for m in re.finditer(r'.{0,40}sudok\w*.{0,40}', t, re.I)]
async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
CAPTURE = """window._seen=[];const o=new MutationObserver(()=>{for(const id of ['toast','modal']){const e=document.getElementById(id);if(e&&!e.hidden&&e.innerText.trim())_seen.push(e.innerText.trim())}});
addEventListener('DOMContentLoaded',()=>o.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true}))"""
async def fresh(b):
    pg = await b.new_page(viewport={'width': 393, 'height': 800}); await route(pg)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.errs = errs
    await pg.add_init_script(CAPTURE)
    await pg.goto('file://' + os.path.abspath('p.html'))
    return pg
async def start(pg, mode, lv=0):
    await pg.click('.tab[data-v=home]'); await pg.click(f'[data-act=pick][data-mode={mode}]'); await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await pg.wait_for_timeout(400)
async def solve_keys(pg):
    g = (await st(pg))['game']
    for i, v in enumerate(g['vals']):
        if not v: await pg.click(f'#board .cell[data-i="{i}"]'); await pg.keyboard.press(str(g['sol'][i]))
    await pg.wait_for_timeout(1000)
async def solve_hints(pg):
    for _ in range(200):
        if await pg.locator('#modal:not([hidden]) [data-act=again]').count(): break
        await pg.click('[data-act=hint]')
        while await pg.locator('[data-act=hintMore]').count(): await pg.click('[data-act=hintMore]')
        if await pg.locator('[data-act=hintFix]').count(): await pg.click('[data-act=hintFix]')
        elif await pg.locator('[data-act=hintReveal]').count(): await pg.click('[data-act=hintReveal]')
        await pg.wait_for_timeout(60)
        g = (await st(pg))['game']
        if g and g['vals'] == g['sol']: await pg.wait_for_timeout(1700)
    await pg.wait_for_timeout(600)

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    # uvítání: aplikace s dalšími hrami
    pg = await fresh(b)
    t = await pg.inner_text('#modal')
    ok('uvítání: „S každou vyřešenou hrou porostu“', 'S každou vyřešenou hrou porostu' in t and not bad_mentions(t), bad_mentions(t))
    await pg.close()
    for mode, how in [('kenken', 'keys'), ('futoshiki', 'keys'), ('binairo', 'hints'), ('hashi', 'hints')]:
        pg = await fresh(b); await pg.click('[data-act=welcomeGo]')
        await start(pg, mode)
        await (solve_keys(pg) if how == 'keys' else solve_hints(pg))
        won = await pg.locator('#modal:not([hidden]) [data-act=again]').count() == 1
        win_txt = await pg.inner_text('#modal')
        s = await st(pg)
        want = ['first', 'perfect'] + (['nohint'] if how == 'keys' else [])
        ok(f'{mode}: výhra a odznaky {want}', won and all(k in s['ach'] for k in want), list(s['ach']))
        ok(f'{mode}: okno výhry nemluví o sudoku', not bad_mentions(win_txt), bad_mentions(win_txt))
        if how == 'keys': ok(f'{mode}: okno výhry ukazuje „Hra bez jediné chyby“ a „Hra bez nápovědy“', 'Hra bez jediné chyby' in win_txt and 'Hra bez nápovědy' in win_txt, win_txt.replace('\n', ' ')[:300])
        await pg.click('#modal [data-act=again]'); await pg.wait_for_timeout(400)
        await pg.click('[data-act=more]'); await pg.wait_for_timeout(200)
        await pg.click('[data-act=restartAsk]'); await pg.wait_for_timeout(200)
        await pg.click('#modal [data-act=close]')
        await pg.click('.tab[data-v=home]') if await pg.locator('.tab[data-v=home]').is_visible() else await pg.click('[data-act=leave]')
        await pg.click(f'[data-act=pick][data-mode=futoshiki]'); await pg.click('.sheet [data-act=play][data-level="0"]'); await pg.wait_for_timeout(300)
        seen = await pg.evaluate("_seen")
        bad = sorted({m for x in seen for m in bad_mentions(x)})
        ok(f'{mode}: žádné okno ani upozornění během hraní nemluví o sudoku ({len(seen)} zachycených)', not bad, bad)
        ok(f'{mode}: chyby v konzoli', not pg.errs, pg.errs); await pg.close()
    # Úspěchy: obecné odznaky nemluví o sudoku
    pg = await fresh(b); await pg.click('[data-act=welcomeGo]'); await pg.click('.tab[data-v=awards]')
    gen = await pg.evaluate("""[...document.querySelectorAll('.ach')].map(e=>e.innerText.replace(/\\s+/g,' '))""")
    generic = [x for x in gen if any(n in x for n in ['První krůček','Rozjezd','Padesátka','Stovka','Pět set','Tisícovka','Bez chybičky','Pečlivost sama','Vlastní hlavou','Tři dny','Celý týden','Celý měsíc','Ranní ptáče','Noční sova'])]
    ok('Úspěchy: 14 obecných odznaků nalezeno', len(generic) == 14, len(generic))
    badg = [x for x in generic if re.search('sudok', x, re.I)]
    ok('Úspěchy: obecné odznaky mluví o hrách, ne o sudoku', not badg, badg)
    # bubliny želvičky (domov a záložka Želvička)
    tips = set()
    for _ in range(80):
        await pg.click('.tab[data-v=pet]'); tips.add(await pg.inner_text('#pet-say'))
        await pg.click('.tab[data-v=home]'); tips.add(await pg.inner_text('.bubble span'))
    ok('bubliny: „Každá vyřešená hra mě posune k dalšímu ostrovu.“', 'Každá vyřešená hra mě posune k dalšímu ostrovu.' in tips and not any('sudoku mě posune' in t for t in tips), len(tips))
    # Nastavení: popis tlačítka Poznámky
    await pg.click('.tab[data-v=settings]'); t = await pg.inner_text('#v-settings')
    ok('Nastavení: Poznámky „pro těžší sudoku, Futoshiki a KenKen“', 'pro těžší sudoku, Futoshiki a KenKen' in t)
    # Cesta, Želvička, statistiky: počítají „hry“
    for v in ['map', 'pet', 'awards']:
        await pg.click(f'.tab[data-v={v}]')
        if v == 'awards' and await pg.locator('[data-act=atab]').count() > 1: await pg.locator('[data-act=atab]').nth(1).click()
        t = await pg.inner_text(f'#v-{v}')
        if v == 'pet': t = t.replace(await pg.inner_text('#pet-say'), '')  # bublina = náhodný tip, sudoku v něm smí být (viz HANDOFF)
        bm = [m for m in bad_mentions(t)]
        ok(f'záložka {v}: bez zmínky o sudoku u věcí, které počítají všechny hry', not bm, bm)
    ok('chyby v konzoli (stránky)', not pg.errs, pg.errs); await pg.close()
    await b.close()
  print('VÝSLEDEK:', 'vše prošlo' if not fails else 'SELHALO: ' + '; '.join(fails))
asyncio.run(main())
