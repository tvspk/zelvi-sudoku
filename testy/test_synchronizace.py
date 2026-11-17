# Skutečný čas (bez falešných hodin), aby hodiny „zařízení“ i napodobeného GitHubu běžely stejně.
# Synchronizace přes napodobený GitHub (soukromý repozitář jako schránka). Každé zařízení = vlastní kontext prohlížeče.
# Ověřuje: nastavení (nový kód, zadání kódu, špatný kód, veřejný repozitář), šifrování, sčítání postupu ze dvou i tří
# zařízení, souběžné hry, rozehranou hru (i výměnu na otevřené herní obrazovce), připojení zařízení s vlastním postupem
# (převzít / přičíst), neplatný token a nový token, vypnutí, smazání dat, angličtinu, zálohu bez tokenu, poškozená data.
import os, sys; os.chdir(os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.getcwd())
import asyncio, json, base64, hashlib, zlib, datetime as dt, re, gzip
from playwright.async_api import async_playwright
from fontroute import route
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

fails = []
def ok(n, c, x=''):
    print(('OK  ' if c else 'FAIL') + ' ' + n + (' | ' + str(x) if x != '' else ''))
    if not c: fails.append(n)

# ---------- napodobený GitHub ----------
class GH:
    def __init__(s):
        s.tokens = {'github_pat_' + 'a' * 30, 'github_pat_' + 'b' * 30}
        s.private = True; s.n = 0; s.log = []
        s.contents = {'README.md': b'# sync'}; s.blobs = {}; s.trees = {}; s.commits = {}; s.refs = {'main': 'f' * 40}
    def sha(s, b=b''):
        s.n += 1; return hashlib.sha1(b + str(s.n).encode()).hexdigest()
    async def handle(s, r):
        req = r.request; u = req.url.split('api.github.com', 1)[1]; m = req.method
        H = {'access-control-allow-origin': '*', 'content-type': 'application/json'}
        def J(o, st=200): return r.fulfill(status=st, headers=H, body=json.dumps(o))
        if m == 'OPTIONS': return await r.fulfill(status=204, headers={**H, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})
        auth = (await req.all_headers()).get('authorization', '')
        if auth.replace('Bearer ', '') not in s.tokens: return await J({'message': 'Bad credentials'}, 401)
        s.log.append((m, u))
        body = json.loads(req.post_data) if req.post_data else None
        P = '/repos/tvspk/zelvi-sudoku-sync'
        if u == '/user': return await J({'login': 'tvspk'})
        if u == P: return await J({'full_name': 'tvspk/zelvi-sudoku-sync', 'private': s.private})
        if not u.startswith(P): return await J({'message': 'Not Found'}, 404)
        u = u[len(P):]
        if u.startswith('/contents/'):
            f = u[len('/contents/'):]
            if m == 'GET': return await (J({'content': base64.b64encode(s.contents[f]).decode()}) if f in s.contents else J({'message': 'Not Found'}, 404))
            if m == 'PUT':
                if f in s.contents: return await J({'message': 'sha wasn’t supplied'}, 422)
                s.contents[f] = base64.b64decode(body['content']); return await J({'content': {}}, 201)
        if u.startswith('/git/matching-refs/heads/'):
            pre = u.split('/heads/', 1)[1]
            return await J([{'ref': 'refs/heads/' + k, 'object': {'sha': v}} for k, v in s.refs.items() if k.startswith(pre)])
        if u.startswith('/git/commits/') and m == 'GET':
            c = s.commits.get(u.split('/')[-1]); return await (J(c) if c else J({'message': 'Not Found'}, 404))
        if u.startswith('/git/trees/') and m == 'GET': return await J({'tree': s.trees[u.split('/')[-1]]})
        if u.startswith('/git/blobs/') and m == 'GET':
            return await r.fulfill(status=200, headers={**H, 'content-type': 'application/octet-stream'}, body=s.blobs[u.split('/')[-1]])
        if u == '/git/blobs' and m == 'POST':
            b = base64.b64decode(body['content']); h = s.sha(b); s.blobs[h] = b; return await J({'sha': h}, 201)
        if u == '/git/trees' and m == 'POST':
            h = s.sha(); s.trees[h] = [{**e, 'type': 'blob'} for e in body['tree']]; return await J({'sha': h}, 201)
        if u == '/git/commits' and m == 'POST':
            h = s.sha(); c = {'sha': h, 'tree': {'sha': body['tree']}, 'committer': {'date': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}}
            s.commits[h] = c; return await J(c, 201)
        if u == '/git/refs' and m == 'POST':
            k = body['ref'].replace('refs/heads/', '')
            if k in s.refs: return await J({'message': 'Reference already exists'}, 422)
            s.refs[k] = body['sha']; return await J({}, 201)
        if u.startswith('/git/refs/heads/') and m == 'PATCH':
            k = u.split('/heads/', 1)[1]
            if k not in s.refs: return await J({'message': 'Not Found'}, 422)
            s.refs[k] = body['sha']; return await J({})
        return await J({'message': 'Not Found ' + u}, 404)
    def state_of(s, br, code):
        """Rozšifruje stav větve stejně jako aplikace (kontrola formátu a šifrování)."""
        c = s.commits[s.refs[br]]; e = [x for x in s.trees[c['tree']['sha']] if x['path'] == 'state'][0]; raw = s.blobs[e['sha']]
        key = HKDF(algorithm=hashes.SHA256(), length=32, salt=b'Zelvi sudoku sync v1', info=b'state').derive(code.encode())
        return json.loads(gzip.decompress(AESGCM(key).decrypt(raw[:12], raw[12:], b'state')))

