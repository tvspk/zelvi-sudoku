import os
FD=os.path.join(os.path.dirname(os.path.abspath(__file__)),'fonts','node_modules','@fontsource')
def css():
  out=''
  for fam,ws in [('baloo-2',[500,600,700]),('nunito',[500,700,800])]:
    for w in ws:out+=open(f'{FD}/{fam}/{w}.css').read().replace('./files/',f'file://{FD}/{fam}/files/')
  return out
async def route(pg):
  c=css()
  await pg.route('**/fonts.googleapis.com/**',lambda r:r.fulfill(status=200,content_type='text/css',body=c))
