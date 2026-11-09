/* ===== MOTEUR =====
   Toute la maths du jeu, sans aucun accès à la page : le même code tourne dans le jeu et dans la simulation.
   Le résultat d'un tour est calculé d'un bloc au départ, l'interface ne fait que le rejouer.
   Tous les montants sont exprimés en multiples de la mise totale. */
(function (root) {
'use strict';

const MOLE=0, CART=1, LAMP=2, PICK=3, A=4, K=5, Q=6, J=7, T=8, WILD=9, BONUS=10, NUG=11;
const NAMES=['Taupe','Wagon','Lanterne','Pioches','A','K','Q','J','10','Wild','Détonateur','Pépite'];
const NLINES=20, MAX_WIN=25000, RESPINS=3, FS_MAX_M=100;

const LINES=[
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
  [0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
  [2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
  [1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0],
];

/* Gains par ligne, en multiples de la mise par ligne (mise totale / 20) */
const PAY=[];
PAY[MOLE]=[0,10,75,400,2500];
PAY[CART]=[0,0,50,250,1250];
PAY[LAMP]=[0,0,40,150,600];
PAY[PICK]=[0,0,30,100,400];
PAY[A]=[0,0,20,60,200];
PAY[K]=[0,0,15,50,150];
PAY[Q]=[0,0,12,40,120];
PAY[J]=[0,0,10,30,100];
PAY[T]=[0,0,8,25,75];
PAY[WILD]=[0,0,100,750,5000];
const SCATTER_PAY={3:2,4:10,5:50}; // en multiples de la mise totale

const JP_BASE={mini:10,minor:40,major:200,grand:2000,super:10000};
const JP_RATE={mini:.0015,minor:.0015,major:.001,grand:.001,super:.001}; // part de chaque mise versée aux compteurs
const JP_ORDER=['mini','minor','major','grand','super'];

/* Rouleaux : [symbole, nombre de blocs, hauteur du bloc] */
const nug=(n)=>[[NUG,1,3],[NUG,1,2],[NUG,n,1]];
const baseCommon=(w,b,n)=>[[MOLE,1,3],[MOLE,2,1],[CART,1,2],[CART,4,1],[LAMP,8,1],[PICK,9,1],[A,11,1],[K,12,1],[Q,15,1],[J,17,1],[T,20,1],[BONUS,b,1],...nug(n),...(w?[[WILD,w,1]]:[])];
const BASE_DEF=[baseCommon(0,3,2),baseCommon(3,3,1),baseCommon(4,3,2),baseCommon(4,3,1),baseCommon(4,2,1)];
const freeCommon=(w)=>[[MOLE,1,3],[MOLE,3,1],[CART,1,3],[CART,3,1],[LAMP,6,1],[PICK,8,1],[A,9,1],[K,9,1],[Q,10,1],[J,10,1],[T,10,1],[BONUS,2,1],...(w?[[WILD,w,1]]:[])];
const FREE_DEF=[freeCommon(0),freeCommon(5),freeCommon(5),freeCommon(6),freeCommon(5)];

function mulberry(seed){return function(){seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function validStrip(s){
  const n=s.length;
  for(let i=0;i<n;i++) if(s[i]===BONUS) for(let d=1;d<=3;d++) if(s[(i+d)%n]===BONUS) return false;
  return true;
}
function buildStrip(def,seed){
  const r=mulberry(seed);
  for(let a=0;a<20000;a++){
    const blocks=[];
    for(const [s,n,h] of def) for(let i=0;i<n;i++) blocks.push(new Array(h).fill(s));
    for(let i=blocks.length-1;i>0;i--){const j=r()*(i+1)|0;const t=blocks[i];blocks[i]=blocks[j];blocks[j]=t;}
    const strip=blocks.flat();
    if(validStrip(strip)) return strip;
  }
  throw new Error('rouleau impossible');
}
const BASE=BASE_DEF.map((d,i)=>buildStrip(d,1000+i*17));
const FREE=FREE_DEF.map((d,i)=>buildStrip(d,5000+i*23));

/* Pépites : [type, valeur, poids] */
const NUG_TABLES=[
  [['cash',1,238],['cash',2,250],['cash',3,178],['cash',5,128],['cash',8,67],['cash',10,50],['cash',15,28],['cash',25,13.5],['cash',50,5.5],
   ['jp','mini',32],['jp','minor',8],['jp','major',1],['jp','grand',.12]],
  [['cash',3,240],['cash',5,240],['cash',8,190],['cash',10,130],['cash',15,85],['cash',25,48],['cash',50,20],['cash',100,6],
   ['jp','mini',34],['jp','minor',16],['jp','major',3],['jp','grand',.3]],
  [['cash',8,260],['cash',10,240],['cash',15,190],['cash',25,130],['cash',50,60],['cash',100,22],['cash',200,5],
   ['jp','minor',32],['jp','major',8],['jp','grand',.8]],
].map(t=>({t,w:t.reduce((a,e)=>a+e[2],0)}));

const HOLD=[
  {name:'HOLD & BLAST', start:6, table:0, base:.07,  decay:.88, late:.5,  tnt:.06, mult:.025, tntHit:.55},
  {name:'SUPER HOLD',   start:7, table:1, base:.076, decay:.88, late:.6,  tnt:.08, mult:.04,  tntHit:.6},
  {name:'MEGA HOLD',    start:9, table:2, base:.082, decay:.88, late:.7,  tnt:.1,  mult:.05,  tntHit:.65},
];
const FS=[
  {name:'FREE SPINS',       spins:12, m0:1, inc:1, retrig:5},
  {name:'SUPER FREE SPINS', spins:15, m0:2, inc:1, retrig:5},
  {name:'MEGA FREE SPINS',  spins:18, m0:3, inc:2, retrig:5},
];
const WHEELS=[
  {name:'GALERIE −1',wedges:[
    {k:'fs',t:0,w:24},{k:'cash',x:20,w:7},{k:'hold',t:0,w:15},{k:'jp',jp:'mini',w:5},
    {k:'fs',t:0,w:24},{k:'cash',x:30,w:7},{k:'up',w:7.5},{k:'hold',t:0,w:15},
    {k:'cash',x:15,w:8},{k:'jp',jp:'minor',w:1.5},{k:'fs',t:0,w:24},{k:'up',w:7.5},
  ]},
  {name:'GALERIE −2',wedges:[
    {k:'fs',t:1,w:20},{k:'cash',x:75,w:10},{k:'hold',t:1,w:18},{k:'jp',jp:'minor',w:6},
    {k:'fs',t:1,w:20},{k:'cash',x:50,w:12},{k:'up',w:6},{k:'hold',t:1,w:18},
    {k:'cash',x:100,w:6},{k:'jp',jp:'major',w:1},{k:'fs',t:1,w:20},{k:'up',w:6},
  ]},
  {name:'GALERIE −3',wedges:[
    {k:'fs',t:2,w:24},{k:'cash',x:250,w:12},{k:'hold',t:2,w:22},{k:'jp',jp:'major',w:10},
    {k:'fs',t:2,w:24},{k:'cash',x:150,w:16},{k:'jp',jp:'grand',w:1.2},{k:'hold',t:2,w:22},
    {k:'cash',x:400,w:6},{k:'jp',jp:'major',w:10},{k:'jp',jp:'super',w:.25},{k:'cash',x:150,w:16},
  ]},
].map(W=>({...W,total:W.wedges.reduce((a,e)=>a+e.w,0)}));

const BLAST={p:1/155,sizes:[[2,35],[3,40],[4,18],[5,7]],total:100};
const OFFERS=[
  {id:'hold',  name:'HOLD & BLAST',    price:50,  kind:'hold', tier:0},
  {id:'wheel', name:'LA ROUE',         price:80,  kind:'wheel',level:0},
  {id:'fs',    name:'FREE SPINS',      price:100, kind:'fs',   tier:0},
  {id:'mhold', name:'MEGA HOLD',       price:260, kind:'hold', tier:2},
  {id:'super', name:'SUPER ROUE',      price:320, kind:'wheel',level:2},
  {id:'mfs',   name:'MEGA FREE SPINS', price:430, kind:'fs',   tier:2},
];

const NEIGHB=[];
for(let i=0;i<15;i++){const r=i/3|0,y=i%3,n=[];if(r>0)n.push(i-3);if(r<4)n.push(i+3);if(y>0)n.push(i-1);if(y<2)n.push(i+1);NEIGHB.push(n);}

function drawGrid(rng,set,g,stops){
  for(let r=0;r<5;r++){
    const s=set[r],n=s.length,st=rng()*n|0;
    stops[r]=st;
    g[r*3]=s[st];g[r*3+1]=s[(st+1)%n];g[r*3+2]=s[(st+2)%n];
  }
}
function evalLines(g,out){
  let tot=0;
  for(let l=0;l<NLINES;l++){
    const L=LINES[l];
    let wr=0;
    while(wr<5&&g[wr*3+L[wr]]===WILD)wr++;
    let pay=0,sym=-1,cnt=0;
    if(wr>=3){pay=PAY[WILD][wr-1];sym=WILD;cnt=wr;}
    if(wr<5){
      const base=g[wr*3+L[wr]];
      if(base<WILD){
        let c=wr+1;
        while(c<5){const s=g[c*3+L[c]];if(s!==base&&s!==WILD)break;c++;}
        const p=PAY[base][c-1];
        if(p>pay){pay=p;sym=base;cnt=c;}
      }
    }
    if(pay>0){tot+=pay;if(out)out.push({line:l,sym,cnt,pay:pay/NLINES});}
  }
  return tot;
}
function rollNug(rng,tb){
  const T=NUG_TABLES[tb];
  let x=rng()*T.w;
  for(const e of T.t){x-=e[2];if(x<0)return e[0]==='cash'?{k:'cash',x:e[1]}:{k:'jp',jp:e[1]};}
  return {k:'cash',x:1};
}
function jackpotPay(ctx,name){
  const v=JP_BASE[name]+ctx.prog[name];
  ctx.prog[name]=0;
  if(ctx.onJackpot)ctx.onJackpot(name,v);
  return v;
}
function shuffled(n,rng){
  const a=[];for(let i=0;i<n;i++)a.push(i);
  for(let i=n-1;i>0;i--){const j=rng()*(i+1)|0;const t=a[i];a[i]=a[j];a[j]=t;}
  return a;
}

function playFS(ctx,tier,already){
  const rng=ctx.rng,F=FS[tier];
  let left=F.spins,M=F.m0,total=0,capped=false,best=0;
  const steps=[];
  while(left>0){
    left--;
    const g=new Array(15),stops=[0,0,0,0,0];
    drawGrid(rng,FREE,g,stops);
    let nw=0,nb=0;
    for(let i=0;i<15;i++){if(g[i]===WILD)nw++;else if(g[i]===BONUS)nb++;}
    const before=M;
    M=Math.min(M+nw*F.inc,FS_MAX_M);
    const wins=[];
    const base=evalLines(g,wins)/NLINES;
    let win=base*M,retrig=0;
    if(nb>=3){retrig=F.retrig;left+=retrig;}
    if(already+total+win>=MAX_WIN){win=MAX_WIN-already-total;capped=true;}
    total+=win;
    if(win>best)best=win;
    steps.push({stops,grid:g,before,M,nw,nb,wins,base,win,retrig,left,running:total});
    if(capped)break;
  }
  return {kind:'fs',tier,name:F.name,m0:F.m0,inc:F.inc,spins:F.spins,steps,total,capped,best};
}

function playHold(ctx,tier,init,already){
  const rng=ctx.rng,H=HOLD[tier];
  const cells=new Array(15).fill(null);
  if(init){for(const i in init)cells[i]={...init[i]};}
  else{const idx=shuffled(15,rng);for(let i=0;i<H.start;i++)cells[idx[i]]=rollNug(rng,H.table);}
  const start=cells.map(c=>c&&{...c});
  let filled=cells.filter(Boolean).length,left=RESPINS;
  const steps=[];
  while(left>0&&filled<15){
    left--;
    const p=H.base*Math.pow(H.decay,Math.max(0,filled-6))*Math.pow(H.late,Math.max(0,filled-11));
    const land=[],boom=[],mults=[];
    for(let i=0;i<15;i++){
      if(cells[i])continue;
      if(rng()<p){
        const r=rng();
        let n;
        if(r<H.tnt)n={k:'tnt'};
        else if(r<H.tnt+H.mult)n={k:'mult',m:rng()<.75?2:3};
        else n=rollNug(rng,H.table);
        cells[i]=n;land.push({i,n:{...n}});filled++;
      }
    }
    for(const l of land){
      if(l.n.k!=='tnt')continue;
      const to=[];
      for(const j of NEIGHB[l.i]){
        if(cells[j])continue;
        if(rng()<H.tntHit){const n=rollNug(rng,H.table);cells[j]=n;to.push({j,n:{...n}});filled++;}
      }
      const n=rollNug(rng,H.table);
      cells[l.i]=n;
      boom.push({i:l.i,n:{...n},to});
    }
    for(const l of land){
      if(l.n.k!=='mult')continue;
      cells[l.i]={k:'cash',x:H.table+1};
      for(let c=0;c<15;c++)if(cells[c]&&cells[c].k==='cash')cells[c].x*=l.n.m;
      mults.push({i:l.i,m:l.n.m});
    }
    if(land.length)left=RESPINS;
    steps.push({land,boom,mults,left,filled,after:cells.map(c=>c&&{...c})});
  }
  let total=0;
  const pays=[];
  for(let i=0;i<15;i++){
    const c=cells[i];
    if(!c)continue;
    const v=c.k==='cash'?c.x:jackpotPay(ctx,c.jp);
    pays.push({i,v,c:{...c}});
    total+=v;
  }
  const full=filled===15;
  let sup=0;
  if(full){sup=jackpotPay(ctx,'super');total+=sup;}
  let capped=false;
  if(already+total>=MAX_WIN){total=MAX_WIN-already;capped=true;}
  return {kind:'hold',tier,name:H.name,start,steps,pays,filled,full,sup,total,capped};
}

function playWheel(ctx,level,already){
  const rng=ctx.rng,spins=[];
  let result;
  for(;;){
    const W=WHEELS[level];
    let x=rng()*W.total,idx=0;
    for(;idx<W.wedges.length-1;idx++){x-=W.wedges[idx].w;if(x<0)break;}
    spins.push({level,idx});
    const w=W.wedges[idx];
    if(w.k==='up'){level++;continue;}
    if(w.k==='fs')result=playFS(ctx,w.t,already);
    else if(w.k==='hold')result=playHold(ctx,w.t,null,already);
    else if(w.k==='cash')result={kind:'cash',x:w.x,total:w.x};
    else result={kind:'jp',jp:w.jp,total:jackpotPay(ctx,w.jp)};
    break;
  }
  return {kind:'wheel',spins,result,total:result.total,capped:!!result.capped};
}

function addProg(ctx,amount){
  for(const k of JP_ORDER)ctx.prog[k]+=JP_RATE[k]*amount;
}

function spin(ctx){
  const rng=ctx.rng;
  addProg(ctx,1);
  const g=new Array(15),stops=[0,0,0,0,0];
  drawGrid(rng,BASE,g,stops);
  let nb=0,nc=0,nugs=null;
  for(let i=0;i<15;i++){
    if(g[i]===BONUS)nb++;
    else if(g[i]===NUG){nc++;(nugs=nugs||{})[i]=rollNug(rng,0);}
  }
  let blast=null;
  if(rng()<BLAST.p){
    let x=rng()*BLAST.total,n=3;
    for(const e of BLAST.sizes){x-=e[1];if(x<0){n=e[0];break;}}
    for(let t=0;t<8;t++){ // une déflagration paie toujours : on replace les Wilds jusqu'à former un gain
      const order=shuffled(15,rng),cand=[],test=g.slice();
      for(const i of order){
        if(cand.length>=n)break;
        if(g[i]===BONUS||g[i]===NUG||g[i]===WILD)continue;
        cand.push(i);test[i]=WILD;
      }
      blast=cand;
      if(evalLines(test)>0)break;
    }
  }
  const finalGrid=g.slice();
  if(blast)for(const i of blast)finalGrid[i]=WILD;
  const wins=[];
  const linePay=evalLines(finalGrid,wins)/NLINES;
  const scat=nb>=3?SCATTER_PAY[nb]:0;
  let total=linePay+scat,feature=null;
  if(nb>=3)feature=playWheel(ctx,nb-3,total);
  else if(nc>=6)feature=playHold(ctx,0,nugs,total);
  if(feature)total+=feature.total;
  let capped=!!(feature&&feature.capped);
  if(total>=MAX_WIN){total=MAX_WIN;capped=true;}
  return {stops,grid:g,finalGrid,nb,nc,nugs,blast,wins,linePay,scat,feature,total,capped,cost:1};
}

function buy(ctx,id){
  const O=OFFERS.find(o=>o.id===id);
  addProg(ctx,O.price);
  let feature;
  if(O.kind==='fs')feature=playFS(ctx,O.tier,0);
  else if(O.kind==='hold')feature=playHold(ctx,O.tier,null,0);
  else feature=playWheel(ctx,O.level,0);
  let total=feature.total,capped=!!feature.capped;
  if(total>=MAX_WIN){total=MAX_WIN;capped=true;}
  return {bought:id,feature,total,capped,cost:O.price};
}

function newProg(){return {mini:0,minor:0,major:0,grand:0,super:0};}

const api={MOLE,CART,LAMP,PICK,A,K,Q,J,T,WILD,BONUS,NUG,NAMES,NLINES,MAX_WIN,RESPINS,LINES,PAY,SCATTER_PAY,JP_BASE,JP_ORDER,BASE,FREE,HOLD,FS,WHEELS,OFFERS,BLAST,NEIGHB,spin,buy,playFS,playHold,playWheel,newProg,evalLines,mulberry};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else root.Engine=api;
})(this);