G = GH()
TOK_A, TOK_B = 'github_pat_' + 'a' * 30, 'github_pat_' + 'b' * 30
NOW = dt.datetime.now()

async def st(pg): return json.loads(await pg.evaluate("localStorage.getItem('zelvi-sudoku-v1')"))
async def cfg(pg):
    v = await pg.evaluate("localStorage.getItem('zelvi-sync')"); return json.loads(v) if v else None
async def device(b, init=None, lang=None, name=None):
    ctx = await b.new_context(viewport={'width': 393, 'height': 820})
    pg = await ctx.new_page(); await route(pg); await pg.route('https://api.github.com/**', G.handle)
    if lang: await pg.add_init_script("localStorage.setItem('zelvi-lang','%s')" % lang)
    if init is not None: await pg.add_init_script("localStorage.getItem('zelvi-sudoku-v1')||localStorage.setItem('zelvi-sudoku-v1',%s)" % json.dumps(json.dumps(init)))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.errs = errs
    await pg.goto(os.environ.get('ZS_URL') or 'file://' + os.path.abspath('p.html'))   # ZS_URL: např. webová verze přes http (kontrola CSP)
    if await pg.locator('#w-player').count():
        if name: await pg.fill('#w-player', name)
        await pg.click('[data-act=welcomeGo]')
    return pg
async def settle(pg, ms=300):
    for _ in range(60):
        await asyncio.sleep((ms)/1000); await asyncio.sleep(0.05)
        c = await cfg(pg)
        if not await pg.locator('#sy-box [data-act=syNow][disabled]').count() and not (await pg.evaluate("document.body.innerText")).count('Synchronizuji…'): break
async def wait_sync(pg, before):
    for _ in range(200):
        await asyncio.sleep((100)/1000); await asyncio.sleep(0.03)
        c = await cfg(pg)
        if c and (c.get('lastAttempt') or 0) > before and await pg.locator('#sy-box [data-act=syNow][disabled]').count() == 0: return c
    return await cfg(pg)
async def sync(pg):
    await asyncio.sleep((1000)/1000)
    await pg.click('.tab[data-v=settings]')
    before = (await cfg(pg) or {}).get('lastAttempt') or 0
    await pg.click('#sy-box [data-act=syNow]')
    return await wait_sync(pg, before)
