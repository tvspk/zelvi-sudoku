# Webová verze pro GitHub Pages (počítač, tablet v prohlížeči): z zelvi-sudoku.html udělá index.html a sw.js v kořeni repozitáře.
# index.html = stejný samostatný soubor jako v APK (vložená písma, android/scripts/make_index.py) + instalace jako aplikace (PWA)
# + Content-Security-Policy (síť jen api.github.com pro synchronizaci).
#   python3 scripts/build_web.py           # vytvoří / přepíše index.html a sw.js
#   python3 scripts/build_web.py --check   # jen ověří, že jsou aktuální (GitHub Actions)
# Písma se berou z android/tools (stáhne android/pripravit_nastroje.sh).
import hashlib, pathlib, subprocess, sys, tempfile

root = pathlib.Path(__file__).resolve().parent.parent
tools = root / 'android' / 'tools'
if not tools.exists():
    subprocess.run(['sh', str(root / 'android' / 'pripravit_nastroje.sh')], check=True)
with tempfile.TemporaryDirectory() as td:
    tmp = pathlib.Path(td) / 'index.html'
    subprocess.run([sys.executable, '-I', str(root / 'android' / 'scripts' / 'make_index.py'), str(root / 'zelvi-sudoku.html'), str(tmp), str(tools)],
                   check=True, stdout=subprocess.DEVNULL)
    h = tmp.read_text(encoding='utf-8')

CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; "
       "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.github.com; "
       "base-uri 'none'; form-action 'none'; object-src 'none'")
head = ('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        f'<meta http-equiv="Content-Security-Policy" content="{CSP}">\n'
        '<meta name="referrer" content="no-referrer">\n'
        '<title>Želví sudoku</title>\n'
        '<meta name="theme-color" content="#E2F2EF">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<link rel="icon" href="icons/icon-192.png">\n'
        '<link rel="apple-touch-icon" href="icons/icon-192.png">\n')
a = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
assert h.count(a) == 1
h = h.replace(a, head)
sw = ("<script>if('serviceWorker' in navigator&&location.protocol==='https:')"
      "addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))</script>\n")
assert h.count('</body>') == 1
h = h.replace('</body>', sw + '</body>')

files = ['index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png']
ver = hashlib.sha256(h.encode() + b''.join((root / f).read_bytes() for f in files[1:])).hexdigest()[:12]
swjs = f"""// Offline: vždy nejdřív síť (nová verze hned), bez sítě z mezipaměti. Vytváří scripts/build_web.py, ručně neupravovat.
const C='zs-{ver}',F={files!r};
self.addEventListener('install',e=>{{e.waitUntil(caches.open(C).then(c=>c.addAll(['./',...F])));self.skipWaiting()}});
self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))}});
self.addEventListener('fetch',e=>{{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith(fetch(r).then(x=>{{if(x.ok){{const y=x.clone();caches.open(C).then(c=>c.put(r,y))}}return x}})
    .catch(()=>caches.match(r,{{ignoreSearch:true}}).then(x=>x||caches.match('index.html'))))}});
"""
out = {'index.html': h, 'sw.js': swjs}
if '--check' in sys.argv:
    bad = [f for f, t in out.items() if not (root / f).exists() or (root / f).read_text(encoding='utf-8') != t]
    if bad:
        print('Neaktuální:', ', '.join(bad), '→ spusťte python3 scripts/build_web.py'); sys.exit(1)
    print('index.html a sw.js jsou aktuální')
else:
    for f, t in out.items(): (root / f).write_text(t, encoding='utf-8')
    print('index.html', len(h), 'B; sw.js', ver)
