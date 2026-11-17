
(()=>{
'use strict';
if(window.ZS_LANG==='en'&&!window.ZS_DONE&&window.ZS_RUN&&document.currentScript){ZS_RUN(document.currentScript);return}
const LANG='en';try{document.documentElement.lang=LANG;document.title='Turtle Sudoku'}catch(e){}
/*ENGINE*/
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}return h>>>0}
const pc=m=>{let c=0;while(m){m&=m-1;c++}return c};
const bd=m=>31-Math.clz32(m);
function shuffle(a,rng){for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}return a}
const GEO={};
function getGeo(N,br,bc,diag){
  const key=N+'-'+br+'-'+bc+'-'+(diag?1:0);if(GEO[key])return GEO[key];
  const units=[],kinds=[];
  for(let r=0;r<N;r++){const u=[];for(let c=0;c<N;c++)u.push(r*N+c);units.push(u);kinds.push('row')}
  for(let c=0;c<N;c++){const u=[];for(let r=0;r<N;r++)u.push(r*N+c);units.push(u);kinds.push('col')}
  if(br>0&&bc>0)for(let R=0;R<N;R+=br)for(let C=0;C<N;C+=bc){const u=[];for(let r=R;r<R+br;r++)for(let c=C;c<C+bc;c++)u.push(r*N+c);units.push(u);kinds.push('box')}
  if(diag){const a=[],b=[];for(let i=0;i<N;i++){a.push(i*N+i);b.push(i*N+N-1-i)}units.push(a,b);kinds.push('diag','diag')}
  const unitsOf=Array.from({length:N*N},()=>[]);units.forEach((u,k)=>u.forEach(c=>unitsOf[c].push(k)));
  const peers=unitsOf.map((us,i)=>{const s=new Set();us.forEach(k=>units[k].forEach(c=>{if(c!==i)s.add(c)}));return[...s]});
  return GEO[key]={N,br,bc,diag,units,kinds,unitsOf,peers,full:((1<<(N+1))-1)&~1};
}
function candMask(g,geo,i){let u=0;const p=geo.peers[i];for(let k=0;k<p.length;k++){const v=g[p[k]];if(v)u|=1<<v}return geo.full&~u}
function search(grid,geo,limit,rng){
  const g=grid.slice(),n=g.length;let count=0,sol=null;
  (function rec(){
    let best=-1,bm=0,bc=99;
    for(let i=0;i<n;i++){if(g[i])continue;const m=candMask(g,geo,i);if(!m)return;const c=pc(m);if(c<bc){bc=c;best=i;bm=m;if(c===1)break}}
    if(best<0){count++;if(!sol)sol=g.slice();return}
    const ds=[];for(let d=1;d<=geo.N;d++)if(bm&(1<<d))ds.push(d);
    if(rng)shuffle(ds,rng);
    for(const d of ds){g[best]=d;rec();if(count>=limit)break}
    g[best]=0;
  })();
  return{count,sol};
}
function solveSingles(grid,geo){
  const g=grid.slice(),n=g.length,N=geo.N;let prog=true;
  while(prog){prog=false;
    for(let i=0;i<n;i++){if(g[i])continue;const m=candMask(g,geo,i);if(!m)return null;if(pc(m)===1){g[i]=bd(m);prog=true}}
    for(const u of geo.units){
      for(let d=1;d<=N;d++){let has=false,cnt=0,at=-1;
        for(const c of u){if(g[c]===d){has=true;break}if(!g[c]&&(candMask(g,geo,c)&(1<<d))){cnt++;at=c}}
        if(has)continue;if(cnt===0)return null;if(cnt===1){g[at]=d;prog=true}}
    }
  }
  return g.every(v=>v)?g:null;
}
function generate(o){
  const rng=mulberry32(o.seed>>>0),geo=getGeo(o.N,o.br,o.bc,o.diag),n=o.N*o.N;
  const sol=search(new Array(n).fill(0),geo,1,rng).sol;
  const pz=sol.slice();const ok=()=>o.singles?!!solveSingles(pz,geo):search(pz,geo,2).count===1;
  const half=[];for(let i=0;i<=Math.floor((n-1)/2);i++)half.push(i);shuffle(half,rng);
  let clues=n;
  for(const i of half){if(clues<=o.clues)break;const j=n-1-i,vi=pz[i],vj=pz[j];pz[i]=0;pz[j]=0;
    if(ok())clues-=(i===j?1:2);else{pz[i]=vi;pz[j]=vj}}
  if(clues>o.clues+1){const rest=[];for(let i=0;i<n;i++)if(pz[i])rest.push(i);shuffle(rest,rng);
    for(const i of rest){if(clues<=o.clues)break;const v=pz[i];pz[i]=0;if(ok())clues--;else pz[i]=v}}
  return{puzzle:pz,sol};
}
/* Součtové sudoku: skupinky 2–5 políček bez opakování čísla; zadání řešitelné logikou (součty + řádek/sloupec/čtverec + jediné místo) */
function makeCages(sol,N,rng){
  const nb=i=>{const r=Math.floor(i/N),c=i%N,a=[];if(r>0)a.push(i-N);if(r<N-1)a.push(i+N);if(c>0)a.push(i-1);if(c<N-1)a.push(i+1);return a};
  for(let t=0;;t++){const cage=new Array(N*N).fill(-1),cs=[];
    for(const s of shuffle([...Array(N*N).keys()],rng)){if(cage[s]>=0)continue;const id=cs.length,cells=[s],used=new Set([sol[s]]);cage[s]=id;
      const size=2+Math.floor(rng()*3);
      while(cells.length<size){const opts=[];for(const c of cells)for(const x of nb(c))if(cage[x]<0&&!used.has(sol[x]))opts.push(x);
        if(!opts.length)break;const x=opts[Math.floor(rng()*opts.length)];cage[x]=id;cells.push(x);used.add(sol[x])}
      cs.push(cells)}
    /* osamělé políčko připojit k nejmenší sousední skupince, ve které jeho číslo ještě není */
    let lone=false;
    cs.forEach((cells,id)=>{if(cells.length!==1)return;const s=cells[0];let best=-1;
      for(const x of nb(s)){const k=cage[x];if(k!==id&&cs[k].length<5&&!cs[k].some(c=>sol[c]===sol[s])&&(best<0||cs[k].length<cs[best].length))best=k}
      if(best<0){lone=true;return}cs[best].push(s);cage[s]=best;cs[id]=[]});
    if(lone&&t<50)continue;
    const cages=[],map=new Array(N*N);
    for(const cells of cs){if(!cells.length)continue;const id=cages.length;cells.sort((a,b)=>a-b).forEach(c=>map[c]=id);cages.push({cells,sum:cells.reduce((a,c)=>a+sol[c],0)})}
    return{cage:map,cages}}
}
/* masky možností po políčkách skupinky (čísla se neopakují a dají součet), nebo null */
function kilEnum(cg,m,N){const c=cg.cells,k=c.length,u=new Array(k).fill(0),pick=new Array(k);let any=false;
  (function rec(q,used,s){if(q===k){if(s===cg.sum){any=true;for(let j=0;j<k;j++)u[j]|=1<<pick[j]}return}
    const left=k-q-1;
    for(let d=1;d<=N;d++){if(s+d+left>cg.sum)break;if(!(m[c[q]]&(1<<d))||(used&(1<<d)))continue;pick[q]=d;rec(q+1,used|1<<d,s+d)}})(0,0,0);
  return any?u:null}
/* možnosti všech políček: řádek, sloupec, čtverec podle doplněných čísel + opakované zúžení součty skupinek; null při sporu */
function kilProp(g,geo,cages){const n=g.length,m=new Array(n);
  for(let i=0;i<n;i++){m[i]=g[i]?1<<g[i]:candMask(g,geo,i);if(!m[i])return null}
  let ch=true;while(ch){ch=false;
    for(const cg of cages){const u=kilEnum(cg,m,geo.N);if(!u)return null;cg.cells.forEach((x,q)=>{if(m[x]!==u[q]){m[x]=u[q];ch=true}})}}
  return m}
/* vyřeší zadání stejnou logikou, jakou vysvětluje nápověda (součty, poslední možnost, jediné místo); true = vyřešeno */
function kilSolve(pz,geo,cages){const n=pz.length,N=geo.N,m=new Array(n);
  for(let i=0;i<n;i++)m[i]=pz[i]?1<<pz[i]:geo.full;
  let ch=true;while(ch){ch=false;
    for(let i=0;i<n;i++){if(!m[i])return false;if(pc(m[i])===1)for(const p of geo.peers[i])if(m[p]&m[i]){m[p]&=~m[i];ch=true;if(!m[p])return false}}
    for(const u of geo.units)for(let d=1;d<=N;d++){const b=1<<d;let cnt=0,at=-1;for(const c of u)if(m[c]&b){cnt++;at=c}
      if(!cnt)return false;if(cnt===1&&m[at]!==b){m[at]=b;ch=true}}
    for(const cg of cages){const u=kilEnum(cg,m,N);if(!u)return false;cg.cells.forEach((x,q)=>{if(m[x]!==u[q]){m[x]=u[q];ch=true}})}}
  return m.every(x=>pc(x)===1)}
function genKiller(seed){const rng=mulberry32(seed>>>0),geo=getGeo(9,3,3,false),n=81;
  const sol=search(new Array(n).fill(0),geo,1,rng).sol;
  const{cage,cages}=makeCages(sol,9,mulberry32((seed^0x9e3779b9)>>>0));
  const pz=sol.slice();
  /* nejdřív políčka uvnitř velkých skupinek, pak ostatní; zadané číslo zůstane jen tam, kde bez něj logika nestačí */
  for(const i of shuffle([...Array(n).keys()],rng)){const v=pz[i];pz[i]=0;if(!kilSolve(pz,geo,cages))pz[i]=v}
  return{puzzle:pz,sol,cage,cages}}
/*END ENGINE*/

const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const KEY='zelvi-sudoku-v1';
const dkey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const fromKey=k=>new Date(k+'T12:00:00');
const fmt=s=>{s=Math.max(0,Math.floor(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0')};
const plural=(n,a,b,c)=>n===1?a:(n>=2&&n<=4?b:c);
const dny=n=>plural(n,'day','days','days');
/* přepínač jazyka; popisky se nepřekládají, aby šel najít v obou jazycích */
const langSeg=()=>`<div class="seg lang-seg">${[['cs','Čeština'],['en','English']].map(([l,t])=>`<button class="${LANG===l?'on':''}" data-act="lang" data-l="${l}" lang="${l}">${t}</button>`).join('')}</div>`;
/* „chybí 1 bod“, „chybějí 2 body“, „chybí 5 bodů“; sloveso u 2–4 v množném čísle */
const chybiBody=n=>plural(n,n+' point',n+' points',n+' points');

function defaults(){return{v:2,welcomed:false,lastBackup:null,
  settings:{player:'',call:'',notesBtn:true,sound:true,vibrate:true,showErrors:true,highlight:true,showTimer:true,autoClean:true,symbols:'num',fs:1,skin:null},
  pet:{name:'Rosie',pets:0,wear:{head:null,face:null,neck:null}},xp:0,
  stats:{solved:0,byKey:{},times:[],perfect:0,nohint:0,quick:0,diag:0,killer:0,expert:0,early:0,owl:0,fastEasy:0,fastMed:0,days:{},games:{}},
  daily:{done:{},best:0},ach:{},lessons:{},postcards:[],game:null}}
function migrate1(r){const re=/^(classic|zen|diag|daily)$/,sh=k=>{const p=String(k).split('-');return re.test(p[0])?p[0]+'-'+(+p[1]+2):k};
  if(r.stats){if(r.stats.byKey){const n={};for(const k in r.stats.byKey)n[sh(k)]=r.stats.byKey[k];r.stats.byKey=n}if(Array.isArray(r.stats.times))r.stats.times.forEach(t=>{t.k=sh(t.k)})}
  if(r.game&&re.test(r.game.mode))r.game.level+=2;r.v=2}
function hydrate(raw){if(!raw||typeof raw!=='object')return null;if(raw.v===1)migrate1(raw);if(raw.v!==2||!raw.stats)return null;const out=defaults();
  for(const k in raw){const a=out[k],b=raw[k];if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a))out[k]=Object.assign(a,b);else out[k]=b}return out}
let S=defaults(),LOADED=false;
try{const h=hydrate(JSON.parse(localStorage.getItem(KEY)));if(h){S=h;LOADED=true}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}syTouch();sySoon()}

/* ---------- data ---------- */
const LEVELS=[
  {name:'Super easy',clues:54,singles:true,xp:10,dots:1,desc:'Just a few numbers missing'},
  {name:'Very easy',clues:47,singles:true,xp:15,dots:2,desc:'Nice and relaxed'},
  {name:'Easy',clues:40,singles:true,xp:20,dots:3,desc:'A classic'},
  {name:'Medium',clues:33,singles:true,xp:35,dots:4,desc:'A little thinking'},
  {name:'Hard',clues:28,singles:false,xp:55,dots:5,desc:'For the experienced'},
  {name:'Expert',clues:24,singles:false,xp:80,dots:6,desc:'A real challenge'}];
const MODES={classic:'Classic sudoku',daily:'Daily challenge',quick:'Quick 6×6',diag:'Diagonals',killer:'Killer sudoku'};
/* ---------- další hry: společné rozhraní ----------
Každá další hra je záznam GAMES[mode]; mode je i klíč do statistik (mode-level). Hry se registrují v bloku „GAMES“ dole.
Povinné:  name, desc, tile (HTML do dlaždice), levels:[{name,desc,xp,dots}],
          create(level,seed) → {N, puzzle, sol, …vlastní data}; puzzle = výchozí stav vals (0 = prázdné)
Mřížkové hry s čísly (výchozí): sdílí mřížku, klávesnici, poznámky, zpět, chyby i postupnou nápovědu se sudoku.
          Geometrie bez čtverců (br=bc=0) = latinský čtverec. Volitelně:
          cand(gm,g,i,mask) → zúžení možností (nerovnosti, klece); používá ho nápověda i automatické poznámky
          deco(gm) → HTML vložené do mřížky (např. znaménka); why → dovětek k vysvětlení v nápovědě
          cages → gm.cages [{cells,label}] + gm.cage (políčko → skupinka) se vykreslí jako u součtového sudoku (label '' = bez štítku)
Vlastní hry (jiná plocha než čísla v políčkách) dodají: build(gm), update(gm), pad(gm), tap(gm,i,e), key(gm,e),
          input(gm,d), erase(gm), hint(gm), reveal(gm,h); notes:false skryje Poznámky; fix(gm,i) = oprava chyby z nápovědy (jinak vals[i]=0)
Volitelné všude: won(gm), progress(gm) 0–1, sub(gm), symbols:true (jinak se hraje s čísly), numNote (text upozornění),
          lessons:[{t,tile,text:[…],mini()→HTML,ask,choices:[[hodnota,popisek]],answer,tip}], again (text tlačítka) */
const GAMES={};
const SUDOKU={};
const kindOf=gm=>GAMES[gm&&gm.mode]||SUDOKU;
const gameLevels=mode=>GAMES[mode]?GAMES[mode].levels:LEVELS;
function isSolved(gm){const K=kindOf(gm);return K.won?K.won(gm):gm.vals.every((v,i)=>v===gm.sol[i])}
const FRUIT=['','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒'];
const TIPS=['Slow and steady. That’s how I do it too.','When you’re stuck, try pencil notes.','Look for numbers that are already almost everywhere.','Every sudoku you solve moves me on towards the next island.','It’s a lovely day for a sudoku.','A mistake isn’t a defeat. I’ve lost my way once too.','The brain is like a muscle, and sudoku gives it a lovely stretch.','Do put the kettle on. I’ll wait here.','Turtles live for over a hundred years, so there’s plenty of time for sudoku.','Start with the rows where only a few numbers are missing.','There’s no need to hurry. The clock is just for interest.'];
const PATS=['Mmm, that’s lovely!','Thank you, that warms my little heart.','Hee hee, that tickles!','More, please!','I’m so happy with you.','I’ve polished my shell just for you.'];
const SLOTS=[{id:'head',name:'Head'},{id:'face',name:'Eyes'},{id:'neck',name:'Neck'}];
const ACC=[{id:'flower',slot:'head',name:'Flower',lvl:2},{id:'hat',slot:'head',name:'Straw hat',lvl:4},{id:'scarf',slot:'neck',name:'Scarf',lvl:6},{id:'glasses',slot:'face',name:'Glasses',lvl:8},{id:'bow',slot:'head',name:'Bow',lvl:11},{id:'crown',slot:'head',name:'Crown',lvl:15}];
const SKINS=[
  {id:'laguna',name:'Lagoon',lvl:1,c:['#E2F2EF','#F2643F','#3E9A5B']},
  {id:'noc',name:'Night sea',lvl:1,c:['#0E2230','#FF8A68','#7DD8E6']},
  {id:'papir',name:'Paper',lvl:3,c:['#FCFCF8','#2F5DA8','#2E3236']},
  {id:'les',name:'Forest moss',lvl:5,c:['#E3ECD9','#C9741F','#3B7A3A']},
  {id:'neon',name:'Neon',lvl:7,c:['#130C2B','#FF3EA5','#45F0FF']},
  {id:'retro',name:'Retro arcade',lvl:10,c:['#9BBC0F','#306230','#0F380F']}];
const ISLANDS=[
  {name:'Sandy Beach',deco:['🌴','🐚','☀️'],land:'#F4D58D',land2:'#E2B65A'},
  {name:'Coral Reef',deco:['🪸','🐠','🫧'],land:'#F7B2A8',land2:'#E5837A'},
  {name:'Seagrass Island',deco:['🌿','🦀','🐌'],land:'#AEDC96',land2:'#7DBB68'},
  {name:'Lighthouse Island',deco:['⛵','🐦','🌊'],land:'#DDD6C6',land2:'#B9AF9B'},
  {name:'Mangrove Forest',deco:['🌳','🐸','🦋'],land:'#97CDA2',land2:'#62A26F'},
  {name:'Volcano Island',deco:['🌋','🪨','🔥'],land:'#D4AE98',land2:'#A47A66'},
  {name:'Ice Floe',deco:['🧊','🐧','❄️'],land:'#EAF6FB',land2:'#B8DCEB'},
  {name:'Pearl Bay',deco:['🦪','🐙','✨'],land:'#E9DDF5',land2:'#C3AEE0'},
  {name:'Treasure Island',deco:['💰','🗝️','🦜'],land:'#F2D282',land2:'#D2A43E'},
  {name:'Rainbow Lagoon',deco:['🌈','🐬','🌸'],land:'#C2EADC',land2:'#86CDB6'}];
const ACH=[
  {id:'first',ico:'🐣',name:'First step',desc:'Solve your first sudoku',goal:1,val:s=>s.stats.solved},
  {id:'s10',ico:'🌱',name:'Getting going',desc:'Solve 10 sudoku',goal:10,val:s=>s.stats.solved},
  {id:'s50',ico:'🌿',name:'Fifty',desc:'Solve 50 sudoku',goal:50,val:s=>s.stats.solved},
  {id:'s100',ico:'🌳',name:'A hundred',desc:'Solve 100 sudoku',goal:100,val:s=>s.stats.solved},
  {id:'s500',ico:'🏝️',name:'Five hundred',desc:'Solve 500 sudoku',goal:500,val:s=>s.stats.solved},
  {id:'s1000',ico:'👑',name:'A thousand',desc:'Solve 1,000 sudoku',goal:1000,val:s=>s.stats.solved},
  {id:'perfect',ico:'✨',name:'Not a single slip',desc:'A sudoku without a single mistake',goal:1,val:s=>s.stats.perfect},
  {id:'perfect25',ico:'💎',name:'Ever so careful',desc:'25 sudoku without a mistake',goal:25,val:s=>s.stats.perfect},
  {id:'nohint',ico:'🧠',name:'All by myself',desc:'A sudoku without hints',goal:1,val:s=>s.stats.nohint},
  {id:'fast',ico:'⚡',name:'Nimble fingers',desc:'An easy sudoku in under 6 minutes',goal:1,val:s=>s.stats.fastEasy},
  {id:'fastmed',ico:'🚀',name:'Like the wind',desc:'A medium sudoku in under 12 minutes',goal:1,val:s=>s.stats.fastMed},
  {id:'d3',ico:'📅',name:'Three days in a row',desc:'Play 3 days in a row (at least one game a day)',goal:3,val:s=>s.daily.best},
  {id:'d7',ico:'🗓️',name:'A whole week',desc:'Play 7 days in a row (at least one game a day)',goal:7,val:s=>s.daily.best},
  {id:'d30',ico:'🏆',name:'A whole month',desc:'Play 30 days in a row (at least one game a day)',goal:30,val:s=>s.daily.best},
  {id:'early',ico:'🌅',name:'Early bird',desc:'Finish a sudoku before 8 in the morning',goal:1,val:s=>s.stats.early},
  {id:'owl',ico:'🦉',name:'Night owl',desc:'Finish a sudoku after 10 at night',goal:1,val:s=>s.stats.owl},
  {id:'quick',ico:'⏱️',name:'Quick ones',desc:'10 sudoku 6×6',goal:10,val:s=>s.stats.quick},
  {id:'diag',ico:'✖️',name:'Criss-cross',desc:'A sudoku with diagonals',goal:1,val:s=>s.stats.diag},
  {id:'killer',ico:'➕',name:'Fun with sums',desc:'A killer sudoku',goal:1,val:s=>s.stats.killer},
  {id:'expert',ico:'🎓',name:'At the top',desc:'An expert sudoku',goal:1,val:s=>s.stats.expert},
  {id:'school',ico:'📚',name:'School finished',desc:'Complete all 5 lessons',goal:5,val:s=>[0,1,2,3,4].filter(k=>s.lessons[k]).length},
  {id:'pat',ico:'💚',name:'Cuddles',desc:'Stroke the turtle 30 times',goal:30,val:s=>s.pet.pets},
  {id:'isl3',ico:'🧭',name:'Seafaring',desc:'Sail to the third island',goal:24,val:s=>s.stats.solved},
  {id:'lvl10',ico:'🐢',name:'Big turtle',desc:'Reach level 10',goal:10,val:()=>lvlInfo().L}];

const W=(sud,oth)=>Object.keys(GAMES).length?oth:sud;
function lvlInfo(xp=S.xp){let L=1,need=100,rest=xp;while(rest>=need){rest-=need;L++;need=100+30*(L-1)}return{L,rest,need}}
function stage(L){return L<5?'Tiny hatchling':L<10?'Young turtle':L<20?'Grown-up turtle':L<35?'Wise turtle':'Ancient turtle'}
const growth=L=>Math.min(1,.62+(L-1)*.035);
const ROMAN=['','I','II','III','IV','V','VI','VII','VIII','IX'];
const ANIMALS=['','🐱','🐶','🐰','🐻','🐷','🐸','🐔','🐮','🐟'];
const SYMSETS=[{id:'num',name:'Numbers',ex:'1 2 3'},{id:'roman',name:'Roman numerals',ex:'I II III'},{id:'fruit',name:'Fruit',ex:'🍎🍐🍊'},{id:'animals',name:'Animals',ex:'🐱🐶🐰'},{id:'dice',name:'Dots like on dice',ex:'<span class="dice" style="display:flex;gap:6px"><i class="dx" data-d="1"></i><i class="dx" data-d="2"></i><i class="dx" data-d="3"></i></span>'},{id:'balls',name:'Coloured balls',ex:'<i class="bx" style="color:#E53935">●</i><i class="bx" style="color:#FDD835">●</i><i class="bx" style="color:#1E40AF">●</i>'}];
const BALLNAMES=['','red','orange','yellow','green','light blue','dark blue','purple','pink','brown'];
function noteWord(gm){const s=symSet(gm);return s==='balls'?'little helper balls':(s==='fruit'||s==='animals')?'little helper pictures':'little helper numbers'}
function symWord(d,gm){const s=symSet(gm);return s==='balls'?'the '+BALLNAMES[d]+' ball':(s==='fruit'||s==='animals')?sym(d,gm):s==='dice'?'the number '+d+' ('+d+' '+plural(d,'dot','dots','dots')+')':'the number '+sym(d,gm)}
function symSet(gm){const s=S.settings.symbols;if(!gm)return s;const K=GAMES[gm.mode];return gm.mode==='killer'||(K&&!K.symbols)?'num':s}
function sym(d,gm,small){if(!d)return'';const s=symSet(gm);
  if(s==='fruit')return FRUIT[d];if(s==='animals')return ANIMALS[d];if(s==='roman')return ROMAN[d];if(s==='balls')return '●';if(s==='dice')return '⚀';return String(d)}
/* oslovení v 5. pádě */
const FEM_CONS=new Set(['dagmar','ingrid','miriam','ester','carmen','ruth','rút','edita','edith','judit','karin','doris','nikol','nicol','margit','rachel','isabel','sharon','kim','lilian','vivien','ellen','helen','marion','annabel','gabriel']);
function vocWord(w){const lo=w.toLocaleLowerCase('cs');if(lo.length<2)return w;
  const fix=(cut,add)=>w.slice(0,w.length-cut)+(w===w.toUpperCase()&&w.length>1?add.toUpperCase():add);
  const last=lo.slice(-1),prev=lo.slice(-2,-1);
  if(FEM_CONS.has(lo))return w;
  if(last==='a')return fix(1,'o');
  if('eéiíyýoóuůúá'.includes(last))return w;
  if(/[ěe]k$/.test(lo)){const b=lo.slice(-3,-2),soft={'n':'ň','d':'ď','t':'ť'};if(lo.slice(-2,-1)==='ě'&&soft[b])return fix(3,soft[b]+'ku');return fix(2,'ku')}
  if(/el$/.test(lo)&&lo.length>3)return fix(2,'le');
  if(/ec$/.test(lo))return fix(2,'če');
  if(/(k|h|g|ch)$/.test(lo))return w+'u';
  if(last==='r')return /[aeiouyáéíóúůý]/.test(prev)?w+'e':fix(1,'ře');
  if('sšžčřcjzxľ'.includes(last))return w+'i';
  return w+'e'}
function vocative(name){return String(name||'').trim().split(/\s+/).filter(Boolean).map(vocWord).join(' ')}
function callName(){const c=(S.settings.call||'').trim();return c||String(S.settings.player||'').trim()}
function geoOf(gm){return getGeo(gm.N,gm.br,gm.bc,!!gm.diag)}
function modeLabel(gm){return GAMES[gm.mode]?GAMES[gm.mode].name:MODES[gm.mode]}
function levelLabel(gm){const K=GAMES[gm.mode];if(K)return K.levels.length>1?K.levels[gm.level].name:'';return(gm.mode==='quick'||gm.mode==='killer')?'':LEVELS[gm.level].name}
/* u součtového sudoku zúží možnosti i součty skupinek (s mezipamětí pro celý stav mřížky) */
const kilCache={gm:null,k:'',m:null};
function cands(gm,geo,g,i){const m=candMask(g,geo,i),K=kindOf(gm);
  if(gm.mode==='killer'&&gm.cages){const k=g.join('');if(kilCache.gm!==gm||kilCache.k!==k){kilCache.gm=gm;kilCache.k=k;kilCache.m=kilProp(g,geo,gm.cages)}return kilCache.m?kilCache.m[i]&m:m}
  return K.cand?K.cand(gm,g,i,m):m}
function czDate(d){try{return d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}catch(e){return dkey(d)}}
/* Série dní: den se počítá, když se v něm vyřešila aspoň jedna hra (jakákoli), nebo denní výzva toho dne (i dohraná po půlnoci) */
function played(k){return (S.stats.days&&S.stats.days[k]>0)||!!(S.daily.done&&S.daily.done[k])}
function streakAt(k){let n=0,d=fromKey(k);while(played(dkey(d))){n++;d=addDays(d,-1)}return n}
function currentStreak(){const t=dkey();return played(t)?streakAt(t):streakAt(dkey(addDays(new Date(),-1)))}
function longestStreak(){const ks=new Set([...Object.keys(S.stats.days||{}),...Object.keys(S.daily.done||{})].filter(played));let best=0;
  for(const k of ks){if(ks.has(dkey(addDays(fromKey(k),-1))))continue;let n=0,d=fromKey(k);while(ks.has(dkey(d))){n++;d=addDays(d,1)}if(n>best)best=n}return best}

