# Z artefaktu (zelvi-sudoku.html) udělá samostatný offline index.html pro APK.
import base64, re, sys, pathlib
src, out, fontdir = sys.argv[1], sys.argv[2], pathlib.Path(sys.argv[3])
h = pathlib.Path(src).read_text(encoding='utf-8')
LAT = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"
EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
fonts = [('Baloo 2','baloo-2',[500,600,700]),('Nunito','nunito',[500,700,800]),('VT323','vt323',[400])]
ff = []
for fam, slug, ws in fonts:
    for w in ws:
        for sub, rng in (('latin-ext', EXT), ('latin', LAT)):
            p = next(fontdir.glob(f'fontsource-{slug}-*/package/files/{slug}-{sub}-{w}-normal.woff2'))
            b = base64.b64encode(p.read_bytes()).decode()
            ff.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format('woff2');unicode-range:{rng}}}")
# odstranit odkazy na Google Fonts a meta pro artefakt
h = re.sub(r'<link rel="(preconnect|stylesheet)" href="https://fonts\.[^>]*>\n?', '', h)
h = re.sub(r'<meta name="claude:[^>]*>\n?', '', h)
assert 'googleapis' not in h and 'gstatic' not in h
# napojení na Android: barvy lišt a tlačítko Zpět
a = "r.dataset.skin=sk;r.style.setProperty('--fs',S.settings.fs)}"
assert h.count(a) == 1; h = h.replace(a, a[:-1] + ";zsBars()}")
a = "document.body.classList.toggle('in-game',v==='game');renderTabs();"
assert h.count(a) == 1; h = h.replace(a, a + "zsBars();")
a = "document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});"
assert h.count(a) == 1
js = r"""/* ---------- APK (Android): barvy systémových lišt a tlačítko Zpět ---------- */
function zsBars(){try{if(!window.ZSAndroid)return;const cs=getComputedStyle(document.documentElement),bg=cs.getPropertyValue('--bg').trim(),nav=UI.view==='game'?bg:cs.getPropertyValue('--surface').trim();ZSAndroid.setBars(bg,nav)}catch(e){}}
/* Volá ho Activity při stisku Zpět. true = vyřízeno v aplikaci, false = aplikaci schovat */
window.zsBack=function(){try{
  const m=$('#modal');
  if(!m.hidden){if(m.querySelector('#w-player'))return false;closeModal();if(UI.view==='game'&&S.game)refresh();return true}
  if(UI.view==='game'){if(UI.hint){hideHint();updateBoard();return true}hideHint();go('home');return true}
  if(UI.view==='school'&&(UI.lesson>=0||UI.glesson)){ACT.lessonBack();return true}
  if(UI.view!=='home'){go('home');return true}
  return false}catch(e){return false}};
"""
h = h.replace(a, js + a)
a = "try{navigator.clipboard.writeText(UI.bcode)"
assert h.count(a) == 1
h = h.replace(a, "if(window.ZSAndroid&&ZSAndroid.copy){try{ZSAndroid.copy(UI.bcode);toast('Kód je zkopírovaný.');return}catch(e){}}" + a)
i = h.index('</style>') + len('</style>')
head = ('<!doctype html>\n<html lang="cs">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<style>\n' + '\n'.join(ff) + '\nbody{margin:0}\n</style>\n')
h = head + h[:i] + '\n</head>\n<body>\n' + h[i:].lstrip('\n') + '\n</body>\n</html>\n'
pathlib.Path(out).write_text(h, encoding='utf-8')
print(len(h), 'B')
