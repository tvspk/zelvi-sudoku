// Generátor KenKen v Node: rychlost, počet pokusů, jediné řešení (hrubou silou), obtížnost, druhy kroků nápovědy,
// a zda nápověda (kkStep) dovede do konce i náhodně rozehrané stavy. Spuštění: node testy/test_kenken_node.js [počet na úroveň, výchozí 200]
const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','zelvi-sudoku.html'),'utf8');
const core=html.slice(html.indexOf('/*ENGINE*/'),html.indexOf('/*END ENGINE*/'));
const kk=html.slice(html.indexOf('/*ENGINE kenken*/'),html.indexOf('/*END ENGINE kenken*/'));
(0,eval)(core+kk+";global.T={KKLEVELS,genKenken,kkSolve,kkStep,kkProp,kkEnum,mulberry32,pc,bd}");const {genKenken,kkSolve,kkStep,kkProp,pc,bd}=T;
// hrubá síla: větvení na políčku s nejméně možnostmi, zúžení kkProp (bez „jediného místa“)
function count(pz,N,cages,limit){let cnt=0;(function rec(g){if(cnt>=limit)return;const m=kkProp(g,N,cages,false);if(!m)return;
  let best=-1,bc=99;for(let i=0;i<g.length;i++){if(g[i])continue;const c=pc(m[i]);if(c<bc){bc=c;best=i}}
  if(best<0){cnt++;return}
  for(let d=1;d<=N;d++)if(m[best]&(1<<d)){const h=g.slice();h[best]=d;
    // dosadit i všechna jistá políčka z masek
    for(let i=0;i<h.length;i++)if(!h[i]&&pc(m[i])===1&&i!==best)h[i]=bd(m[i]);rec(h)}})(pz.slice());return cnt}
const cfg=T.KKLEVELS;
const K=+process.argv[2]||200;let bad=0;
cfg.forEach((c,li)=>{let t0=Date.now(),tries=[],fail=0,uniq=0,maxms=0,kinds={},given=0,lab=0,maxLab='',ops={},easier=0,hintOk=0,hintRuns=0;
  for(let s=1;s<=K;s++){const a=Date.now();const r=genKenken(Object.assign({},c,{seed:s*7919}));const ms=Date.now()-a;maxms=Math.max(maxms,ms);
    if(!r){fail++;continue}tries.push(r.tries);const P={N:c.N,cages:r.cages,cage:r.cage};
    if(count(r.puzzle,c.N,r.cages,2)===1)uniq++;
    given+=r.puzzle.filter(v=>v).length;r.cages.forEach(x=>{ops[x.op]=(ops[x.op]||0)+1;if(x.label.length>maxLab.length)maxLab=x.label});
    if(li>0&&kkSolve(r.puzzle,P,1))easier++;
    // průchod nápovědou od zadání
    const g=r.puzzle.slice();let st;while((st=kkStep(g,P,3))&&!st.bad){kinds[st.kind]=(kinds[st.kind]||0)+1;if(st.v!==r.sol[st.i]){bad++;break}g[st.i]=st.v}
    // náhodně rozehrané stavy (správná čísla v náhodném pořadí) musí jít dohrát nápovědou
    const rng=T.mulberry32(s);for(let k=0;k<5;k++){hintRuns++;const h=r.puzzle.slice();h.forEach((v,i)=>{if(!v&&rng()<rng())h[i]=r.sol[i]});
      let x,okk=true;while((x=kkStep(h,P,3))){if(x.bad||x.v!==r.sol[x.i]){okk=false;break}h[x.i]=x.v}if(okk&&h.every((v,i)=>v===r.sol[i]))hintOk++}}
  console.log(c.name,c.N+'×'+c.N,'ok',tries.length,'fail',fail,'jediné řešení',uniq,'ø ms',((Date.now()-t0)/K).toFixed(1),'max ms',maxms,
    'ø pokusů',(tries.reduce((a,b)=>a+b,0)/tries.length).toFixed(1),'ø zadaných',(given/tries.length).toFixed(1),'jde nejlehčí logikou',li?easier:'-',
    'nápověda dohrála',hintOk+'/'+hintRuns,'nejdelší',maxLab,'počty',JSON.stringify(ops),'kroky',JSON.stringify(kinds))});
console.log(bad?'CHYBA: nápověda dala špatné číslo '+bad+'×':'nápověda nikdy nedala špatné číslo');