/* ---------- ikony ---------- */
const ICON={
  back:'<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  undo:'<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>',
  redo:'<svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/></svg>',
  pencil:'<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/></svg>',
  bulb:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0012 3z"/></svg>',
  dots:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" style="fill:currentColor"/><circle cx="12" cy="12" r="1.4" style="fill:currentColor"/><circle cx="19" cy="12" r="1.4" style="fill:currentColor"/></svg>',
  erase:'<svg class="ico" viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7z"/><path d="M12 9l5 6M17 9l-5 6"/></svg>',
  home:'<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/></svg>',
  map:'<svg viewBox="0 0 24 24"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  turtle:'<svg viewBox="0 0 24 24"><path d="M2.5 16c0-5 3.6-8.5 8.2-8.5S19 11 19 16z"/><path d="M19 14c1.3 0 3-.6 3-2.4S20.4 9.5 19 10.5"/><path d="M6 16v2.5M15 16v2.5"/><path d="M7.5 11.5l3 2 3-2"/></svg>',
  trophy:'<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4"/><path d="M12 13v4M8 20h8"/></svg>',
  gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
  pause:'<svg class="ico" viewBox="0 0 24 24"><path d="M9 5v14M15 5v14"/></svg>',
  chev:'<svg class="ico" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  book:'<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M8 7h7M8 11h5"/></svg>',
  leaf:'<svg viewBox="0 0 24 24"><path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l8-8"/></svg>',
  diag:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M6 6l12 12M18 6L6 18"/></svg>'};

/* ---------- želva ---------- */
function petals(cx,cy){let s='';for(let k=0;k<5;k++){const a=k*Math.PI*2/5-Math.PI/2;s+=`<circle class="a-petal" cx="${(cx+Math.cos(a)*8).toFixed(1)}" cy="${(cy+Math.sin(a)*8).toFixed(1)}" r="6.5"/>`}return s+`<circle class="a-center" cx="${cx}" cy="${cy}" r="5"/>`}
function accMarkup(w){w=w||{};let s='';
  if(w.neck==='scarf')s+='<path class="a-scarf" d="M150 92 Q168 82 186 96 L182 112 Q166 100 154 110Z"/><path class="a-scarf" d="M166 104 L176 134 L160 131Z"/>';
  if(w.face==='glasses')s+='<circle class="a-lens" cx="196" cy="70" r="11"/><circle class="a-glass" cx="196" cy="70" r="11"/><path class="a-glass" d="M185 68 L166 63"/>';
  if(w.head==='hat')s+='<ellipse class="a-straw2" cx="190" cy="50" rx="40" ry="8"/><path class="a-straw" d="M166 50 Q168 18 190 18 Q212 18 214 50Z"/><rect class="a-band" x="166" y="39" width="48" height="8" rx="3"/>';
  if(w.head==='flower')s+=petals(172,50);
  if(w.head==='bow')s+='<path class="a-bow" d="M190 48 L170 36 L172 60Z M190 48 L210 36 L208 60Z"/><circle class="a-bow" cx="190" cy="48" r="6"/>';
  if(w.head==='crown')s+='<path class="a-gold" d="M168 52 L170 26 L180 38 L190 20 L200 38 L210 26 L212 52Z"/><circle class="a-gem" cx="190" cy="43" r="4"/>';
  return s}
function turtleInner(o={}){const mood=o.mood||'open';
  const eyes=mood==='sleep'?'<path class="t-line" d="M188 72 q7 6 14 0"/>':mood==='happy'?'<path class="t-line" d="M188 73 q7 -10 14 0"/>':'<g class="t-eyes"><circle class="t-eye" cx="195" cy="70" r="6.5"/><circle class="t-shine" cx="197.5" cy="67.5" r="2.2"/></g>';
  return `<g class="t-grow" style="--g:${o.g||1}"><g class="t-body">
<ellipse class="t-shadow" cx="104" cy="160" rx="84" ry="7"/>
<path class="t-skin" d="M26 112 L6 122 L30 127 Z"/>
<ellipse class="t-skin" cx="58" cy="138" rx="18" ry="19"/><ellipse class="t-skin" cx="150" cy="138" rx="18" ry="19"/>
<path class="t-skin" d="M150 96 Q166 70 182 72 L200 98 Q182 116 160 122Z"/>
<circle class="t-skin" cx="190" cy="76" r="30"/>
<rect class="t-shell-dark" x="16" y="104" width="172" height="22" rx="11"/>
<path class="t-shell" d="M22 112 Q24 28 102 26 Q180 28 182 112 Z"/>
<path class="t-scute" d="M80 52 L124 52 L140 80 L124 108 L80 108 L64 80Z"/>
<path class="t-scute" d="M56 58 L64 80 L80 108 L34 108 Q34 76 56 58Z"/>
<path class="t-scute" d="M148 58 L140 80 L124 108 L170 108 Q170 76 148 58Z"/>
<path class="t-scute" d="M70 42 Q102 30 134 42 L124 52 L80 52Z"/>
${eyes}<circle class="t-cheek" cx="207" cy="88" r="6"/><path class="t-line" d="M198 95 q8 7 15 -1"/>
${accMarkup(o.wear)}</g></g>`}
function turtleSVG(o={}){return `<svg class="turtle ${o.cls||''}" viewBox="0 0 230 170" aria-hidden="true">${turtleInner(o)}</svg>`}
function myTurtle(o={}){return turtleSVG(Object.assign({wear:S.pet.wear},o))}

/* ---------- zvuk a vibrace ---------- */
let AC=null;
function tone(f,dur=.12,type='sine',vol=.07,delay=0){if(!S.settings.sound)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+dur+.03)}catch(e){}}
const sfx={place:()=>tone(660,.1,'triangle'),note:()=>tone(990,.05,'sine',.035),err:()=>tone(196,.25,'sine',.07),
  house:()=>[523,659,784].forEach((f,i)=>tone(f,.2,'triangle',.06,i*.08)),
  win:()=>[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,.25,'triangle',.06,i*.11)),
  pat:()=>[784,988].forEach((f,i)=>tone(f,.12,'sine',.05,i*.08)),click:()=>tone(520,.04,'sine',.03)};
function buzz(p){if(S.settings.vibrate&&navigator.vibrate)try{navigator.vibrate(p)}catch(e){}}

/* ---------- UI stav ---------- */
const UI={view:'home',sel:-1,notes:false,paused:false,hint:null,awards:'ach',lesson:-1,ld:null,cells:[],builtFor:null};
function applyLook(){const r=document.documentElement;let sk=S.settings.skin;
  if(!sk){let dark=false;try{dark=matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}sk=dark?'noc':'laguna';S.settings.skin=sk}
  r.dataset.skin=sk;r.style.setProperty('--fs',S.settings.fs)}

const TABS=[{v:'home',l:'Play',i:'home'},{v:'map',l:'Journey',i:'map'},{v:'pet',l:'Turtle',i:'turtle'},{v:'awards',l:'Awards',i:'trophy'},{v:'settings',l:'Settings',i:'gear'}];
function renderTabs(){const cur=UI.view==='school'?'home':UI.view;$('#tabbar>div').innerHTML=TABS.map(t=>`<button class="tab ${cur===t.v?'on':''}" data-act="go" data-v="${t.v}" aria-label="${t.l}"><span class="ico">${ICON[t.i]}</span>${t.l}</button>`).join('')}
function go(v){if(UI.view==='game'&&v!=='game')save();UI.view=v;document.querySelectorAll('.view').forEach(s=>s.hidden=s.id!=='v-'+v);
  document.body.classList.toggle('in-game',v==='game');renderTabs();(RENDER[v]||(()=>{}))();if(v!=='game')window.scrollTo(0,0)}

/* ---------- modal / toast ---------- */
function modal(html){const m=$('#modal');m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;m.hidden=false}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML=''}
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>{t.hidden=true},3000)}

/* ---------- domů ---------- */
function renderHome(){
  const nm=callName(),h=new Date().getHours();
  const greet=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
  const gm=S.game&&!S.game.done?S.game:null,today=dkey(),dDone=!!S.daily.done[today],st=currentStreak();
  const WD=['Su','Mo','Tu','We','Th','Fr','Sa'];let week='';
  for(let k=6;k>=0;k--){const d=addDays(new Date(),-k),key=dkey(d),on=played(key);week+=`<div class="wk ${on?'on':''} ${k===0?'today':''}"><span>${WD[d.getDay()]}</span><i>${on?ICON.check:d.getDate()}</i></div>`}
  const prog=gm?Math.round((kindOf(gm).progress?kindOf(gm).progress(gm):gm.vals.filter((v,i)=>v&&v===gm.sol[i]).length/gm.vals.length)*100):0;
  const best=(k,i)=>{const b=S.stats.byKey[k];return b?`Best ${fmt(b.best)} · ${b.n}×`:LEVELS[i].desc};
  const row=(act,attrs,tile,name,desc)=>`<button class="mrow" data-act="${act}" ${attrs}><span class="tile">${tile}</span><div><b>${name}</b><span>${desc}</span></div><span class="chev">${ICON.chev}</span></button>`;
  const games=Object.keys(GAMES).map(m=>{const K=GAMES[m];return row(K.levels.length>1?'pick':'play',`data-mode="${m}" data-level="0"`,K.tile,K.name,K.desc)}).join('');
  $('#v-home').innerHTML=`
  <header class="hello">
    <div class="hello-turtle" data-act="go" data-v="pet" aria-label="My turtle">${myTurtle({cls:'bob'})}</div>
    <div class="bubble"><b>${greet}${nm?', '+esc(nm):''}!</b><span>${esc(pick(TIPS))}</span></div>
  </header>
  ${gm?`<button class="card continue" data-act="continue"><div><small>Game in progress</small><b>${modeLabel(gm)}${levelLabel(gm)?' · '+levelLabel(gm):''}</b><div class="bar"><i style="width:${prog}%"></i></div><span class="muted small">${prog}% done · ${fmt(gm.time)}</span></div><span class="cta">Continue ${ICON.chev}</span></button>`:''}
  <section class="card daily">
    <div class="row-between"><div><small>Daily challenge</small><b class="date">${czDate(new Date())}</b></div><div class="streak"><span class="flame">${st}</span>${dny(st)} in a row</div></div>
    <div class="week">${week}</div>
    <p class="muted small streak-note">Every day you solve at least one game counts towards your streak.</p>
    ${dDone?`<div class="done-note">${ICON.check}<span>You’ve solved today’s sudoku. A new one awaits tomorrow.</span></div>`:`<button class="btn primary big" data-act="daily">Play today’s sudoku</button>`}
  </section>
  <h2 class="sec">New game</h2>
  <div class="levels">${LEVELS.map((L,i)=>`<button class="lvl" data-act="play" data-mode="classic" data-level="${i}"><span class="dots">${'<i></i>'.repeat(L.dots)}${'<i class="off"></i>'.repeat(6-L.dots)}</span><b>${L.name}</b><small>${best('classic-'+i,i)}</small></button>`).join('')}</div>
  <h2 class="sec">More ways to play</h2>
  <div class="list">
    ${row('play','data-mode="quick" data-level="0"','6×6','Quick 6×6','A small grid with the numbers 1 to 6. Just a few minutes.')}
    ${row('pick','data-mode="diag"',ICON.diag,'Diagonals','The numbers 1 to 9 must also appear on both diagonals.')}
    ${row('play','data-mode="killer" data-level="2"','Σ','Killer sudoku','Dotted cages tell you the sum of their numbers. Always played with numbers.')}
    ${games?'':row('go','data-v="school"',ICON.book,'Sudoku school','Five short lessons on how to play.')}
  </div>
  ${games?`<h2 class="sec">More games</h2><div class="list">${games}
    ${row('go','data-v="school"',ICON.book,'School','Short lessons on how to play sudoku and the other games.')}</div>`:''}
  <p class="infinite">The turtle makes up every sudoku from scratch. There are <b>6,670,903,752,021,072,936,960</b> different completed grids, so you won’t run out even in a hundred years.</p>`;
}

/* ---------- start hry ---------- */
function newGame(mode,level,opts={}){
  const seed=opts.seed!=null?opts.seed:(Math.random()*4294967296)>>>0;
  if(GAMES[mode]){const d=GAMES[mode].create(level,seed);
    return Object.assign({mode,level,br:0,bc:0,diag:false,cage:null,cages:null,notes:new Array(d.puzzle.length).fill(0)},d,
      {vals:d.puzzle.slice(),mistakes:0,hints:0,time:0,done:false,dateKey:null,hist:[],fut:[]})}
  let N=9,br=3,bc=3,diag=false,clues=LEVELS[level].clues,singles=LEVELS[level].singles;
  if(mode==='quick'){N=6;br=2;bc=3;clues=14;singles=true;level=0}
  if(mode==='diag')diag=true;
  if(mode==='killer'){const k=genKiller(seed);
    return{mode,level:2,N,br,bc,diag,puzzle:k.puzzle,sol:k.sol,vals:k.puzzle.slice(),notes:new Array(N*N).fill(0),cage:k.cage,cages:k.cages,mistakes:0,hints:0,time:0,done:false,dateKey:opts.dateKey||null,hist:[],fut:[]}}
  const{puzzle,sol}=generate({N,br,bc,diag,clues,singles,seed});
  return{mode,level,N,br,bc,diag,puzzle,sol,vals:puzzle.slice(),notes:new Array(N*N).fill(0),cage:null,cages:null,mistakes:0,hints:0,time:0,done:false,dateKey:opts.dateKey||null,hist:[],fut:[]};
}
function hasProgress(){const g=S.game;return g&&!g.done&&(g.hist.length>0||g.time>20)}
function startGame(mode,level,opts={},force=false){
  if(!force&&hasProgress()){UI.pending=[mode,level,opts];
    modal(`${myTurtle({cls:'bob',mood:'open'})}<h2>Start a new game?</h2><p>${GAMES[S.game.mode]?'The game in progress':'The sudoku in progress'} (${modeLabel(S.game)}) will end.</p><div class="btns"><button class="btn primary big" data-act="pendingGo">Yes, start a new one</button><button class="btn big" data-act="close">No, go back</button></div>`);return}
  modal(`${myTurtle({cls:'bob',mood:'happy'})}<h2>The turtle is shuffling the numbers…</h2><div class="spinner-dots"><i></i><i></i><i></i></div>`);
  setTimeout(()=>{S.game=newGame(mode,level,opts);UI.builtFor=null;save();closeModal();go('game');if(S.settings.symbols!=='num'&&symSet(S.game)==='num')toast(kindOf(S.game).numNote||'Killer sudoku is played with numbers because it’s all about adding up.')},60);
}
function startDaily(){const t=dkey();
  if(S.game&&S.game.mode==='daily'&&S.game.dateKey===t&&!S.game.done){go('game');return}
  if(S.daily.done[t]){toast('You’ve completed today’s challenge. There’ll be a new one tomorrow.');return}
  startGame('daily',2,{seed:hashStr('zelva-'+t),dateKey:t})}
function pickLevel(mode){const LV=gameLevels(mode),mx=Math.max(...LV.map(L=>L.dots)),K=GAMES[mode];
  modal(`<h2>${K?K.name:MODES[mode]}</h2><p class="muted">Choose a difficulty</p><div class="lv-pick">${LV.map((L,i)=>`<button class="lvl" data-act="play" data-mode="${mode}" data-level="${i}"><span class="dots">${'<i></i>'.repeat(L.dots)}${'<i class="off"></i>'.repeat(mx-L.dots)}</span><b>${L.name}</b>${K&&L.desc?`<small>${L.desc}</small>`:''}</button>`).join('')}</div><button class="btn big ghost" data-act="close">Back</button>`)}

/* ---------- herní plocha ---------- */
function buildBoard(){
  const gm=S.game,N=gm.N,b=$('#board'),K=kindOf(gm);b.style.setProperty('--n',N);b.className='board n'+N+' '+symSet(gm)+(GAMES[gm.mode]?' g-'+gm.mode:'');
  if(K.build){UI.cells=[];K.build(gm,b);return}
  let h='';for(let i=0;i<N*N;i++){const r=Math.floor(i/N),c=i%N;let cls='cell';
    if(c===N-1)cls+=' lc';else if((c+1)%gm.bc===0)cls+=' br';
    if(r===N-1)cls+=' lr';else if((r+1)%gm.br===0)cls+=' bb';
    if(gm.diag&&(r===c||r+c===N-1))cls+=' dg';
    let sum='';if(gm.cages){const cg=gm.cages[gm.cage[i]];if(cg.cells[0]===i&&cg.label!==''){sum=`<span class="sum">${esc(cg.label!=null?cg.label:cg.sum)}</span>`;cls+=' hs'}}
    h+=`<div class="${cls}" data-i="${i}" role="button" aria-label="Row ${r+1}, column ${c+1}"><span class="fx"></span><span class="v"></span><div class="notes"></div>${sum}</div>`}
  if(gm.cages)h+=cageSVG(gm);
  if(K.deco)h+=K.deco(gm);
  b.innerHTML=h;
  UI.cells=[...b.querySelectorAll('.cell')].map(el=>({el,base:el.className,v:el.querySelector('.v'),n:el.querySelector('.notes'),fx:el.querySelector('.fx'),nk:-1}));
}
/* flat (KenKen) = plná čára přímo na hranici mezi skupinkami; jinak čárkovaný rámeček uvnitř políček */
function cageSVG(gm){const N=gm.N,RW=gm.rows||N,d=.1,flat=gm.flat||gm.mode==='kenken';let p='';
  for(let i=0;i<N*RW;i++){const r=Math.floor(i/N),c=i%N,id=gm.cage[i];
    if(flat){if(c<N-1&&gm.cage[i+1]!==id)p+=`M${c+1} ${r}V${r+1}`;if(r<RW-1&&gm.cage[i+N]!==id)p+=`M${c} ${r+1}H${c+1}`;continue}
    const same=(rr,cc)=>rr>=0&&rr<RW&&cc>=0&&cc<N&&gm.cage[rr*N+cc]===id;
    const L=same(r,c-1),R=same(r,c+1),T=same(r-1,c),B=same(r+1,c);
    const x0=c+(L?0:d),x1=c+1-(R?0:d),y0=r+(T?0:d),y1=r+1-(B?0:d);
    if(!T)p+=`M${x0} ${r+d}H${x1}`;if(!B)p+=`M${x0} ${r+1-d}H${x1}`;
    if(!L)p+=`M${c+d} ${y0}V${y1}`;if(!R)p+=`M${c+1-d} ${y0}V${y1}`;
    /* vnitřní roh (skupinka se láme do L): dotáhnout obě čáry až k sobě, jinak v rohu zůstane mezera */
    const D=(dr,dc)=>same(r+dr,c+dc);
    if(L&&T&&!D(-1,-1))p+=`M${c} ${r+d}H${c+d}V${r}`;if(R&&T&&!D(-1,1))p+=`M${c+1} ${r+d}H${c+1-d}V${r}`;
    if(L&&B&&!D(1,-1))p+=`M${c} ${r+1-d}H${c+d}V${r+1}`;if(R&&B&&!D(1,1))p+=`M${c+1} ${r+1-d}H${c+1-d}V${r+1}`}
  return `<svg class="cages" viewBox="0 0 ${N} ${RW}" preserveAspectRatio="none"><path d="${p}"/></svg>`}
function sizeBoard(){const w=$('#board-wrap'),b=$('#board');if(!w||UI.view!=='game')return;const s=Math.floor(Math.min(w.clientWidth,w.clientHeight));if(s>0)b.style.width=s+'px'}
function updateBoard(){
  const gm=S.game;if(!gm)return;const K=kindOf(gm);if(K.update){K.update(gm);return}
  if(!UI.cells.length)return;const geo=geoOf(gm),N=gm.N,sel=UI.sel,st=S.settings;
  const sv=sel>=0?gm.vals[sel]:0,peers=sel>=0&&st.highlight?new Set(geo.peers[sel]):null;
  const hs=hintStep(),hh=hs&&hs.house?new Set(hs.house):null,ht=hs&&hs.show?UI.hint.target:-1;
  UI.cells.forEach((c,i)=>{const v=gm.vals[i],given=gm.puzzle[i]!==0,wrong=v&&v!==gm.sol[i]&&st.showErrors;
    let cls=c.base;if(given)cls+=' given';if(peers&&peers.has(i))cls+=' peer';if(hh&&hh.has(i))cls+=' hh';
    if(st.highlight&&sv&&v===sv&&i!==sel)cls+=' same';if(i===sel)cls+=' sel';if(wrong)cls+=' err';if(i===ht)cls+=' ht';
    if(c.el.className!==cls)c.el.className=cls;
    const t=sym(v,gm);if(c.v.textContent!==t||c.v.dataset.d!=v){c.v.textContent=t;c.v.dataset.l=t.length;c.v.dataset.d=v}
    const nk=v?0:gm.notes[i];const hk=nk*16+(st.highlight&&sv?sv:0);
    if(c.nk!==hk){c.nk=hk;if(!nk){c.n.innerHTML='';c.n.className='notes'}else{const flow=symSet(gm)==='roman',cnt=pc(nk);let s='';
      for(let d=1;d<=N;d++){const on=nk&(1<<d);if(flow&&!on)continue;s+=on?`<span data-d="${d}" class="${st.highlight&&sv===d?'hit':''}">${sym(d,gm)}</span>`:'<span></span>'}
      c.n.className='notes'+(flow?' flow'+(cnt>4?' many':''):'');c.n.innerHTML=s}}
  });
}
function renderPad(){const gm=S.game,K=kindOf(gm);if(K.pad){const p=$('#pad');p.className='pad p-'+gm.mode;p.innerHTML=K.pad(gm)||'';return}
  const N=gm.N,cnt=new Array(N+1).fill(0);gm.vals.forEach(v=>{if(v)cnt[v]++});let h='';
  for(let d=1;d<=N;d++){const done=cnt[d]>=N;h+=`<button class="key ${done?'done':''} ${UI.notes?'note':''}" data-act="num" data-d="${d}" aria-label="${symSet(gm)==='balls'?BALLNAMES[d]+' ball':'Number '+d}"><span data-d="${d}">${sym(d,gm)}</span></button>`}
  h+=`<button class="key erase" data-act="erase" aria-label="Clear the square">${ICON.erase}<small>Clear</small></button>`;
  const p=$('#pad');p.className='pad n'+N+' '+symSet(gm);p.innerHTML=h}
const notesOn=gm=>S.settings.notesBtn&&kindOf(gm).notes!==false;
function renderTools(){const gm=S.game,nb=notesOn(gm);$('#tools').className='tools'+(nb?'':' t4');if(!nb)UI.notes=false;
  $('#tools').innerHTML=`
  <button class="tool" data-act="undo" ${gm.hist.length?'':'disabled'}><span class="ico">${ICON.undo}</span>Undo</button>
  <button class="tool" data-act="redo" ${gm.fut.length?'':'disabled'}><span class="ico">${ICON.redo}</span>Redo</button>
  ${nb?`<button class="tool ${UI.notes?'on':''}" data-act="notes" aria-pressed="${UI.notes}"><span class="ico">${ICON.pencil}</span>Notes</button>`:''}
  <button class="tool" data-act="hint"><span class="ico">${ICON.bulb}</span>Hint</button>
  <button class="tool" data-act="more"><span class="ico">${ICON.dots}</span>More</button>`}
function renderStatus(){const gm=S.game;
  $('#g-mode').textContent=modeLabel(gm);const K=kindOf(gm);$('#g-level').textContent=(K.sub&&K.sub(gm))||levelLabel(gm)||(gm.mode==='quick'?'Numbers 1 to 6':gm.mode==='killer'?'Sums in cages':'');
  $('#g-status').innerHTML=UI.notes?`<span class="notes-on">Writing notes: ${noteWord(gm)}</span>`:`<span>Mistakes: ${gm.mistakes}</span><span>Hints: ${gm.hints}</span>`;
  const t=$('#g-timer');const showT=S.settings.showTimer;t.innerHTML=ICON.pause+(showT?`<span>${fmt(gm.time)}</span>`:'');}
function enterGame(){const gm=S.game;if(!gm){go('home');return}
  if(UI.builtFor!==gm){clearHolds();buildBoard();UI.builtFor=gm;UI.sel=-1;UI.hint=null;UI.notes=false;$('#hint-panel').hidden=true;$('#tools').hidden=false}
  UI.paused=false;$('#pause-cover').hidden=true;
  renderStatus();renderTools();renderPad();updateBoard();requestAnimationFrame(sizeBoard)}
function refresh(){save();updateBoard();renderPad();renderTools();renderStatus()}
/* odložené vyhodnocení chyby (Binairo, Hashi) nesmí přejít do jiné hry ani přežít „Začít znovu“ */
function clearHolds(){clearTimeout(UI.bnTimer);clearTimeout(UI.hsTimer);UI.bnHold=-1;UI.hsHold=-1}

function record(cells){const gm=S.game;if(!cells.length)return;gm.hist.push(cells.map(i=>[i,gm.vals[i],gm.notes[i]]));if(gm.hist.length>300)gm.hist.shift();gm.fut=[]}
function restore(from,to){const gm=S.game;const e=from.pop();if(!e||!e.length)return;to.push(e.map(([i])=>[i,gm.vals[i],gm.notes[i]]));e.forEach(([i,v,n])=>{gm.vals[i]=v;gm.notes[i]=n});UI.sel=e[0][0];sfx.click();refresh();checkWin()}
function inputDigit(d){
  const gm=S.game;if(!gm||gm.done||UI.paused)return;const K=kindOf(gm);if(K.input){K.input(gm,d);return}const i=UI.sel;
  if(i<0){toast('First tap a square in the grid.');return}
  if(gm.puzzle[i]){buzz(15);toast('This number was given and can’t be changed.');return}
  const geo=geoOf(gm);
  if(UI.notes){if(gm.vals[i]){toast('This square is already filled in. To add notes, clear it first.');return}record([i]);gm.notes[i]^=1<<d;sfx.note();buzz(8)}
  else if(gm.vals[i]===d){record([i]);gm.vals[i]=0;sfx.click()}
  else{const ch=[i];if(S.settings.autoClean)for(const p of geo.peers[i])if(!gm.vals[p]&&(gm.notes[p]&(1<<d)))ch.push(p);
    record(ch);gm.vals[i]=d;gm.notes[i]=0;if(S.settings.autoClean)for(const p of geo.peers[i])gm.notes[p]&=~(1<<d);
    const cell=UI.cells[i];
    if(d!==gm.sol[i]){gm.mistakes++;sfx.err();buzz([30,40,30]);if(S.settings.showErrors)anim(cell.v,'shake')}
    else{sfx.place();buzz(12);anim(cell.v,'pop');checkHouses(i)}}
  hideHint();refresh();checkWin();
}
function anim(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),500)}
function checkHouses(i){const gm=S.game,geo=geoOf(gm),N=gm.N;let any=false;const r0=Math.floor(i/N),c0=i%N;
  for(const k of geo.unitsOf[i]){const u=geo.units[k];if(u.every(c=>gm.vals[c]===gm.sol[c])){any=true;
    u.forEach(c=>{const f=UI.cells[c].fx;const dist=Math.abs(Math.floor(c/N)-r0)+Math.abs(c%N-c0);f.classList.remove('wave');void f.offsetWidth;f.style.animationDelay=(dist*45)+'ms';f.classList.add('wave')})}}
  if(any)setTimeout(sfx.house,120)}
function erase(){const gm=S.game,i=UI.sel;if(!gm||gm.done||UI.paused)return;const K=kindOf(gm);if(K.erase){K.erase(gm);return}if(i<0||gm.puzzle[i])return;if(!gm.vals[i]&&!gm.notes[i])return;record([i]);gm.vals[i]=0;gm.notes[i]=0;sfx.click();hideHint();refresh()}
function checkWin(){const gm=S.game;if(!gm.done&&isSolved(gm))setTimeout(()=>{if(S.game===gm&&!gm.done&&isSolved(gm))win()},500)}