async def start(pg, mode='classic', lv=0):
    await pg.click('.tab[data-v=home]')
    if mode == 'classic': await pg.click(f'[data-act=play][data-mode=classic][data-level="{lv}"]')
    elif mode == 'quick': await pg.click('[data-act=play][data-mode=quick]')
    else: await pg.click(f'[data-act=pick][data-mode={mode}]'); await pg.click(f'.sheet [data-act=play][data-level="{lv}"]')
    if await pg.locator('[data-act=pendingGo]').count(): await pg.click('[data-act=pendingGo]')
    await asyncio.sleep((300)/1000)
async def hint_step(pg):
    try:
        await pg.click('[data-act=hint]', timeout=3000); await asyncio.sleep(0.05)
        for _ in range(10):
            if await pg.locator('[data-act=hintMore]:visible').count(): await pg.click('[data-act=hintMore]:visible', timeout=3000); await asyncio.sleep(0.03)
            else: break
        if await pg.locator('[data-act=hintFix]:visible').count(): await pg.click('[data-act=hintFix]:visible', timeout=3000)
        elif await pg.locator('[data-act=hintReveal]:visible').count(): await pg.click('[data-act=hintReveal]:visible', timeout=3000)
    except Exception as e:
        if 'Timeout' not in str(e): raise
    await asyncio.sleep(0.05)
async def solve(pg):
    for _ in range(300):
        await asyncio.sleep(0.02)
        if await pg.locator('#modal:not([hidden]) [data-act=home]').count(): break
        await hint_step(pg)
    won = await pg.locator('#modal:not([hidden]) [data-act=home]').count() == 1
    if won: await pg.click('#modal [data-act=home]')
    return won
