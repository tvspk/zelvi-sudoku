// Generátory sudoku, součtového sudoku, Futoshiki a Binaira v Node (bez prohlížeče): jediné řešení, počty zadaných, rychlost (i nejhorší případ).
const fs=require('fs'),path=require('path');const s=fs.readFileSync(path.join(__dirname,'..','zelvi-sudoku.html'),'utf8');
const blk=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b));
const fails=[];const ok=(n,c,x)=>{console.log((c?'OK  ':'FAIL')+' '+n+(x!==undefined?' | '+x:''));if(!c)fails.push(n)};
eval(blk('/*ENGINE*/','/*END ENGINE*/')+blk('/*ENGINE futoshiki*/','/*END ENGINE futoshiki*/')+blk('/*ENGINE binairo*/','/*END ENGINE binairo*/')+`
const q=(a,p)=>a.slice().sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))];
const ms=f=>{const t=process.hrtime.bigint();const r=f();return[r,Number(process.hrtime.bigint()-t)/1e6]};
// sudoku
const SL=[[54,1],[47,1],[40,1],[33,1],[28,0],[24,0]];
for(const diag of [false,true])SL.forEach(([cl,sg],l)=>{const ts=[];let bad=0;for(let k=0;k<150;k++){const[r,t]=ms(()=>generate({N:9,br:3,bc:3,diag,clues:cl,singles:!!sg,seed:k*101+l}));ts.push(t);
  if(search(r.puzzle,getGeo(9,3,3,diag),2).count!==1)bad++;if(sg&&!solveSingles(r.puzzle,getGeo(9,3,3,diag)))bad++}
  ok((diag?'úhlopříčky ':'sudoku ')+l+': jediné řešení'+(sg?' a jen jednoduché kroky':''),bad===0,'nejhůř '+q(ts,1).toFixed(0)+' ms')});
// součtové sudoku
function kilCount(pz,cages,cage){const geo=getGeo(9,3,3,false),g=pz.slice();let cnt=0;
 /* zbývající součet skupinky musí jít složit z volných políček různými nepoužitými čísly */
 const okC=i=>{const cg=cages[cage[i]];let s=0,e=0,used=0;for(const x of cg.cells){if(g[x]){s+=g[x];used|=1<<g[x]}else e++}const r=cg.sum-s;
  if(!e)return r===0;let lo=0,hi=0,a=0,b=0;for(let d=1;d<=9&&a<e;d++)if(!(used&(1<<d))){lo+=d;a++}for(let d=9;d>=1&&b<e;d--)if(!(used&(1<<d))){hi+=d;b++}return r>=lo&&r<=hi};
 (function rec(){if(cnt>1)return;let best=-1,bm=0,bc=99;for(let i=0;i<81;i++){if(g[i])continue;let m=candMask(g,geo,i);for(const x of cages[cage[i]].cells)if(g[x])m&=~(1<<g[x]);
   let ok=0;for(let d=1;d<=9;d++)if(m&(1<<d)){g[i]=d;if(okC(i))ok|=1<<d;g[i]=0}const c=pc(ok);if(!c)return;if(c<bc){bc=c;best=i;bm=ok;if(c===1)break}}
  if(best<0){cnt++;return}for(let d=1;d<=9;d++)if(bm&(1<<d)){g[best]=d;rec();g[best]=0}})();return cnt}
/* krok nápovědy jako findHint: jediné místo nebo poslední možnost z masek kilProp */
function kilHintStep(g){const geo=getGeo(9,3,3,false),m=kilProp(g,geo,KC);if(!m)return null;
 for(let i=0;i<81;i++)if(!g[i]&&pc(m[i])===1)return[i,bd(m[i])];
 for(const u of geo.units)for(let d=1;d<=9;d++){if(u.some(c=>g[c]===d))continue;const at=u.filter(c=>!g[c]&&(m[c]&(1<<d)));if(at.length===1)return[at[0],d]}return null}
let KC;{const ts=[],gv=[];let bad=0,lone=0,sum=0,stuck=0;
 for(let k=0;k<150;k++){const[r,t]=ms(()=>genKiller(k*7919+5));ts.push(t);gv.push(r.puzzle.filter(v=>v).length);
  if(kilCount(r.puzzle,r.cages,r.cage)!==1||!kilSolve(r.puzzle,getGeo(9,3,3,false),r.cages))bad++;
  if(r.cages.some(c=>c.cells.length<2))lone++;
  if(r.cages.some(c=>c.sum!==c.cells.reduce((a,x)=>a+r.sol[x],0)||new Set(c.cells.map(x=>r.sol[x])).size!==c.cells.length))sum++;
  KC=r.cages;const rng=mulberry32(k);const g=r.puzzle.slice();for(let i=0;i<81;i++)if(!g[i]&&rng()<.3)g[i]=r.sol[i];
  for(let s;g.includes(0);){s=kilHintStep(g);if(!s||s[1]!==r.sol[s[0]]){stuck++;break}g[s[0]]=s[1]}}
 ok('součtové sudoku: jediné řešení (hrubou silou se součty) a řešitelné logikou',bad===0,'zadaných čísel '+q(gv,0)+'–'+q(gv,1)+', medián '+q(gv,.5));
 ok('součtové sudoku: žádná skupinka o jednom políčku',lone===0);
 ok('součtové sudoku: součty sedí, čísla ve skupince se neopakují',sum===0);
 ok('součtové sudoku: nápověda dojde do konce i z rozehraného stavu',stuck===0);
 ok('součtové sudoku: rychlost (nejhůř pod 300 ms)',q(ts,1)<300,'p50 '+q(ts,.5).toFixed(0)+' / max '+q(ts,1).toFixed(0)+' ms')}
// futoshiki
function fzCount(pz,N,rel){const g=pz.slice(),n=N*N;let cnt=0;const geo=getGeo(N,0,0,false);
 (function rec(i){if(cnt>1)return;if(i===n){cnt++;return}if(g[i]){rec(i+1);return}const m=candMask(g,geo,i);
  for(let d=1;d<=N;d++)if(m&(1<<d)){g[i]=d;if(rel.every(([a,b])=>!g[a]||!g[b]||g[a]<g[b]))rec(i+1);g[i]=0}})(0);return cnt}
[{N:4,signs:.35,clues:6},{N:5,signs:.35,clues:8},{N:6,signs:.33,clues:8}].forEach((L,l)=>{const ts=[];let bad=0;
  for(let k=0;k<200;k++){const[r,t]=ms(()=>genFuto(Object.assign({seed:k*7919+l},L)));ts.push(t);if(fzCount(r.puzzle,L.N,r.rel)!==1||!fzSolved(r.puzzle,L.N,r.rel))bad++;if(r.rel.some(([a,b])=>!(r.sol[a]<r.sol[b])))bad++}
  ok('futoshiki '+L.N+'×'+L.N+': jediné řešení logikou, znaménka sedí',bad===0,'nejhůř '+q(ts,1).toFixed(0)+' ms')});
// binairo
[{N:6,clues:14,adv:false},{N:8,clues:22,adv:false},{N:10,clues:32,adv:true}].forEach((L,l)=>{const ts=[];let bad=0,cl=0;
  for(let k=0;k<(L.N===10?400:200);k++){const[r,t]=ms(()=>genBinairo(Object.assign({seed:k*7919+l},L)));ts.push(t);const g=bnSolve(r.puzzle,L.N,L.adv);if(!g||g.join()!==r.sol.join()||bnErrors0(r.sol,L.N))bad++;if(r.clues!==L.clues)cl++}
  ok('binairo '+L.N+'×'+L.N+': řešitelné logikou úrovně, řešení podle pravidel',bad===0,'zadaných mimo cíl: '+cl);
  ok('binairo '+L.N+'×'+L.N+': rychlost (99 % pod 150 ms)',q(ts,.99)<150,'p50 '+q(ts,.5).toFixed(0)+' / p99 '+q(ts,.99).toFixed(0)+' / max '+q(ts,1).toFixed(0)+' ms')});
function bnErrors0(g,N){const L=bnLines(N),h=N/2;for(const u of L){let w=0;for(let k=0;k<N;k++){if(g[u[k]]===1)w++;if(k>=2&&g[u[k]]===g[u[k-1]]&&g[u[k]]===g[u[k-2]])return true}if(w!==h)return true}
  const rs=new Set(L.slice(0,N).map(u=>u.map(c=>g[c]).join(''))),cs=new Set(L.slice(N).map(u=>u.map(c=>g[c]).join('')));return rs.size<N||cs.size<N}
`);
console.log('VÝSLEDEK:',fails.length?'SELHALO: '+fails.join(', '):'vše prošlo');