/* ---------- nápověda ---------- */
function symAcc(d,gm){return symWord(d,gm)}
function findHint(gm){const geo=geoOf(gm),N=gm.N;
  const wrong=gm.vals.findIndex((v,i)=>v&&v!==gm.sol[i]);
  if(wrong>=0)return{type:'wrong',target:wrong,steps:[
    {text:'A little mistake has crept into the grid. Try to find it and put it right.'},
    {text:'Here it is. Try clearing the square and thinking again.',show:true}]};
  const g=gm.vals.slice();const boxTxt='box',kindTxt={row:'row',col:'column',box:boxTxt,diag:'diagonal'};
  const hasBox=geo.kinds.includes('box'),wy=gm.mode==='killer'?{hidden:', or by the sum of their cage',naked:'. The sum of its cage and the numbers already in it help too'}:kindOf(gm).why||'',why=typeof wy==='string'?wy:wy.hidden||'',whyN=typeof wy==='string'?wy:wy.naked||'',where=hasBox?`row, column or ${boxTxt}`:'row or column';
  const hidden=kind=>{for(let k=0;k<geo.units.length;k++){if(geo.kinds[k]!==kind)continue;const u=geo.units[k];
    for(let d=1;d<=N;d++){if(u.some(c=>g[c]===d))continue;const at=u.filter(c=>!g[c]&&(cands(gm,geo,g,c)&(1<<d)));
      if(at.length===1&&gm.sol[at[0]]===d){const K=kindTxt[kind],dg=kind==='diag',IN='in the highlighted',TH='in this';return{type:'hidden',target:at[0],steps:[
        {house:u,text:`${IN.charAt(0).toUpperCase()+IN.slice(1)} ${K}, one square can be filled in for certain. Try to find it.`},
        {house:u,text:`A little extra hint: focus on ${symAcc(d,gm)}. Where can it go ${IN} ${K}?`},
        {house:u,show:true,text:`${(w=>w.charAt(0).toUpperCase()+w.slice(1))(symWord(d,gm))} belongs in the marked square. The other empty squares ${TH} ${K} are ruled out by the same ${symSet(gm)==='balls'?'ball':(symSet(gm)==='fruit'||symSet(gm)==='animals')?'picture':'number'} in their ${where}${why}.`}]}}}}return null};
  let h=hidden('box');if(h)return h;
  for(let i=0;i<g.length;i++){if(g[i])continue;const m=cands(gm,geo,g,i);if(pc(m)===1){const bk=geo.unitsOf[i].find(k=>geo.kinds[k]==='box'),box=geo.units[bk!=null?bk:geo.unitsOf[i][0]];return{type:'naked',target:i,steps:[
    {house:box,text:`In the highlighted ${hasBox?boxTxt:'row'} there’s a square with only one possibility left. Try to find it.`},
    {house:geo.peers[i],show:true,text:`It’s the marked square. Go through its ${hasBox?'row, column and box':'row and column'} and work out what is still missing${whyN}.`}]}}}
  h=hidden('row')||hidden('col')||(gm.diag&&hidden('diag'));if(h)return h;
  const empty=[];g.forEach((v,i)=>{if(!v)empty.push(i)});const t=UI.sel>=0&&!g[UI.sel]?UI.sel:pick(empty);
  return{type:'reveal',target:t,steps:[{show:true,text:'This is a really tricky spot. I’m happy to reveal this square for you.'}]}}
function hintStep(){const h=UI.hint;return h?h.steps[h.lvl]:null}
function renderHint(){const h=UI.hint,st=hintStep(),last=h.lvl===h.steps.length-1;
  if(st.show)UI.sel=h.target;
  const main=!last?'<button class="btn primary" data-act="hintMore">More help</button>':h.type==='wrong'?'<button class="btn primary" data-act="hintFix">Clear the mistake</button>':'<button class="btn primary" data-act="hintReveal">Reveal</button>';
  const p=$('#hint-panel');p.innerHTML=`<div class="hp-top">${myTurtle({mood:'open'})}<p>${st.text}</p></div><div class="hp-btns">${main}<button class="btn" data-act="hintClose">I’ll try</button></div>`;
  p.hidden=false;$('#tools').hidden=true;refresh();requestAnimationFrame(sizeBoard)}
/* otevřená nápověda se nepočítá znovu: další klepnutí na Nápovědu jen ukáže další krok */
function showHint(){const gm=S.game;if(!gm||gm.done||UI.paused)return;if(isSolved(gm))return;const K=kindOf(gm);
  if(UI.hint){hintMore();return}
  UI.hint=(K.hint||findHint)(gm);UI.hint.lvl=0;gm.hints++;sfx.note();renderHint()}
function hintMore(){const h=UI.hint;if(!h||h.lvl>=h.steps.length-1)return;h.lvl++;sfx.note();renderHint()}
function hideHint(){if(!UI.hint&&$('#hint-panel').hidden)return;UI.hint=null;$('#hint-panel').hidden=true;$('#tools').hidden=false;requestAnimationFrame(sizeBoard)}
function hintReveal(){const gm=S.game,h=UI.hint;if(!h)return;const K=kindOf(gm);if(K.reveal){hideHint();K.reveal(gm,h);refresh();checkWin();return}
  const i=h.target,d=gm.sol[i],geo=geoOf(gm);
  const ch=[i];for(const p of geo.peers[i])if(gm.notes[p]&(1<<d))ch.push(p);record(ch);
  gm.vals[i]=d;gm.notes[i]=0;for(const p of geo.peers[i])gm.notes[p]&=~(1<<d);
  hideHint();sfx.place();anim(UI.cells[i].v,'pop');checkHouses(i);refresh();checkWin()}
function hintFix(){const gm=S.game,h=UI.hint;if(!h)return;const K=kindOf(gm);record([h.target]);if(K.fix)K.fix(gm,h.target);else gm.vals[h.target]=0;hideHint();refresh()}

/* ---------- výhra ---------- */
function win(){const gm=S.game;if(gm.done)return;gm.done=true;const before=lvlInfo().L,st=S.stats,now=new Date(),today=dkey();
  const GK=GAMES[gm.mode];
  let xp=GK?GK.levels[gm.level].xp:gm.mode==='quick'?15:gm.mode==='killer'?60:LEVELS[gm.level].xp+(gm.mode==='diag'?10:0);if(gm.mode==='daily')xp+=25;
  const perfect=gm.mistakes===0,nohint=gm.hints===0;if(perfect)xp+=10;if(nohint)xp+=10;S.xp+=xp;
  st.solved++;const key=gm.mode+'-'+gm.level;const b=st.byKey[key]||{n:0,best:0,total:0};b.n++;b.total+=gm.time;b.best=b.best?Math.min(b.best,gm.time):gm.time;st.byKey[key]=b;
  st.times.push({t:gm.time,k:key,d:today});if(st.times.length>60)st.times.shift();
  if(perfect)st.perfect++;if(nohint)st.nohint++;
  if(gm.mode==='quick')st.quick++;if(gm.mode==='diag')st.diag++;if(gm.mode==='killer')st.killer++;
  if(GK)st.games[gm.mode]=(st.games[gm.mode]||0)+1;
  else if(gm.level===5&&gm.mode!=='quick'&&gm.mode!=='killer')st.expert++;
  if(now.getHours()<8)st.early++;if(now.getHours()>=22)st.owl++;
  if(gm.mode==='classic'&&gm.level===2&&gm.time<360)st.fastEasy++;if(gm.mode==='classic'&&gm.level===3&&gm.time<720)st.fastMed++;
  st.days[today]=(st.days[today]||0)+1;
  if(gm.mode==='daily'&&gm.dateKey)S.daily.done[gm.dateKey]=true;
  S.daily.best=Math.max(S.daily.best||0,streakAt(today),gm.dateKey?streakAt(gm.dateKey):0);
  const step=((st.solved-1)%12)+1,isl=Math.floor((st.solved-1)/12),I=ISLANDS[isl%ISLANDS.length];let postcard=false;
  if(step===12){S.postcards.push(isl%ISLANDS.length);postcard=true}
  const news=checkAch(),after=lvlInfo();save();sySoon(3000);
  const unlocked=[...ACC.filter(a=>a.lvl>before&&a.lvl<=after.L).map(a=>a.name),...SKINS.filter(s=>s.lvl>before&&s.lvl<=after.L).map(s=>'the '+s.name+' theme')];
  sfx.win();buzz([40,60,40,60,80]);confetti();
  const heads=['Well done!','All done!','You did it!','Brilliant work!','Bravo!'];
  modal(`${myTurtle({cls:'dance',mood:'happy'})}<h2>${pick(heads)}</h2>
  <div class="win-stats"><div><b>${fmt(gm.time)}</b><span>Time</span></div><div><b>${gm.mistakes}</b><span>Mistakes</span></div><div><b>${gm.hints}</b><span>Hints</span></div></div>
  <div class="xp-gain">+${xp} points${perfect&&nohint?' · no mistakes and no hints':''}</div>
  <div class="xp"><div class="bar"><i style="width:${after.rest/after.need*100}%"></i></div><small>Level ${after.L} · ${chybiBody(after.need-after.rest)} to the next level</small></div>
  ${after.L>before?`<div class="lvlup">${esc(S.pet.name)} has grown! She’s now at level ${after.L}.${unlocked.length?'<br>Newly unlocked: '+unlocked.join(', '):''}</div>`:''}
  <p>${postcard?`${esc(S.pet.name)} has swum to the far end of <b>${I.name}</b> and sent you a postcard!`:`${esc(S.pet.name)} has swum one step further: <b>step ${step} of 12</b> on ${I.name}.`}</p>
  ${news.map(a=>`<div class="newach"><span>${a.ico}</span><div>New award: ${a.name}<br><small class="muted">${a.desc}</small></div></div>`).join('')}
  <div class="btns">${gm.mode==='daily'?'':`<button class="btn primary big" data-act="again">${GK?GK.again||'Another game':'Another sudoku'}</button>`}<button class="btn big ${gm.mode==='daily'?'primary':''}" data-act="home">Home</button></div>`)}
function checkAch(){const out=[];for(const a of ACH){if(!S.ach[a.id]&&a.val(S)>=a.goal){S.ach[a.id]=dkey();out.push(a)}}return out}
function achToast(){const n=checkAch();if(n.length){save();toast(`New award: ${n[0].ico} ${n[0].name}`)}}
function confetti(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){}
  const c=$('#fx-canvas'),ctx=c.getContext('2d'),dp=window.devicePixelRatio||1,W=c.width=innerWidth*dp,H=c.height=innerHeight*dp;c.hidden=false;
  const cs=getComputedStyle(document.documentElement),cols=['--accent','--sun','--leaf','--user','--cage'].map(v=>cs.getPropertyValue(v).trim());
  const P=Array.from({length:150},(_,i)=>({x:W/2+(Math.random()-.5)*W*.4,y:H*.4,vx:(Math.random()-.5)*18*dp,vy:(-Math.random()*20-6)*dp,s:(7+Math.random()*8)*dp,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[i%cols.length]}));
  const t0=performance.now();(function f(t){ctx.clearRect(0,0,W,H);for(const p of P){p.vy+=.55*dp;p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.r+=p.vr;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r);ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);ctx.restore()}
    if(t-t0<3200)requestAnimationFrame(f);else{ctx.clearRect(0,0,W,H);c.hidden=true}})(t0)}

/* ---------- menu hry ---------- */
function moreMenu(){const gm=S.game,K=kindOf(gm),nt=K.notes!==false;modal(`<h2>Game options</h2><div class="btns">
  ${nt?`<button class="btn big" data-act="autonotes">Fill in notes automatically</button>
  <button class="btn big" data-act="clearnotes">Clear all notes</button>`:''}
  <button class="btn big" data-act="toggleErr">${S.settings.showErrors?'Don’t show mistakes in red':'Show mistakes in red'}</button>
  <button class="btn big" data-act="restartAsk">${GAMES[gm.mode]?'Restart this game':'Restart this sudoku'}</button>
  <button class="btn big ghost" data-act="close">Close</button></div>`)}
function autoNotes(){const gm=S.game,geo=geoOf(gm);const g=gm.vals.map((v,i)=>v===gm.sol[i]?v:0);const ch=[];gm.vals.forEach((v,i)=>{if(!v)ch.push(i)});if(!ch.length){closeModal();toast('All the squares are filled in.');return}record(ch);
  ch.forEach(i=>{gm.notes[i]=cands(gm,geo,g,i)});closeModal();toast('Notes filled in.');refresh()}
function clearNotes(){const gm=S.game;const ch=[];gm.notes.forEach((n,i)=>{if(n)ch.push(i)});if(ch.length){record(ch);ch.forEach(i=>gm.notes[i]=0)}closeModal();refresh()}
function pause(on){UI.paused=on;const c=$('#pause-cover');if(on){c.innerHTML=`${myTurtle({mood:'sleep'})}<h2>Paused</h2><p class="muted">${esc(S.pet.name)} is having a little nap in the meantime.</p><button class="btn primary big" data-act="resume" style="max-width:280px">Back to the game</button>`;c.hidden=false;save()}else c.hidden=true}

/* ---------- cesta ---------- */
function renderMap(){const solved=S.stats.solved,isl=Math.floor(solved/12),step=solved%12,idx=isl%ISLANDS.length,lap=Math.floor(isl/ISLANDS.length)+1,I=ISLANDS[idx];
  const ys=[66,136,206],xs=[62,142,222,302],pts=[];for(let r=0;r<3;r++)for(let k=0;k<4;k++)pts.push([r%2?xs[3-k]:xs[k],ys[r]]);
  let svg=`<svg viewBox="0 0 364 270" role="img" aria-label="Map of ${I.name}"><rect class="map-sea" width="364" height="270"/>`;
  for(let k=0;k<6;k++){const y=20+k*46,x=(k%2)*30;svg+=`<path class="map-wave" d="M${x} ${y} q12 -8 24 0 t24 0" opacity=".6"/><path class="map-wave" d="M${x+250} ${y+18} q12 -8 24 0 t24 0" opacity=".6"/>`}
  svg+=`<path d="M38 44 Q30 14 100 26 Q182 6 270 24 Q340 26 334 112 Q348 196 316 236 Q246 258 178 246 Q92 260 44 234 Q12 184 26 124 Q16 72 38 44Z" fill="${I.land}" stroke="${I.land2}" stroke-width="8"/>`;
  svg+=`<text x="44" y="250" font-size="30">${I.deco[0]}</text><text x="300" y="58" font-size="26">${I.deco[1]}</text><text x="296" y="250" font-size="24">${I.deco[2]}</text>`;
  svg+=`<path class="map-path" d="M${pts.map(p=>p.join(' ')).join(' L')}"/>`;
  pts.forEach((p,k)=>{const done=k<step;svg+=`<circle class="map-stop ${done?'done':''}" cx="${p[0]}" cy="${p[1]}" r="14"/><text class="map-num ${done?'done':''}" x="${p[0]}" y="${p[1]}">${k+1}</text>`});
  const tp=pts[Math.min(step,11)];svg+=`<g transform="translate(${tp[0]-30},${tp[1]-50}) scale(.27)">${turtleInner({wear:S.pet.wear,mood:'happy'})}</g></svg>`;
  const list=ISLANDS.map((x,k)=>{const visited=lap>1||k<idx,cur=k===idx;return `<div class="isl ${cur?'cur':''} ${!visited&&!cur?'unk':''}"><i style="background:${x.land}">${visited||cur?x.deco[0]:'?'}</i><div>${visited||cur?x.name:'Undiscovered island'}<small>${cur?`You are here · step ${step} of 12`:visited?'Visited':`You’ll get there after ${(k-idx)*12-step} more ${(k-idx)*12-step===1?W('sudoku','game'):W('sudoku','games')}`}</small></div></div>`}).join('');
  $('#v-map').innerHTML=`<h1 class="title">Journey round the islands</h1><p class="muted" style="margin:0">${W('Every sudoku you solve','Every game you solve')} is one step on the journey. After twelve steps the turtle swims on to the next island.</p>
  <div class="mapbox">${svg}<div class="mapinfo"><small class="lbl">${lap>1?'Round '+lap+' · ':''}Island ${idx+1} of ${ISLANDS.length}</small><h2>${I.name}</h2><div class="bar"><i style="width:${step/12*100}%"></i></div><span class="muted small">Step ${step} of 12. ${12-step} more ${W('sudoku',plural(12-step,'game','games','games'))} to the next island.</span></div></div>
  <h2 class="sec">Islands</h2><div class="isl-list">${list}</div>
  <p class="infinite">When ${esc(S.pet.name)} has sailed round all ten islands, she’ll set off on another round. The journey never ends.</p>`}

/* ---------- želvička ---------- */
function renderPet(){const li=lvlInfo();
  const cards=S.postcards.length?`<div class="cards">${S.postcards.map(k=>{const I=ISLANDS[k];return `<div class="postcard" style="background:${I.land}"><span>${I.deco.join(' ')}</span>Greetings from ${I.name}</div>`}).join('')}</div>`:`<p class="muted" style="margin:0">After each island (12 ${W('sudoku','games')}) the turtle will send you a postcard.</p>`;
  $('#v-pet').innerHTML=`<h1 class="title">My turtle</h1>
  <div class="pet-stage" data-act="pat" role="button" aria-label="Stroke the turtle">${myTurtle({cls:'bob',g:growth(li.L)})}<div class="hearts" id="hearts"></div></div>
  <div class="pet-name"><b>${esc(S.pet.name)}</b></div>
  <p class="muted center" style="margin:0;font-weight:800">${stage(li.L)} · level ${li.L}</p>
  <div class="xp"><div class="bar"><i style="width:${li.rest/li.need*100}%"></i></div><small>${chybiBody(li.need-li.rest)} to the next level. You earn points for ${W('every sudoku','every game')}.</small></div>
  <p class="say" id="pet-say">${esc(pick(TIPS))}</p>
  <p class="muted center small" style="margin:0">Tap the turtle to give her a stroke.</p>
  <h2 class="sec">Wardrobe</h2>
  ${SLOTS.map(sl=>`<div class="wear-row"><span>${sl.name}</span><div class="chips"><button class="chip ${!S.pet.wear[sl.id]?'on':''}" data-act="wear" data-slot="${sl.id}" data-item="">Nothing</button>${ACC.filter(a=>a.slot===sl.id).map(a=>li.L>=a.lvl?`<button class="chip ${S.pet.wear[sl.id]===a.id?'on':''}" data-act="wear" data-slot="${sl.id}" data-item="${a.id}">${a.name}</button>`:`<span class="chip locked">${ICON.lock}${a.name} · from level ${a.lvl}</span>`).join('')}</div></div>`).join('')}
  <h2 class="sec">Postcards from the journey</h2>${cards}`}
function pat(){S.pet.pets++;save();sfx.pat();buzz(20);const h=$('#hearts');if(h){for(let k=0;k<4;k++){const s=document.createElement('span');s.className='heart';s.textContent='♥';s.style.left=(25+Math.random()*50)+'%';s.style.animationDelay=(k*.12)+'s';h.appendChild(s);setTimeout(()=>s.remove(),1700)}}
  const say=$('#pet-say');if(say)say.textContent=pick(PATS);const t=$('.pet-stage .turtle');if(t){t.classList.remove('bob');t.classList.add('wiggle');setTimeout(()=>{t.classList.remove('wiggle');t.classList.add('bob')},520)}achToast()}

/* ---------- úspěchy a statistiky ---------- */
function renderAwards(){const tab=UI.awards;let body='';
  if(tab==='ach'){const got=ACH.filter(a=>S.ach[a.id]).length;
    body=`<p class="muted" style="margin:0">${got} of ${ACH.length} badges earned.</p><div class="ach-grid">${ACH.map(a=>{const g=S.ach[a.id],v=Math.min(a.val(S),a.goal);
      return `<div class="ach ${g?'got':''}"><div class="badge">${a.ico}</div><b>${a.name}</b><span>${a.desc}</span>${g?`<em>Earned ${fromKey(g).toLocaleDateString('en-GB')}</em>`:a.goal>1?`<div class="bar"><i style="width:${v/a.goal*100}%"></i></div><span>${v.toLocaleString('en-GB')} of ${a.goal.toLocaleString('en-GB')}</span>`:''}</div>`}).join('')}</div>`}
  else{const st=S.stats,li=lvlInfo();
    const rows=[...LEVELS.map((L,i)=>[L.name,'classic-'+i]),['Quick 6×6','quick-0'],['Killer','killer-2']];
    const extra=Object.keys(st.byKey).filter(k=>/^(diag|daily)-/.test(k)).map(k=>[MODES[k.split('-')[0]]+' · '+LEVELS[+k.split('-')[1]].name,k]);
    for(const m in GAMES){const K=GAMES[m];K.levels.forEach((L,i)=>{if(st.byKey[m+'-'+i])extra.push([K.name+(K.levels.length>1?' · '+L.name:''),m+'-'+i])})}
    const tr=[...rows,...extra].map(([n,k])=>{const b=st.byKey[k];return `<tr><td>${n}</td><td class="n">${b?b.n:0}</td><td class="n">${b?fmt(b.best):'—'}</td><td class="n">${b?fmt(b.total/b.n):'—'}</td></tr>`}).join('');
    const cal=calendar();
    body=`<div class="tiles"><div class="stat"><b>${st.solved}</b><span>${W('Sudoku','Games')} solved</span></div><div class="stat"><b>${li.L}</b><span>Turtle level</span></div><div class="stat"><b>${currentStreak()}</b><span>Days in a row</span></div><div class="stat"><b>${S.daily.best||0}</b><span>Longest streak (days)</span></div></div>
    <h2 class="sec">Times by difficulty</h2><div class="tbl-wrap"><table><thead><tr><th>Game</th><th style="text-align:right">Played</th><th style="text-align:right">Best</th><th style="text-align:right">Average</th></tr></thead><tbody>${tr}</tbody></table></div>
    <h2 class="sec">Last 20 games</h2>${timeChart()}
    <h2 class="sec">When you played</h2>${cal}`}
  $('#v-awards').innerHTML=`<h1 class="title">Awards</h1><div class="seg"><button class="${tab==='ach'?'on':''}" data-act="atab" data-t="ach">Badges</button><button class="${tab==='stats'?'on':''}" data-act="atab" data-t="stats">Statistics</button></div>${body}`}
function timeChart(){const T=S.stats.times.slice(-20);if(T.length<2)return '<p class="muted" style="margin:0">The chart will appear after two finished games.</p>';
  const W=340,H=170,l=34,r=10,t=12,b=26,v=T.map(x=>x.t/60),mx=Math.max(5,Math.ceil(Math.max(...v)/5)*5);
  const X=i=>l+(W-l-r)*i/(T.length-1),Y=m=>t+(H-t-b)*(1-m/mx);
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart of times in minutes">`;
  [0,mx/2,mx].forEach(m=>{s+=`<line class="ch-grid" x1="${l}" x2="${W-r}" y1="${Y(m)}" y2="${Y(m)}"/><text class="ch-lbl" x="${l-6}" y="${Y(m)+4}" text-anchor="end">${m}</text>`});
  const pts=v.map((m,i)=>`${X(i).toFixed(1)},${Y(m).toFixed(1)}`);
  s+=`<path class="ch-area" d="M${X(0)},${Y(0)} L${pts.join(' L')} L${X(T.length-1)},${Y(0)}Z"/><polyline class="ch-line" points="${pts.join(' ')}"/>`;
  v.forEach((m,i)=>{s+=`<circle class="ch-dot ${i===v.length-1?'last':''}" cx="${X(i)}" cy="${Y(m)}" r="${i===v.length-1?5:3.5}"/>`});
  s+=`<text class="ch-lbl" x="${l}" y="${H-6}">older</text><text class="ch-lbl" x="${W-r}" y="${H-6}" text-anchor="end">newest</text><text class="ch-lbl" x="${l-6}" y="${t-2}" text-anchor="end">min</text></svg>`;
  return `<div class="chart">${s}</div>`}
function calendar(){const WD=['Mo','Tu','We','Th','Fr','Sa','Su'];let s=WD.map(d=>`<b>${d}</b>`).join('');
  const today=new Date(),dow=(today.getDay()+6)%7,start=addDays(today,-(28+dow));
  for(let k=0;k<35;k++){const d=addDays(start,k),key=dkey(d),n=S.stats.days[key]||0,fut=d>today&&key!==dkey(today);
    s+=fut?'<i style="visibility:hidden"></i>':`<i class="${n>=3?'l3':n===2?'l2':n===1?'l1':''} ${key===dkey(today)?'t':''}" title="${d.toLocaleDateString('en-GB')}: ${n}"></i>`}
  return `<div class="cal">${s}</div><p class="muted small" style="margin:0">The greener the square, the more ${W('sudoku','games')} you played that day.</p>`}

/* ---------- záloha ---------- */
function toB64(u8){let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s)}
async function makeBackup(){const d=JSON.parse(JSON.stringify(S));d.lang=LANG;if(d.game){d.game.hist=[];d.game.fut=[]}const json=JSON.stringify(d);
  try{if('CompressionStream' in window){const st=new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));return 'ZS2-'+toB64(new Uint8Array(await new Response(st).arrayBuffer()))}}catch(e){}
  return 'ZS1-'+toB64(new TextEncoder().encode(json))}
async function readBackup(code){try{code=String(code||'').replace(/\s+/g,'');const m=/^ZS([12])-(.+)$/.exec(code);if(!m)return null;
  const bin=atob(m[2]),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);let json;
  if(m[1]==='2'){const st=new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));json=await new Response(st).text()}else json=new TextDecoder().decode(u8);
  return hydrate(JSON.parse(json))}catch(e){return null}}

/* ---------- nastavení ---------- */
function renderSettings(){const st=S.settings,L=lvlInfo().L;
  const sw=(k,t,d)=>`<button class="sw-row" data-act="toggle" data-k="${k}" aria-pressed="${!!st[k]}"><span><b>${t}</b><small>${d}</small></span><i class="sw"></i></button>`;
  const seg=(k,opts)=>`<div class="seg">${opts.map(o=>`<button class="${String(st[k])===String(o[0])?'on':''}" data-act="set" data-k="${k}" data-v="${o[0]}">${o[1]}</button>`).join('')}</div>`;
  $('#v-settings').innerHTML=`<h1 class="title">Settings</h1>
  <div class="group"><div class="field"><b>Jazyk · Language</b>${langSeg()}</div></div>
  <div class="group"><div class="field"><b>Your name</b><input id="player-in" maxlength="24" value="${esc(st.player)}" placeholder="E.g. Jane" aria-label="Your name">
  <div class="preview" id="call-prev"></div>
  <b>What should the turtle call you? (optional)</b><input id="call-in" maxlength="24" value="${esc(st.call)}" placeholder="${esc(st.player||'E.g. Granny')}" aria-label="What should the turtle call you?"><small class="muted">Normally the turtle uses your name. If you’d like her to call you something else, such as “Granny”, write it here.</small></div>
  <div class="field"><b>Turtle’s name</b><input id="pet-in" maxlength="16" value="${esc(S.pet.name)}" placeholder="Rosie" aria-label="Turtle’s name"></div>
  <div class="field"><b>Text size</b>${seg('fs',[[1,'Normal'],[1.15,'Larger'],[1.3,'Largest']])}</div>
  <div class="field"><b>Symbols in the grid</b><div class="sym-grid">${SYMSETS.map(o=>`<button class="sym-opt ${st.symbols===o.id?'on':''}" data-act="set" data-k="symbols" data-v="${o.id}"><span>${o.ex}</span>${o.name}</button>`).join('')}</div><small class="muted">Fruit, animals and balls are handy for playing with the grandchildren. ${Object.keys(GAMES).length?'Games that involve counting or comparing (killer sudoku, Futoshiki, Hashi, KenKen) always use numbers.':'Killer sudoku always uses numbers.'}</small></div></div>
  <div class="group">${sw('sound','Sounds','Gentle tones while playing')}${sw('vibrate','Vibration','The phone buzzes gently')}${sw('showErrors','Show mistakes','A wrong number turns red')}${sw('highlight','Highlighting','Row, column and matching numbers')}${sw('showTimer','Show the time','A clock at the top while you play')}${sw('notesBtn','Notes button',W('Little helper numbers in a square, for harder sudoku','Little helper numbers in a square, for harder sudoku, Futoshiki and KenKen'))}${sw('autoClean','Tidy up notes','When you write a number, it disappears from nearby notes')}</div>
  <h2 class="sec">Theme</h2>
  <div class="group"><div class="skins">${SKINS.map(s=>{const open=L>=s.lvl;return `<button class="skin ${st.skin===s.id?'on':''} ${open?'':'locked'}" data-act="skin" data-s="${s.id}" ${open?'':'disabled'}><span class="sw3">${s.c.map(c=>`<i style="background:${c}"></i>`).join('')}</span>${s.name}${open?'':`<small>from level ${s.lvl}</small>`}</button>`}).join('')}</div></div>
  <h2 class="sec">${SYT.sec}</h2>
  <div class="group"><div class="field" id="sy-box">${syBox()}</div></div>
  <h2 class="sec">Backing up your progress</h2>
  <div class="group"><div class="field"><b>Backup code</b><small class="muted">The code contains your turtle, level, awards, statistics and any game in progress. Send it to yourself by email or message. On a new phone, paste it in and everything comes back.</small>
  <small style="font-weight:800">${S.lastBackup?'Last backup: '+fromKey(S.lastBackup).toLocaleDateString('en-GB'):'No backup has been made yet.'}</small>
  <button class="btn primary" data-act="backupMake">Make a backup</button><button class="btn" data-act="backupRestore">Restore from a backup</button></div></div>
  <div class="group"><button class="sw-row" data-act="resetAsk"><span><b style="color:var(--err)">Delete all data</b><small>Statistics, awards and the turtle start again from scratch</small></span></button></div>
  <p class="muted small center">${SY?SYT.foot:'Turtle Sudoku · saved only on this device'}</p>`;
  const inp=$('#player-in'),ci=$('#call-in'),prev=()=>{const n=callName();$('#call-prev').textContent='The turtle will say: Hello'+(n?', '+n:'')+'!';ci.placeholder=S.settings.player||'E.g. Granny'};prev();
  inp.addEventListener('input',()=>{S.settings.player=inp.value;save();prev()});const pi=$('#pet-in');pi.addEventListener('input',()=>{const v=pi.value.trim();S.pet.name=v||'Rosie';save()});ci.addEventListener('input',()=>{S.settings.call=ci.value;save();prev()})}