async def play(pg, mode='classic', lv=0): await start(pg, mode, lv); return await solve(pg)
async def setup(pg, token=TOK_A, code=None):
    """Nastaví synchronizaci; bez kódu čeká, že vznikne nový (vrátí ho)."""
    await pg.click('.tab[data-v=settings]'); await pg.click('#sy-box [data-act=sySetup]')
    await pg.fill('#sy-tok', token); await pg.click('[data-act=syConnect]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if await pg.locator('.sy-words li').count() or await pg.locator('#sy-code').count() or not await pg.locator('#sy-err[hidden]').count(): break
    if await pg.locator('.sy-words li').count():
        words = ' '.join(await pg.locator('.sy-words li').all_inner_texts()); await pg.click('[data-act=syNewGo]')
    elif await pg.locator('#sy-code').count():
        await pg.fill('#sy-code', code); await pg.click('[data-act=syCodeGo]'); words = code
    else: return None
    for _ in range(100):
        await asyncio.sleep(0.03)
        if await pg.locator('[data-act=syJoinGo]').count() or (await cfg(pg) or {}).get('lastSync'): break
    await settle(pg)
    return words
def tot(s): return s['stats']['solved'], s['xp']

async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch()
    # ---------- A: první zařízení s postupem ----------
    A = await device(b, name='Jana')
    ok('A: vyřešená hra', await play(A))
    await A.click('.tab[data-v=settings]')
    ok('Nastavení: sekce Synchronizace s tlačítkem', await A.locator('#sy-box [data-act=sySetup]').count() == 1)
    ok('patička: jen v tomto zařízení', 'ukládá se jen v tomto zařízení' in await A.inner_text('#v-settings'))
    # veřejný repozitář je odmítnut
    G.private = False
    await A.click('#sy-box [data-act=sySetup]'); await A.fill('#sy-tok', TOK_A); await A.click('[data-act=syConnect]'); await asyncio.sleep(0.4)
    ok('veřejný repozitář odmítnut', 'veřejný' in await A.inner_text('#sy-err'), await A.inner_text('#sy-err'))
    G.private = True
    await A.fill('#sy-tok', 'github_pat_' + 'x' * 30); await A.click('[data-act=syConnect]'); await asyncio.sleep(0.4)
    ok('neplatný token odmítnut', 'Token je neplatný' in await A.inner_text('#sy-err'))
    await A.click('#modal [data-act=close]')
    code = await setup(A)
    ok('A: nový párovací kód má 8 slov', code and len(code.split()) == 8, code)
    c = await cfg(A)
    ok('A: připojeno a nahráno', c and c['lastSync'] > 0 and not c['lastError'] and c['branch'] in G.refs, c and c.get('lastError'))
    ok('schránka: popis se šifrovanou kontrolou', 'zelvi-sudoku-sync.json' in G.contents and json.loads(G.contents['zelvi-sudoku-sync.json'])['app'] == 'ZelviSudoku')
    raw = G.blobs[[e for e in G.trees[G.commits[G.refs[c['branch']]]['tree']['sha']] if e['path'] == 'state'][0]['sha']]
    ok('na GitHubu je jen šifrovaný obsah', b'Jana' not in raw and b'solved' not in raw and len(raw) > 40)
    sa = G.state_of(c['branch'], code)
    ok('stav jde rozšifrovat 8 slovy a má správný tvar', sa['app'] == 'ZelviSudoku' and sa['own'].get('s.solved') == 1 and sa['lw']['player']['v'] == 'Jana', sa['own'])
    ok('patička: synchronizuje se', 'synchronizuje se šifrovaně' in await A.inner_text('#v-settings'))
    ok('Nastavení: stav Naposledy', 'Naposledy:' in await A.inner_text('#sy-box'))
    sA = await st(A); ok('záloha ani stav neobsahují token ani kód', TOK_A not in json.dumps(sA) and code.split()[0] not in json.dumps(sA))
    await A.click('[data-act=backupMake]'); bk = await A.input_value('#bk-code'); await A.click('#modal [data-act=close]')
    dec = zlib.decompress(base64.b64decode(bk[4:]), -15).decode()
    ok('zálohovací kód je bez tokenu a kódu', TOK_A not in dec and code.split()[1] not in dec and '"solved":1' in dec)

    # ---------- B: nové prázdné zařízení převezme postup ----------
    B = await device(b)
    await B.click('.tab[data-v=settings]'); await B.click('#sy-box [data-act=sySetup]')
    await B.fill('#sy-tok', TOK_B); await B.click('[data-act=syConnect]')
    for _ in range(50):
        await asyncio.sleep(0.03)
        if await B.locator('#sy-code').count(): break
    await B.fill('#sy-code', 'abandon ability able about above absent absorb abstract'); await B.click('[data-act=syCodeGo]'); await asyncio.sleep(0.3)
    ok('B: špatný kód odmítnut', 'Kód nesedí' in await B.inner_text('#sy-err'))
    short = ' '.join(w[:4].upper() for w in code.split())
    await B.fill('#sy-code', short); await B.click('[data-act=syCodeGo]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if (await cfg(B) or {}).get('lastSync'): break
    await settle(B)
    sB, sA = await st(B), await st(A)
    ok('B: kód stačí zadat prvními 4 písmeny, velkými', (await cfg(B) or {}).get('code') == code)
    ok('B: převzal postup (bez dotazu, byl prázdný)', tot(sB) == tot(sA) and sB['stats']['byKey'] == sA['stats']['byKey'], (tot(sB), tot(sA)))
    ok('B: převzal jméno a pohlednice/odznaky', sB['settings']['player'] == 'Jana' and sB['ach'].keys() == sA['ach'].keys())
    ok('B: dny a časy', sB['stats']['days'] == sA['stats']['days'] and len(sB['stats']['times']) == 1)
    await B.click('.tab[data-v=settings]')
    ok('B: 2 spárovaná zařízení', 'Spárovaných zařízení: 2' in await B.inner_text('#sy-box'))

    # ---------- hra na B, potom A ----------
    ok('B: vyřešená hra', await play(B, 'quick'))
    await asyncio.sleep((3500)/1000)                     # po výhře se nahraje do 3 s samo
    for _ in range(100):
        await asyncio.sleep(0.03)
        if G.state_of((await cfg(B))['branch'], code)['own'].get('s.solved') == 1: break
    ok('B: po výhře se nahrálo samo', G.state_of((await cfg(B))['branch'], code)['own'].get('s.solved') == 1)
    await sync(A); sA, sB = await st(A), await st(B)
    ok('A: má součet obou zařízení', tot(sA) == tot(sB) and sA['stats']['solved'] == 2, (tot(sA), tot(sB)))
    ok('A: Rychlovka z B ve statistikách', sA['stats']['quick'] == 1 and sA['stats']['byKey'].get('quick-0', {}).get('n') == 1)

    # ---------- souběžně na obou ----------
    ok('A: další hra', await play(A, 'classic', 1)); ok('B: další hra', await play(B, 'classic', 1))
    await sync(A); await sync(B); await sync(A)
    sA, sB = await st(A), await st(B)
    ok('souběžné hry se sečetly na obou', sA['stats']['solved'] == 4 and tot(sA) == tot(sB), (tot(sA), tot(sB)))
    ok('rekord Velmi lehká = lepší z obou', sA['stats']['byKey']['classic-1']['n'] == 2 and sA['stats']['byKey']['classic-1']['best'] == sB['stats']['byKey']['classic-1']['best'])
    ok('dny sečtené', sum(sA['stats']['days'].values()) == 4 and sA['stats']['days'] == sB['stats']['days'])
    ok('časy her z obou', len(sA['stats']['times']) == 4 and sorted(map(json.dumps, sA['stats']['times'])) == sorted(map(json.dumps, sB['stats']['times'])))
    x = tot(sA); await sync(A); await sync(B); await sync(A)
    ok('opakovaná synchronizace nic nepřičítá', tot(await st(A)) == x and tot(await st(B)) == x)
    n0 = len(G.commits); await sync(A)
    ok('beze změny se nic nenahrává', len(G.commits) == n0)

    # ---------- rozehraná hra ----------
    await start(A, 'classic', 2)
    for _ in range(3): await hint_step(A)
    await A.click('[data-act=leave]'); await sync(A)
    gA = (await st(A))['game']; await sync(B); gB = (await st(B))['game']
    ok('B: dostal rozehranou hru z A', gB and gB['vals'] == gA['vals'] and gB['level'] == 2)
    await B.click('.tab[data-v=home]')
    ok('B: domovská obrazovka nabízí pokračovat', await B.locator('[data-act=continue]').count() == 1)
    await B.click('[data-act=continue]'); await hint_step(B); await hint_step(B); await B.click('[data-act=leave]')
    await sync(B); await sync(A)
    ok('A: pokračuje tam, kde skončila na B', (await st(A))['game']['vals'] == (await st(B))['game']['vals'] != gA['vals'])
    # A má otevřenou hru, B mezitím hraje dál → po návratu do aplikace se hra na A vymění
    await A.click('.tab[data-v=home]'); await A.click('[data-act=continue]')
    await B.click('.tab[data-v=home]'); await B.click('[data-act=continue]'); await hint_step(B); await B.click('[data-act=leave]'); await sync(B)
    filledB = sum(1 for v in (await st(B))['game']['vals'] if v)
    await asyncio.sleep((25000)/1000)
    await A.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
    for _ in range(80):
        await asyncio.sleep((200)/1000); await asyncio.sleep(0.03)
        if sum(1 for v in (await st(A))['game']['vals'] if v) == filledB: break
    filledA = await A.evaluate("[...document.querySelectorAll('#board .cell .v')].filter(e=>e.textContent.trim()).length")
    ok('A: otevřená hra se po návratu vyměnila za novější z B', sum(1 for v in (await st(A))['game']['vals'] if v) == filledB and filledA == filledB, (filledA, filledB))
    ok('A: herní obrazovka zůstala otevřená', await A.locator('#v-game:not([hidden])').count() == 1)
    ok('A: hru jde dohrát', await solve(A))
    await sync(A); await sync(B)
    sA, sB = await st(A), await st(B)
    ok('dohraná hra: obě zařízení bez rozehrané hry a se stejným součtem', (not sB['game'] or sB['game'].get('done')) and tot(sA) == tot(sB) and sA['stats']['solved'] == 5, (tot(sA), tot(sB)))
    await B.click('.tab[data-v=home]')
    ok('B: už nenabízí pokračovat', await B.locator('[data-act=continue]').count() == 0)

    # ---------- jméno želvičky: naposledy změněné vyhrává ----------
    await B.click('.tab[data-v=settings]'); await B.fill('#pet-in', 'Bětka'); await asyncio.sleep((1000)/1000)
    await sync(B); await sync(A)
    ok('jméno želvičky z B je i na A', (await st(A))['pet']['name'] == 'Bětka')
    await A.click('.tab[data-v=settings]'); await A.click('[data-act=set][data-k=fs][data-v="1.3"]'); await sync(A); await sync(B)
    ok('velikost písma se nesynchronizuje', (await st(B))['settings']['fs'] == 1 and (await st(A))['settings']['fs'] == 1.3)

    # ---------- C: zařízení s vlastním postupem → přičíst ----------
    base = await st(A)
    pre = json.loads(json.dumps(base)); pre['xp'] = 500; pre['stats'] = {**pre['stats'], 'solved': 7, 'days': {'2026-01-05': 7}, 'times': [], 'byKey': {'classic-0': {'n': 7, 'best': 100, 'total': 900}}, 'quick': 0}
    pre['game'] = None; pre['pet']['name'] = 'Rozárka'
    C = await device(b, init=pre)
    await setup(C, TOK_A, code)
    ok('C: zeptá se, co s postupem', await C.locator('[data-act=syJoinGo]').count() == 2 and 'Vyřešených her tady: 7' in await C.inner_text('#modal'))
    await C.click('[data-act=syJoinGo][data-m=add]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if (await cfg(C) or {}).get('lastSync'): break
    await settle(C); await sync(A)
    sA, sC = await st(A), await st(C)
    ok('C: přičteno (5 + 7 her, body)', sC['stats']['solved'] == 12 and sA['stats']['solved'] == 12 and sC['xp'] == base['xp'] + 500 and tot(sA) == tot(sC), (tot(sA), tot(sC)))
    ok('C: rekord Úplně lehká = lepší ze zařízení', sA['stats']['byKey']['classic-0']['best'] == min(100, base['stats']['byKey']['classic-0']['best']) == sC['stats']['byKey']['classic-0']['best'])
    ok('C: převzal jméno želvičky ze schránky (Bětka)', sC['pet']['name'] == 'Bětka')
    ok('12 her = pohlednice', len(sA['postcards']) == 1 and len(sC['postcards']) == 1)
    await sync(B); ok('B: 3 zařízení, stejný součet', tot(await st(B)) == tot(sA) and 'Spárovaných zařízení: 3' in await B.inner_text('#sy-box'))

    # ---------- D: zařízení s postupem → převzít ----------
    pre2 = json.loads(json.dumps(base)); pre2['xp'] = 999; pre2['stats'] = {**pre2['stats'], 'solved': 40, 'byKey': {'classic-0': {'n': 40, 'best': 50, 'total': 4000}}}
    D = await device(b, init=pre2)
    await setup(D, TOK_B, code); await D.click('[data-act=syJoinGo][data-m=adopt]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if (await cfg(D) or {}).get('lastSync'): break
    await settle(D); await sync(A)
    sD, sA = await st(D), await st(A)
    ok('D: převzal postup, vlastní zahodil', tot(sD) == tot(sA) and sD['stats']['solved'] == 12 and sD['stats']['byKey']['classic-0']['best'] == sA['stats']['byKey']['classic-0']['best'] != 50, (tot(sD), tot(sA)))

    # ---------- neplatný token, nový token ----------
    G.tokens.discard(TOK_B)
    await sync(B)
    ok('B: vypršelý token = hláška a tlačítko Vložit nový token', 'Token je neplatný' in await B.inner_text('#sy-box') and await B.locator('[data-act=syToken]').count() == 1)
    newtok = 'github_pat_' + 'c' * 30; G.tokens.add(newtok)
    await B.click('[data-act=syToken]'); await B.fill('#sy-tok', newtok); await B.click('[data-act=syTokenGo]')
    for _ in range(100):
        await asyncio.sleep((100)/1000); await asyncio.sleep(0.03)
        if (await cfg(B)).get('token') == newtok and not (await cfg(B)).get('lastError') and (await cfg(B)).get('lastSync'): break
    ok('B: nový token uložen a funguje', (await cfg(B))['token'] == newtok and not (await cfg(B))['lastError'])

    # ---------- poškozená data jiného zařízení ----------
    brC = (await cfg(C))['branch']; e = [x for x in G.trees[G.commits[G.refs[brC]]['tree']['sha']] if x['path'] == 'state'][0]
    good = G.blobs[e['sha']]; G.blobs[e['sha']] = good[:20] + bytes([good[20] ^ 1]) + good[21:]
    await A.click('.tab[data-v=settings]'); before = (await cfg(A))['lastAttempt']; await asyncio.sleep((1000)/1000)
    await A.click('#sy-box [data-act=syNow]'); await wait_sync(A, before)
    ok('poškozený stav: hláška, ostatní data zůstanou', (await cfg(A))['lastError'] == 'damaged' and tot(await st(A)) == tot(sA))
    G.blobs[e['sha']] = good

    # ---------- angličtina ----------
    E = await device(b, lang='en')
    await E.click('.tab[data-v=settings]')
    t = await E.inner_text('#v-settings')
    ok('EN: sekce Sync anglicky', 'Set up sync' in t and 'Sync' in t and not re.search('[ěščřžýáíéůú]', await E.inner_text('#sy-box')))
    await E.click('#sy-box [data-act=sySetup]'); await E.fill('#sy-tok', TOK_A); await E.click('[data-act=syConnect]')
    for _ in range(50):
        await asyncio.sleep(0.03)
        if await E.locator('#sy-code').count(): break
    ok('EN: zadání kódu anglicky', 'Enter the 8 words' in await E.inner_text('#modal') and not re.search('[ěščřžýáíéůú]', await E.inner_text('#modal')))
    await E.fill('#sy-code', code); await E.click('[data-act=syCodeGo]')
    for _ in range(100):
        await asyncio.sleep(0.03)
        if (await cfg(E) or {}).get('lastSync'): break
    await settle(E)
    ok('EN: převzal postup a texty anglicky', (await st(E))['stats']['solved'] == 12 and 'Last sync:' in await E.inner_text('#sy-box') and 'Paired devices: 5' in await E.inner_text('#sy-box'))

    # ---------- vypnutí, smazání dat ----------
    await D.click('.tab[data-v=settings]'); await D.click('[data-act=syOffAsk]'); await D.click('[data-act=syOff]')
    ok('D: vypnuto, postup zůstal', await cfg(D) is None and (await st(D))['stats']['solved'] == 12 and await D.locator('#sy-box [data-act=sySetup]').count() == 1)
    await C.click('.tab[data-v=settings]'); await C.click('[data-act=resetAsk]')
    ok('smazání dat upozorní na vypnutí synchronizace', 'Synchronizace se v tomto zařízení vypne' in await C.inner_text('#modal'))
    await C.click('[data-act=resetYes]')
    ok('C: smazáno a odpojeno', await cfg(C) is None and (await st(C))['stats']['solved'] == 0)
    await sync(A)
    ok('A: smazání na C se ostatních nedotklo', (await st(A))['stats']['solved'] == 12)

    # ---------- automaticky: při odchodu z aplikace ----------
    ok('A: hra před odchodem', await play(A, 'quick'))
    n0 = len(G.commits)
    await A.evaluate("Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'))")
    for _ in range(100):
        await asyncio.sleep(0.03)
        if len(G.commits) > n0: break
    ok('A: při odchodu z aplikace se nahrálo hned', len(G.commits) > n0)
    await A.evaluate("Object.defineProperty(document,'hidden',{value:false,configurable:true})")
    await asyncio.sleep((61000)/1000)
    for _ in range(100):
        await asyncio.sleep((200)/1000); await asyncio.sleep(0.03)
        if (await st(B))['stats']['solved'] == 13: break
    ok('B: v otevřené aplikaci se do minuty samo stáhne', (await st(B))['stats']['solved'] == 13)

    for nm, pg in (('A', A), ('B', B), ('C', C), ('D', D), ('E', E)):
        print(nm, 'chyby v konzoli:', pg.errs)
        if pg.errs: fails.append('konzole ' + nm)
    await b.close()
  print('HOTOVO' if not fails else 'SELHALO: ' + ', '.join(fails))
asyncio.run(main())
