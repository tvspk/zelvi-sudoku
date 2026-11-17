// Generátor Hashi v Node: rychlost, počet pokusů, jediné řešení (hrubou silou), zda jde vyřešit nejlehčí logikou, četnost čísel.
// Spuštění: node testy/test_hashi_node.js [počet zadání na úroveň, výchozí 200]
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','zelvi-sudoku.html'),'utf8');
const core=html.slice(html.indexOf('/*ENGINE*/'),html.indexOf('/*END ENGINE*/'));
const hs=html.slice(html.indexOf('/*ENGINE hashi*/'),html.indexOf('/*END ENGINE hashi*/'));
(0,eval)(core+hs+";global.T={hsBuild,hsSolve,genHashi,hsNext,hsCap,hsComps}");const {hsBuild,hsSolve,genHashi,hsCap}=T;

function brute(P,limit){const E=P.edges,I=P.isl,val=E.map(()=>0),used=I.map(()=>0);let cnt=0;
  function conn(){const {k}=T.hsComps(P,val);return k===1}
  (function rec(e){if(cnt>=limit)return;
    if(e===E.length){if(I.every((s,i)=>used[i]===s.n)&&conn())cnt++;return}
    const {a,b}=E[e];
    for(let v=0;v<=hsCap(P,e);v++){if(v&&P.cross[e].some(f=>f<e&&val[f]))break;
      if(used[a]+v>I[a].n||used[b]+v>I[b].n)break;
      val[e]=v;used[a]+=v;used[b]+=v;
      // prune: island a done with all its edges assigned?
      let okk=true;for(const i of [a,b]){const last=Math.max(...P.ie[i]);if(last===e&&used[i]!==I[i].n)okk=false}
      if(okk)rec(e+1);
      val[e]=0;used[a]-=v;used[b]-=v}})(0);
  return cnt}
// parametry úrovní musí odpovídat GAMES.hashi.levels v aplikaci
const cfg=[
 {name:'L',N:7,isl:9,lvl:1,two:.35,extra:.3},
 {name:'S',N:8,isl:14,lvl:2,two:.35,extra:.3},
 {name:'T',N:9,isl:20,lvl:3,two:.35,extra:.3,minLvl:2}];
for(const c of cfg){let t0=Date.now(),tries=[],fail=0,uniq=0,maxms=0,need1=0,nums={};const K=+process.argv[2]||200;
  for(let s=1;s<=K;s++){const a=Date.now();const r=genHashi(Object.assign({seed:s*7919},c));const ms=Date.now()-a;maxms=Math.max(maxms,ms);
    if(!r){fail++;continue}tries.push(r.tries);
    const P=hsBuild(c.N,r.cells,r.nums);if(brute(P,2)===1)uniq++;
    if(hsSolve(P,1))need1++;r.nums.forEach(x=>nums[x]=(nums[x]||0)+1)}
  console.log(c.name,'ok',tries.length,'fail',fail,'uniq',uniq,'avg ms',((Date.now()-t0)/K).toFixed(1),'max ms',maxms,'avg tries',(tries.reduce((a,b)=>a+b,0)/tries.length).toFixed(1),'lvl1-solvable',need1,'nums',JSON.stringify(nums))}