/* ---------- škola ---------- */
const LESSONS=[
  {t:'Three rules',tile:'1',text:['A sudoku has 9 rows, 9 columns and 9 boxes of 3×3.','Every row, column and box must contain each number from 1 to 9 exactly once. There’s no adding up – you just look for what’s missing.'],ask:'One number is missing from the highlighted row. Which one?',tip:'Go through the numbers 1 to 9 one by one and look for the one that isn’t in the row.'},
  {t:'The last space in a box',tile:'2',text:['When a box has only one empty square left, the number still missing from the box goes there.','It works the same way for rows and columns. This is the easiest step, so look for it first.'],ask:'Which number belongs in the empty square of the box?',tip:'There are eight numbers in the box. Which of 1 to 9 isn’t among them?'},
  {t:'Only one option',tile:'3',text:['Sometimes a square has no other option left. Look at the numbers in its row, column and box together.','If you find eight different numbers there, the ninth belongs in the square.'],ask:'Which number belongs in the square with the highlighted border?',tip:'In your head, list all the numbers in the highlighted row, column and box. One is missing.'},
  {t:'Where does the number go?',tile:'4',text:['Now the other way round: pick one number and look for where it can go in one box.','Rows and columns that already contain that number are closed to it. Often only one place is left.'],ask:'',tip:'Look at which rows and columns already have that number. It can’t go there a second time.'},
  {t:'Pencil notes',tile:'5',text:['In harder sudoku you can write small numbers in a square for the options that could go there. Turn on the Notes button and tap the numbers. If you don’t need the button, you can hide it in Settings.','In the More menu you’ll also find automatic notes, which fill them in for you.','When two squares in the same row have only the same pair in their notes, for example 4 and 7, those two numbers belong to them alone. You can then cross them out from the rest of the row.'],ask:'',tip:''}];
let LSOL=null;
function lessonSol(){if(!LSOL)LSOL=search(new Array(81).fill(0),getGeo(9,3,3,false),1,mulberry32(74)).sol;return LSOL}
function buildLesson(k){const s=lessonSol(),geo=getGeo(9,3,3,false),rng=mulberry32((Date.now()&0xffff)+k*977),R=n=>Math.floor(rng()*n);
  const vals=new Array(81).fill(0);let target=-1,answer=0,hl=[],same=-1,mode='num',ask=LESSONS[k].ask;
  if(k===0){const r=R(9),c=R(9);for(let x=0;x<9;x++)vals[r*9+x]=s[r*9+x];target=r*9+c;hl=geo.units[r]}
  else if(k===1){const b=geo.units[18+R(9)];b.forEach(c=>vals[c]=s[c]);target=b[R(9)];hl=b}
  else if(k===2){target=R(81);const ps=shuffle(geo.peers[target].slice(),rng),shown=new Set(ps);
    for(const p of ps){shown.delete(p);if(new Set([...shown].map(c=>s[c])).size<8)shown.add(p)}
    shown.forEach(c=>vals[c]=s[c]);hl=geo.peers[target]}
  else if(k===3){const X=1+R(9),bi=R(9),box=geo.units[18+bi];mode='cell';same=X;
    for(let i=0;i<81;i++){if(box.includes(i))continue;if(s[i]===X||rng()<.22)vals[i]=s[i]}
    const others=shuffle(box.filter(c=>s[c]!==X),rng).slice(0,3);others.forEach(c=>vals[c]=s[c]);
    target=box.find(c=>s[c]===X);hl=box;ask=`Where does the number ${X} go in the highlighted box? Tap the square.`}
  vals[target]=0;answer=s[target];return{vals,target,answer,hl:new Set(hl),same,mode,ask,state:null,wrongCell:-1}}
function miniBoard(ld){let h='';for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9;let cls='cell';
  if(c===8)cls+=' lc';else if((c+1)%3===0)cls+=' br';if(r===8)cls+=' lr';else if((r+1)%3===0)cls+=' bb';
  if(ld.vals[i])cls+=' given';if(ld.hl.has(i))cls+=ld.mode==='cell'?' hh':' peer';if(ld.same&&ld.vals[i]===ld.same)cls+=' same';
  if(ld.mode==='num'&&i===ld.target)cls+=' sel ht';if(ld.state==='ok'&&i===ld.target)cls+=' sel';if(i===ld.wrongCell)cls+=' err';
  const v=ld.state==='ok'&&i===ld.target?ld.answer:ld.vals[i];
  h+=`<div class="${cls}" ${ld.mode==='cell'&&ld.state!=='ok'?`data-act="lcell" data-i="${i}"`:''}><span class="v">${v||''}</span></div>`}
  return `<div class="board mini ${ld.mode==='cell'?'tap':''}" style="--n:9">${h}</div>`}
