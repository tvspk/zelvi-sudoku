import sys, asyncio
from playwright.async_api import async_playwright
idx, outdir = sys.argv[1], sys.argv[2]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(device_scale_factor=1)
        await pg.goto('file://' + idx)
        await pg.wait_for_timeout(500)
        svg = await pg.evaluate("document.querySelector('#modal svg').outerHTML")
        await pg.evaluate("""(svg)=>{document.querySelector('#modal').hidden=true;
          for(const e of document.body.children)e.style.visibility='hidden';
          document.documentElement.style.background='transparent';document.body.style.background='transparent';
          const mk=(id,bg,sz,inner,rad)=>{const d=document.createElement('div');d.id=id;
            d.style.cssText=`position:fixed;left:0;top:0;width:${sz}px;height:${sz}px;z-index:999;display:grid;place-items:center;background:${bg};border-radius:${rad}`;
            d.innerHTML=svg;const s=d.firstElementChild;s.removeAttribute('class');s.style.cssText=`width:${inner}px;height:${inner}px;display:block;animation:none`;d.style.visibility='visible';document.body.appendChild(d);return d};
          window._mk=mk}""", svg)
        sizes = {'mdpi':(48,108),'hdpi':(72,162),'xhdpi':(96,216),'xxhdpi':(144,324),'xxxhdpi':(192,432)}
        for name,(leg,fg) in sizes.items():
            await pg.set_viewport_size({'width':600,'height':600})
            # popředí adaptivní ikony (průhledné), želvička v bezpečné zóně
            await pg.evaluate("([s])=>{document.querySelectorAll('#ic').forEach(e=>e.remove());_mk('ic','transparent',s,Math.round(s*0.62),'0')}", [fg])
            await pg.locator('#ic').screenshot(path=f'{outdir}/fg-{name}.png', omit_background=True)
            await pg.evaluate("([s])=>{document.querySelectorAll('#ic').forEach(e=>e.remove());_mk('ic','#BCE6EE',s,Math.round(s*0.86),'22%')}", [leg])
            await pg.locator('#ic').screenshot(path=f'{outdir}/leg-{name}.png', omit_background=True)
            await pg.evaluate("([s])=>{document.querySelectorAll('#ic').forEach(e=>e.remove());_mk('ic','#BCE6EE',s,Math.round(s*0.86),'50%')}", [leg])
            await pg.locator('#ic').screenshot(path=f'{outdir}/round-{name}.png', omit_background=True)
        await pg.evaluate("()=>{document.querySelectorAll('#ic').forEach(e=>e.remove());_mk('ic','#BCE6EE',512,440,'22%')}")
        await pg.locator('#ic').screenshot(path=f'{outdir}/preview-512.png', omit_background=True)
        await b.close()
asyncio.run(main())
