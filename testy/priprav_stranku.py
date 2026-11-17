# Z aplikace vytvoří testovací stránku p.html (doplní hlavičku, kterou jinak přidá artefakt)
import os
here=os.path.dirname(os.path.abspath(__file__))
s=open(os.path.join(here,'..','zelvi-sudoku.html'),encoding='utf-8').read()
open(os.path.join(here,'p.html'),'w',encoding='utf-8').write('<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'+s+'</body></html>')
import re
js='\n'.join(re.findall(r'<script>(.*?)</script>',s,flags=re.S))  # oba skripty: překlady (I18N) i aplikace
open(os.path.join(here,'app.js'),'w',encoding='utf-8').write(js)
print('p.html a app.js připraveny')