function lessonRow(act,attrs,done,tile,t,k){return `<button class="mrow lesson-item" data-act="${act}" ${attrs}><span class="tile ${done?'ok':''}">${done?ICON.check:tile}</span><div><b>${t}</b><span>${done?'Done':'Lesson '+(k+1)}</span></div><span class="chev">${ICON.chev}</span></button>`}
function renderSchool(){const el=$('#v-school');
  if(UI.glesson){renderGLesson();return}
  if(UI.lesson<0){const gl=Object.keys(GAMES).filter(m=>GAMES[m].lessons).map(m=>`<h2 class="sec">${GAMES[m].name}</h2><div class="list">${GAMES[m].lessons.map((L,k)=>lessonRow('glesson',`data-g="${m}" data-k="${k}"`,S.lessons[m+'-'+k],L.tile||k+1,L.t,k)).join('')}</div>`).join('');
    el.innerHTML=`<button class="link" data-act="go" data-v="home" style="align-self:flex-start">‹ Back</button><h1 class="title">${gl?'School':'Sudoku school'}</h1><p class="muted" style="margin:0">Short lessons with an example to try. You can go through them again at any time.</p>
    ${gl?'<h2 class="sec">Sudoku</h2>':''}<div class="list">${LESSONS.map((L,k)=>lessonRow('lesson',`data-k="${k}"`,S.lessons[k],L.tile,L.t,k)).join('')}</div>${gl}`;return}
  const k=UI.lesson,L=LESSONS[k],ld=UI.ld;let task='';
  if(k===4)task=`<button class="btn primary big" data-act="lessonOk">Got it</button>`;
  else{task=`${miniBoard(ld)}<p class="ask">${ld.ask}</p>`;
    if(ld.state==='ok')task+=`<div class="feedback ok">${myTurtle({cls:'dance',mood:'happy'})}<span>Correct! ${ld.mode==='cell'?'That’s exactly where the number goes.':'It’s '+ld.answer+'.'}</span></div>`;
    else{if(ld.state==='no')task+=`<div class="feedback no"><span>Try again. ${L.tip}</span></div>`;
      if(ld.mode==='num')task+=`<div class="lpad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button class="key" data-act="lans" data-d="${d}">${d}</button>`).join('')}</div>`}}
  const done=k===4?S.lessons[4]:ld&&ld.state==='ok';
  el.innerHTML=`<button class="link" data-act="lessonBack" style="align-self:flex-start">‹ All lessons</button><small class="lbl">Lesson ${k+1} of ${LESSONS.length}</small><h1 class="title">${L.t}</h1>
  <div class="lesson-text">${L.text.map(p=>`<p>${p}</p>`).join('')}</div>${task}
  ${done?`<div class="btns" style="display:flex;flex-direction:column;gap:10px">${k<4?`<button class="btn primary big" data-act="lesson" data-k="${k+1}">Next lesson</button>`:`<button class="btn primary big" data-act="play" data-mode="classic" data-level="0">Try an easy sudoku</button>`}<button class="btn big" data-act="lessonBack">Back to lessons</button></div>`:''}`}
function renderGLesson(){const G=UI.glesson,K=GAMES[G.g],L=K.lessons[G.k],key=G.g+'-'+G.k,done=L.ask?G.state==='ok':!!S.lessons[key];
  let task=L.mini?`<div class="g-mini">${L.mini()}</div>`:'';
  if(L.ask){task+=`<p class="ask">${L.ask}</p>`;
    if(G.state==='ok')task+=`<div class="feedback ok">${myTurtle({cls:'dance',mood:'happy'})}<span>Correct!${L.ok?' '+L.ok:''}</span></div>`;
    else{if(G.state==='no')task+=`<div class="feedback no"><span>Try again. ${L.tip||''}</span></div>`;
      task+=`<div class="lpad" style="grid-template-columns:repeat(${Math.min(5,L.choices.length)},1fr)">${L.choices.map(([v,t])=>`<button class="key" data-act="gans" data-v="${esc(v)}">${t}</button>`).join('')}</div>`}}
  else if(!done)task+=`<button class="btn primary big" data-act="gok">Got it</button>`;
  const next=G.k<K.lessons.length-1;
  $('#v-school').innerHTML=`<button class="link" data-act="lessonBack" style="align-self:flex-start">‹ All lessons</button><small class="lbl">${K.name} · lesson ${G.k+1} of ${K.lessons.length}</small><h1 class="title">${L.t}</h1>
  <div class="lesson-text">${L.text.map(p=>`<p>${p}</p>`).join('')}</div>${task}
  ${done?`<div class="btns" style="display:flex;flex-direction:column;gap:10px">${next?`<button class="btn primary big" data-act="glesson" data-g="${G.g}" data-k="${G.k+1}">Next lesson</button>`:`<button class="btn primary big" data-act="play" data-mode="${G.g}" data-level="0">Try the game</button>`}<button class="btn big" data-act="lessonBack">Back to lessons</button></div>`:''}`}
function lessonResult(ok){const ld=UI.ld;if(ok){ld.state='ok';ld.wrongCell=-1;S.lessons[UI.lesson]=true;save();sfx.house();buzz(30);achToast()}else{ld.state='no';sfx.err();buzz([30,40,30])}renderSchool()}

/*GAMES*/
/* Sem patří další hry: každá ve vlastním bloku „GAMES.<mode>={…}“ (rozhraní je popsané u konstanty GAMES).
   Vlastní generátor hry ať je mezi značkami ENGINE <mode> / END ENGINE <mode>, aby šel testovat v Node. */
/*ENGINE futoshiki*/
/* rel = [[lo,hi],…]: hodnota v políčku lo je menší než v sousedním políčku hi */
function fzPairs(N){const p=[];for(let r=0;r<N;r++)for(let c=0;c<N;c++){const i=r*N+c;if(c<N-1)p.push([i,i+1]);if(r<N-1)p.push([i,i+N])}return p}
/* Zúží možnosti logikou: číslo vylučuje stejné v řádku a sloupci, znaménko ořízne krajní hodnoty.
   hidden=true přidá i „jediné místo v řádku/sloupci“ (pro řešitel generátoru). Vrací masky, nebo null při sporu. */
function fzProp(g,N,rel,hidden){
  const geo=getGeo(N,0,0,false),n=N*N,m=new Array(n);
  for(let i=0;i<n;i++)m[i]=g[i]?1<<g[i]:geo.full;
  let ch=true;
  while(ch){ch=false;
    for(let i=0;i<n;i++){if(pc(m[i])!==1)continue;const b=m[i];for(const p of geo.peers[i])if(m[p]&b){m[p]&=~b;ch=true;if(!m[p])return null}}
    for(const [a,b] of rel){const mx=bd(m[b]),mn=bd(m[a]&-m[a]);
      const na=m[a]&((1<<mx)-1),nb=m[b]&~((2<<mn)-1);
      if(na!==m[a]){m[a]=na;ch=true;if(!na)return null}
      if(nb!==m[b]){m[b]=nb;ch=true;if(!nb)return null}}
    if(hidden)for(const u of geo.units)for(let d=1;d<=N;d++){const bit=1<<d;let cnt=0,at=-1;for(const c of u)if(m[c]&bit){cnt++;at=c}
      if(!cnt)return null;if(cnt===1&&m[at]!==bit){m[at]=bit;ch=true}}
  }
  return m}
function fzSolved(g,N,rel){const m=fzProp(g,N,rel,true);return !!m&&m.every(x=>pc(x)===1)}
/* o = {N, signs: podíl sousedních dvojic se znaménkem, clues: cílový počet zadaných čísel, seed} */
function genFuto(o){
  const rng=mulberry32(o.seed>>>0),N=o.N,n=N*N,geo=getGeo(N,0,0,false);
  const sol=search(new Array(n).fill(0),geo,1,rng).sol;
  const all=fzPairs(N),rel=shuffle(all.slice(),rng).slice(0,Math.round(all.length*o.signs)).map(([a,b])=>sol[a]<sol[b]?[a,b]:[b,a]);
  const pz=sol.slice();let clues=n;
  for(const i of shuffle([...Array(n).keys()],rng)){if(clues<=o.clues)break;const v=pz[i];pz[i]=0;if(fzSolved(pz,N,rel))clues--;else pz[i]=v}
  return{puzzle:pz,sol,rel,clues}}
/*END ENGINE futoshiki*/
/* ---------- hra: Futoshiki ---------- */
function fzSVG(N,rel){let p='';const w=.11,h=.17,f=x=>+x.toFixed(3);
  for(const [lo,hi] of rel){const a=Math.min(lo,hi),b=Math.max(lo,hi),r=Math.floor(a/N),c=a%N,s=lo===a?1:-1;
    if(b-a===1){const x=c+1,y=r+.5;p+=`M${f(x+w*s)} ${f(y-h)}L${f(x-w*s)} ${f(y)}L${f(x+w*s)} ${f(y+h)}`}
    else{const x=c+.5,y=r+1;p+=`M${f(x-h)} ${f(y+w*s)}L${f(x)} ${f(y-w*s)}L${f(x+h)} ${f(y+w*s)}`}}
  return `<svg class="fz" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none" aria-hidden="true"><path d="${p}"/></svg>`}
function fzMini(N,vals,rel,target,hl){let h='';for(let i=0;i<N*N;i++){const r=Math.floor(i/N),c=i%N;let cls='cell';
  if(c===N-1)cls+=' lc';if(r===N-1)cls+=' lr';if(vals[i])cls+=' given';if(hl&&hl.includes(i))cls+=' peer';if(i===target)cls+=' sel ht';
  h+=`<div class="${cls}"><span class="v">${vals[i]||''}</span></div>`}
  return `<div class="board mini n${N}" style="--n:${N}">${h}${fzSVG(N,rel)}</div>`}
const fzCache={gm:null,k:'',m:null};
GAMES.futoshiki={name:'Futoshiki',tile:'&lt;&gt;',desc:'A smaller grid with greater-than and less-than signs. No sums involved.',
  levels:[{name:'Easy',desc:'4×4 grid',xp:15,dots:1,N:4,signs:.35,clues:6},
          {name:'Medium',desc:'5×5 grid',xp:30,dots:2,N:5,signs:.35,clues:8},
          {name:'Harder',desc:'6×6 grid',xp:50,dots:3,N:6,signs:.33,clues:8}],
  numNote:'Futoshiki is played with numbers because it’s all about which is bigger.',
  why:{hidden:', or by the sign next to them',naked:'. The signs next to the square help too'},
  create(level,seed){const L=this.levels[level],r=genFuto({N:L.N,signs:L.signs,clues:L.clues,seed});return{N:L.N,puzzle:r.puzzle,sol:r.sol,rel:r.rel}},
  sub(gm){return this.levels[gm.level].name+' · '+gm.N+'×'+gm.N},
  cand(gm,g,i,m){const k=g.join('');if(fzCache.gm!==gm||fzCache.k!==k){fzCache.gm=gm;fzCache.k=k;fzCache.m=fzProp(g,gm.N,gm.rel,false)}return fzCache.m?fzCache.m[i]&m:m},
  deco(gm){return fzSVG(gm.N,gm.rel)},
  lessons:[
    {t:'Rules',tile:'1',text:['Futoshiki is a Japanese puzzle with a smaller grid, such as 4×4. Each row and column contains every number from 1 to 4 exactly once, just like sudoku. But there are no boxes.',
      'Between some squares there are greater-than and less-than signs. The point of the sign always faces the smaller number. This also applies to signs between squares one above the other.'],
     mini:()=>fzMini(4,[3,1,0,2,0,0,0,0,0,0,0,0,0,0,0,0],[[1,0],[8,12]],2,[0,1,2,3]),
     ask:'Which number belongs in the marked square?',choices:[[1,'1'],[2,'2'],[3,'3'],[4,'4']],answer:4,tip:'The row already has 3, 1 and 2. Which of the numbers 1 to 4 is missing?',ok:'The row was missing a 4.'},
    {t:'Signs give clues',tile:'2',text:['When two numbers are missing from a row and there’s a sign between their squares, you know straight away which goes where.',
      'Here 2 and 3 are missing and there’s a less-than sign between the squares. The point faces left, so the smaller number is on the left.',
      'This is handy too: the square the point faces can never hold the largest number, and the other side of the sign can never be a 1.'],
     mini:()=>fzMini(4,[4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],[[1,2]],1,[0,1,2,3]),
     ask:'Which number belongs in the marked square?',choices:[[1,'1'],[2,'2'],[3,'3'],[4,'4']],answer:2,tip:'2 and 3 are missing. The point of the sign faces the smaller of them.',ok:'The smaller number, 2, goes by the point.'}]};
ACH.push({id:'fz1',ico:'⚖️',name:'Bigger, smaller',desc:'Solve your first futoshiki',goal:1,val:s=>s.stats.games.futoshiki||0},
  {id:'fz10',ico:'🎯',name:'Master of signs',desc:'Solve 10 futoshiki',goal:10,val:s=>s.stats.games.futoshiki||0});
/*ENGINE binairo*/
/* vals: 0 = prázdné, 1 = bílé, 2 = černé; N sudé. Řádky mají indexy 0…N-1, sloupce N…2N-1. */
const BNL={},BNP={};
function bnLines(N){if(BNL[N])return BNL[N];const L=[];
  for(let r=0;r<N;r++){const a=[];for(let c=0;c<N;c++)a.push(r*N+c);L.push(a)}
  for(let c=0;c<N;c++){const a=[];for(let r=0;r<N;r++)a.push(r*N+c);L.push(a)}return BNL[N]=L}
/* všechny platné hotové řádky délky N (půl na půl, nikde tři stejné) */
function bnPatterns(N){if(BNP[N])return BNP[N];const out=[],h=N/2;
  (function rec(a,w,b){const k=a.length;if(k===N){out.push(a.slice());return}
    for(const v of [1,2]){if(v===1?w===h:b===h)continue;if(k>=2&&a[k-1]===v&&a[k-2]===v)continue;a.push(v);rec(a,w+(v===1),b+(v===2));a.pop()}})([],0,0);
  return BNP[N]=out}
/* Jeden logický krok. adv = i rozbor celého řádku (vyzkoušet obě barvy) a pravidlo „žádné dva stejné řádky“.
   Vrací {i,v,kind,line,cells,twin} nebo null; {bad:true} při sporu. */
function bnStep(g,N,adv){const L=bnLines(N),h=N/2;
  for(let li=0;li<L.length;li++){const u=L[li];
    for(let k=0;k+1<N;k++){const a=g[u[k]],b=g[u[k+1]];
      if(a&&a===b){if(k>0&&!g[u[k-1]])return{i:u[k-1],v:3-a,kind:'pair',line:li,cells:[u[k-1],u[k],u[k+1]]};
        if(k+2<N&&!g[u[k+2]])return{i:u[k+2],v:3-a,kind:'pair',line:li,cells:[u[k],u[k+1],u[k+2]]}}
      if(k+2<N&&a&&!b&&a===g[u[k+2]])return{i:u[k+1],v:3-a,kind:'gap',line:li,cells:[u[k],u[k+1],u[k+2]]}}}
  for(let li=0;li<L.length;li++){const u=L[li];let w=0,b=0,e=-1;for(const c of u){if(g[c]===1)w++;else if(g[c]===2)b++;else e=c}
    if(e<0)continue;if(w===h)return{i:e,v:2,kind:'count',line:li,n:h,full:1};if(b===h)return{i:e,v:1,kind:'count',line:li,n:h,full:2}}
  if(!adv)return null;
  const P=bnPatterns(N);
  for(let li=0;li<L.length;li++){const u=L[li];if(u.every(c=>g[c]))continue;
    const done=[];const base=li<N?0:N;for(let lj=base;lj<base+N;lj++)if(lj!==li&&L[lj].every(c=>g[c]))done.push(lj);
    const fit=P.filter(p=>u.every((c,k)=>!g[c]||g[c]===p[k]));
    const same=(p,lj)=>L[lj].every((c,k)=>g[c]===p[k]);
    const ok=fit.filter(p=>!done.some(lj=>same(p,lj)));
    if(!ok.length)return{bad:true};
    for(let k=0;k<N;k++){if(g[u[k]])continue;const v=ok[0][k];if(!ok.every(p=>p[k]===v))continue;
      if(fit.every(p=>p[k]===v))return{i:u[k],v,kind:'enum',line:li};
      const twin=done.find(lj=>fit.some(p=>p[k]!==v&&same(p,lj)));return{i:u[k],v,kind:'uniq',line:li,twin}}}
  return null}
/* vyřeší jen logikou; vrací hotovou mřížku, nebo null */
function bnSolve(pz,N,adv){const g=pz.slice();let s;
  while((s=bnStep(g,N,adv))){if(s.bad)return null;g[s.i]=s.v}
  return g.every(v=>v)?g:null}
function bnFull(N,rng){const P=bnPatterns(N),h=N/2,rows=[];
  const colOk=()=>{const r=rows.length;for(let c=0;c<N;c++){let w=0,b=0;for(let k=0;k<r;k++){if(rows[k][c]===1)w++;else b++}
      if(w>h||b>h)return false;if(r>=3&&rows[r-1][c]===rows[r-2][c]&&rows[r-2][c]===rows[r-3][c])return false}
    if(r===N){const cs=new Set();for(let c=0;c<N;c++){const s=rows.map(x=>x[c]).join('');if(cs.has(s))return false;cs.add(s)}}
    return true};
  let tries=0;
  (function rec(){if(rows.length===N)return true;if(++tries>200)return false;/* raději brzy začít znovu: dlouhé hledání u 10×10 trvalo i stovky ms */
    for(const p of shuffle(P.slice(),rng)){if(rows.includes(p))continue;rows.push(p);if(colOk()&&rec())return true;rows.pop()}
    return false})();
  return rows.length===N?[].concat(...rows):null}
/* o = {N, clues: cílový počet zadaných koleček, adv, seed} */
function genBinairo(o){const rng=mulberry32(o.seed>>>0),N=o.N,n=N*N;let sol=null;while(!sol)sol=bnFull(N,rng);
  const pz=sol.slice();let clues=n;
  for(const i of shuffle([...Array(n).keys()],rng)){if(clues<=o.clues)break;const v=pz[i];pz[i]=0;if(bnSolve(pz,N,o.adv))clues--;else pz[i]=v}
  return{puzzle:pz,sol,clues}}
/*END ENGINE binairo*/
/* ---------- hra: Binairo ---------- */
const BNW=['','white','black'],BNA=['','a white one','a black one'];
const bnLineName=(li,N,pad)=>li<N?'row':'column';
/* políčka, která porušují pravidla: tři stejná vedle sebe, víc než polovina jedné barvy, dva stejné hotové řádky/sloupce */
function bnErrors(g,N){const L=bnLines(N),h=N/2,bad=new Set();
  for(let li=0;li<L.length;li++){const u=L[li];let w=0,b=0;
    for(let k=0;k<N;k++){const v=g[u[k]];if(v===1)w++;else if(v===2)b++;if(k>=2&&v&&v===g[u[k-1]]&&v===g[u[k-2]])bad.add(u[k]).add(u[k-1]).add(u[k-2])}
    if(w>h)u.forEach(c=>{if(g[c]===1)bad.add(c)});if(b>h)u.forEach(c=>{if(g[c]===2)bad.add(c)})}
  for(let a=0;a<L.length;a++){if(!L[a].every(c=>g[c]))continue;const lim=a<N?N:2*N;
    for(let b=a+1;b<lim;b++)if(L[b].every((c,k)=>g[c]===g[L[a][k]])){L[a].forEach(c=>bad.add(c));L[b].forEach(c=>bad.add(c))}}
  return bad}
function bnCellHTML(i,N,cls){const r=Math.floor(i/N),c=i%N;return `<div class="cell bn${c===N-1?' lc':''}${r===N-1?' lr':''}${cls||''}" data-i="${i}" role="button" aria-label="Row ${r+1}, column ${c+1}"><span class="fx"></span><span class="st"></span></div>`}
function bnMini(N,rows,vals,target,hl){let h='';for(let i=0;i<N*rows;i++){const r=Math.floor(i/N),c=i%N,v=vals[i];
  h+=`<div class="cell bn${c===N-1?' lc':''}${r===rows-1?' lr':''}${v?' given s'+v:''}${hl&&hl.includes(i)?' hh':''}${i===target?' sel ht':''}"><span class="st"></span></div>`}
  return `<div class="board mini g-binairo" style="--n:${N};grid-template-rows:repeat(${rows},1fr);aspect-ratio:${N}/${rows}">${h}</div>`}
/* Chyba se vyhodnotí až po chvilce bez klepání na stejné políčko, aby přeskočení bílé cestou k černé nebylo chybou.
   Do té doby se políčko UI.bnHold při kontrole pravidel bere jako prázdné. */
function bnSet(gm,i,v){clearTimeout(UI.bnTimer);if(UI.bnHold>=0&&UI.bnHold!==i)bnJudge(gm,UI.bnHold,gm.vals[UI.bnHold]);
  record([i]);gm.vals[i]=v;UI.sel=i;hideHint();UI.bnHold=v?i:-1;
  const cell=UI.cells[i];
  if(v){sfx.place();buzz(10);if(cell)anim(cell.st,'pop');bnWave(gm,i);UI.bnTimer=setTimeout(()=>bnJudge(gm,i,v),1500)}else sfx.click();
  refresh();checkWin()}
function bnJudge(gm,i,v){if(UI.bnHold!==i)return;UI.bnHold=-1;if(S.game!==gm||gm.done)return;
  if(gm.vals[i]===v&&bnErrors(gm.vals,gm.N).has(i)){gm.mistakes++;sfx.err();buzz([30,40,30]);const c=UI.cells[i];if(S.settings.showErrors&&c&&UI.view==='game')anim(c.st,'shake')}
  if(UI.view==='game')refresh();else save()}
function bnWave(gm,i){const N=gm.N,r=Math.floor(i/N),c=i%N;
  for(const u of [bnLines(N)[r],bnLines(N)[N+c]])if(u.every(x=>gm.vals[x]===gm.sol[x]))u.forEach(x=>{const f=UI.cells[x]&&UI.cells[x].fx;if(!f)return;
    const d=Math.abs(Math.floor(x/N)-r)+Math.abs(x%N-c);f.classList.remove('wave');void f.offsetWidth;f.style.animationDelay=(d*45)+'ms';f.classList.add('wave')})}
GAMES.binairo={name:'Binairo',tile:'<span class="bn-tile"><i></i><i></i></span>',desc:'White and black circles. No numbers, just a few simple rules.',
  notes:false,symbols:true,again:'Another binairo',
  levels:[{name:'Easy',desc:'6×6 grid',xp:15,dots:1,N:6,clues:14,adv:false},
          {name:'Medium',desc:'8×8 grid',xp:30,dots:2,N:8,clues:22,adv:false},
          {name:'Harder',desc:'10×10 grid',xp:50,dots:3,N:10,clues:32,adv:true}],
  create(level,seed){const L=this.levels[level],r=genBinairo({N:L.N,clues:L.clues,adv:L.adv,seed});return{N:L.N,puzzle:r.puzzle,sol:r.sol}},
  sub(gm){return this.levels[gm.level].name+' · '+gm.N+'×'+gm.N},
  build(gm,b){b.innerHTML=gm.vals.map((v,i)=>bnCellHTML(i,gm.N)).join('');
    UI.cells=[...b.querySelectorAll('.cell')].map(el=>({el,base:el.className,st:el.querySelector('.st'),fx:el.querySelector('.fx')}))},
  update(gm){const hs=hintStep(),hh=hs&&hs.house?new Set(hs.house):null,ht=hs&&hs.show?UI.hint.target:-1,bad=S.settings.showErrors?bnErrors(UI.bnHold>=0?gm.vals.map((v,k)=>k===UI.bnHold?0:v):gm.vals,gm.N):null;
    UI.cells.forEach((c,i)=>{const v=gm.vals[i];let cls=c.base;if(v)cls+=' s'+v;if(gm.puzzle[i])cls+=' given';if(hh&&hh.has(i))cls+=' hh';
      if(i===UI.sel&&UI.kbd)cls+=' sel';if(bad&&bad.has(i))cls+=' err';if(i===ht)cls+=' ht';if(c.el.className!==cls)c.el.className=cls})},
  pad(){return `<div class="bn-legend">Tap a square: <span class="cell bn"><span class="st"></span></span> → <span class="cell bn s1"><span class="st"></span></span> → <span class="cell bn s2"><span class="st"></span></span> → empty</div>`},
  tap(gm,i){UI.kbd=false;if(gm.puzzle[i]){buzz(15);toast('This circle was given and can’t be changed.');return}bnSet(gm,i,(gm.vals[i]+1)%3)},
  key(gm,e){const N=gm.N;let i=UI.sel<0?0:UI.sel,r=Math.floor(i/N),c=i%N;
    if(e.key.startsWith('Arrow')){if(e.key==='ArrowUp')r=(r+N-1)%N;if(e.key==='ArrowDown')r=(r+1)%N;if(e.key==='ArrowLeft')c=(c+N-1)%N;if(e.key==='ArrowRight')c=(c+1)%N;UI.sel=r*N+c;UI.kbd=true;updateBoard();e.preventDefault();return}
    const v={'1':1,'b':1,'B':1,'2':2,'c':2,'C':2,'0':0,'Backspace':0,'Delete':0,' ':-1}[e.key];if(v==null||UI.sel<0)return;e.preventDefault();
    if(gm.puzzle[UI.sel])return;UI.kbd=true;bnSet(gm,UI.sel,v<0?(gm.vals[UI.sel]+1)%3:v)},
  input(){},erase(){},
  hint(gm){const N=gm.N,L=bnLines(N);
    const wrong=gm.vals.findIndex((v,i)=>v&&v!==gm.sol[i]);
    if(wrong>=0)return{type:'wrong',target:wrong,steps:[{text:'There’s a circle in the grid that doesn’t belong there. Try to find it.'},{text:'Here it is. Try clearing the square and thinking again.',show:true}]};
    const g=gm.vals.slice();let s=bnStep(g,N,true);
    if(!s||s.bad){const e=[];g.forEach((v,i)=>{if(!v)e.push(i)});const t=pick(e);return{type:'reveal',target:t,steps:[{show:true,text:'This is a really tricky spot. I’m happy to reveal this square for you.'}]}}
    const u=L[s.line],ln=bnLineName(s.line,N,2),W=BNW[s.v],O=BNW[3-s.v],cap=w=>w.charAt(0).toUpperCase()+w.slice(1);
    const why={pair:`Next to a pair of matching circles there must be the opposite colour, otherwise there would be three of the same colour in a row. So a ${W} circle goes here.`,
      gap:`Between two matching circles there must be the opposite colour, otherwise there would be three of the same colour in a row. So a ${W} circle goes here.`,
      count:`This ${ln} already has all ${s.n} ${s.full===1?'white':'black'} circles. There can’t be any more, so this one must be ${W}.`,
      enum:`Imagine putting ${BNA[3-s.v]} here. The rest of the ${bnLineName(s.line,N,1)} couldn’t then be filled in: there would be three of the same colour in a row, or there wouldn’t be equal numbers of white and black. So a ${W} circle goes here.`,
      uniq:`If there were a ${O} circle here, this ${bnLineName(s.line,N,0)} would turn out exactly the same as the other highlighted one. But no two may be the same. So a ${W} circle goes here.`}[s.kind];
    return{type:'logic',target:s.i,steps:[{house:u,text:`In the highlighted ${ln}, one square can be filled in for certain. Try to find it.`},
      {house:s.kind==='uniq'?u.concat(L[s.twin]):u,show:true,text:cap(why)}]}},
  reveal(gm,h){const i=h.target;UI.bnHold=-1;record([i]);gm.vals[i]=gm.sol[i];UI.sel=i;sfx.place();if(UI.cells[i])anim(UI.cells[i].st,'pop');bnWave(gm,i)},
  lessons:[
    {t:'Rules',tile:'1',text:['Binairo is a puzzle with white and black circles. You fill each empty square with one of them. Tapping changes the circle: white, black, empty.',
      'There are three rules: there must never be three circles of the same colour next to each other, across or down. Every row and column has as many white circles as black. And no two rows (or columns) may be exactly the same.',
      'This helps most often: next to a pair of matching circles there must be the opposite colour.'],
     mini:()=>bnMini(6,1,[2,2,0,0,0,0],2),
     ask:'Which circle belongs in the marked square?',choices:[[1,'White'],[2,'Black']],answer:1,tip:'Two black ones are already side by side. A third black one isn’t allowed next to them.',ok:'Otherwise there would be three black ones in a row.'},
    {t:'A gap between two',tile:'2',text:['When there are two matching circles with one empty square between them, the opposite colour goes in the gap. Otherwise there would be three of the same colour in a row.'],
     mini:()=>bnMini(6,1,[0,1,0,1,0,0],2),
     ask:'Which circle belongs in the marked square?',choices:[[1,'White'],[2,'Black']],answer:2,tip:'There’s white on the left and on the right. If there were white in the middle too, there would be three white ones in a row.',ok:'A black circle separates the two white ones.'},
    {t:'Half and half',tile:'3',text:['A row of six squares always has 3 white and 3 black circles. If all 3 white ones are already there, the rest will be black.'],
     mini:()=>bnMini(6,1,[1,0,1,2,0,1],4),
     ask:'Which circle belongs in the marked square?',choices:[[1,'White'],[2,'Black']],answer:2,tip:'Count the white circles in the row. Are all three already there?',ok:'There are already three white ones, so no more will fit.'}]};
ACH.push({id:'bn1',ico:'⚫',name:'Black on white',desc:'Solve your first binairo',goal:1,val:s=>s.stats.games.binairo||0},
  {id:'bn10',ico:'☯️',name:'Master of circles',desc:'Solve 10 binairo',goal:10,val:s=>s.stats.games.binairo||0});
/*ENGINE hashi*/
/* Ostrovy: P.isl[k] = {c (políčko), r, col, n}; hrany = možné mosty mezi nejbližšími ostrovy v řádku/sloupci:
   P.edges[e] = {a, b (ostrovy, a vlevo/nahoře), h (vodorovně), cells (políčka mezi nimi)}; P.cross[e] = hrany, které e kříží.
   Stav = počet mostů na hraně (0–2). lo/hi = nejméně/nejvíc mostů, které na hraně mohou být. */
function hsBuild(N,cells,nums){const at=new Array(N*N).fill(-1),isl=cells.map((c,k)=>{at[c]=k;return{c,r:Math.floor(c/N),col:c%N,n:nums[k]}});
  const edges=[],ie=isl.map(()=>[]),on=Array.from({length:N*N},()=>[]);
  isl.forEach((s,k)=>{for(const h of [1,0]){const between=[];let r=s.r,c=s.col;
    for(;;){if(h)c++;else r++;if(r>=N||c>=N)break;const x=r*N+c;if(at[x]>=0){const e=edges.length;edges.push({a:k,b:at[x],h:!!h,cells:between});ie[k].push(e);ie[at[x]].push(e);between.forEach(y=>on[y].push(e));break}between.push(x)}}});
  const cross=edges.map((E,e)=>{const s=new Set();E.cells.forEach(y=>on[y].forEach(f=>{if(f!==e)s.add(f)}));return[...s]});
  return{N,isl,at,edges,ie,on,cross}}
const hsCap=(P,e)=>Math.min(2,P.isl[P.edges[e].a].n,P.isl[P.edges[e].b].n);
function hsComps(P,lo){const n=P.isl.length,comp=new Array(n).fill(-1);let k=0;
  for(let s=0;s<n;s++){if(comp[s]>=0)continue;const st=[s];comp[s]=k;while(st.length){const i=st.pop();for(const e of P.ie[i]){if(!lo[e])continue;const E=P.edges[e],j=E.a===i?E.b:E.a;if(comp[j]<0){comp[j]=k;st.push(j)}}}k++}
  return{comp,k}}
/* Jeden logický krok. lvl 1 = počty mostů a křížení, 2 = navíc „dva ostrovy se nesmí uzavřít samy“, 3 = obecné propojení.
   Upravuje hi (a why = důvod, proč hi kleslo). Vrací {e,v,kind:'cap'|'conn',isl|group} = na hraně e musí být aspoň v mostů,
   null = nic dalšího nevím, {bad:true} = spor. */
function hsNext(P,lo,hi,lvl,why){const E=P.edges,I=P.isl;why=why||[];
  for(;;){let ch=true;
    while(ch){ch=false;
      for(let e=0;e<E.length;e++){if(!lo[e])continue;for(const f of P.cross[e])if(hi[f]>0){if(lo[f]>0)return{bad:true};hi[f]=0;why[f]={k:'cross',by:e};ch=true}}
      for(let i=0;i<I.length;i++){let sl=0,sh=0;for(const e of P.ie[i]){sl+=lo[e];sh+=hi[e]}const n=I[i].n;if(sh<n||sl>n)return{bad:true};
        for(const e of P.ie[i]){const m=n-(sl-lo[e]);if(hi[e]>m){hi[e]=m;why[e]={k:'full',isl:i};ch=true;if(hi[e]<lo[e])return{bad:true}}}}}
    for(let i=0;i<I.length;i++){let sh=0;for(const e of P.ie[i])sh+=hi[e];
      for(const e of P.ie[i]){const m=I[i].n-(sh-hi[e]);if(m>lo[e])return{e,v:m,kind:'cap',isl:i,others:sh-hi[e]}}}
    if(lvl<2)return null;
    const{comp,k}=hsComps(P,lo);let any=false;
    if(k>1){const R=new Array(k).fill(0),size=new Array(k).fill(0);
      I.forEach((s,i)=>{let sl=0;for(const e of P.ie[i])sl+=lo[e];R[comp[i]]+=s.n-sl;size[comp[i]]++});
      for(let e=0;e<E.length;e++){if(hi[e]<=lo[e])continue;const ca=comp[E[e].a],cb=comp[E[e].b];
        const sz=ca===cb?size[ca]:size[ca]+size[cb];if(lvl<3&&sz>2)continue;
        const r=ca===cb?R[ca]:R[ca]+R[cb];if(r-2*(hi[e]-lo[e])===0){hi[e]--;why[e]={k:'iso',sz};any=true}}}
    if(any)continue;
    if(lvl<3||k<2)return null;
    for(let c=0;c<k;c++){let out=-1,cnt=0;
      for(let i=0;i<I.length;i++){if(comp[i]!==c)continue;for(const e of P.ie[i]){const j=E[e].a===i?E[e].b:E[e].a;if(comp[j]!==c&&hi[e]>0){cnt++;out=e}}}
      if(!cnt)return{bad:true};
      if(cnt===1&&!lo[out]){const g=[];I.forEach((s,i)=>{if(comp[i]===c)g.push(i)});return{e:out,v:1,kind:'conn',group:g}}}
    return null}}
function hsSolve(P,lvl,lo0){const lo=lo0?lo0.slice():P.edges.map(()=>0),hi=P.edges.map((x,e)=>hsCap(P,e));let s,steps=0;
  while((s=hsNext(P,lo,hi,lvl))){if(s.bad)return null;lo[s.e]=s.v;steps++}
  for(let i=0;i<P.isl.length;i++){let sl=0;for(const e of P.ie[i])sl+=lo[e];if(sl!==P.isl[i].n)return null}
  return lo}
/* o = {N, isl: počet ostrovů, lvl, two: podíl dvojitých mostů, extra: podíl přidaných mostů navíc, seed} */
function genHashi(o){const rng=mulberry32(o.seed>>>0),N=o.N,n=N*N,R=k=>Math.floor(rng()*k);
  for(let t=0;t<500;t++){const occ=new Int8Array(n),cells=[],br=[];
    const ok=x=>{if(occ[x])return false;const r=Math.floor(x/N),c=x%N;return!((r>0&&occ[x-N]===1)||(r<N-1&&occ[x+N]===1)||(c>0&&occ[x-1]===1)||(c<N-1&&occ[x+1]===1))};
    const s0=R(n);occ[s0]=1;cells.push(s0);
    for(let a=0;a<600&&cells.length<o.isl;a++){const from=cells[R(cells.length)],d=R(4),dr=[0,0,1,-1][d],dc=[1,-1,0,0][d],len=2+R(N-2);
      let r=Math.floor(from/N),c=from%N,path=[],good=true;
      for(let k=1;k<len;k++){r+=dr;c+=dc;if(r<0||c<0||r>=N||c>=N||occ[r*N+c]){good=false;break}path.push(r*N+c)}
      if(!good)continue;r+=dr;c+=dc;if(r<0||c<0||r>=N||c>=N)continue;const x=r*N+c;if(!ok(x))continue;
      occ[x]=1;path.forEach(y=>occ[y]=2);cells.push(x);br.push([from,x,rng()<o.two?2:1])}
    if(cells.length<o.isl)continue;
    cells.sort((a,b)=>a-b);let P=hsBuild(N,cells,cells.map(()=>0));const val=P.edges.map(()=>0);
    for(const [x,y,v] of br){const a=P.at[x],b=P.at[y],e=P.edges.findIndex(E=>(E.a===a&&E.b===b)||(E.a===b&&E.b===a));val[e]=v}
    for(const e of shuffle(P.edges.map((x,k)=>k),rng)){if(val[e]||rng()>=o.extra)continue;if(P.cross[e].some(f=>val[f]))continue;val[e]=rng()<o.two?2:1}
    const nums=P.isl.map((s,i)=>P.ie[i].reduce((m,e)=>m+val[e],0));
    P=hsBuild(N,cells,nums);const sol=hsSolve(P,o.lvl);if(!sol)continue;
    if(o.minLvl&&hsSolve(P,o.minLvl-1))continue;
    return{cells,nums,sol,tries:t+1}}
  return null}
/*END ENGINE hashi*/
/* ---------- hra: Hashi ---------- */
const hsCache={gm:null,P:null};
function hsP(gm){if(hsCache.gm!==gm){hsCache.gm=gm;hsCache.P=hsBuild(gm.N,gm.cells,gm.nums)}return hsCache.P}
const hsSum=(P,vals,k)=>P.ie[k].reduce((m,e)=>m+vals[e],0);
const hsOther=(P,e,i)=>P.edges[e].a===i?P.edges[e].b:P.edges[e].a;
const hsDir=(P,i,e)=>{const x=P.edges[e];return x.h?(x.a===i?'to the right':'to the left'):(x.a===i?'below':'above')};
const hsMost=k=>k+' '+plural(k,'bridge','bridges','bridges');
/* čáry mostů ve viewBoxu 0 0 sloupce řádky; středy ostrovů */
function hsPath(P,e,v){const E=P.edges[e],A=P.isl[E.a],B=P.isl[E.b],f=x=>+x.toFixed(3);let p='';
  const offs=v===2?[-.11,.11]:[0];
  for(const o of offs){if(E.h)p+=`M${f(A.col+.5)} ${f(A.r+.5+o)}H${f(B.col+.5)}`;else p+=`M${f(A.col+.5+o)} ${f(A.r+.5)}V${f(B.r+.5)}`}
  return p}
function hsMini(cols,rows,isl,br,target,hl){const at={};isl.forEach(([c,n])=>at[c]=n);let h='',p='';
  for(let x=0;x<cols*rows;x++)h+=`<div class="hc">${at[x]!=null?`<span class="hs-isl${x===target?' sel':''}${hl&&hl.includes(x)?' hh':''}">${at[x]}</span>`:''}</div>`;
  for(const [a,b,v] of br){const ra=Math.floor(a/cols),ca=a%cols,rb=Math.floor(b/cols),cb=b%cols;
    for(const o of v===2?[-.11,.11]:[0])p+=ra===rb?`M${ca+.5} ${ra+.5+o}H${cb+.5}`:`M${ca+.5+o} ${ra+.5}V${rb+.5}`}
  return `<div class="board mini g-hashi" style="--n:${cols};--rows:${rows};grid-template-rows:repeat(${rows},1fr);aspect-ratio:${cols}/${rows}"><svg class="hs-br" viewBox="0 0 ${cols} ${rows}" preserveAspectRatio="none" aria-hidden="true"><path class="b" d="${p}"/></svg>${h}</div>`}
/* Mosty: klepnutí 0 → 1 → 2 → 0 (u jedničky jen 0 → 1 → 0). Přeplněný ostrov je chyba až po chvilce bez klepání na stejný most,
   aby cesta přes dva mosty k nule nebyla chybou. Do té doby se ostrovy u tohoto mostu nečervenají. */
function hsCycle(gm,e){const P=hsP(gm),cap=hsCap(P,e),v=(gm.vals[e]+1)%(cap+1);
  if(v&&!gm.vals[e]&&P.cross[e].some(f=>gm.vals[f])){buzz(15);toast('Bridges mustn’t cross. Another bridge is blocking this way.');return}
  hsSet(gm,e,v)}
function hsSet(gm,e,v){clearTimeout(UI.hsTimer);if(UI.hsHold>=0&&UI.hsHold!==e)hsJudge(gm,UI.hsHold);
  if(UI.hsHold!==e)UI.hsFrom=gm.vals[e];
  record([e]);gm.vals[e]=v;hideHint();UI.hsHold=e;
  const P=hsP(gm),E=P.edges[e];
  if(v){sfx.place();buzz(10)}else sfx.click();
  for(const k of [E.a,E.b])if(hsSum(P,gm.vals,k)===P.isl[k].n){const c=UI.cells[P.isl[k].c];if(c)anim(c.el,'pop')}
  UI.hsTimer=setTimeout(()=>hsJudge(gm,e),1500);
  refresh();checkWin()}
function hsJudge(gm,e){if(UI.hsHold!==e)return;UI.hsHold=-1;if(S.game!==gm||gm.done)return;
  const P=hsP(gm),E=P.edges[e],over=[E.a,E.b].filter(k=>hsSum(P,gm.vals,k)>P.isl[k].n);
  if(over.length&&gm.vals[e]>UI.hsFrom){gm.mistakes++;sfx.err();buzz([30,40,30]);
    if(S.settings.showErrors&&UI.view==='game')over.forEach(k=>{const c=UI.cells[P.isl[k].c];if(c)anim(c.el,'shake')})}
  if(UI.view==='game')refresh();else save()}
GAMES.hashi={name:'Hashi',tile:'<svg viewBox="0 0 30 30"><circle cx="7" cy="15" r="5"/><circle cx="23" cy="15" r="5"/><path d="M12 12.5h6M12 17.5h6"/></svg>',
  desc:'Connect the numbered islands with bridges. The number says how many bridges lead from the island.',
  notes:false,again:'Another hashi',numNote:'Hashi is played with numbers because the number says how many bridges lead from the island.',
  levels:[{name:'Easy',desc:'7×7, nine islands',xp:15,dots:1,N:7,isl:9,lvl:1,two:.35,extra:.3},
          {name:'Medium',desc:'8×8, fourteen islands',xp:30,dots:2,N:8,isl:14,lvl:2,two:.35,extra:.3},
          {name:'Harder',desc:'9×9, twenty islands',xp:50,dots:3,N:9,isl:20,lvl:3,two:.35,extra:.3,minLvl:2}],
  create(level,seed){const L=this.levels[level];let r=null;for(let k=0;!r;k++)r=genHashi(Object.assign({},L,{seed:seed+k*7919}));
    return{N:L.N,cells:r.cells,nums:r.nums,puzzle:r.sol.map(()=>0),sol:r.sol}},
  sub(gm){return this.levels[gm.level].name+' · '+gm.N+'×'+gm.N},
  won(gm){const P=hsP(gm),v=gm.vals;if(P.isl.some((s,k)=>hsSum(P,v,k)!==s.n))return false;
    if(P.edges.some((x,e)=>v[e]&&P.cross[e].some(f=>v[f])))return false;return hsComps(P,v).k===1},
  progress(gm){let a=0,b=0;gm.sol.forEach((s,e)=>{a+=Math.min(s,gm.vals[e]);b+=s});return b?a/b:0},
  build(gm,b){const P=hsP(gm),N=gm.N;let h='';
    for(let x=0;x<N*N;x++){const k=P.at[x];h+=`<div class="hc" data-i="${x}"${k>=0?` role="button" aria-label="Island ${P.isl[k].n}, row ${Math.floor(x/N)+1}, column ${x%N+1}"`:''}>${k>=0?`<span class="hs-isl">${P.isl[k].n}</span>`:''}</div>`}
    b.innerHTML=`<svg class="hs-br" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none" aria-hidden="true"></svg>`+h;
    UI.cells=[...b.querySelectorAll('.hc')].map(el=>({el,isl:el.querySelector('.hs-isl')}));UI.hsSvg=b.querySelector('.hs-br');UI.hsel=-1;UI.hsHold=-1},
  update(gm){const P=hsP(gm),v=gm.vals,hs=hintStep(),hh=hs&&hs.house?new Set(hs.house):null,ht=hs&&hs.show?UI.hint.target:-1;
    const held=UI.hsHold>=0?P.edges[UI.hsHold]:null,sel=UI.hsel;
    const nb=new Set();if(sel>=0)for(const e of P.ie[sel])if(!P.cross[e].some(f=>v[f]))nb.add(hsOther(P,e,sel));
    P.isl.forEach((s,k)=>{const c=UI.cells[s.c];if(!c)return;const sum=hsSum(P,v,k);let cls='hs-isl';
      if(sum===s.n)cls+=' done';else if(sum>s.n&&S.settings.showErrors&&!(held&&(held.a===k||held.b===k)))cls+=' err';
      if(k===sel)cls+=' sel';else if(nb.has(k))cls+=' nb';if(hh&&hh.has(k))cls+=' hh';if(c.isl.className!==cls)c.isl.className=cls});
    let p='';P.edges.forEach((x,e)=>{if(v[e])p+=hsPath(P,e,v[e])});
    UI.hsSvg.innerHTML=`<path class="b" d="${p}"/>${ht>=0?`<path class="ht" d="${hsPath(P,ht,1)}"/>`:''}`},
  pad(){return `<div class="bn-legend hs-legend">Tap an island and then its neighbour. Another tap adds a second bridge, and a third removes the bridges. You can also tap straight on the gap between islands.</div>`},
  tap(gm,x){UI.kbd=false;const P=hsP(gm),k=P.at[x];
    if(k>=0){const s=UI.hsel;if(s<0||s===k){UI.hsel=s===k?-1:k;sfx.click();updateBoard();return}
      const e=P.ie[s].find(f=>hsOther(P,f,s)===k);if(e==null){UI.hsel=k;sfx.click();updateBoard();return}
      hsCycle(gm,e);return}
    const es=P.on[x];if(!es.length){if(UI.hsel>=0){UI.hsel=-1;updateBoard()}return}
    const e=es.length===1?es[0]:es.find(f=>gm.vals[f]>0);
    if(e==null){toast('Two paths cross here. Tap an island and then its neighbour.');return}
    hsCycle(gm,e)},
  key(gm,ev){const P=hsP(gm),D={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowDown:[1,0],ArrowUp:[-1,0]}[ev.key];
    if(ev.key==='Escape'){UI.hsel=-1;updateBoard();return}
    if(!D)return;ev.preventDefault();UI.kbd=true;if(UI.hsel<0){UI.hsel=0;updateBoard();return}
    const s=UI.hsel,e=P.ie[s].find(f=>{const E=P.edges[f];return E.h===(D[0]===0)&&(E.a===s)===(D[0]+D[1]>0)});if(e==null)return;
    if(ev.shiftKey)hsCycle(gm,e);else{UI.hsel=hsOther(P,e,s);updateBoard()}},
  input(){},erase(){},
  fix(gm,e){UI.hsHold=-1;clearTimeout(UI.hsTimer);gm.vals[e]=gm.sol[e]},
  hint(gm){const P=hsP(gm),E=P.edges,I=P.isl;
    const wrong=gm.vals.findIndex((v,e)=>v>gm.sol[e]);
    if(wrong>=0)return{type:'wrong',target:wrong,steps:[{text:'Somewhere there’s a bridge that doesn’t belong. Try to find it.'},
      {text:`Here it is. ${gm.sol[wrong]?'There should be only one bridge in the marked place.':'There shouldn’t be any bridge in the marked place.'} Try to put it right.`,show:true}]};
    const lo=gm.vals.slice(),hi=E.map((x,e)=>hsCap(P,e)),why=hi.map(h=>h<2?{k:'small'}:null);
    const s=hsNext(P,lo,hi,3,why);
    if(!s||s.bad){const t=E.findIndex((x,e)=>gm.vals[e]<gm.sol[e]);return{type:'reveal',target:t,v:gm.sol[t],steps:[{show:true,text:'This is a really tricky spot. I’m happy to reveal this bridge for you.'}]}}
    if(s.kind==='conn')return{type:'logic',target:s.e,v:1,steps:[{house:s.group,text:'The highlighted islands still have to connect with the others. Try to find the way.'},
      {house:s.group,show:true,text:'The highlighted group can’t connect to the other islands any other way, as all the other paths are closed. So a bridge must go here.'}]};
    const i=s.isl,n=I[i].n,d=hsDir(P,i,s.e),G={};
    for(const f of P.ie[i]){if(f===s.e||!why[f]||hi[f]>=2)continue;const w=why[f],df=hsDir(P,i,f),j=hsOther(P,f,i),rem=hi[f]-gm.vals[f];
      const key=w.k==='cross'&&hi[f]===0?'cross':w.k==='full'&&w.isl===j?'full'+rem:w.k==='small'&&I[j].n===1?'small':w.k==='iso'?'iso'+w.sz+hi[f]:null;
      if(key)(G[key]=G[key]||[]).push(df)}
    const and=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a[a.length-1]:a[0];
    const extra=Object.keys(G).slice(0,2).map(key=>{const ds=G[key],D=and(ds),m=ds.length>1;
      if(key==='cross')return m?`The paths to the neighbours ${D} are blocked by other bridges.`:`The path to the neighbour ${D} is blocked by another bridge.`;
      if(key==='full0')return m?`The neighbours ${D} already have all their bridges.`:`The neighbour ${D} already has all its bridges.`;
      if(/^full/.test(key))return m?`The neighbours ${D} need only one more bridge.`:`The neighbour ${D} needs only one more bridge.`;
      if(key==='small')return m?`The neighbours ${D} have the number 1, so at most one bridge leads to each.`:`The neighbour ${D} has the number 1, so at most one bridge leads to it.`;
      const one=key.slice(-1)==='1';
      if(key.slice(3,-1)==='2')return m?`${one?'It may have at most one bridge to':'It mustn’t connect to'} the neighbours ${D}, otherwise they would be cut off from the others.`:`${one?'It may have at most one bridge to':'It mustn’t connect to'} the neighbour ${D}, otherwise those two islands would be cut off from the others.`;
      return `${one?'Another bridge':'A bridge'} ${m?'to the neighbours':'to the neighbour'} ${D} would close off a group of islands, leaving it cut off from the others.`});
    const t=`The island with the number ${n} needs ${hsMost(n)}. `+(extra.length?extra.join(' ')+' ':'')+(s.others===0?`It can only connect with the neighbour ${d}, so ${s.v===2?'two bridges':'a bridge'} must lead to it.`:
      `At most ${s.others===1?'one bridge':hsMost(s.others)} can lead to the other neighbours, so ${s.v===2?'two bridges':'at least one bridge'} must lead to the neighbour ${d}.`);
    return{type:'logic',target:s.e,v:s.v,steps:[{house:[i],text:'A bridge can definitely be built from the highlighted island. Try to work out where.'},{house:[i],show:true,text:t}]}},
  reveal(gm,h){const e=h.target,P=hsP(gm);UI.hsHold=-1;clearTimeout(UI.hsTimer);record([e]);gm.vals[e]=Math.max(gm.vals[e],h.v);sfx.place();
    for(const k of [P.edges[e].a,P.edges[e].b])if(hsSum(P,gm.vals,k)===P.isl[k].n){const c=UI.cells[P.isl[k].c];if(c)anim(c.el,'pop')}},
  lessons:[
    {t:'Rules',tile:'1',text:['Hashi is Japanese for bridge. There are numbered islands in the sea and you connect them with bridges. The number says how many bridges lead from the island.',
      'Bridges only run straight, across or up and down. There can be at most two bridges between two islands. Bridges mustn’t cross, and in the end all the islands must be connected together.',
      'To build a bridge, tap an island and then its neighbour. A second tap adds a second bridge, and a third makes the bridges disappear again. An island with all its bridges turns green.'],
     mini:()=>hsMini(6,3,[[0,3],[5,1],[12,2]],[[0,5,1]],0),
     ask:'The island with the number 3 has one bridge so far. How many more bridges does it need?',choices:[[1,'1'],[2,'2'],[3,'3']],answer:2,tip:'The 3 needs three bridges. One already leads to the right.',ok:'Two bridges will lead down to the 2.'},
    {t:'A big number in the corner',tile:'2',text:['When an island has only one neighbour, all its bridges must lead to it.',
      'It’s similar for a 4 in the corner: it has only two neighbours and at most two bridges lead to each. To have four, it needs two bridges to each. The same goes for a 6 on the edge and an 8 in the middle.'],
     mini:()=>hsMini(6,4,[[0,4],[5,3],[18,2],[23,1]],[],0),
     ask:'How many bridges will lead from the 4 in the corner to the 2 below it?',choices:[[1,'1'],[2,'2']],answer:2,tip:'The 4 has only two neighbours and at most two bridges lead to each. Two and two make four.',ok:'Two bridges lead to each neighbour.'},
    {t:'All together',tile:'3',text:['At the end, all the islands must be joined into one group, so the turtle can cross the whole sea by bridge.',
      'That’s why two 1s mustn’t connect to each other: each would use up its only bridge and both would be cut off from the rest. For the same reason, two 2s mustn’t have two bridges between them.'],
     mini:()=>hsMini(6,3,[[0,1],[5,1],[12,3],[17,3]],[],-1,[0,5]),
     ask:'May a bridge run between the two 1s at the top?',choices:[['ano','Yes'],['ne','No']],answer:'ne',tip:'If the 1s joined each other, they’d have no more bridges and would be left on their own.',ok:'The 1s would be cut off from the others.'}]};
ACH.push({id:'hs1',ico:'🌉',name:'First bridge',desc:'Solve your first hashi',goal:1,val:s=>s.stats.games.hashi||0},
  {id:'hs10',ico:'⚓',name:'Master of bridges',desc:'Solve 10 hashi',goal:10,val:s=>s.stats.games.hashi||0});
/*ENGINE kenken*/
/* Skupinky: cages[k] = {cells (vzestupně), op: '+' '-' '*' '/' nebo '=' (jedno políčko = zadané číslo), t (výsledek), label};
   cage[i] = index skupinky políčka. V řádku i sloupci je každé číslo 1…N právě jednou. */
const KKOP={'+':'+','-':'−','*':'×','/':'÷','=':''};
/* Projde všechna dosazení do skupinky z masek m (políčka ve stejném řádku/sloupci se liší) a vrátí masky po políčkách skupinky, nebo null. */
function kkEnum(cg,N,m){const c=cg.cells,k=c.length,out=new Array(k).fill(0),cur=new Array(k),t=cg.t,op=cg.op,add=op==='+'||op==='=';
  const r=c.map(x=>Math.floor(x/N)),co=c.map(x=>x%N);
  (function rec(j,acc){
    if(j===k){const ok=add||op==='*'?acc===t:op==='-'?Math.abs(cur[0]-cur[1])===t:Math.max(cur[0],cur[1])===t*Math.min(cur[0],cur[1]);
      if(ok)for(let q=0;q<k;q++)out[q]|=1<<cur[q];return}
    const mk=m[c[j]];
    for(let v=1;v<=N;v++){if(!(mk&(1<<v)))continue;let bad=false;
      for(let p=0;p<j;p++)if(cur[p]===v&&(r[p]===r[j]||co[p]===co[j])){bad=true;break}
      if(bad)continue;let a=acc;
      if(add){a=acc+v;if(a+(k-j-1)>t)break}else if(op==='*'){a=acc*v;if(t%a)continue}
      cur[j]=v;rec(j+1,a)}})(0,op==='*'?1:0);
  return out[0]?out:null}
/* Zúží možnosti logikou (řádek, sloupec, výpočty ve skupinkách); hidden = i „jediné místo v řádku/sloupci“. Vrací masky, nebo null při sporu. */
function kkProp(g,N,cages,hidden){const geo=getGeo(N,0,0,false),n=N*N,m=new Array(n);
  for(let i=0;i<n;i++)m[i]=g[i]?1<<g[i]:geo.full;
  let ch=true;
  while(ch){ch=false;
    for(let i=0;i<n;i++){if(pc(m[i])!==1)continue;const b=m[i];for(const p of geo.peers[i])if(m[p]&b){m[p]&=~b;ch=true;if(!m[p])return null}}
    for(const cg of cages){const u=kkEnum(cg,N,m);if(!u)return null;cg.cells.forEach((x,q)=>{if(m[x]!==u[q]){m[x]=u[q];ch=true}})}
    if(hidden)for(const u of geo.units)for(let d=1;d<=N;d++){const bit=1<<d;let cnt=0,at=-1;for(const c of u)if(m[c]&bit){cnt++;at=c}
      if(!cnt)return null;if(cnt===1&&m[at]!==bit){m[at]=bit;ch=true}}}
  return m}
/* Jeden logický krok, od nejsnazšího. P = {N, cages, cage}. lvl 1 = poslední políčko skupinky, řádek a sloupec,
   výpočet skupinky spolu s řádkem a sloupcem políčka, jediné místo v řádku/sloupci; lvl 2 = navíc výpočet skupinky
   s ohledem na řádky a sloupce ostatních jejích políček; lvl 3 = dotažení všeho dohromady (jako s poznámkami).
   Vrací {i,v,kind,cage|unit,opts} nebo null; {bad:true} při sporu. */
function kkStep(g,P,lvl){const N=P.N,geo=getGeo(N,0,0,false),n=N*N,cg=P.cages,RC=g.map((v,i)=>v?0:candMask(g,geo,i));
  const fill=f=>g.map((v,i)=>v?1<<v:f(i));
  const union=m=>{const A=new Array(n).fill(0);for(const c of cg){const u=kkEnum(c,N,m);if(!u)return null;c.cells.forEach((x,q)=>A[x]=u[q])}return A};
  const naked=(A,kind)=>{for(let i=0;i<n;i++)if(!g[i]&&pc(A[i])===1)return{i,v:bd(A[i]),kind,cage:P.cage[i]};return null};
  const hid=(A,kind)=>{for(let k=0;k<geo.units.length;k++){const u=geo.units[k];for(let d=1;d<=N;d++){if(u.some(c=>g[c]===d))continue;
    const at=u.filter(c=>!g[c]&&(A[c]&(1<<d)));if(at.length===1)return{i:at[0],v:d,kind,unit:k,cage:P.cage[at[0]]}}}return null};
  const A0=union(fill(()=>geo.full));if(!A0)return{bad:true};
  for(let k=0;k<cg.length;k++){const c=cg[k];if(c.cells.length<2)continue;const e=c.cells.filter(x=>!g[x]);if(e.length!==1)continue;
    const i=e[0],x=A0[i]&RC[i];if(pc(x)===1)return{i,v:bd(x),kind:'last',cage:k,opts:A0[i]}}
  for(let i=0;i<n;i++)if(!g[i]&&pc(RC[i])===1)return{i,v:bd(RC[i]),kind:'rc',cage:P.cage[i]};
  const A1=A0.map((a,i)=>g[i]?a:a&RC[i]);
  for(let i=0;i<n;i++)if(!g[i]&&pc(A1[i])===1)return{i,v:bd(A1[i]),kind:'cagerc',cage:P.cage[i],opts:A0[i]};
  let s=hid(A1,'hidden');if(s||lvl<2)return s;
  const A2=union(fill(i=>RC[i]));if(!A2)return{bad:true};
  s=naked(A2,'cage2')||hid(A2,'hidden2');if(s||lvl<3)return s;
  const M=kkProp(g,N,cg,false);if(!M)return{bad:true};
  return naked(M,'deep')||hid(M,'deephidden')}
/* vyřeší jen logikou do úrovně lvl; vrací hotovou mřížku, nebo null */
function kkSolve(pz,P,lvl){const g=pz.slice();let s;while((s=kkStep(g,P,lvl))){if(s.bad)return null;g[s.i]=s.v}return g.every(v=>v)?g:null}
/* rozdělí mřížku na skupinky; o.sz = váhy velikostí (index = velikost), o.ops = povolené počty, o.w = jejich váhy */
function kkCages(sol,N,o,rng){const n=N*N,cage=new Array(n).fill(-1),cages=[];
  const nb=i=>{const r=Math.floor(i/N),c=i%N,a=[];if(r>0)a.push(i-N);if(r<N-1)a.push(i+N);if(c>0)a.push(i-1);if(c<N-1)a.push(i+1);return a};
  const pickW=w=>{let s=0;for(const x of w)s+=x;let r=rng()*s;for(let k=0;k<w.length;k++){r-=w[k];if(r<0)return k}return w.length-1};
  for(const s of shuffle([...Array(n).keys()],rng)){if(cage[s]>=0)continue;const id=cages.length,cells=[s];cage[s]=id;const size=pickW(o.sz);
    while(cells.length<size){const opts=[];for(const c of cells)for(const x of nb(c))if(cage[x]<0)opts.push(x);if(!opts.length)break;
      const x=opts[Math.floor(rng()*opts.length)];cage[x]=id;cells.push(x)}
    cells.sort((a,b)=>a-b);const v=cells.map(c=>sol[c]),k=cells.length,lo=Math.min(...v),hi=Math.max(...v);let op='=';
    if(k>1){const can=o.ops.filter(p=>k===2||p==='+'||p==='*');op=can[pickW(can.map(p=>p==='/'&&hi%lo?0:o.w[p]))]}
    const t=op==='='||op==='+'?v.reduce((a,b)=>a+b,0):op==='*'?v.reduce((a,b)=>a*b,1):op==='-'?hi-lo:hi/lo;
    cages.push({cells,op,t,label:op==='='?'':t+KKOP[op]})}
  return{cage,cages}}
/* o = {N, ops, w, sz, lvl, minLvl, seed}; zadání jde vyřešit logikou úrovně lvl (tím má i jediné řešení) */
function genKenken(o){const rng=mulberry32(o.seed>>>0),N=o.N,n=N*N,geo=getGeo(N,0,0,false);let sol=null;
  for(let t=0;t<600;t++){if(t%30===0)sol=search(new Array(n).fill(0),geo,1,rng).sol;
    const{cage,cages}=kkCages(sol,N,o,rng),P={N,cages,cage},pz=sol.map((v,i)=>cages[cage[i]].op==='='?v:0);
    if(!kkSolve(pz,P,o.lvl))continue;if(o.minLvl&&kkSolve(pz,P,o.minLvl-1))continue;
    return{puzzle:pz,sol,cages,cage,tries:t+1}}
  return null}
/* úrovně hry (čte je i test v Node) */
const KKLEVELS=[
  {name:'Easy',desc:'4×4, adding only',xp:15,dots:1,N:4,ops:['+'],w:{'+':1},sz:[0,.15,.5,.35],lvl:1},
  {name:'Medium',desc:'5×5, adding and subtracting',xp:30,dots:2,N:5,ops:['+','-'],w:{'+':1,'-':1.3},sz:[0,.1,.55,.35],lvl:2},
  {name:'Harder',desc:'6×6, all four operations',xp:50,dots:3,N:6,ops:['+','-','*','/'],w:{'+':1,'-':1,'*':1,'/':1.5},sz:[0,.05,.5,.33,.12],lvl:3,minLvl:2}];
/*END ENGINE kenken*/
/* ---------- hra: KenKen ---------- */
const kkCache={gm:null,k:'',m:null};
const kkP=gm=>({N:gm.N,cages:gm.cages,cage:gm.cage});
const kkAnd=a=>a.length>1?a.slice(0,-1).join(', ')+' and '+a[a.length-1]:String(a[0]);
const kkBits=m=>{const a=[];for(let d=1;d<=9;d++)if(m&(1<<d))a.push(d);return a};
/* dvojice čísel, které se vejdou do skupinky ze dvou políček, např. „1 + 4 nebo 2 + 3“ */
function kkPairs(cg,N){const out=[],S=KKOP[cg.op];
  for(let x=1;x<=N;x++)for(let y=x+1;y<=N;y++){const ok=cg.op==='+'?x+y===cg.t:cg.op==='*'?x*y===cg.t:cg.op==='-'?y-x===cg.t:y===x*cg.t;
    if(ok)out.push(cg.op==='+'||cg.op==='*'?`${x} ${S} ${y}`:`${y} ${S} ${x}`)}
  return out.length?out.slice(0,-1).join(', ')+(out.length>1?' or ':'')+out[out.length-1]:''}
/* malá mřížka do lekcí: list = [{cells,label}] pokrývá všechna políčka */
function kkMini(cols,rows,vals,list,target,hl){const cage=new Array(cols*rows).fill(-1);list.forEach((c,k)=>c.cells.forEach(x=>cage[x]=k));let h='';
  for(let i=0;i<cols*rows;i++){const r=Math.floor(i/cols),c=i%cols,cg=list[cage[i]];let cls='cell';
    if(c===cols-1)cls+=' lc';if(r===rows-1)cls+=' lr';if(vals[i])cls+=' given';if(hl&&hl.includes(i))cls+=' hh';if(i===target)cls+=' sel ht';
    h+=`<div class="${cls}"><span class="v">${vals[i]||''}</span>${cg.cells[0]===i&&cg.label?`<span class="sum">${cg.label}</span>`:''}</div>`}
  return `<div class="board mini g-kenken n${cols}" style="--n:${cols};grid-template-rows:repeat(${rows},1fr);aspect-ratio:${cols}/${rows}">${h}${cageSVG({N:cols,rows,cage,flat:true})}</div>`}
/* vysvětlení jednoho kroku z kkStep */
function kkHint(gm){const N=gm.N,geo=getGeo(N,0,0,false);
  const wrong=gm.vals.findIndex((v,i)=>v&&v!==gm.sol[i]);
  if(wrong>=0)return{type:'wrong',target:wrong,steps:[{text:'A little mistake has crept into the grid. Try to find it and put it right.'},{text:'Here it is. Try clearing the square and thinking again.',show:true}]};
  const g=gm.vals.slice(),s=kkStep(g,kkP(gm),3);
  if(!s||s.bad){const e=[];g.forEach((v,i)=>{if(!v)e.push(i)});const t=UI.sel>=0&&!g[UI.sel]?UI.sel:pick(e);
    return{type:'reveal',target:t,steps:[{show:true,text:'This is a really tricky spot. I’m happy to reveal this square for you.'}]}}
  const i=s.i,d=s.v,cg=gm.cages[gm.cage[i]],lab=cg.label,cells=cg.cells,peers=geo.peers[i];
  const inCage=`In the highlighted ${lab} cage, one square can be filled in for certain. Try to find it.`;
  const pairs=cells.length===2&&cells.every(x=>!g[x])?kkPairs(cg,N):'',pre=pairs?`In the two-square ${lab} cage, the only ${pairs.includes(' or ')?'pairs that work are':'pair that works is'} ${pairs}. `:'';
  if(s.kind==='last'){const kn=cells.filter(x=>x!==i).map(x=>g[x]);let t;
    if(cg.op==='+')t=`The ${lab} cage already contains ${kn.length>1?'the numbers '+kkAnd(kn):'the number '+kn[0]}. The last square takes ${cg.t} − ${kn.join(' − ')} = ${d}.`;
    else if(cg.op==='*'){const p=kn.reduce((a,b)=>a*b,1);t=`The ${lab} cage already contains ${kn.length>1?`the numbers ${kkAnd(kn)}, which makes ${kn.join(' × ')} = ${p}`:'the number '+p}. To make ${cg.t}, the last square takes ${cg.t} ÷ ${p} = ${d}.`}
    else{const a=kn[0],dv=cg.op==='/',lo=dv?a/cg.t:a-cg.t,hi=dv?a*cg.t:a+cg.t,okLo=Number.isInteger(lo)&&lo>=1,okHi=hi<=N;
      t=`The ${lab} cage already contains the number ${a}. `+(dv?`One number must be ${cg.t===2?'twice':cg.t+' times'} the other`:`The two numbers must differ by ${cg.t}`);
      if(okLo&&okHi)t+=`, so the other could be ${lo} or ${hi}. The number ${d===lo?hi:lo} is already in the row or column of the marked square, so ${d} goes here.`;
      else if(okLo)t+=`. So the other number will be ${a} ${dv?'÷':'−'} ${cg.t} = ${d}, because there’s no ${hi} in a ${N}×${N} grid.`;
      else t+=`. So the other number will be ${a} ${dv?'×':'+'} ${cg.t} = ${d}, because ${dv?`${a} ÷ ${cg.t} isn’t a whole number`:'a number can’t be less than 1'}.`}
    return{type:'logic',target:i,steps:[{house:cells,text:`Only one number is missing from the highlighted ${lab} cage. Try to work it out.`},{house:cells,show:true,text:t}]}}
  if(s.kind==='rc'){const r=Math.floor(i/N);return{type:'logic',target:i,steps:[
    {house:geo.units[r],text:'In the highlighted row there’s a square with only one number left. Look at the columns too.'},
    {house:peers,show:true,text:`It’s the marked square. Its row and column already contain all the other numbers; only ${d} is missing.`}]}}
  if(s.kind==='cagerc'){const o=kkBits(s.opts),ex=o.filter(x=>x!==d);
    const exT=ex.length?` ${ex.length>1?'The numbers '+kkAnd(ex)+' are':'The number '+ex[0]+' is'} already in its row or column, so ${d} goes here.`:'';
    const t=pre?pre+(ex.length?`So only ${o.slice(0,-1).join(', ')} or ${o[o.length-1]} can go in the marked square.`+exT:`So ${d} goes in the marked square.`):
      ex.length?`The calculation in the ${lab} cage only allows ${kkAnd(o)} in the marked square.`+exT:`The calculation in the ${lab} cage allows only one number in the marked square: ${d}.`;
    return{type:'logic',target:i,steps:[{house:cells,text:inCage},{house:cells,show:true,text:t}]}}
  if(s.kind==='cage2'||s.kind==='deep')return{type:'logic',target:i,steps:[{house:cells,text:inCage},{house:cells,show:true,text:s.kind==='cage2'?
    `${pre}Try writing out which numbers fit in the whole cage, and take the rows and columns of its other squares into account. That leaves only ${d} for the marked square.`:
    `Only one number is left for the marked square: ${d}. You’ll find it if you write notes in the nearby squares about what could go there, going by the rows, columns and cage calculations.`}]};
  const u=geo.units[s.unit],isRow=s.unit<N,W=isRow?'row':'column',O=isRow?'column':'row';
  return{type:'hidden',target:i,steps:[{house:u,text:`In the highlighted ${W}, one square can be filled in for certain. Try to find it.`},
    {house:u,text:`A little extra hint: focus on the number ${d}. Where can it go in the highlighted ${W}?`},
    {house:u,show:true,text:`The number ${d} belongs in the marked square. It can’t go in the other empty squares in this ${W}: either ${d} is already in their ${O}, or the calculation in their cage wouldn’t work.`+
      (s.kind==='hidden2'?' Take the rows and columns of the cage’s other squares into account too.':s.kind==='deephidden'?' Notes will help here.':'')}]}}
GAMES.kenken={name:'KenKen',tile:'7+',desc:'A grid of cages where you do sums. On the easy level, adding only.',
  levels:KKLEVELS,again:'Another kenken',numNote:'KenKen is played with numbers because it involves arithmetic.',
  create(level,seed){const L=this.levels[level];let r=null;for(let k=0;!r;k++)r=genKenken(Object.assign({},L,{seed:seed+k*7919}));
    return{N:L.N,puzzle:r.puzzle,sol:r.sol,cages:r.cages,cage:r.cage}},
  sub(gm){return this.levels[gm.level].name+' · '+gm.N+'×'+gm.N},
  cand(gm,g,i,m){const k=g.join('');if(kkCache.gm!==gm||kkCache.k!==k){kkCache.gm=gm;kkCache.k=k;kkCache.m=kkProp(g,gm.N,gm.cages,false)}return kkCache.m?kkCache.m[i]&m:m},
  hint:kkHint,
  lessons:[
    {t:'Rules',tile:'1',text:['KenKen is a Japanese puzzle similar to sudoku. Each row and column contains every number from 1 to 4 exactly once (up to 5 or 6 in a bigger grid). There are no boxes.',
      'The grid is divided into cages with a coloured border. In the corner of each cage there’s a result and a sign: 7+ means the numbers in the cage add up to 7.',
      'A number may repeat within a cage, just not in the same row or column. A square that forms a cage on its own has its number given.'],
     mini:()=>kkMini(4,1,[3,0,0,0],[{cells:[0,1],label:'7+'},{cells:[2,3],label:'3+'}],1,[0,1]),
     ask:'The 7+ cage already has a 3. Which number belongs in the marked square?',choices:[[1,'1'],[2,'2'],[3,'3'],[4,'4']],answer:4,tip:'The numbers in the cage add up to 7. How much do you need to get from 3 to 7?',ok:'3 + 4 = 7.'},
    {t:'Pairs in a cage',tile:'2',text:['Only a few pairs fit in a two-square cage. In 3+ only 1 and 2, and in 7+ on a 4×4 grid only 3 and 4.',
      'The row or column tells you which of the two numbers goes where.'],
     mini:()=>kkMini(4,2,[0,0,0,0,1,0,0,0],[{cells:[0,1],label:'3+'},{cells:[2,3],label:'7+'},{cells:[4],label:''},{cells:[5,6,7],label:'9+'}],0,[0,1]),
     ask:'Which number belongs in the marked square?',choices:[[1,'1'],[2,'2'],[3,'3'],[4,'4']],answer:2,tip:'Only 1 and 2 fit in the 3+ cage. There’s already a 1 below the marked square.',ok:'The 1 is already below it, so the 2 goes at the top.'},
    {t:'Subtracting, multiplying and dividing',tile:'3',text:['On the medium level, subtracting is added. 3− means the two numbers in the cage differ by 3: take the smaller from the larger.',
      'On the harder level, multiplying and dividing are added. 6× means the numbers in the cage multiply to 6, such as 2 × 3. 2÷ means one number is twice the other, such as 4 and 2.'],
     mini:()=>kkMini(4,1,[0,0,0,0],[{cells:[0,1],label:'3−'},{cells:[2,3],label:'6×'}],-1,[0,1]),
     ask:'Which two numbers belong in the 3− cage?',choices:[['14','1 and 4'],['23','2 and 3'],['24','2 and 4']],answer:'14',tip:'Look for two numbers from 1 to 4 that differ by three.',ok:'4 − 1 = 3. That leaves 2 and 3 for the 6× cage.'}]};
ACH.push({id:'kk1',ico:'🧮',name:'First sums',desc:'Solve your first kenken',goal:1,val:s=>s.stats.games.kenken||0},
  {id:'kk10',ico:'🔢',name:'Master of sums',desc:'Solve 10 kenken',goal:10,val:s=>s.stats.games.kenken||0});
/*END GAMES*/
if(Object.keys(GAMES).length){const H={first:'Solve your first game',s10:'Solve 10 games',s50:'Solve 50 games',s100:'Solve 100 games',s500:'Solve 500 games',s1000:'Solve 1,000 games',early:'Finish a game before 8 in the morning',owl:'Finish a game after 10 at night',
    perfect:'A game without a single mistake',perfect25:'25 games without a mistake',nohint:'A game without hints'};
  ACH.forEach(a=>{if(H[a.id])a.desc=H[a.id]});
  const ti=TIPS.indexOf('Every sudoku you solve moves me on towards the next island.');if(ti>=0)TIPS[ti]='Every game you solve moves me on towards the next island.'}

/* úklid po načtení a po obnově ze zálohy: neplatné pohlednice, statistiky neznámých her a rozehraná hra neznámého druhu nesmí rozbít obrazovky */
function tidy(){S.postcards=(Array.isArray(S.postcards)?S.postcards:[]).filter(k=>Number.isInteger(k)&&!!ISLANDS[k]);
  const st=S.stats;st.solved=Math.max(0,Math.floor(+st.solved)||0);const bk=st.byKey||(st.byKey={});
  for(const k in bk){const [m,l]=k.split('-'),b=bk[k];if(!(MODES[m]||GAMES[m])||!gameLevels(m)[+l]||!b||!(b.n>0))delete bk[k]}
  if(!Array.isArray(st.times))st.times=[];st.times=st.times.filter(x=>x&&isFinite(x.t));
  if(!st.days||typeof st.days!=='object')st.days={};if(!S.daily.done||typeof S.daily.done!=='object')S.daily.done={};
  S.daily.best=Math.max(Math.floor(+S.daily.best)||0,longestStreak());
  /* Zen byl zrušen (krok 8): rozehraná hra Zen pokračuje jako Klasické sudoku téže obtížnosti (čas a chyby od nuly, v Zenu nebyly vidět); časy Zenu ze statistik a odznak Klidná mysl pryč */
  if(S.game&&S.game.mode==='zen'){S.game.mode='classic';S.game.time=0;S.game.mistakes=0}
  st.times=st.times.filter(x=>!/^zen-/.test(x.k));delete st.zen;if(S.ach)delete S.ach.zen;
  const g=S.game;if(g&&(!(MODES[g.mode]||GAMES[g.mode])||!gameLevels(g.mode)[g.level]||!Array.isArray(g.vals)||!Array.isArray(g.sol)))S.game=null}

/* ---------- akce ---------- */
const RENDER={home:renderHome,game:enterGame,map:renderMap,pet:renderPet,awards:renderAwards,settings:renderSettings,school:renderSchool};
const ACT={
  lang:d=>{if(d.l===LANG)return;const wp=$('#w-player'),wn=$('#w-pet');
    /* na uvítací obrazovce si zapamatovat jméno; nezměněné jméno želvičky nechat na výchozím pro nový jazyk */
    if(wp){S.settings.player=(wp.value||'').trim();const n=(wn.value||'').trim();if(n&&n!==defaults().pet.name)S.pet.name=n;else delete S.pet.name}
    try{localStorage.setItem('zelvi-lang',d.l);if(d.l==='cs')localStorage.removeItem('zelvi-en-cache')}catch(e){}save();location.reload()},
  go:d=>{if(d.v==='school'){UI.lesson=-1;UI.glesson=null}go(d.v)},
  glesson:d=>{UI.glesson={g:d.g,k:+d.k,state:null};renderSchool();window.scrollTo(0,0)},
  gans:d=>{const G=UI.glesson,L=GAMES[G.g].lessons[G.k];if(String(L.answer)===d.v){G.state='ok';S.lessons[G.g+'-'+G.k]=true;save();sfx.house();buzz(30);achToast()}else{G.state='no';sfx.err();buzz([30,40,30])}renderSchool()},
  gok:()=>{const G=UI.glesson;S.lessons[G.g+'-'+G.k]=true;save();achToast();renderSchool()},
  close:closeModal,
  continue:()=>go('game'),
  play:d=>{closeModal();startGame(d.mode,+d.level||0)},
  pick:d=>pickLevel(d.mode),
  daily:startDaily,
  pendingGo:()=>{const p=UI.pending;closeModal();if(p)startGame(p[0],p[1],p[2],true)},
  num:d=>inputDigit(+d.d),
  erase:erase,
  undo:()=>{hideHint();restore(S.game.hist,S.game.fut)},
  redo:()=>{hideHint();restore(S.game.fut,S.game.hist)},
  notes:()=>{UI.notes=!UI.notes;renderTools();renderPad();renderStatus();if(UI.notes&&!S.notesSeen){S.notesSeen=true;save();toast(`Notes are ${noteWord(S.game)} that you jot down as a reminder of what could go in a square. Tap the same button to turn them off.`)}},
  hint:showHint,hintMore:hintMore,hintClose:()=>{hideHint();updateBoard()},hintReveal:hintReveal,hintFix:hintFix,
  more:moreMenu,autonotes:autoNotes,clearnotes:clearNotes,
  toggleErr:()=>{S.settings.showErrors=!S.settings.showErrors;closeModal();refresh()},
  restartAsk:()=>modal(`<h2>Start again?</h2><p>${GAMES[S.game.mode]?'Everything you’ve filled in in this game will be cleared.':'All your numbers and notes in this sudoku will be cleared.'}</p><div class="btns"><button class="btn primary big" data-act="restart">Yes, start again</button><button class="btn big" data-act="close">No</button></div>`),
  restart:()=>{const g=S.game;clearHolds();g.vals=g.puzzle.slice();g.notes.fill(0);g.mistakes=0;g.hints=0;g.time=0;g.hist=[];g.fut=[];closeModal();UI.sel=-1;hideHint();refresh()},
  pause:()=>{if(S.game&&!S.game.done)pause(true)},resume:()=>pause(false),
  leave:()=>{hideHint();go('home')},
  again:()=>{const g=S.game;closeModal();startGame(g.mode,g.level,{},true)},
  home:()=>{closeModal();go('home')},
  pat:pat,
  wear:d=>{S.pet.wear[d.slot]=d.item||null;save();renderPet()},
  atab:d=>{UI.awards=d.t;renderAwards()},
  toggle:d=>{S.settings[d.k]=!S.settings[d.k];save();renderSettings();if(d.k==='sound'&&S.settings.sound)sfx.place()},
  set:d=>{S.settings[d.k]=d.k==='fs'?+d.v:d.v;if(d.k==='symbols')UI.builtFor=null;save();applyLook();renderSettings()},
  skin:d=>{S.settings.skin=d.s;save();applyLook();renderSettings()},
  resetAsk:()=>modal(`<h2>Really delete everything?</h2><p>Your statistics, awards, journey and the turtle’s level will all be deleted. This can’t be undone.${SY?SYT.reset:''}</p><div class="btns"><button class="btn big" data-act="close">No, leave it</button><button class="btn primary big" data-act="resetYes" style="background:var(--err);border-color:var(--err)">Yes, delete</button></div>`),
  resetYes:()=>{if(SY){SY=null;syKey=null;sySave()}const sk=S.settings.skin;S=defaults();S.welcomed=true;S.settings.skin=sk;save();closeModal();applyLook();UI.builtFor=null;go('home');toast('Everything has been deleted. Starting afresh.')},
  lesson:d=>{UI.lesson=+d.k;UI.ld=UI.lesson<4?buildLesson(UI.lesson):null;renderSchool();window.scrollTo(0,0)},
  lessonBack:()=>{UI.lesson=-1;UI.glesson=null;renderSchool();window.scrollTo(0,0)},
  lans:d=>lessonResult(+d.d===UI.ld.answer),
  lcell:d=>{const i=+d.i;if(i===UI.ld.target)lessonResult(true);else{if(UI.ld.vals[i])return;UI.ld.wrongCell=i;lessonResult(false)}},
  lessonOk:()=>{S.lessons[4]=true;save();achToast();renderSchool()},
  backupMake:async()=>{S.lastBackup=dkey();save();const code=await makeBackup();UI.bcode=code;renderSettings();
    modal(`<h2>Your backup code</h2><p>Copy it and send it to yourself by email or message. You can use it at any time.</p><textarea class="codebox" id="bk-code" readonly rows="6">${code}</textarea><div class="btns"><button class="btn primary big" data-act="backupCopy">Copy the code</button><button class="btn big" data-act="close">Done</button></div>`)},
  backupCopy:()=>{const ta=$('#bk-code'),fb=()=>{ta.focus();ta.select();toast('The code is selected. Press and hold on it and choose Copy.')};
    try{navigator.clipboard.writeText(UI.bcode).then(()=>toast('Code copied.'),fb)}catch(e){fb()}},
  backupRestore:()=>modal(`<h2>Restore from a backup</h2><p>Paste your backup code here (it begins with the letters ZS).</p><textarea class="codebox" id="bk-in" rows="6" placeholder="ZS2-..."></textarea><p class="errtxt" id="bk-err" hidden>This code couldn’t be read. Check that you’ve pasted all of it.</p><div class="btns"><button class="btn primary big" data-act="backupCheck">Continue</button><button class="btn big" data-act="close">Cancel</button></div>`),
  backupCheck:async()=>{const d=await readBackup($('#bk-in').value);if(!d){$('#bk-err').hidden=false;return}UI.restore=d;d.welcomed=true;const L=lvlInfo(d.xp).L;
    modal(`<h2>Restore this backup?</h2><p>Turtle ${esc(d.pet.name)}, level ${L}, ${W('sudoku solved','games solved')}: ${Math.max(0,Math.floor(+d.stats.solved)||0)}.</p><p class="muted">Your current progress on this device will be replaced by the backup.</p><div class="btns"><button class="btn primary big" data-act="backupYes">Yes, restore</button><button class="btn big" data-act="close">No</button></div>`)},
  backupYes:()=>{S=UI.restore;UI.restore=null;const bl=S.lang;delete S.lang;tidy();save();
    /* záloha si nese jazyk; když je jiný než teď, přepnout (stránka se znovu načte) */
    if((bl==='cs'||bl==='en')&&bl!==LANG){try{localStorage.setItem('zelvi-lang',bl)}catch(e){}location.reload();return}
    closeModal();applyLook();UI.builtFor=null;go('home');toast('Backup restored. Welcome back!')},
  welcomeGo:()=>{const p=($('#w-player').value||'').trim(),n=($('#w-pet').value||'').trim();S.settings.player=p;if(n)S.pet.name=n;S.welcomed=true;save();closeModal();renderHome()}
};
document.addEventListener('click',e=>{
  const cell=e.target.closest('#board [data-i]');
  if(cell&&UI.view==='game'){const i=+cell.dataset.i;if(UI.paused)return;const K=kindOf(S.game);if(K.tap){if(!S.game.done)K.tap(S.game,i,e);return}UI.sel=i;updateBoard();sfx.click();return}
  const t=e.target.closest('[data-act]');if(!t||t.disabled)return;const f=ACT[t.dataset.act];if(f)f(t.dataset,t,e)});
document.addEventListener('keydown',e=>{if(UI.view!=='game'||!S.game||$('#modal').hidden===false)return;if(e.target.tagName==='INPUT')return;const gm=S.game,N=gm.N,K=kindOf(gm);
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){if(!UI.paused&&!gm.done)ACT.undo();e.preventDefault();return}
  if(K.key){if(!UI.paused&&!gm.done)K.key(gm,e);return}
  if(/^[1-9]$/.test(e.key)&&+e.key<=N){inputDigit(+e.key);e.preventDefault()}
  else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0'){erase();e.preventDefault()}
  else if(e.key.startsWith('Arrow')){let i=UI.sel<0?0:UI.sel,r=Math.floor(i/N),c=i%N;if(e.key==='ArrowUp')r=(r+N-1)%N;if(e.key==='ArrowDown')r=(r+1)%N;if(e.key==='ArrowLeft')c=(c+N-1)%N;if(e.key==='ArrowRight')c=(c+1)%N;UI.sel=r*N+c;updateBoard();e.preventDefault()}
  else if((e.key==='n'||e.key==='N')&&notesOn(gm)){ACT.notes()}});

setInterval(()=>{const gm=S.game;if(UI.view!=='game'||!gm||gm.done||UI.paused||document.hidden||!$('#modal').hidden)return;gm.time++;
  if(S.settings.showTimer){const s=$('#g-timer span');if(s)s.textContent=fmt(gm.time)}if(gm.time%10===0)save()},1000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
window.addEventListener('pagehide',save);
try{new ResizeObserver(sizeBoard).observe($('#board-wrap'))}catch(e){window.addEventListener('resize',sizeBoard)}

/* ---------- synchronizace: telefon ↔ tablet ↔ počítač přes soukromý repozitář na GitHubu ----------
   Schránka = soukromý repozitář (výchozí zelvi-sudoku-sync). V main je jen SY_META ({app, sync:1, check}), check ověří párovací kód.
   Každé zařízení má vlastní větev zs-<12 hex> s jediným souborem „state“ (commit bez rodičů, historie neroste).
   „state“ = [IV 12 B][AES-256-GCM(gzip(JSON))], AAD 'state'; klíč HKDF-SHA-256 z 8 slov (salt 'Zelvi sudoku sync v1').
   Slučování (syMerge):
   - počítadla (body, vyřešené hry, statistiky, dny, pohlazení) se SČÍTAJÍ. Každé zařízení nahrává jen svůj příspěvek
     own = stav − součet příspěvků ostatních při posledním sloučení (SY.dev); stav = own + nový součet ostatních.
   - posledních 60 časů: vlastní záznamy (bez cizích) + záznamy ostatních
   - denní výzvy, odznaky, lekce = sjednocení; rekordy = nejlepší čas; nejdelší série = maximum
   - rozehraná hra, jméno, oslovení, jméno a doplňky želvičky = naposledy změněné vyhrává (SY.lw, čas podle hodin GitHubu)
   - nastavení (písmo, vzhled, zvuky, znaky…) se nesynchronizuje
   Token a 8 slov jsou jen v localStorage 'zelvi-sync' tohoto zařízení, nikdy v zálohovacím kódu. */
const SY_KEY='zelvi-sync',SY_API='https://api.github.com',SY_META='zelvi-sudoku-sync.json',SY_APP='ZelviSudoku';
const SY_RE_REPO=/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/,SY_RE_BR=/^zs-[a-f0-9]{12}$/,SY_SHA=/^[a-f0-9]{40}$/;
const SY_POLL=60000,SY_SOON=15000,SY_BACK=20000,SY_ERRWAIT=5*60000,SY_RETRY=30*60000,SY_HARD=['token','notfound','forbidden','public','meta'];
const SY_WORDS='abandon ability able about above absent absorb abstract absurd abuse access accident account accuse achieve acid acoustic acquire across act action actor actress actual adapt add addict address adjust admit adult advance advice aerobic affair afford afraid again age agent agree ahead aim air airport aisle alarm album alcohol alert alien all alley allow almost alone alpha already also alter always amateur amazing among amount amused analyst anchor ancient anger angle angry animal ankle announce annual another answer antenna antique anxiety any apart apology appear apple approve april arch arctic area arena argue arm armed armor army around arrange arrest arrive arrow art artefact artist artwork ask aspect assault asset assist assume asthma athlete atom attack attend attitude attract auction audit august aunt author auto autumn average avocado avoid awake aware away awesome awful awkward axis baby bachelor bacon badge bag balance balcony ball bamboo banana banner bar barely bargain barrel base basic basket battle beach bean beauty because become beef before begin behave behind believe below belt bench benefit best betray better between beyond bicycle bid bike bind biology bird birth bitter black blade blame blanket blast bleak bless blind blood blossom blouse blue blur blush board boat body boil bomb bone bonus book boost border boring borrow boss bottom bounce box boy bracket brain brand brass brave bread breeze brick bridge brief bright bring brisk broccoli broken bronze broom brother brown brush bubble buddy budget buffalo build bulb bulk bullet bundle bunker burden burger burst bus business busy butter buyer buzz cabbage cabin cable cactus cage cake call calm camera camp can canal cancel candy cannon canoe canvas canyon capable capital captain car carbon card cargo carpet carry cart case cash casino castle casual cat catalog catch category cattle caught cause caution cave ceiling celery cement census century cereal certain chair chalk champion change chaos chapter charge chase chat cheap check cheese chef cherry chest chicken chief child chimney choice choose chronic chuckle chunk churn cigar cinnamon circle citizen city civil claim clap clarify claw clay clean clerk clever click client cliff climb clinic clip clock clog close cloth cloud clown club clump cluster clutch coach coast coconut code coffee coil coin collect color column combine come comfort comic common company concert conduct confirm congress connect consider control convince cook cool copper copy coral core corn correct cost cotton couch country couple course cousin cover coyote crack cradle craft cram crane crash crater crawl crazy cream credit creek crew cricket crime crisp critic crop cross crouch crowd crucial cruel cruise crumble crunch crush cry crystal cube culture cup cupboard curious current curtain curve cushion custom cute cycle dad damage damp dance danger daring dash daughter dawn day deal debate debris decade december decide decline decorate decrease deer defense define defy degree delay deliver demand demise denial dentist deny depart depend deposit depth deputy derive describe desert design desk despair destroy detail detect develop device devote diagram dial diamond diary dice diesel diet differ digital dignity dilemma dinner dinosaur direct dirt disagree discover disease dish dismiss disorder display distance divert divide divorce dizzy doctor document dog doll dolphin domain donate donkey donor door dose double dove draft dragon drama drastic draw dream dress drift drill drink drip drive drop drum dry duck dumb dune during dust dutch duty dwarf dynamic eager eagle early earn earth easily east easy echo ecology economy edge edit educate effort egg eight either elbow elder electric elegant element elephant elevator elite else embark embody embrace emerge emotion employ empower empty enable enact end endless endorse enemy energy enforce engage engine enhance enjoy enlist enough enrich enroll ensure enter entire entry envelope episode equal equip era erase erode erosion error erupt escape essay essence estate eternal ethics evidence evil evoke evolve exact example excess exchange excite exclude excuse execute exercise exhaust exhibit exile exist exit exotic expand expect expire explain expose express extend extra eye eyebrow fabric face faculty fade faint faith fall false fame family famous fan fancy fantasy farm fashion fat fatal father fatigue fault favorite feature february federal fee feed feel female fence festival fetch fever few fiber fiction field figure file film filter final find fine finger finish fire firm first fiscal fish fit fitness fix flag flame flash flat flavor flee flight flip float flock floor flower fluid flush fly foam focus fog foil fold follow food foot force forest forget fork fortune forum forward fossil foster found fox fragile frame frequent fresh friend fringe frog front frost frown frozen fruit fuel fun funny furnace fury future gadget gain galaxy gallery game gap garage garbage garden garlic garment gas gasp gate gather gauge gaze general genius genre gentle genuine gesture ghost giant gift giggle ginger giraffe girl give glad glance glare glass glide glimpse globe gloom glory glove glow glue goat goddess gold good goose gorilla gospel gossip govern gown grab grace grain grant grape grass gravity great green grid grief grit grocery group grow grunt guard guess guide guilt guitar gun gym habit hair half hammer hamster hand happy harbor hard harsh harvest hat have hawk hazard head health heart heavy hedgehog height hello helmet help hen hero hidden high hill hint hip hire history hobby hockey hold hole holiday hollow home honey hood hope horn horror horse hospital host hotel hour hover hub huge human humble humor hundred hungry hunt hurdle hurry hurt husband hybrid ice icon idea identify idle ignore ill illegal illness image imitate immense immune impact impose improve impulse inch include income increase index indicate indoor industry infant inflict inform inhale inherit initial inject injury inmate inner innocent input inquiry insane insect inside inspire install intact interest into invest invite involve iron island isolate issue item ivory jacket jaguar jar jazz jealous jeans jelly jewel job join joke journey joy judge juice jump jungle junior junk just kangaroo keen keep ketchup key kick kid kidney kind kingdom kiss kit kitchen kite kitten kiwi knee knife knock know lab label labor ladder lady lake lamp language laptop large later latin laugh laundry lava law lawn lawsuit layer lazy leader leaf learn leave lecture left leg legal legend leisure lemon lend length lens leopard lesson letter level liar liberty library license life lift light like limb limit link lion liquid list little live lizard load loan lobster local lock logic lonely long loop lottery loud lounge love loyal lucky luggage lumber lunar lunch luxury lyrics machine mad magic magnet maid mail main major make mammal man manage mandate mango mansion manual maple marble march margin marine market marriage mask mass master match material math matrix matter maximum maze meadow mean measure meat mechanic medal media melody melt member memory mention menu mercy merge merit merry mesh message metal method middle midnight milk million mimic mind minimum minor minute miracle mirror misery miss mistake mix mixed mixture mobile model modify mom moment monitor monkey monster month moon moral more morning mosquito mother motion motor mountain mouse move movie much muffin mule multiply muscle museum mushroom music must mutual myself mystery myth naive name napkin narrow nasty nation nature near neck need negative neglect neither nephew nerve nest net network neutral never news next nice night noble noise nominee noodle normal north nose notable note nothing notice novel now nuclear number nurse nut oak obey object oblige obscure observe obtain obvious occur ocean october odor off offer office often oil okay old olive olympic omit once one onion online only open opera opinion oppose option orange orbit orchard order ordinary organ orient original orphan ostrich other outdoor outer output outside oval oven over own owner oxygen oyster ozone pact paddle page pair palace palm panda panel panic panther paper parade parent park parrot party pass patch path patient patrol pattern pause pave payment peace peanut pear peasant pelican pen penalty pencil people pepper perfect permit person pet phone photo phrase physical piano picnic picture piece pig pigeon pill pilot pink pioneer pipe pistol pitch pizza place planet plastic plate play please pledge pluck plug plunge poem poet point polar pole police pond pony pool popular portion position possible post potato pottery poverty powder power practice praise predict prefer prepare present pretty prevent price pride primary print priority prison private prize problem process produce profit program project promote proof property prosper protect proud provide public pudding pull pulp pulse pumpkin punch pupil puppy purchase purity purpose purse push put puzzle pyramid quality quantum quarter question quick quit quiz quote rabbit raccoon race rack radar radio rail rain raise rally ramp ranch random range rapid rare rate rather raven raw razor ready real reason rebel rebuild recall receive recipe record recycle reduce reflect reform refuse region regret regular reject relax release relief rely remain remember remind remove render renew rent reopen repair repeat replace report require rescue resemble resist resource response result retire retreat return reunion reveal review reward rhythm rib ribbon rice rich ride ridge rifle right rigid ring riot ripple risk ritual rival river road roast robot robust rocket romance roof rookie room rose rotate rough round route royal rubber rude rug rule run runway rural sad saddle sadness safe sail salad salmon salon salt salute same sample sand satisfy satoshi sauce sausage save say scale scan scare scatter scene scheme school science scissors scorpion scout scrap screen script scrub sea search season seat second secret section security seed seek segment select sell seminar senior sense sentence series service session settle setup seven shadow shaft shallow share shed shell sheriff shield shift shine ship shiver shock shoe shoot shop short shoulder shove shrimp shrug shuffle shy sibling sick side siege sight sign silent silk silly silver similar simple since sing siren sister situate six size skate sketch ski skill skin skirt skull slab slam sleep slender slice slide slight slim slogan slot slow slush small smart smile smoke smooth snack snake snap sniff snow soap soccer social sock soda soft solar soldier solid solution solve someone song soon sorry sort soul sound soup source south space spare spatial spawn speak special speed spell spend sphere spice spider spike spin spirit split spoil sponsor spoon sport spot spray spread spring spy square squeeze squirrel stable stadium staff stage stairs stamp stand start state stay steak steel stem step stereo stick still sting stock stomach stone stool story stove strategy street strike strong struggle student stuff stumble style subject submit subway success such sudden suffer sugar suggest suit summer sun sunny sunset super supply supreme sure surface surge surprise surround survey suspect sustain swallow swamp swap swarm swear sweet swift swim swing switch sword symbol symptom syrup system table tackle tag tail talent talk tank tape target task taste tattoo taxi teach team tell ten tenant tennis tent term test text thank that theme then theory there they thing this thought three thrive throw thumb thunder ticket tide tiger tilt timber time tiny tip tired tissue title toast tobacco today toddler toe together toilet token tomato tomorrow tone tongue tonight tool tooth top topic topple torch tornado tortoise toss total tourist toward tower town toy track trade traffic tragic train transfer trap trash travel tray treat tree trend trial tribe trick trigger trim trip trophy trouble truck true truly trumpet trust truth try tube tuition tumble tuna tunnel turkey turn turtle twelve twenty twice twin twist two type typical ugly umbrella unable unaware uncle uncover under undo unfair unfold unhappy uniform unique unit universe unknown unlock until unusual unveil update upgrade uphold upon upper upset urban urge usage use used useful useless usual utility vacant vacuum vague valid valley valve van vanish vapor various vast vault vehicle velvet vendor venture venue verb verify version very vessel veteran viable vibrant vicious victory video view village vintage violin virtual virus visa visit visual vital vivid vocal voice void volcano volume vote voyage wage wagon wait walk wall walnut want warfare warm warrior wash wasp waste water wave way wealth weapon wear weasel weather web wedding weekend weird welcome west wet whale what wheat wheel when where whip whisper wide width wife wild will win window wine wing wink winner winter wire wisdom wise wish witness wolf woman wonder wood wool word work world worry worth wrap wreck wrestle wrist write wrong yard year yellow you young youth zebra zero zone zoo'.split(' ');
/* texty synchronizace; anglická verze je jeden pár v ZS_EN (vkládá ho apply_sync.py) */
const SYT={
  sec:'Sync',intro:'Progress moves between phone, tablet and computer, encrypted, through your private GitHub repository. Each device is set up once.',
  setup:'Set up sync',now:'Sync now',code:'Pairing code',tokenNew:'Enter a new token',off:'Turn off on this device',
  last:d=>'Last sync: '+d,never:'Not synced yet',busy:'Syncing…',devs:n=>'Paired devices: '+n,foot:'Turtle Sudoku · synced, encrypted, through GitHub',
  setupP:'Enter the token for the mailbox (it starts with github_pat_) and the name of the private repository.',tokenL:'Token',repoL:'Repository',
  connect:'Connect',checking:'Checking…',cancel:'Cancel',close:'Close',ok:'Continue',
  newCodeP:'This is the pairing code for all devices. Write down these 8 words (ideally in a password manager). You will enter them on the other devices.',saved:'I have written them down',
  askCodeP:'The mailbox is already set up. Enter the 8 words of the pairing code from the first device, or scan it as a QR code.',codeL:'8 words',codeBad:'The code doesn’t match. Check all 8 words.',
  showCodeP:'Enter this code on another device when setting up sync. Don’t send it to anyone.',
  joinT:'This device already has progress',joinP:n=>`Games solved here: ${n}. The other devices have their own progress. What should happen?`,
  joinAdopt:'Take the progress from the other devices',joinAdoptS:'Progress on this device is replaced (best if it got here from a backup code).',
  joinAdd:'Add this device’s progress',joinAddS:'Games solved here are added to the others.',
  done:'Synced',first:'Sync is on.',offT:'Turn off sync?',offP:'Progress on this device stays. The other devices keep theirs.',offYes:'Yes, turn off',offDone:'Sync is off on this device.',
  qrShow:'Show QR code',qrHide:'Hide QR code',qrHint:'On the other device tap “Scan QR code”. The code hides itself in 2 minutes.',
  qrScan:'Scan QR code',qrScanP:'On the other device open Settings → Sync → Pairing code → Show QR code, and point the camera at it.',
  qrStarting:'Starting the camera…',qrLooking:'Looking for the code…',qrNoCam:'The camera isn’t available here. Type the 8 words instead.',
  qrDenied:'Turtle Sudoku isn’t allowed to use the camera. Allow it in the device settings, or type the 8 words instead.',qrWrong:'This isn’t a Turtle Sudoku pairing code.',
  tokenOk:'The token is saved.',reset:' Sync will be turned off on this device; the other devices keep their progress.',
  e:{offline:'No internet connection. It will try again later.',token:'The token is invalid or has expired. Enter a new one.',
    notfound:'The repository can’t be opened. Check its name and the token’s permissions.',forbidden:'The repository can’t be opened. Check its name and the token’s permissions.',
    public:'The repository is public. For sync it must be private.',empty:'The repository is empty. Add a README file to it on GitHub.',
    meta:'The mailbox holds data of another app.',damaged:'Some data couldn’t be read (a different pairing code?). The rest was synced.',
    http:s=>`GitHub refused the request (${s}). Try again later.`,other:'Sync failed. Try again later.'}
};
function syErrText(k){if(!k)return '';if(k.startsWith('http:'))return SYT.e.http(k.slice(5));const f=SYT.e[k];return typeof f==='string'?f:SYT.e.other}

var SY=null,syKey=null,syBusy=false,sySoonT=null;   /* var: save() se může volat dřív, než tento blok proběhne */
function syLoad(){try{const c=JSON.parse(localStorage.getItem(SY_KEY));
  if(c&&SY_RE_REPO.test(c.repo||'')&&SY_RE_BR.test(c.branch||'')&&typeof c.token==='string'&&typeof c.code==='string'){
    for(const k of ['seen','dev','lw'])if(!c[k]||typeof c[k]!=='object'||Array.isArray(c[k]))c[k]={};return c}}catch(e){}return null}
function sySave(){try{if(SY)localStorage.setItem(SY_KEY,JSON.stringify(SY));else localStorage.removeItem(SY_KEY)}catch(e){}}
function syOn(){return !!(SY&&syKey)}
const syEnc=s=>new TextEncoder().encode(s);
const syHash=a=>{let x=2166136261;for(let i=0;i<a.length;i++)x=Math.imul(x^a.charCodeAt(i),16777619);return(x>>>0).toString(36)+'.'+a.length};
function fromB64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}

/* klíč, šifra, komprese */
async function syDerive(code){const ikm=await crypto.subtle.importKey('raw',syEnc(code),'HKDF',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:syEnc('Zelvi sudoku sync v1'),info:syEnc('state')},ikm,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function sySeal(key,name,u8){const iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:syEnc(name)},key,u8));
  const o=new Uint8Array(12+ct.length);o.set(iv);o.set(ct,12);return o}
async function syOpen(key,name,u8){if(!(u8 instanceof Uint8Array)||u8.length<28)throw new Error('short');
  return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:u8.slice(0,12),additionalData:syEnc(name)},key,u8.subarray(12)))}
async function syZip(u8,on){const s=new Blob([u8]).stream().pipeThrough(on?new CompressionStream('gzip'):new DecompressionStream('gzip'));return new Uint8Array(await new Response(s).arrayBuffer())}
/* párovací kód: 8 slov ze seznamu 2048 slov (88 bitů); stačí první 4 písmena každého slova */
function syNewCode(){return [...crypto.getRandomValues(new Uint16Array(8))].map(x=>SY_WORDS[x&2047]).join(' ')}
function syParseCode(s){const ws=String(s||'').toLowerCase().replace(/[^a-z]+/g,' ').trim().split(' ').filter(Boolean);if(ws.length!==8)return null;const out=[];
  for(const w of ws){const m=SY_WORDS.includes(w)?w:w.length>=4?SY_WORDS.find(x=>x.startsWith(w.slice(0,4))):null;if(!m)return null;out.push(m)}return out.join(' ')}
const SY_CHECK='Zelvi sudoku sync check';
async function syCheckBlob(k){return toB64(await sySeal(k,'check',syEnc(SY_CHECK)))}
async function syCheckOk(k,c){try{return new TextDecoder().decode(await syOpen(k,'check',fromB64(c)))===SY_CHECK}catch(e){return false}}

/* GitHub REST API */
class SyErr extends Error{constructor(kind,status){super(kind);this.kind=kind;this.status=status||0}}
async function gh(token,method,path,body,raw){let r;
  try{r=await fetch(SY_API+path,{method,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',
    headers:Object.assign({Authorization:'Bearer '+token,Accept:raw?'application/vnd.github.raw+json':'application/vnd.github+json'},body?{'Content-Type':'application/json'}:{}),body:body?JSON.stringify(body):undefined})}
  catch(e){throw new SyErr('offline')}
  if(r.status===401)throw new SyErr('token',401);
  if(!r.ok)throw new SyErr(r.status===404?'notfound':r.status===403?'forbidden':r.status===409?'empty':'http',r.status);
  if(raw)return new Uint8Array(await r.arrayBuffer());if(r.status===204)return null;
  try{return await r.json()}catch(e){throw new SyErr('http',r.status)}}
async function syCheckRepo(token,input){let repo=String(input||'').trim().replace(/^https:\/\/github\.com\//,'').replace(/\.git$/,'').replace(/\/+$/,'');
  if(!repo.includes('/')){const u=await gh(token,'GET','/user');if(!u||typeof u.login!=='string')throw new SyErr('http');repo=u.login+'/'+(repo||'zelvi-sudoku-sync')}
  if(!SY_RE_REPO.test(repo))throw new SyErr('notfound');
  const info=await gh(token,'GET','/repos/'+repo);if(!info||info.private!==true)throw new SyErr('public');
  return info.full_name&&SY_RE_REPO.test(info.full_name)?info.full_name:repo}
async function syReadMeta(token,repo){let r;try{r=await gh(token,'GET',`/repos/${repo}/contents/${SY_META}`)}catch(e){if(e.kind==='notfound')return null;throw e}
  try{const m=JSON.parse(new TextDecoder().decode(fromB64(String(r.content||'').replace(/\s+/g,''))));if(m&&m.app===SY_APP&&m.sync===1&&typeof m.check==='string')return m}catch(e){}
  throw new SyErr('meta')}

/* ---------- slučování ---------- */
const SY_CNT=['solved','perfect','nohint','quick','diag','killer','expert','early','owl','fastEasy','fastMed'];
const syNum=v=>{v=+v;return isFinite(v)?v:0};
/* počítadla jako plochá mapa (bez nul) */
function syCount(s){const o={},st=s.stats,a=(k,v)=>{v=syNum(v);if(v)o[k]=(o[k]||0)+v};
  a('xp',s.xp);a('pets',s.pet.pets);SY_CNT.forEach(k=>a('s.'+k,st[k]));
  for(const k in st.byKey){const b=st.byKey[k]||{};a('n.'+k,b.n);a('t.'+k,b.total)}
  for(const k in st.days)a('d.'+k,st.days[k]);for(const k in st.games)a('g.'+k,st.games[k]);return o}
function syAdd(a,b,m=1){const o=Object.assign({},a);for(const k in b){const v=(o[k]||0)+m*syNum(b[k]);if(v)o[k]=v;else delete o[k]}return o}
function sySetCount(s,c){const st=s.stats,g=k=>c[k]||0;s.xp=g('xp');s.pet.pets=g('pets');SY_CNT.forEach(k=>{st[k]=g('s.'+k)});
  const keys=new Set(Object.keys(st.byKey));for(const k in c)if(/^[nt]\./.test(k))keys.add(k.slice(2));
  for(const k of keys){const n=g('n.'+k);if(n>0){const b=st.byKey[k]||{n:0,best:0,total:0};b.n=n;b.total=g('t.'+k);st.byKey[k]=b}else delete st.byKey[k]}
  st.days={};st.games={};for(const k in c){if(!(c[k]>0))continue;if(k.startsWith('d.'))st.days[k.slice(2)]=c[k];else if(k.startsWith('g.'))st.games[k.slice(2)]=c[k]}}
const SY_RE_CNT=new RegExp('^(xp|pets|s\\.('+SY_CNT.join('|')+')|[nt]\\.[a-z]{1,12}-\\d{1,2}|d\\.\\d{4}-\\d\\d-\\d\\d|g\\.[a-z]{1,12})$');
const syOwn=o=>{const r={};if(o&&typeof o==='object'&&!Array.isArray(o))for(const k in o)if(SY_RE_CNT.test(k)&&isFinite(+o[k]))r[k]=+o[k];return r};
const syDevSum=dev=>Object.values(dev).reduce((a,d)=>syAdd(a,syOwn(d&&d.own)),{});
const syOkTime=x=>x&&typeof x==='object'&&isFinite(x.t)&&typeof x.k==='string'&&typeof x.d==='string';
const syDevTimes=dev=>Object.values(dev).flatMap(d=>Array.isArray(d&&d.times)?d.times.filter(syOkTime):[]);
const syTK=x=>x.t+'|'+x.k+'|'+x.d;
function syMinus(list,rem){const m=new Map();rem.forEach(x=>{const k=syTK(x);m.set(k,(m.get(k)||0)+1)});
  return list.filter(x=>{const k=syTK(x),n=m.get(k);if(n){m.set(k,n-1);return false}return true})}
function sySets(s){const st=s.stats,best={};for(const k in st.byKey){const b=st.byKey[k];if(b&&b.best>0)best[k]=b.best}
  return{daily:Object.keys(s.daily.done).filter(k=>s.daily.done[k]),ach:Object.assign({},s.ach),les:Object.keys(s.lessons).filter(k=>s.lessons[k]),ns:!!s.notesSeen,best,db:syNum(s.daily.best)}}
function syUnion(s,x){if(!x||typeof x!=='object')return;
  if(Array.isArray(x.daily))x.daily.forEach(k=>{if(typeof k==='string'&&/^\d{4}-\d\d-\d\d$/.test(k))s.daily.done[k]=true});
  if(x.ach&&typeof x.ach==='object')for(const k in x.ach){const v=x.ach[k];if(typeof v==='string'&&(!s.ach[k]||v<s.ach[k]))s.ach[k]=v}
  if(Array.isArray(x.les))x.les.forEach(k=>{if(typeof k==='string'&&k.length<40)s.lessons[k]=true});
  if(x.ns===true)s.notesSeen=true;
  if(x.best&&typeof x.best==='object')for(const k in x.best){const b=s.stats.byKey[k],v=syNum(x.best[k]);if(b&&v>0&&(!b.best||v<b.best))b.best=v}
  s.daily.best=Math.max(syNum(s.daily.best),syNum(x.db))}
/* naposledy změněné vyhrává */
const SY_LW={game:[s=>s.game,(s,v)=>{s.game=v}],pet:[s=>s.pet.name,(s,v)=>{s.pet.name=v}],wear:[s=>s.pet.wear,(s,v)=>{s.pet.wear=v}],
  player:[s=>s.settings.player,(s,v)=>{s.settings.player=v}],call:[s=>s.settings.call,(s,v)=>{s.settings.call=v}]};
/* nastavení (kromě velikosti písma, ta se řídí obrazovkou) a jazyk */
const SY_SET=['notesBtn','sound','vibrate','showErrors','highlight','showTimer','autoClean','symbols','skin'];
SY_SET.forEach(k=>{SY_LW['set.'+k]=[s=>s.settings[k],(s,v)=>{s.settings[k]=v}]});
let syLangV=LANG;SY_LW.lang=[()=>syLangV,(s,v)=>{syLangV=v}];
const syGetLw=(p,s)=>{const v=SY_LW[p][0](s);return v===undefined?null:v};
/* výchozí (nevyplněná) hodnota nikdy nepřepíše vyplněnou z jiného zařízení */
function syDef(p,v){const D=defaults();if(p==='game')return v===null;if(p==='pet')return v===D.pet.name;if(p==='wear')return !v||Object.values(v).every(x=>!x);
  if(p==='player'||p==='call')return !v;if(p==='lang')return v==='cs';if(p.startsWith('set.'))return v===D.settings[p.slice(4)];return false}
/* u hry se nepočítá ubíhající čas ani historie tahů, jinak by „změnou“ bylo i jen otevření hry */
const sySig=(p,v)=>JSON.stringify(p==='game'&&v?Object.assign({},v,{time:0,hist:0,fut:0}):v);
const syClean=(p,v)=>p==='game'&&v?Object.assign({},v,{hist:[],fut:[]}):v;
function syValid(p,v){
  if(p==='game')return v===null||!!(v&&typeof v==='object'&&(MODES[v.mode]||GAMES[v.mode])&&gameLevels(v.mode)[v.level]&&Array.isArray(v.vals)&&Array.isArray(v.sol)&&Array.isArray(v.puzzle));
  if(p==='wear')return !!(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>['head','face','neck'].includes(k)&&(v[k]===null||typeof v[k]==='string')));
  if(p==='lang')return v==='cs'||v==='en';
  if(p==='set.symbols')return SYMSETS.some(o=>o.id===v);
  if(p==='set.skin')return v===null||SKINS.some(o=>o.id===v);
  if(p.startsWith('set.'))return typeof v==='boolean';
  return typeof v==='string'&&v.length<=40&&(p!=='pet'||v.trim().length>0)}
/* rozehranou hru nejde vyměnit pod rukama, když je otevřené okno (třeba výhra) */
const syCanSwapGame=()=>!(UI.view==='game'&&!$('#modal').hidden);
function syMerge(present,fresh){let look=false;const c=SY,adopt=!c.joined&&c.join==='adopt',now=Date.now()-(c.skew||0),gm0=S.game;
  const old=c.dev;
  /* čas změny: hodiny GitHubu, ale vždy později než všechno, co zařízení u té hodnoty už vidělo (hodiny zařízení se můžou rozcházet) */
  for(const p in SY_LW){const v=syGetLw(p,S),s=sySig(p,v),l=c.lw[p];
    if(!l||typeof l!=='object'){c.lw[p]={s,at:syDef(p,v)?0:1};continue}
    if(l.s===s){if(l.at<=1&&syDef(p,v))l.at=0;continue}     /* 1.7: výchozí hodnota měla at 1 a při shodě vyhrávala */
    let seen=syNum(l.at);for(const br in old){const x=old[br]&&old[br].lw&&old[br].lw[p];if(x)seen=Math.max(seen,syNum(x.at))}
    const ch=c.chg&&syNum(c.chg[p]);c.lw[p]={s,at:Math.max(Math.round(ch>0?ch:now),Math.floor(seen)+1)}}
  c.chg={};
  const O=adopt?{}:syAdd(syCount(S),syDevSum(old),-1),ownT=adopt?[]:syMinus(S.stats.times.filter(syOkTime),syDevTimes(old));
  const dev={};for(const br of present){if(fresh[br]){dev[br]=fresh[br].d;c.seen[br]=fresh[br].cs}else if(old[br])dev[br]=old[br]}
  for(const br in c.seen)if(!present.has(br))delete c.seen[br];
  c.dev=dev;
  if(adopt){S.stats.byKey={};S.daily.done={};S.ach={};S.lessons={};S.daily.best=0;S.notesSeen=false}
  sySetCount(S,syAdd(O,syDevSum(dev)));
  S.stats.times=[...syDevTimes(dev),...ownT].sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0).slice(-60);
  for(const br in dev)syUnion(S,dev[br].sets);
  for(const p in SY_LW){let best=null;
    for(const br in dev){const x=dev[br].lw&&dev[br].lw[p];if(x&&typeof x==='object'&&syNum(x.at)>0&&(!best||x.at>best.at))best=x}
    if(!best||!(adopt||best.at>c.lw[p].at)||!syValid(p,best.v))continue;
    if((p==='game'||p==='lang')&&!syCanSwapGame())continue;
    if(p==='lang'&&UI.view==='game')continue;
    SY_LW[p][1](S,syClean(p,JSON.parse(JSON.stringify(best.v))));c.lw[p]={s:sySig(p,syGetLw(p,S)),at:best.at};
    if(p.startsWith('set.'))look=true;if(p==='set.symbols')UI.builtFor=null}
  S.postcards=Array.from({length:Math.floor(Math.max(0,S.stats.solved)/12)},(_,i)=>i%ISLANDS.length);
  tidy();checkAch();
  return{O,ownT,swapped:S.game!==gm0||(look&&UI.builtFor===null),look}}

/* ---------- jedna synchronizace ---------- */
async function syNow(manual){if(!syOn()||syBusy)return false;syBusy=true;const c=SY,P='/repos/'+c.repo;c.lastAttempt=Date.now();sySave();syUI();
  let ok=false,damaged=false,res=null;
  try{save();
    const refs=await gh(c.token,'GET',P+'/git/matching-refs/heads/zs-'),present=new Set(),fresh={};let own=null;
    for(const ref of Array.isArray(refs)?refs:[]){const br=String(ref.ref||'').replace(/^refs\/heads\//,''),cs=ref.object&&ref.object.sha;
      if(!SY_RE_BR.test(br)||!SY_SHA.test(cs||''))continue;
      if(br===c.branch){own=cs;continue}
      present.add(br);if(!manual&&c.seen[br]===cs&&c.dev[br])continue;
      try{const cm=await gh(c.token,'GET',`${P}/git/commits/${cs}`),ts=cm&&cm.tree&&cm.tree.sha;if(!SY_SHA.test(ts||''))throw new SyErr('http');
        const tr=await gh(c.token,'GET',`${P}/git/trees/${ts}`),e=(Array.isArray(tr.tree)?tr.tree:[]).find(x=>x.path==='state'&&x.type==='blob'&&SY_SHA.test(x.sha||''));
        if(!e)continue;
        const d=JSON.parse(new TextDecoder().decode(await syZip(await syOpen(syKey,'state',await gh(c.token,'GET',`${P}/git/blobs/${e.sha}`,null,true)),false)));
        if(!d||d.app!==SY_APP||d.v!==1)throw new Error('shape');fresh[br]={d,cs}}
      catch(e){if(e instanceof SyErr)throw e;console.warn('sync: unreadable',br,e);damaged=true}}
    if(c!==SY)return false;
    res=syMerge(present,fresh);for(const p in SY_LW)syLast[p]=sySig(p,syGetLw(p,S));save();sySave();       /* stav a příspěvky ostatních se ukládají spolu */
    const lw={};for(const p in SY_LW)lw[p]={v:syClean(p,syGetLw(p,S)),at:c.lw[p].at};
    const body=JSON.stringify({app:SY_APP,v:1,own:res.O,times:res.ownT,sets:sySets(S),lw}),h=syHash(body);
    if(h!==c.upHash||!own){
      const blob=await gh(c.token,'POST',P+'/git/blobs',{content:toB64(await sySeal(syKey,'state',await syZip(syEnc(body),true))),encoding:'base64'});
      const tr=await gh(c.token,'POST',P+'/git/trees',{tree:[{path:'state',mode:'100644',type:'blob',sha:blob.sha}]});
      const t0=Date.now(),cm=await gh(c.token,'POST',P+'/git/commits',{message:'Zelvi sudoku sync',tree:tr.sha,parents:[]});
      const sd=Date.parse(((cm&&cm.committer)||{}).date||'');if(isFinite(sd))c.skew=Math.round((t0+Date.now())/2-sd);
      if(own)await gh(c.token,'PATCH',`${P}/git/refs/heads/${c.branch}`,{sha:cm.sha,force:true});
      else await gh(c.token,'POST',P+'/git/refs',{ref:'refs/heads/'+c.branch,sha:cm.sha});
      c.upHash=h}
    c.joined=true;delete c.join;c.lastSync=Date.now();c.lastError=damaged?'damaged':null;ok=true}
  catch(e){console.warn('sync failed',e);c.lastError=e instanceof SyErr?(e.kind==='http'&&e.status?'http:'+e.status:e.kind):'other'}
  finally{syBusy=false;if(SY===c)sySave()}
  /* jazyk z jiného zařízení: uložit a stránku jednou znovu načíst (jako přepnutí v Nastavení) */
  if(ok&&syLangV!==LANG){try{localStorage.setItem('zelvi-lang',syLangV);if(syLangV==='cs')localStorage.removeItem('zelvi-en-cache')}catch(e){}save();location.reload();return ok}
  if(res&&res.look)applyLook();
  if(res)syShow(res.swapped);syUI();
  if(manual)toast(ok?(damaged?SYT.e.damaged:SYT.done):syErrText(c.lastError));
  return ok}
/* po sloučení překreslit, co je vidět (ne pod rukama: rozepsané pole v Nastavení, otevřené okno) */
function syShow(swapped){
  if(UI.view==='game'){if(swapped){hideHint();if(S.game&&!S.game.done)go('game');else go('home')}return}
  if(!$('#modal').hidden)return;const a=document.activeElement;if(a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA'))return;
  (RENDER[UI.view]||(()=>{}))()}

/* kdy: při spuštění, po návratu do aplikace, při odchodu z ní, každou minutu v otevřené aplikaci, chvíli po změně */
function syMaybe(gap){if(!syOn()||syBusy||navigator.onLine===false)return;const e=SY.lastError,
  w=SY_HARD.includes(e)?SY_RETRY:e&&e!=='damaged'?Math.max(gap,SY_ERRWAIT):gap;
  if(Date.now()-(SY.lastAttempt||0)>=w)syNow(false)}
/* každá změna termín posune (dávka změn = jedno nahrání), jen dřívější krátký termín (po výhře 3 s) zůstane */
let sySoonAt=0,sySoonFast=false;
function sySoon(ms){if(!syOn()||syBusy)return;const due=Date.now()+(ms||SY_SOON);if(sySoonT&&sySoonFast&&sySoonAt<=due)return;
  clearTimeout(sySoonT);sySoonAt=due;sySoonFast=!!ms;sySoonT=setTimeout(()=>{sySoonT=null;syMaybe(0)},due-Date.now())}
/* kdy se hodnota naposledy změnila (volá save()); rozhoduje mezi zařízeními, ne až okamžik synchronizace */
const syLast={};
function syTouch(){if(!SY)return;let ch=false;for(const p in SY_LW){const s=sySig(p,syGetLw(p,S));if(syLast[p]===undefined){syLast[p]=s;continue}
  if(syLast[p]!==s){syLast[p]=s;(SY.chg||(SY.chg={}))[p]=Date.now()-(SY.skew||0);ch=true}}if(ch)sySave()}
function syBoot(){SY=syLoad();if(!SY)return;syTouch();
  syDerive(SY.code).then(k=>{syKey=k;syUI();setTimeout(()=>syMaybe(0),1500)}).catch(e=>console.warn('sync key',e))}
document.addEventListener('visibilitychange',()=>{if(!syOn())return;
  if(document.hidden){clearTimeout(sySoonT);syMaybe(0)}else setTimeout(()=>syMaybe(SY_BACK),300)});
window.addEventListener('online',()=>setTimeout(()=>syMaybe(0),2000));
setInterval(()=>{if(!document.hidden)syMaybe(SY_POLL)},10000);

/* ---------- nastavení ---------- */
function syWhen(t){return new Date(t).toLocaleString('en-GB',{day:'numeric',month:'numeric',hour:'2-digit',minute:'2-digit'})}
function syBox(){if(!SY)return `<small class="muted">${SYT.intro}</small><button class="btn primary" data-act="sySetup">${SYT.setup}</button>`;
  const line=syBusy?SYT.busy:SY.lastError&&SY.lastError!=='damaged'?syErrText(SY.lastError):SY.lastSync?SYT.last(syWhen(SY.lastSync)):SYT.never;
  return `<small class="muted">${SYT.intro}</small><small style="font-weight:800" ${SY.lastError&&SY.lastError!=='damaged'&&!syBusy?'class="errtxt"':''}>${esc(line)}</small>
  ${SY.joined?`<small class="muted">${SYT.devs(Object.keys(SY.dev).length+1)}</small>`:''}
  <button class="btn primary" data-act="syNow" ${syBusy?'disabled':''}>${SYT.now}</button>
  ${SY.lastError==='token'?`<button class="btn" data-act="syToken">${SYT.tokenNew}</button>`:''}
  <button class="btn" data-act="syCode">${SYT.code}</button><button class="btn" data-act="syOffAsk">${SYT.off}</button>`}
function syUI(){const b=$('#sy-box');if(b&&UI.view==='settings')b.innerHTML=syBox()}
const syErrP=k=>`<p class="errtxt" id="sy-err" ${k?'':'hidden'}>${k?esc(syErrText(k)):''}</p>`;
function syErr(k){const e=$('#sy-err');if(e){e.textContent=syErrText(k);e.hidden=!k}}
/* QR kód obsahuje jen „ZELVI:“ + 8 slov (bez tokenu), ukáže se jen na požádání a za 2 minuty se sám skryje */
const SY_QR='ZELVI:',SY_QR_MS=120000;let syQrT=0,syCam=null;
const syQrBtn=w=>window.ZSQR?`<div class="sy-qr" id="sy-qr" hidden><div class="sy-qrimg"></div><small class="muted">${SYT.qrHint}</small></div><button class="btn" data-act="syQr" data-w="${w}">${SYT.qrShow}</button>`:'';
function syQrCode(t){const s=String(t||'').trim();return s.slice(0,SY_QR.length).toUpperCase()===SY_QR?syParseCode(s.slice(SY_QR.length)):null}
function syScanStop(){const c=syCam;syCam=null;if(!c)return;c.done=true;clearTimeout(c.t);if(c.stream)c.stream.getTracks().forEach(t=>{try{t.stop()}catch(e){}})}
async function syScan(){syScanStop();
  modal(`<h2>${SYT.qrScan}</h2><p>${SYT.qrScanP}</p><div class="sy-cam"><video playsinline muted autoplay></video><div class="sy-frame"></div></div>
    <p class="muted" id="sy-cst">${SYT.qrStarting}</p><div class="btns"><button class="btn big" data-act="syScanBack">${SYT.cancel}</button></div>`);
  const cam=syCam={done:false,t:0,stream:null,det:null},video=$('#modal video'),st=$('#sy-cst'),cv=document.createElement('canvas');
  const say=(s,bad)=>{if(cam.done)return;st.textContent=s;st.classList.toggle('errtxt',!!bad)};
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){say(SYT.qrNoCam,1);return}
  try{cam.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}})}
  catch(e){console.warn('camera',e);say(e&&(e.name==='NotAllowedError'||e.name==='SecurityError')?SYT.qrDenied:SYT.qrNoCam,1);return}
  if(cam.done||!document.contains(video)){cam.stream.getTracks().forEach(t=>t.stop());if(syCam===cam)syCam=null;return}
  try{if('BarcodeDetector' in window&&(await BarcodeDetector.getSupportedFormats()).includes('qr_code'))cam.det=new BarcodeDetector({formats:['qr_code']})}catch(e){cam.det=null}
  video.srcObject=cam.stream;try{await video.play()}catch(e){}say(SYT.qrLooking);
  const tick=async()=>{if(cam.done)return;
    if(!document.contains(video)){if(syCam===cam)syScanStop();else{cam.done=true;cam.stream.getTracks().forEach(t=>t.stop())}return}   /* okno zavřené jinak (Zpět) */
    if(video.readyState>=2&&video.videoWidth){
      try{const k=Math.min(1,800/Math.max(video.videoWidth,video.videoHeight)),w=cv.width=Math.round(video.videoWidth*k),h=cv.height=Math.round(video.videoHeight*k),ctx=cv.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(video,0,0,w,h);let t=null;
        if(cam.det){try{const r=await cam.det.detect(cv);if(r&&r[0]&&r[0].rawValue)t=r[0].rawValue}catch(e){cam.det=null}}
        if(t==null&&window.ZSQR)t=ZSQR.decode(ctx.getImageData(0,0,w,h),80);
        if(t!=null&&!cam.done){const code=syQrCode(t);
          if(code){syScanStop();syAskCode();$('#sy-code').value=code;const b=$('[data-act=syCodeGo]');ACT.syCodeGo(b.dataset,b);return}
          say(SYT.qrWrong,1)}}
      catch(e){console.warn('qr',e)}}
    cam.t=setTimeout(tick,150)};
  tick()}
function syCodeHTML(code){return `<ol class="sy-words">${code.split(' ').map(w=>`<li>${esc(w)}</li>`).join('')}</ol>`}
const syPend={};
function syAskCode(){modal(`<h2>${SYT.code}</h2><p>${SYT.askCodeP}</p><div class="field" style="padding:0"><b>${SYT.codeL}</b><textarea class="codebox" id="sy-code" rows="3" autocomplete="off" spellcheck="false" autocapitalize="off"></textarea></div>
  <p class="errtxt" id="sy-err" hidden></p><div class="btns"><button class="btn primary big" data-act="syCodeGo">${SYT.ok}</button>${window.ZSQR?`<button class="btn big" data-act="syScan">${SYT.qrScan}</button>`:''}<button class="btn big" data-act="close">${SYT.cancel}</button></div>`)}
function syNewBranch(){return 'zs-'+[...crypto.getRandomValues(new Uint8Array(6))].map(b=>b.toString(16).padStart(2,'0')).join('')}
/* další zařízení: je tu postup a ostatní zařízení už nějaký mají → zeptat se, jinak převzít */
async function syJoin(){const p=syPend;let others=0;
  try{const refs=await gh(p.token,'GET',`/repos/${p.repo}/git/matching-refs/heads/zs-`);others=(Array.isArray(refs)?refs:[]).filter(r=>SY_RE_BR.test(String(r.ref||'').replace(/^refs\/heads\//,''))).length}
  catch(e){if(!(e instanceof SyErr&&e.kind==='notfound'))throw e}
  if(!others){syStart('add');return}
  if(S.stats.solved>0||S.xp>0){modal(`<h2>${SYT.joinT}</h2><p>${SYT.joinP(S.stats.solved)}</p><div class="btns">
    <button class="btn primary big" data-act="syJoinGo" data-m="adopt">${SYT.joinAdopt}</button><small class="muted">${SYT.joinAdoptS}</small>
    <button class="btn big" data-act="syJoinGo" data-m="add">${SYT.joinAdd}</button><small class="muted">${SYT.joinAddS}</small>
    <button class="btn big ghost" data-act="close">${SYT.cancel}</button></div>`);return}
  syStart('adopt')}
async function syStart(mode){const p=syPend;
  SY={repo:p.repo,branch:syNewBranch(),token:p.token,code:p.code,join:mode,joined:false,seen:{},dev:{},lw:{},lastSync:0,lastAttempt:0,lastError:null,skew:0};
  syKey=p.key;syTouch();sySave();for(const k in syPend)delete syPend[k];closeModal();if(UI.view==='settings')renderSettings();
  const ok=await syNow(false);toast(ok?SYT.first:syErrText(SY&&SY.lastError))}
Object.assign(ACT,{
  sySetup:()=>{modal(`<h2>${SYT.setup}</h2><p>${SYT.setupP}</p>
    <div class="field" style="padding:0"><b>${SYT.tokenL}</b><input id="sy-tok" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></div>
    <div class="field" style="padding:0"><b>${SYT.repoL}</b><input id="sy-repo" type="text" autocomplete="off" spellcheck="false" autocapitalize="off" value="zelvi-sudoku-sync"></div>
    ${syErrP()}<div class="btns"><button class="btn primary big" data-act="syConnect">${SYT.connect}</button><button class="btn big" data-act="close">${SYT.cancel}</button></div>`)},
  syConnect:async(d,b)=>{const token=$('#sy-tok').value.trim();if(!/^[A-Za-z0-9_]{20,255}$/.test(token)){syErr('token');return}
    b.disabled=true;b.textContent=SYT.checking;syErr('');
    try{const repo=await syCheckRepo(token,$('#sy-repo').value),meta=await syReadMeta(token,repo);Object.assign(syPend,{token,repo,meta});
      if(meta){syAskCode();return}
      syPend.code=syNewCode();
      modal(`<h2>${SYT.code}</h2><p>${SYT.newCodeP}</p>${syCodeHTML(syPend.code)}${syErrP()}<div class="btns"><button class="btn primary big" data-act="syNewGo">${SYT.saved}</button>${syQrBtn('pend')}<button class="btn big" data-act="close">${SYT.cancel}</button></div>`)}
    catch(e){console.warn('sync setup',e);b.disabled=false;b.textContent=SYT.connect;syErr(e instanceof SyErr?e.kind:'other')}},
  syCodeGo:async(d,b)=>{const code=syParseCode($('#sy-code').value),e=$('#sy-err');if(!code){e.textContent=SYT.codeBad;e.hidden=false;return}
    b.disabled=true;try{const k=await syDerive(code);if(!await syCheckOk(k,syPend.meta.check)){e.textContent=SYT.codeBad;e.hidden=false;b.disabled=false;return}
      Object.assign(syPend,{code,key:k});await syJoin()}catch(x){b.disabled=false;syErr(x instanceof SyErr?x.kind:'other')}},
  syNewGo:async(d,b)=>{b.disabled=true;const p=syPend;
    try{p.key=await syDerive(p.code);
      const content=toB64(syEnc(JSON.stringify({app:SY_APP,sync:1,created:new Date().toISOString(),check:await syCheckBlob(p.key)},null,1)));
      try{await gh(p.token,'PUT',`/repos/${p.repo}/contents/${SY_META}`,{message:'Zelvi sudoku sync',content})}
      catch(x){/* mezitím ji založilo jiné zařízení: zadat jeho kód */const m=await syReadMeta(p.token,p.repo).catch(()=>null);if(!m)throw x;p.meta=m;syAskCode();return}
      await syJoin()}catch(x){console.warn('sync setup',x);b.disabled=false;syErr(x instanceof SyErr?x.kind:'other')}},
  syJoinGo:d=>syStart(d.m==='add'?'add':'adopt'),
  syNow:()=>{syNow(true)},
  syCode:()=>{if(SY)modal(`<h2>${SYT.code}</h2><p>${SYT.showCodeP}</p>${syCodeHTML(SY.code)}<div class="btns">${syQrBtn('cfg')}<button class="btn big" data-act="close">${SYT.close}</button></div>`)},
  syQr:(d,b)=>{const box=$('#sy-qr'),code=d.w==='cfg'?SY&&SY.code:syPend.code;if(!box||!code)return;clearTimeout(syQrT);
    if(!box.hidden){box.hidden=true;box.firstElementChild.innerHTML='';b.textContent=SYT.qrShow;return}
    try{box.firstElementChild.innerHTML=ZSQR.svg(SY_QR+code.toUpperCase(),'M')}catch(e){console.warn('qr',e);return}
    box.hidden=false;b.textContent=SYT.qrHide;box.scrollIntoView({block:'nearest'});
    syQrT=setTimeout(()=>{if(document.contains(box)){box.hidden=true;box.firstElementChild.innerHTML='';b.textContent=SYT.qrShow}},SY_QR_MS)},
  syScan:()=>{syScan()},
  syScanBack:()=>{syScanStop();syAskCode()},
  syToken:()=>{modal(`<h2>${SYT.tokenNew}</h2><div class="field" style="padding:0"><b>${SYT.tokenL}</b><input id="sy-tok" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"></div>
    ${syErrP()}<div class="btns"><button class="btn primary big" data-act="syTokenGo">${SYT.ok}</button><button class="btn big" data-act="close">${SYT.cancel}</button></div>`)},
  syTokenGo:async(d,b)=>{const token=$('#sy-tok').value.trim();if(!SY||!/^[A-Za-z0-9_]{20,255}$/.test(token)){syErr('token');return}
    b.disabled=true;try{const repo=await syCheckRepo(token,SY.repo),m=await syReadMeta(token,repo);if(!m||!await syCheckOk(syKey,m.check))throw new SyErr('meta');
      SY.token=token;SY.lastError=null;SY.lastAttempt=0;sySave();closeModal();toast(SYT.tokenOk);syUI();syNow(false)}
    catch(x){b.disabled=false;syErr(x instanceof SyErr?x.kind:'other')}},
  syOffAsk:()=>modal(`<h2>${SYT.offT}</h2><p>${SYT.offP}</p><div class="btns"><button class="btn primary big" data-act="syOff">${SYT.offYes}</button><button class="btn big" data-act="close">${SYT.cancel}</button></div>`),
  syOff:()=>{SY=null;syKey=null;sySave();closeModal();if(UI.view==='settings')renderSettings();toast(SYT.offDone)}});
syBoot();

$('#i-back').innerHTML=ICON.back;$('[data-act=leave]').setAttribute('aria-label','Back to the home screen');$('#g-timer').setAttribute('aria-label','Pause the game');
tidy();if(LOADED)save();applyLook();go('home');
if(!S.welcomed){modal(`${turtleSVG({cls:'bob',mood:'happy'})}${langSeg()}<h2>Welcome to Turtle Sudoku!</h2><p>I’m a little turtle and I’ll keep you company. ${W('With every sudoku you solve','With every game you solve')}, I’ll grow, and we’ll swim round the islands together.</p>
  <div class="field" style="padding:0"><b>What shall I call you?</b><input id="w-player" maxlength="20" value="${esc(S.settings.player)}" placeholder="Your name (optional)"></div>
  <div class="field" style="padding:0"><b>What will my name be?</b><input id="w-pet" maxlength="16" value="${esc(S.pet.name)}"></div>
  <button class="btn primary big" data-act="welcomeGo">Start playing</button>`)}
})();
