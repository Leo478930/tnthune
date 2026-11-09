/* ===== JEU =====
   Enchaîne ce que le moteur a décidé : rouleaux, roue, bonus, célébrations, compte du joueur. */
(function(){
'use strict';
const E=Engine,$=id=>document.getElementById(id);
const {RW,RH,MX,MY,CELL}=Art;
const BETS=[.2,.4,.6,1,2,3,5,10,20,50,100],START_BALANCE=2000,BIG=15,KEY='tnthune.v1';
const SPEED=[1,1.6,2.4],FAST=[1,.72,.5];
const TIMING=[
  {base:.5,step:.17,antic:1.45,v:27,vAntic:15,dur:.32,stagger:.05},
  {base:.22,step:.08,antic:1,v:34,vAntic:17,dur:.22,stagger:.02},
  {base:.08,step:.04,antic:.8,v:40,vAntic:19,dur:.15,stagger:0},
];
/* Mesuré sur 60 millions de spins simulés avec ce moteur (voir l'onglet Chiffres) */
const MATH={"rtp":"96,1 %","hit":"28,3 %","hitN":"3,5","sd":"13,8×","wheel":"1 sur 292","hold":"1 sur 355","blast":"1 sur 155","win100":"1 sur 1 050","win1000":"1 sur 60 000","mini":"1 sur 880","minor":"1 sur 3 100","major":"1 sur 22 600","grand":"1 sur 220 000","super":"1 sur 2,9 millions","spins":"60 millions"};

const cents=v=>Math.round(v*100)/100;
const NF=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
const eur=v=>NF.format(v).replace(/[\s ]/g,' ')+' €';
const fmtBig=v=>eur(v).replace(/ /g,' ');
function shortEur(v){
  if(v>=1e6)return (v/1e6).toFixed(1).replace('.',',')+'M';
  if(v>=1e4)return Math.round(v/1e3)+'K';
  if(v>=1e3)return (v/1e3).toFixed(1).replace('.',',')+'K';
  return Number.isInteger(v)?String(v):v.toFixed(2).replace('.',',').replace(/0$/,'');
}
const mod=(a,n)=>((a%n)+n)%n;
const ease={out3:u=>1-Math.pow(1-u,3),out4:u=>1-Math.pow(1-u,4),io:u=>.5-.5*Math.cos(u*Math.PI)};
const rand=(a,b)=>a+Math.random()*(b-a);
function newStats(){return {spins:0,wagered:0,won:0,best:0,bonus:0,dry:0};}

const uBuf=new Uint32Array(256);let uI=256;
function rng(){if(uI>=256){crypto.getRandomValues(uBuf);uI=0;}return uBuf[uI++]/4294967296;}

function load(){try{const v=JSON.parse(localStorage.getItem(KEY));return v&&typeof v==='object'?v:null;}catch(e){return null;}}
const G={balance:START_BALANCE,betIdx:4,prog:E.newProg(),stats:newStats(),turbo:0,sound:true,music:true,reduced:false,
  mode:'base',busy:false,spinning:false,slam:false,auto:null,pending:0,time:0,slow:1,slowT:0,override:{},grid:null,nugs:null,present:null,lastWin:0,lastFeature:false,round:null,mood:'base',shownProg:null};
function save(){
  try{localStorage.setItem(KEY,JSON.stringify({balance:cents(G.balance+G.pending),betIdx:G.betIdx,prog:G.prog,stats:G.stats,turbo:G.turbo,sound:G.sound,music:G.music,reduced:G.reduced}));}catch(e){}
}
const curBet=()=>BETS[G.betIdx];

/* Horloge du jeu : tout ce qui attend passe par ici, pour que ralenti et turbo s'appliquent partout */
const timers=[],tweens=[];
function wait(ms,skippable){return new Promise(res=>timers.push({t:ms/1000,res,skippable}));}
function tween(ms,fn,e){return new Promise(res=>tweens.push({l:0,d:ms/1000,fn,e:e||(u=>u),res}));}
function skipWaits(){for(const t of timers)if(t.skippable)t.t=0;}
function slowMo(f,sec){G.slow=f;G.slowT=sec;}

let SYM,BLUR,TNT_NUG,reelBackImg,frameImg,rctx,rs=1,bulbOn,bulbOff;
const stage=$('stage'),reelsCv=$('reels'),tapEl=$('tap');
let L={s:1,ox:0,oy:0};
const R=[],CF=Array.from({length:15},()=>({pop:0,hot:false}));
const HS={cells:null,left:3};
const BULBS=[];
let tapCb=null;
function arm(cb){tapCb=cb;tapEl.hidden=false;}
function disarm(){tapCb=null;tapEl.hidden=true;}
tapEl.addEventListener('pointerdown',e=>{e.preventDefault();if(tapCb)tapCb();});

const ui={bal:{el:$('balance'),v:G.balance,t:G.balance},win:{el:$('win'),v:0,t:0}};
function stepCounter(k,dt){
  if(k.v===k.t)return;
  k.v+=(k.t-k.v)*Math.min(1,dt*10);
  if(Math.abs(k.t-k.v)<.006)k.v=k.t;
  k.el.textContent=eur(k.v);
  fitOutput(k.el,206,29);
}
function setCounter(k,v,instant){k.t=v;if(instant){k.v=v;k.el.textContent=eur(v);fitOutput(k.el,206,29);}}
function punch(el){el.classList.remove('punch');void el.offsetWidth;el.classList.add('punch');}
let toastT=0;
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);}

/* --- Mise en page --- */
let bgSize='';
function hasSize(){return window.innerWidth>0&&window.innerHeight>0&&$('fit').clientWidth>0&&$('fit').clientHeight>0;}
function layout(){
  if(!hasSize())return;
  const fit=$('fit'),vw=fit.clientWidth,vh=fit.clientHeight,portrait=window.innerWidth/window.innerHeight<.82;
  stage.className=portrait?'portrait':'landscape';
  const SW=portrait?720:1280,SH=portrait?1280:720,s=Math.min(vw/SW,vh/SH);
  L={s,ox:(vw-SW*s)/2,oy:(vh-SH*s)/2};
  stage.style.transform='translate('+L.ox+'px,'+L.oy+'px) scale('+s+')';
  const cssW=(portrait?692:820)*s,dpr=Math.min(window.devicePixelRatio||1,2);
  rs=cssW*dpr/RW;
  reelsCv.width=Math.round(RW*rs);reelsCv.height=Math.round(RH*rs);
  FX.resize();
  const key=window.innerWidth+'x'+window.innerHeight;
  if(key!==bgSize){
    bgSize=key;
    const bw=Math.min(window.innerWidth,1500),bh=Math.round(bw*window.innerHeight/window.innerWidth),bg=$('bg');
    bg.width=bw;bg.height=bh;bg.getContext('2d').drawImage(Art.background(bw,bh),0,0);
  }
}
function cellXY(i){const r=i/3|0,row=i%3;return [MX+r*CELL+CELL/2,MY+row*CELL+CELL/2];}
function toScreen(x,y){const b=reelsCv.getBoundingClientRect();return [b.left+x/RW*b.width,b.top+y/RH*b.height];}
function cellScreen(i){const p=cellXY(i);return toScreen(p[0],p[1]);}
function elCenter(el){const b=el.getBoundingClientRect();return [b.left+b.width/2,b.top+b.height/2];}

/* --- Rouleaux --- */
function initReels(){
  for(let i=0;i<5;i++){const n=E.BASE[i].length,p=Math.floor(Math.random()*n);R.push({i,strip:E.BASE[i],pos:p,target:p,state:'idle',t:0,v:0,vmax:0,left:0,travel:0,dur:0,antic:false,onland:null,start:p});}
  const inset=15,w=RW-inset*2,h=RH-inset*2,per=2*(w+h),n=74;
  for(let i=0;i<n;i++){
    const d=i/n*per;let x,y;
    if(d<w){x=inset+d;y=inset;}else if(d<w+h){x=RW-inset;y=inset+d-w;}else if(d<2*w+h){x=RW-inset-(d-w-h);y=RH-inset;}else{x=inset;y=RH-inset-(d-2*w-h);}
    BULBS.push([x,y]);
  }
}
function planStops(grid,opts,T){
  const t=[],antic=[];let scat=0,coin=0,cum=0;
  for(let r=0;r<5;r++){
    let a=false;
    if(r>=2&&scat>=2)a=true;
    if(!opts.fs&&((r===3&&coin>=3)||(r===4&&coin>=4)))a=true;
    antic[r]=a;
    if(a)cum+=T.antic;
    t[r]=T.base+r*T.step+cum;
    for(let row=0;row<3;row++){const s=grid[r*3+row];if(s===E.BONUS)scat++;else if(s===E.NUG)coin++;}
  }
  return {t,antic};
}
function spinReels(set,stops,grid,nugs,opts){
  return new Promise(resolve=>{
    opts=opts||{};
    const T=TIMING[G.turbo],plan=planStops(grid,opts,T);
    G.spinning=true;G.slam=false;G.grid=grid;G.nugs=nugs;G.override={};G.present=null;
    CF.forEach(f=>{f.pop=0;f.hot=false;});
    updateControls();
    let landed=0,scat=0,coin=0;
    Snd.spinStart();
    R.forEach((rl,i)=>{
      rl.strip=set[i];rl.target=stops[i];rl.state='kick';rl.t=-i*T.stagger;rl.start=rl.pos;rl.v=0;
      rl.left=plan.t[i];rl.antic=plan.antic[i];rl.vmax=rl.antic?T.vAntic:T.v;
      rl.onland=()=>{
        Snd.reelStop(i);
        for(let row=0;row<3;row++){
          const idx=i*3+row,s=grid[idx];
          if(s===E.BONUS){scat++;CF[idx].pop=1;CF[idx].hot=true;Snd.scatterLand(scat);const p=cellScreen(idx);FX.explode(p[0],p[1],.5,{col:'cyan'});FX.shake(.22);}
          else if(s===E.NUG){coin++;CF[idx].pop=1;Snd.coinLand(coin);const p=cellScreen(idx);FX.spray(p[0],p[1],16,'gold',300);}
          else if(s===E.WILD){CF[idx].pop=.8;const p=cellScreen(idx);FX.spray(p[0],p[1],14,'red',260);}
        }
        landed++;
        const nextR=R[i+1];
        if(nextR&&nextR.antic&&!G.slam){Snd.tensionStart();FX.shake(.14);$('reelbox').classList.add('antic');}
        if(landed===5){G.spinning=false;Snd.spinStop();Snd.tensionStop();$('reelbox').classList.remove('antic');updateControls();resolve();}
      };
    });
  });
}
function beginStop(rl){
  const T=TIMING[G.turbo],N=Math.max(2,Math.round(rl.v*T.dur/3));
  rl.travel=N;rl.dur=3*N/Math.max(rl.v,1);rl.t=0;rl.pos=rl.target+N;rl.state='stop';
}
function updateReels(dt){
  for(const rl of R){
    switch(rl.state){
      case 'kick':
        rl.t+=dt;
        if(rl.t>0){const u=Math.min(rl.t/.11,1);rl.pos=rl.start+.2*Math.sin(u*Math.PI);if(u>=1){rl.state='spin';rl.v=rl.vmax*.4;}}
        break;
      case 'spin':
        rl.v+=(rl.vmax-rl.v)*Math.min(1,dt*14);
        rl.pos-=rl.v*dt;rl.left-=dt;
        if(G.slam&&rl.left>rl.i*.03)rl.left=rl.i*.03;
        if(rl.left<=0)beginStop(rl);
        break;
      case 'stop':{
        rl.t+=dt;const u=Math.min(rl.t/rl.dur,1);
        rl.pos=rl.target+rl.travel*Math.pow(1-u,3);
        if(u>=1){rl.state='bounce';rl.t=0;rl.pos=rl.target;if(rl.onland)rl.onland();}
        break;
      }
      case 'bounce':{
        rl.t+=dt;const u=Math.min(rl.t/.15,1);
        rl.pos=rl.target-.11*Math.sin(u*Math.PI);
        if(u>=1){rl.state='idle';rl.pos=rl.target;}
        break;
      }
    }
  }
}
function nugSprite(n){
  if(n.k==='cash')return Art.nugLabel('gold',shortEur(cents(n.x*curBet())));
  if(n.k==='jp')return Art.nugLabel(n.jp,n.jp.toUpperCase());
  if(n.k==='tnt')return TNT_NUG;
  return Art.nugLabel('mult','×'+n.m);
}
function drawSymbol(c,sym,idx,x,y){
  let s=1,a=1;
  if(idx>=0){
    const f=CF[idx];
    if(f.pop>0)s+=.34*f.pop;
    if(f.hot)s+=.06*Math.sin(G.time*9);
    if(G.present&&!f.hot)a=.36;
  }
  let img=SYM[sym];
  if(sym===E.NUG&&idx>=0&&G.nugs&&G.nugs[idx])img=nugSprite(G.nugs[idx]);
  const d=CELL*.92;
  c.save();c.globalAlpha=a;c.translate(x+CELL/2,y+CELL/2);c.scale(s,s);c.drawImage(img,-d/2,-d/2,d,d);c.restore();
}
function drawColumn(c,rl){
  const x=MX+rl.i*CELL,n=rl.strip.length,ip=Math.floor(rl.pos),frac=rl.pos-ip;
  const blur=(rl.state==='spin'&&rl.v>9)||(rl.state==='stop'&&rl.t/rl.dur<.5);
  for(let k=0;k<4;k++){
    const y=MY+(k-frac)*CELL,raw=mod(ip+k,n);
    let sym=rl.strip[raw],idx=-1;
    if(rl.state==='stop'||rl.state==='bounce'||rl.state==='idle'){
      const off=mod(raw-rl.target,n);
      if(off<3)idx=rl.i*3+off;
    }
    if(idx>=0&&G.override[idx]!==undefined)sym=G.override[idx];
    if(blur)c.drawImage(BLUR[sym],x+CELL*.04,y+CELL*.04,CELL*.92,CELL*.92);
    else drawSymbol(c,sym,idx,x,y);
  }
}
const LINE_COL=['#ffd34d','#ff5a7a','#4dd8ff','#6dff9a','#ff9a2e','#d36bff','#fffa8a','#ff72c8','#58ffe0','#9ab6ff','#ffb36b','#b6ff5c','#ff8aa8','#7ac6ff','#e0a0ff','#ffe066','#6df0c0','#ff6d4d','#a0f0ff','#f2c0ff'];
function drawLine(c,l,alpha){
  const pts=E.LINES[l].map((row,r)=>[MX+r*CELL+CELL/2,MY+row*CELL+CELL/2]);
  const path=()=>{c.beginPath();c.moveTo(MX-8,pts[0][1]);pts.forEach(p=>c.lineTo(p[0],p[1]));c.lineTo(RW-MX+8,pts[4][1]);};
  c.save();c.lineJoin='round';c.lineCap='round';c.globalCompositeOperation='lighter';
  c.strokeStyle=LINE_COL[l];c.globalAlpha=alpha*.32;c.lineWidth=20;path();c.stroke();
  c.globalAlpha=alpha*.9;c.lineWidth=7;path();c.stroke();
  c.strokeStyle='#fff';c.globalAlpha=alpha;c.lineWidth=2.5;path();c.stroke();
  c.restore();
}
function markCells(w){
  const L0=E.LINES[w.line];
  for(let r=0;r<w.cnt;r++)CF[r*3+L0[r]].hot=true;
}
function drawPresent(c){
  const P=G.present;if(!P)return;
  if(P.phase==='all'){const a=.6+.4*Math.sin((G.time-P.t0)*10);P.wins.forEach(w=>drawLine(c,w.line,a));}
  else if(P.wins.length){
    const n=P.wins.length,i=Math.floor((G.time-P.t0)/.95)%n,w=P.wins[i];
    if(P.cur!==i){P.cur=i;CF.forEach(f=>{f.hot=false;});markCells(w);P.label=(P.mult>1?'×'+P.mult+'  ':'')+'Ligne '+(w.line+1)+'  '+fmtBig(cents(w.pay*(P.mult||1)*curBet()));}
    drawLine(c,w.line,.95);
  }
  if(P.label){
    const sz=FX.fitSize(P.label,RW-140,50,'white',true);
    FX.drawText(c,P.label,RW/2,RH-MY-18,sz,'white',{tab:true});
  }
}
function drawHold(c){
  for(let i=0;i<15;i++){
    const r=i/3|0,row=i%3,x=MX+r*CELL,y=MY+row*CELL,s=HS.cells[i],f=CF[i];
    Art.rr(c,x+6,y+6,CELL-12,CELL-12,16);
    c.fillStyle=s.coin?'rgba(92,52,8,.62)':'rgba(8,22,48,.78)';c.fill();
    c.strokeStyle=s.coin?'#ffd34d':'rgba(90,190,255,.32)';c.lineWidth=s.coin?3.5:2;c.stroke();
    if(s.coin){
      const q=1+.34*f.pop+(f.hot?.06*Math.sin(G.time*9):0),d=CELL*.92;
      c.save();c.translate(x+CELL/2,y+CELL/2);c.scale(q,q);c.drawImage(nugSprite(s.coin),-d/2,-d/2,d,d);c.restore();
    }else if(s.spin){
      const off=(G.time*7+i*.37)%1;
      c.save();Art.rr(c,x+8,y+8,CELL-16,CELL-16,14);c.clip();c.globalAlpha=.6;
      for(let k=-1;k<=1;k++)c.drawImage(BLUR[E.NUG],x+CELL*.1,y+(k+off)*CELL+CELL*.04,CELL*.8,CELL*.92);
      c.restore();
    }
  }
}
function drawAnticipation(c){
  const a=R.find(r=>r.antic&&r.state==='spin');
  if(!a)return;
  const x=MX+a.i*CELL,p=.55+.45*Math.sin(G.time*20),h=RH-2*MY;
  c.fillStyle='rgba(8,3,18,.56)';
  for(const r of R)if(r.i!==a.i&&r.state==='idle'){
    c.fillRect(MX+r.i*CELL,MY,CELL,h);
    for(let row=0;row<3;row++){const idx=r.i*3+row;if(CF[idx].hot||G.grid[idx]===E.NUG)drawSymbol(c,G.grid[idx],idx,MX+r.i*CELL,MY+row*CELL);}
  }
  c.save();c.globalCompositeOperation='lighter';
  c.fillStyle='rgba(255,170,40,'+(.14+.14*p)+')';c.fillRect(x,MY,CELL,h);
  c.strokeStyle='rgba(255,226,130,'+(.75+.25*p)+')';c.lineWidth=7;c.strokeRect(x+4,MY+4,CELL-8,h-8);
  c.restore();
  if(Math.random()<.65){const q=toScreen(x+rand(0,CELL),Math.random()<.5?MY:RH-MY);FX.spray(q[0],q[1],2,'gold',240);}
}
function drawBulbs(c){
  const t=G.time,n=BULBS.length;
  let k;
  if(G.present||G.bulbHot)k=(i)=>((Math.floor(t*9)+i)%2===0?1:0);
  else if(G.spinning)k=(i)=>((Math.floor(t*20)+i)%3===0?0:(i+Math.floor(t*20))%3===1?2:-1);
  else k=(i)=>((Math.floor(t*3.5)+i)%4===0?0:-1);
  for(let i=0;i<n;i++){
    const b=BULBS[i],m=k(i);
    c.drawImage(m>=0?bulbOn[m]:bulbOff,b[0]-13,b[1]-13,26,26);
  }
}
function drawReels(){
  const c=rctx;
  c.setTransform(rs,0,0,rs,0,0);c.clearRect(0,0,RW,RH);
  c.drawImage(reelBackImg,0,0);
  if(G.mode!=='base'){c.fillStyle=G.mode==='fs'?'rgba(255,70,20,.14)':'rgba(30,190,255,.12)';c.fillRect(MX,MY,RW-2*MX,RH-2*MY);}
  c.save();c.beginPath();c.rect(MX,MY,RW-2*MX,RH-2*MY);c.clip();
  if(G.mode==='hold')drawHold(c);else R.forEach(rl=>drawColumn(c,rl));
  drawAnticipation(c);
  drawPresent(c);
  c.restore();
  c.drawImage(frameImg,0,0,RW,RH);
  drawBulbs(c);
}

/* --- Boucle --- */
let last=0,flickT=0;
function tick(dt){
  G.time+=dt;
  if(G.slowT>0){G.slowT-=dt;if(G.slowT<=0)G.slow=1;}
  const sdt=dt*G.slow,gdt=sdt*SPEED[G.turbo];
  for(let i=timers.length-1;i>=0;i--){const t=timers[i];t.t-=gdt;if(t.t<=0){timers.splice(i,1);t.res();}}
  for(let i=tweens.length-1;i>=0;i--){
    const t=tweens[i];t.l+=gdt;const u=Math.min(t.l/t.d,1);t.fn(t.e(u));
    if(u>=1){tweens.splice(i,1);t.res();}
  }
  updateReels(sdt);
  for(const f of CF)if(f.pop>0)f.pop=Math.max(0,f.pop-sdt*3.6);
  FX.update(sdt);
  stepCounter(ui.bal,dt);stepCounter(ui.win,dt);
  flickT-=dt;
  if(flickT<=0){flickT=.07+Math.random()*.14;$('flicker').style.opacity=(.55+Math.random()*.45).toFixed(2);}
  if(!FX.reduced&&Math.random()<dt*7)FX.add({img:FX.tint.gold,x:rand(0,FX.W),y:FX.H+8,vx:rand(-20,20),vy:rand(-120,-50),s:rand(4,9),m:rand(3,6.5),add:1,al:.75});
  drawReels();FX.draw();
  const s=FX.getShake();
  stage.style.transform='translate('+(L.ox+s.x)+'px,'+(L.oy+s.y)+'px) rotate('+s.r+'rad) scale('+L.s+')';
}
function frame(now){
  const dt=Math.min((now-last)/1000||0,.05);last=now;
  tick(dt);requestAnimationFrame(frame);
}

/* --- Contrôles --- */
function updateControls(){
  const b=G.busy,a=!!G.auto;
  $('betMax').disabled=b||a;
  $('betDown').disabled=b||a||G.betIdx===0;
  $('betUp').disabled=b||a||G.betIdx===BETS.length-1;
  $('buyBtn').disabled=b||a;
  $('autoBtn').disabled=b&&!a;
  $('autoBtn').classList.toggle('on',a);
  $('autoLeft').textContent=a?(G.auto.infinite?'∞':String(G.auto.left)):'';
  const sb=$('spinBtn');
  sb.classList.toggle('auto',a);sb.classList.toggle('stop',!a&&G.spinning);
  $('spinTxt').textContent=a||G.spinning?'STOP':'SPIN';
  sb.setAttribute('aria-label',a?'Arrêter le mode auto':G.spinning?'Arrêter les rouleaux':'Lancer les rouleaux');
}
function fitOutput(el,maxW,base){el.style.fontSize=Math.min(base,maxW/(el.textContent.length*.6)).toFixed(1)+'px';}
function refreshJackpots(){
  const bet=curBet(),p=G.shownProg||G.prog,port=stage.classList.contains('portrait');
  for(const k of E.JP_ORDER){
    const el=$('jpv-'+k);el.textContent=eur((E.JP_BASE[k]+p[k])*bet);
    const sup=k==='super';
    fitOutput(el,port?(sup?650:150):188,port?(sup?44:30):(sup?34:28));
  }
}
function refreshBet(){
  $('bet').textContent=eur(curBet());
  const min=Math.min(...E.OFFERS.map(o=>o.price));
  $('buyFrom').textContent='dès '+eur(cents(min*curBet()));
  refreshJackpots();updateControls();
}
function refreshReport(){
  const s=G.stats;
  $('rSpins').textContent=s.spins.toLocaleString('fr-FR');
  $('rDry').textContent=s.dry.toLocaleString('fr-FR');
  $('rBest').textContent=eur(s.best);
  $('rRtp').textContent=s.wagered>0?(s.won/s.wagered*100).toFixed(1).replace('.',',')+' %':'–';
}
function changeBet(d){
  const n=Math.min(BETS.length-1,Math.max(0,G.betIdx+d));
  if(n===G.betIdx)return;
  G.betIdx=n;Snd.setup();Snd.click();refreshBet();save();
  if(!$('mBuy').hidden)renderOffers();
}
function setSound(v){G.sound=v;Snd.setMuted(!v);$('soundBtn').classList.toggle('off',!v);$('soundBtn').setAttribute('aria-label',v?'Couper le son':'Activer le son');}
function cycleTurbo(){
  G.turbo=(G.turbo+1)%3;
  $('turboBtn').classList.toggle('on',G.turbo>0);
  $('turboBtn').setAttribute('aria-pressed',G.turbo>0?'true':'false');
  $('turboLvl').textContent=['off','×2','×3'][G.turbo];
}

/* --- Tour de jeu --- */
function hideGamble(){$('gambleBtn').hidden=true;}
async function playRound(buyId){
  if(G.busy)return false;
  const bet=curBet(),of=buyId?E.OFFERS.find(o=>o.id===buyId):null,cost=of?cents(of.price*bet):bet;
  if(G.balance<cost-1e-9){
    if(of)toast('Solde insuffisant pour ce bonus');else openBroke();
    return false;
  }
  Snd.setup();
  G.busy=true;updateControls();hideGamble();
  G.balance=cents(G.balance-cost);
  setCounter(ui.bal,G.balance,true);setCounter(ui.win,0,true);
  G.stats.wagered=cents(G.stats.wagered+cost);
  if(!of)G.stats.spins++;
  const before={...G.prog};
  const ctx={rng,prog:G.prog};
  const o=/*DEV*/window.__forced?window.__forced(ctx,bet,buyId):/*ENDDEV*/(of?E.buy(ctx,buyId):E.spin(ctx));
  G.shownProg=o.feature?Object.fromEntries(E.JP_ORDER.map(k=>[k,before[k]+(G.prog[k]>=before[k]?G.prog[k]-before[k]:0)])):null;
  refreshJackpots();
  const total=cents(Math.min(o.total,E.MAX_WIN)*bet);
  G.pending=total;save();
  G.round={o,bet,total,run:0};
  G.lastFeature=!!o.feature;
  if(o.feature){G.stats.dry=0;G.stats.bonus++;}else G.stats.dry++;
  refreshReport();
  try{
    if(!of){
      await spinReels(E.BASE,o.stops,o.grid,o.nugs,{});
      if(o.blast)await playBlast(o);
      if(o.wins.length||o.scat)await showWins(o,bet);
    }
    if(o.feature)await runFeature(o,bet);
    await finishRound(o,bet,total);
  }catch(e){
    console.error(e);
    Snd.stopAll();FX.setScene(null);disarm();setMode('base');
    G.balance=cents(G.balance+G.pending);G.pending=0;setCounter(ui.bal,G.balance,true);
  }
  G.busy=false;G.spinning=false;G.shownProg=null;refreshJackpots();updateControls();save();
  return true;
}
async function playBlast(o){
  const T=(u)=>{
    const w=RW-2*MX,h=RH-2*MY,per=2*(w+h);let d=u*per;
    if(d<w)return [MX+d,MY];d-=w;
    if(d<h)return [RW-MX,MY+d];d-=h;
    if(d<w)return [RW-MX-d,RH-MY];d-=w;
    return [MX,RH-MY-d];
  };
  G.bulbHot=true;
  FX.flash('red',.3);
  const c=toScreen(RW/2,RH/2);
  FX.float('DÉFLAGRATION !',c[0],c[1],Math.min(FX.W*.09,72),'fire');
  Snd.fuseStart();
  await tween(900,u=>{const p=T(u),q=toScreen(p[0],p[1]);FX.spray(q[0],q[1],5,'gold',220);});
  Snd.fuseStop();
  for(const i of o.blast){
    G.override[i]=E.WILD;CF[i].pop=1;
    const p=cellScreen(i);FX.explode(p[0],p[1],1,{col:'red',coins:12});
    Snd.explosion(.75);FX.shake(.32);
    await wait(150);
  }
  G.bulbHot=false;
  await wait(180);
}
async function showWins(o,bet){
  const amountX=o.linePay+o.scat,amount=cents(amountX*bet);
  if(amountX<=0)return;
  o.wins.forEach(markCells);
  const P={wins:o.wins,phase:'all',t0:G.time,label:'',mult:1};
  G.present=P;
  Snd.smallWin(amountX);
  const cells=CF.map((f,i)=>f.hot?i:-1).filter(i=>i>=0);
  for(const i of cells){const p=cellScreen(i);FX.spray(p[0],p[1],8+Math.min(amountX,20)*1.3|0,'gold',300);if(amountX>=3)FX.coins(p[0],p[1],Math.min(amountX,10)|0,520);}
  if(amountX>=5){FX.shake(.3);FX.flash('gold',.22);}
  const dur=amountX>=BIG?360:amountX<1?420:amountX<5?760:1200;
  G.round.run=amount;
  await tween(dur,u=>{P.label=fmtBig(cents(amount*u));setCounter(ui.win,amount*u,true);},ease.out3);
  P.label=fmtBig(amount);setCounter(ui.win,amount,true);
  if(amountX<BIG)await wait(o.feature||G.auto?420:680,true);
}
function setMode(m){
  G.mode=m;
  $('bg').style.filter=m==='fs'?'hue-rotate(-24deg) saturate(1.5) brightness(1.12)':m==='hold'?'hue-rotate(165deg) saturate(1.3)':'none';
  $('logoBox').hidden=m!=='base';
  $('hud').hidden=m==='base';
  $('hudMult').hidden=m!=='fs';
}
function card(text,sub,style,dur){return FX.titleCard({text,sub,style,dur:(G.auto?Math.min(dur,1.3):dur)*FAST[G.turbo],arm,disarm});}
async function runFeature(o,bet){
  const f=o.feature;
  const fromSpin=!o.bought;
  if(fromSpin){
    Snd.freeze();slowMo(.2,.32);
    await wait(120);
    Snd.unfreeze();
    if(f.kind==='wheel'){
      CF.forEach((c,i)=>{if(o.grid[i]===E.BONUS){const p=cellScreen(i);FX.explode(p[0],p[1],1.5,{col:'cyan',coins:24});}});
    }else{
      CF.forEach((c,i)=>{if(o.grid[i]===E.NUG){const p=cellScreen(i);FX.explode(p[0],p[1],.8,{col:'gold',coins:14});}});
    }
    Snd.explosion(1.7);FX.flash('white',.95);FX.shake(.9);
    await wait(620);
  }
  G.present=null;CF.forEach(c=>{c.hot=false;});
  if(f.kind==='wheel'){
    G.mood='wheel';Snd.mood('wheel');
    for(let i=0;i<f.spins.length;i++)await wheelSpin(f.spins[i].level,f.spins[i].idx,bet);
    const r=f.result;
    if(r.kind==='fs')await runFS(r,bet);
    else if(r.kind==='hold')await runHold(r,bet);
    else if(r.kind==='jp')await jackpotShow(r.jp,r.total,bet);
    else{Snd.smallWin(10);setCounter(ui.win,G.round.run+r.total*bet,true);}
  }else if(f.kind==='fs')await runFS(f,bet);
  else await runHold(f,bet);
  G.mood='base';Snd.mood('base');
  setMode('base');
}
function jackpotShow(name,v,bet){
  const m={mini:{t:'MINI JACKPOT',s:'green',r:'green',l:0,d:2},minor:{t:'MINOR JACKPOT',s:'ice',r:'cyan',l:1,d:2.8},major:{t:'MAJOR JACKPOT',s:'violet',r:'violet',l:2,d:4.2},grand:{t:'GRAND JACKPOT',s:'fire',r:'red',l:3,d:6.5},super:{t:'SUPER JACKPOT',s:'cycle',r:'pink',l:4,d:10}}[name];
  const el=$('jp-'+name);el.classList.remove('hit');void el.offsetWidth;el.classList.add('hit');
  Snd.siren();FX.flash('white',.9);FX.shake(.7);
  return FX.bigWin({title:m.t,style:m.s,ray:m.r,level:m.l,dur:m.d,multiple:v,bet,format:fmtBig,arm,disarm,fast:FAST[G.turbo],moodAfter:G.mood,maxWin:E.MAX_WIN});
}

/* --- Roue --- */
const wheelCache={};
function wheelImg(l){return wheelCache[l]||(wheelCache[l]=Art.wheel(E.WHEELS[l]));}
const pointerImg=(()=>{let p;return ()=>p||(p=Art.pointer());})();
function wedgeText(w,bet){
  if(w.k==='fs')return E.FS[w.t].name;
  if(w.k==='hold')return E.HOLD[w.t].name;
  if(w.k==='cash')return fmtBig(cents(w.x*bet));
  if(w.k==='up')return 'CREUSE ENCORE !';
  return w.jp.toUpperCase()+' JACKPOT';
}
function wheelSpin(level,idx,bet){
  return new Promise(resolve=>{
    const W=E.WHEELS[level],n=W.wedges.length,step=Art.TAU/n,img=wheelImg(level),w=W.wedges[idx];
    const S={phase:'in',t:0,ang:Math.random()*Art.TAU,kick:0,appear:0,last:0,res:0,glow:0,prompt:0};
    const a0=S.ang;
    // Arrêt quelque part dans la bonne case, souvent tout près du bord : la roue hésite jusqu'au bout
    const nearEdge=Math.random()<.55,jit=(nearEdge?(Math.random()<.5?-1:1)*(step/2-.022):(Math.random()-.5)*step*.7);
    let target=-idx*step+jit;
    target+=Art.TAU*Math.ceil((a0+Art.TAU*6-target)/Art.TAU);
    const dur=[5.4,3.6,2.6][G.turbo];
    S.last=Math.floor((S.ang+step/2)/step);
    Snd.explosion(.8);FX.flash('gold',.4);
    const cx=()=>FX.W/2,cy=()=>FX.H*.57,rad=()=>Math.min(FX.W*.46,FX.H*.4);
    function go(){if(S.phase!=='ready')return;disarm();S.phase='spin';S.t=0;Snd.fireball();}
    const scene={
      update(dt){
        S.t+=dt;S.kick*=Math.pow(.0005,dt);
        if(S.phase==='in'){
          S.appear=Math.min(1,S.t/.5);
          if(S.appear>=1){S.phase='ready';S.t=0;arm(go);if(G.auto)S.prompt=-1;}
        }else if(S.phase==='ready'){
          if(G.auto&&S.t>.45)go();
          else if(S.t>9)go();
        }else if(S.phase==='spin'){
          const u=Math.min(S.t/dur,1);
          S.ang=a0+(target-a0)*ease.out4(u);
          const b=Math.floor((S.ang+step/2)/step);
          if(b!==S.last){S.last=b;S.kick=1;Snd.wheelTick(1-u);}
          if(u>=1){
            S.phase='result';S.t=0;
            FX.flash(w.k==='jp'?'white':'gold',.65);FX.shake(.5);
            FX.explode(cx(),cy()-rad()*.72,1.4,{coins:30,col:w.k==='jp'?'pink':'gold'});
            Snd.stinger(level+(w.k==='jp'?1:0));Snd.explosion(1);
          }
        }else if(S.phase==='result'){
          if(S.t>[1.5,1.05,.75][G.turbo]){
            S.phase='out';S.t=0;
            if(w.k==='up'){Snd.explosion(1.6);FX.flash('white',.9);FX.shake(.7);FX.explode(cx(),cy(),2.2,{coins:50});}
          }
        }else if(S.phase==='out'){
          S.appear=Math.max(0,1-S.t/.3);
          if(S.t>=.32){FX.setScene(null);resolve();}
        }
      },
      back(x,W2,H2){
        const a=S.phase==='in'?S.appear:S.phase==='out'?S.appear:1;
        x.globalAlpha=a*.88;x.fillStyle='#0a0314';x.fillRect(0,0,W2,H2);
        const RR=Math.max(W2,H2)*1.5;
        x.globalCompositeOperation='lighter';x.globalAlpha=a*(S.phase==='result'?.75:.34);
        x.save();x.translate(cx(),cy());x.rotate(G.time*.25);x.drawImage(FX.rayT[['gold','cyan','pink'][level]],-RR/2,-RR/2,RR,RR);x.restore();
        x.globalCompositeOperation='source-over';x.globalAlpha=1;
      },
      front(x,W2,H2){
        const a=S.appear,sc=S.phase==='in'?.5+.5*ease.out3(a)+.07*Math.sin(a*Math.PI):1,r=rad()*sc,CX=cx(),CY=cy();
        x.globalAlpha=a;
        const size=r*2*960/(960-88);
        x.save();x.translate(CX,CY);x.rotate(S.ang);x.drawImage(img,-size/2,-size/2,size,size);
        if(S.phase==='result'){
          x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,255,220,'+(.28+.28*Math.sin(G.time*16))+')';
          const q=-S.ang-Math.PI/2;
          x.beginPath();x.moveTo(0,0);x.arc(0,0,r,q-step/2,q+step/2);x.closePath();x.fill();
          x.globalCompositeOperation='source-over';
        }
        x.restore();
        for(let i=0;i<30;i++){
          const an=i/30*Art.TAU,on=(Math.floor(G.time*(S.phase==='spin'?22:8))+i)%3===0,bx=CX+Math.cos(an)*r*1.018,by=CY+Math.sin(an)*r*1.018,bs=r*.09;
          x.globalCompositeOperation='lighter';x.globalAlpha=a*(on?1:.28);x.drawImage(FX.tint[['gold','cyan','pink'][level]],bx-bs/2,by-bs/2,bs,bs);
        }
        x.globalCompositeOperation='source-over';x.globalAlpha=a;
        const pw=r*.26,pi=pointerImg();
        x.save();x.translate(CX,CY-r*1.05);x.rotate(-S.kick*.5);x.drawImage(pi,-pw/2,-pw*.24,pw,pw*140/120);x.restore();
        const ts=FX.fitSize(E.WHEELS[level].name,W2*.8,Math.min(H2*.09,W2*.09),['gold','ice','fire'][level]);
        FX.drawText(x,E.WHEELS[level].name,CX,Math.max(ts*1.05,CY-r*1.2),ts,['gold','ice','fire'][level]);
        if(S.phase==='ready'&&!G.auto){
          const ps=Math.max(16,r*.1);
          x.font='700 '+ps+'px "Barlow Condensed","Arial Narrow",Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';
          x.lineJoin='round';x.lineWidth=ps*.32;x.strokeStyle='rgba(10,3,20,.92)';x.fillStyle='#fff3cf';
          x.globalAlpha=a*(.65+.35*Math.sin(G.time*6));
          x.strokeText('TOUCHE POUR LANCER',CX,CY+r*.5);x.fillText('TOUCHE POUR LANCER',CX,CY+r*.5);x.globalAlpha=a;
        }
        if(S.phase==='result'){
          const txt=wedgeText(w,bet),st=w.k==='jp'?'cycle':'gold',q=FX.fitSize(txt,W2*.86,Math.min(H2*.15,W2*.13),st);
          const u=Math.min(S.t/.16,1),k=2.4-1.4*ease.out3(u);
          FX.drawText(x,txt,CX,CY+q*.3,q,st,{fn:()=>({s:k,a:1})});
        }
        x.globalAlpha=1;
      },
    };
    FX.setScene(scene);
  });
}

/* --- Free spins --- */
const FSS={M:1,total:0};
function hudFS(played,left){
  $('hudCountLbl').textContent='TOUR';
  $('hudCountVal').textContent=played+' / '+(played+left);
}
async function runFS(r,bet){
  await card(r.name,r.spins+' tours · multiplicateur ×'+r.m0+' · chaque Wild ajoute +'+r.inc,'fire',2.3);
  setMode('fs');G.mood='fs';Snd.mood('fs',0);
  FSS.M=r.m0;FSS.total=0;
  $('hudMultVal').textContent='×'+FSS.M;$('hudTotalVal').textContent=eur(0);hudFS(0,r.spins);
  await wait(300);
  for(let s=0;s<r.steps.length;s++){
    const st=r.steps[s];
    hudFS(s+1,st.left);
    await spinReels(E.FREE,st.stops,st.grid,null,{fs:true});
    if(st.nw>0){
      const cells=st.grid.map((v,i)=>v===E.WILD?i:-1).filter(i=>i>=0);
      const target=elCenter($('hudMult'));
      let m=st.before;
      await wait(120);
      for(let k=0;k<cells.length;k++){
        const p=cellScreen(cells[k]);
        CF[cells[k]].pop=1;FX.explode(p[0],p[1],.75,{col:'red'});Snd.explosion(.55);Snd.fireball();FX.shake(.22);
        await new Promise(res=>FX.trail(p[0],p[1],target[0],target[1],.42,'red',res));
        m=Math.min(m+r.inc,100);
        FSS.M=m;$('hudMultVal').textContent='×'+m;punch($('hudMult'));Snd.multUp(m);FX.flash('red',.18);
        FX.spray(target[0],target[1],40,'gold',460);
      }
      Snd.mood('fs',Math.floor(FSS.M/4));
      await wait(140);
    }
    if(st.wins.length){
      const amount=cents(st.win*bet),base=cents(st.base*bet);
      st.wins.forEach(markCells);
      const P={wins:st.wins,phase:'all',t0:G.time,label:'',mult:st.M};
      G.present=P;
      const xw=st.win;
      Snd.smallWin(xw);
      CF.forEach((f,i)=>{if(f.hot){const p=cellScreen(i);FX.spray(p[0],p[1],14,'gold',320);if(xw>=5)FX.coins(p[0],p[1],6,520);}});
      if(xw>=25){FX.shake(.5);FX.flash('gold',.4);Snd.explosion(.9);}
      const from=FSS.total,dur=xw<5?620:xw<50?1050:1700;
      P.label=fmtBig(base)+'  ×'+st.M;
      await wait(300,true);
      await tween(dur,u=>{P.label=fmtBig(cents(amount*u));$('hudTotalVal').textContent=eur(cents(from+amount*u));},ease.out3);
      P.label=fmtBig(amount);
      FSS.total=cents(from+amount);$('hudTotalVal').textContent=eur(FSS.total);punch($('hudTotal'));
      setCounter(ui.win,G.round.run+FSS.total,true);
      await wait(xw<5?300:620,true);
      G.present=null;CF.forEach(f=>{f.hot=false;});
    }else await wait(240);
    if(st.retrig){await card('+'+st.retrig+' FREE SPINS','Les Détonateurs relancent la mèche','gold',1.5);}
    if(r.capped&&s===r.steps.length-1){await card('MAX WIN',null,'cycle',1.2);}
    await wait(120);
  }
  G.round.run=cents(G.round.run+r.total*bet);
}

/* --- Hold & Blast --- */
function hudHold(){
  $('hudCountLbl').textContent='RELANCES';
  const v=$('hudCountVal');
  v.textContent='';
  const d=document.createElement('span');d.className='dots';
  for(let i=0;i<E.RESPINS;i++){const b=document.createElement('i');if(i<HS.left)b.className='on';d.appendChild(b);}
  v.appendChild(d);
}
async function runHold(r,bet){
  await card(r.name,'3 relances · chaque nouvelle pépite remet le compteur à 3 · plein écran = SUPER JACKPOT','ice',2.3);
  setMode('hold');G.mood='hold';Snd.mood('hold');
  CF.forEach(f=>{f.pop=0;f.hot=false;});
  HS.cells=r.start.map(()=>({coin:null,spin:false}));
  HS.left=E.RESPINS;hudHold();$('hudTotalVal').textContent=eur(0);
  let n=0;
  for(let i=0;i<15;i++){
    if(!r.start[i])continue;
    HS.cells[i].coin={...r.start[i]};CF[i].pop=1;Snd.coinLand(n++);
    const p=cellScreen(i);FX.spray(p[0],p[1],18,'gold',320);
    await wait(110);
  }
  await wait(360);
  for(const st of r.steps){
    HS.left=Math.max(0,HS.left-1);hudHold();
    const empties=HS.cells.map((c,i)=>c.coin?-1:i).filter(i=>i>=0);
    const tense=empties.length<=3;
    empties.forEach(i=>{HS.cells[i].spin=true;});
    Snd.spinStart();
    if(tense){Snd.heartStart(540);G.bulbHot=true;}
    await wait(tense?620:330);
    const landed=new Map(st.land.map(l=>[l.i,l.n]));
    for(const i of empties){
      HS.cells[i].spin=false;
      if(landed.has(i)){
        const nn=landed.get(i);
        HS.cells[i].coin={...nn};CF[i].pop=1;n++;
        Snd.coinLand(n);
        const p=cellScreen(i);
        if(nn.k==='jp'){FX.explode(p[0],p[1],.8,{col:'pink'});FX.shake(.25);}
        else if(nn.k==='tnt'){FX.explode(p[0],p[1],.6,{col:'red'});}
        else if(nn.k==='mult'){FX.explode(p[0],p[1],.7,{col:'violet'});}
        else FX.spray(p[0],p[1],22,'gold',340);
        await wait(tense?420:120);
      }else{
        Snd.emptyTick();
        await wait(tense?300:46);
      }
    }
    Snd.spinStop();Snd.heartStop();G.bulbHot=false;
    for(const b of st.boom){
      await wait(160);
      const p=cellScreen(b.i);
      FX.explode(p[0],p[1],1.5,{col:'red',coins:18});Snd.explosion(1.2);FX.flash('red',.35);FX.shake(.5);
      HS.cells[b.i].coin={...b.n};CF[b.i].pop=1;
      for(const t of b.to){
        HS.cells[t.j].coin={...t.n};HS.cells[t.j].spin=false;CF[t.j].pop=1;n++;
        const q=cellScreen(t.j);FX.explode(q[0],q[1],.7,{col:'gold'});Snd.coinLand(n);
        await wait(120);
      }
      await wait(160);
    }
    for(const m of st.mults){
      await wait(200);
      const p=cellScreen(m.i);
      FX.explode(p[0],p[1],1.3,{col:'violet',coins:12});FX.float('×'+m.m,p[0],p[1]-20,Math.min(FX.W*.14,120),'violet');
      Snd.multUp(10+m.m*2);Snd.explosion(.9);FX.flash('violet',.34);FX.shake(.45);
      HS.cells.forEach((c,i)=>{if(c.coin){const tp=cellScreen(i);FX.trail(p[0],p[1],tp[0],tp[1],.32,'violet');CF[i].pop=1;}});
      await wait(420);
    }
    st.after.forEach((c,i)=>{if(c){HS.cells[i].coin={...c};HS.cells[i].spin=false;}});
    HS.left=st.left;
    if(st.land.length){
      hudHold();punch($('hudCount'));Snd.respinReset();FX.flash('cyan',.14);
      await wait(280);
    }else await wait(tense?420:320);
  }
  HS.cells.forEach(c=>{c.spin=false;});
  await wait(420);
  G.bulbHot=true;
  let tot=0,k=0;
  const hudT=elCenter($('hudTotal'));
  for(const p of r.pays){
    CF[p.i].pop=1;CF[p.i].hot=true;
    const q=cellScreen(p.i);
    if(p.c.k==='jp'){
      await jackpotShow(p.c.jp,p.v,bet);
    }else{
      FX.trail(q[0],q[1],hudT[0],hudT[1],.3,'gold');
      Snd.coinLand(Math.min(k,18));
    }
    tot=cents(tot+p.v*bet);k++;
    $('hudTotalVal').textContent=eur(tot);punch($('hudTotal'));
    setCounter(ui.win,G.round.run+tot,true);
    await wait(p.v*1>=25?280:130);
  }
  if(r.full){
    await jackpotShow('super',r.sup,bet);
    tot=cents(tot+r.sup*bet);$('hudTotalVal').textContent=eur(tot);
  }
  G.bulbHot=false;
  await wait(520);
  G.round.run=cents(G.round.run+r.total*bet);
  HS.cells=null;
}

function coinStream(amount){
  const t=elCenter($('balBox')),n=Math.min(26,8+Math.log10(amount+1)*4|0);
  for(let i=0;i<n;i++)setTimeout(()=>{FX.trail(FX.W/2+rand(-160,160),FX.H*.55+rand(-100,100),t[0],t[1],.55,'gold',i===n-1?()=>punch($('balBox')):null);},i*42);
}
async function finishRound(o,bet,total){
  const x=Math.min(o.total,E.MAX_WIN);
  if(x>=BIG){
    await FX.bigWin({multiple:x,maxWin:E.MAX_WIN,bet,format:fmtBig,arm,disarm,fast:FAST[G.turbo],moodAfter:'base',onExit:()=>coinStream(total)});
  }else if(o.feature&&total>0){
    await card(fmtBig(total),'Gain total du bonus','gold',1.5);
  }else if(o.feature){
    await card('PSCHITT','La mèche a fait long feu','violet',1.1);
  }
  G.balance=cents(G.balance+total);G.pending=0;
  G.stats.won=cents(G.stats.won+total);
  if(total>G.stats.best)G.stats.best=total;
  setCounter(ui.bal,G.balance);setCounter(ui.win,total);
  refreshReport();
  G.lastWin=total;
  if(total>0&&!G.auto&&x<2000){$('gambleBtn').hidden=false;}
  if(G.present&&G.present.wins.length&&!o.feature){
    if(G.auto){G.present=null;CF.forEach(f=>{f.hot=false;});}
    else{G.present.phase='cycle';G.present.t0=G.time;G.present.cur=-1;}
  }
}

/* --- Auto --- */
const autoPick={spins:50,loss:0,win:0};
function stopAuto(){if(!G.auto)return;G.auto=null;updateControls();}
async function autoLoop(){
  while(G.auto){
    const a=G.auto;
    if(!a.infinite&&a.left<=0){stopAuto();break;}
    if(!a.infinite)a.left--;
    updateControls();
    const ok=await playRound(null);
    if(!ok){stopAuto();break;}
    if(!G.auto)break;
    if(a.loss&&a.start-G.balance>=a.loss){toast('Auto arrêté : limite de perte atteinte');stopAuto();break;}
    if(a.win&&G.lastWin>=a.win){toast('Auto arrêté : gain visé atteint');stopAuto();break;}
    if(a.bonus&&G.lastFeature){toast('Auto arrêté : bonus tombé');stopAuto();break;}
    await wait(G.lastWin>0?300:110);
  }
  updateControls();
}
function renderAuto(){
  const bet=curBet();
  const chips=(box,opts,key,lab)=>{
    const b=$(box);b.textContent='';
    opts.forEach(v=>{
      const e=document.createElement('button');e.type='button';e.textContent=lab(v);
      if(autoPick[key]===v)e.className='on';
      e.onclick=()=>{autoPick[key]=v;Snd.click();renderAuto();};
      b.appendChild(e);
    });
  };
  chips('aSpins',[10,25,50,100,250,1000,Infinity],'spins',v=>v===Infinity?'∞':String(v));
  if(![0,50,100,250,500].includes(autoPick.loss))autoPick.loss=0;
  chips('aLoss',[0,50,100,250,500],'loss',v=>v?eur(cents(v*bet)):'Jamais');
  chips('aWin',[0,20,50,100,500],'win',v=>v?eur(cents(v*bet)):'Jamais');
}
function startAuto(){
  const bet=curBet();
  closeModal('mAuto');
  G.auto={left:autoPick.spins===Infinity?0:autoPick.spins,infinite:autoPick.spins===Infinity,loss:autoPick.loss*bet,win:autoPick.win*bet,bonus:$('aBonus').checked,start:G.balance};
  autoLoop();
}

/* --- Achat de bonus --- */
const OFFER_TXT={
  hold:'6 pépites au départ, 3 relances. Mini à Grand Jackpot dans le lot.',
  wheel:'La roue décide : free spins, hold, jackpot, ou descente à l\'étage suivant.',
  fs:'12 tours. Chaque Wild ajoute +1 au multiplicateur, qui ne redescend jamais.',
  mhold:'9 pépites au départ, valeurs de ×8 à ×200. Plein écran = Super Jackpot.',
  super:'Direct au dernier étage : Mega bonus, Grand ou Super Jackpot.',
  mfs:'18 tours, départ ×3, +2 par Wild. C\'est ici que tombent les max win.',
};
function renderOffers(){
  const bet=curBet(),box=$('offers');
  box.textContent='';
  E.OFFERS.forEach(of=>{
    const price=cents(of.price*bet),can=G.balance>=price;
    const d=document.createElement('div');d.className='offer'+(of.price>=260?' hot':'');
    const h=document.createElement('h4');h.textContent=of.name;
    const p=document.createElement('p');p.textContent=OFFER_TXT[of.id];
    const pr=document.createElement('div');pr.className='price';pr.textContent=eur(price);
    const m=document.createElement('div');m.className='mult';m.textContent=of.price+'× la mise';
    const b=document.createElement('button');b.type='button';b.textContent=can?'Acheter':'Solde insuffisant';b.disabled=!can;
    let armed=false,cancel=null;
    b.onclick=()=>{
      if(!armed){
        armed=true;Snd.setup();Snd.click();
        b.textContent='Confirmer';b.className='confirm';
        cancel=document.createElement('button');cancel.type='button';cancel.className='cancel';cancel.textContent='Annuler';
        cancel.onclick=()=>{armed=false;b.textContent='Acheter';b.className='';cancel.remove();cancel=null;};
        d.appendChild(cancel);
        return;
      }
      closeModal('mBuy');
      playRound(of.id);
    };
    d.append(h,p,pr,m,b);box.appendChild(d);
  });
  $('bBet').textContent=eur(bet);$('bBal').textContent=eur(G.balance);
}

/* --- Quitte ou double --- */
const GB={stake:0,round:0,locked:false};
function paintCrate(cv,state){
  const c=cv.getContext('2d');c.clearRect(0,0,240,240);
  if(state==='boom'){
    c.fillStyle=Art.rad(c,120,120,10,120,[[0,'#fff6c0'],[.5,'#ffb32c'],[1,'rgba(255,90,0,0)']]);c.fillRect(0,0,240,240);
    FX.drawText(c,'BOUM',120,142,62,'gold');return;
  }
  if(state==='dud'){
    Art.rr(c,40,60,160,130,12);Art.paint(c,'#3a3040','#120812',6);
    FX.drawText(c,'PSCHITT',120,136,36,'violet');return;
  }
  Art.rr(c,26,44,188,160,14);Art.paint(c,Art.lin(c,0,44,0,204,[[0,'#c98a4a'],[.5,'#8d5426'],[1,'#532c12']]),'#1b0a13',7);
  c.strokeStyle='rgba(50,22,6,.6)';c.lineWidth=4;for(let i=1;i<4;i++){c.beginPath();c.moveTo(30,44+i*40);c.lineTo(210,44+i*40);c.stroke();}
  Art.rr(c,44,92,152,62,10);Art.paint(c,Art.lin(c,0,92,0,154,[[0,'#e5261f'],[1,'#7e0d16']]),'#1b0a13',5);
  FX.drawText(c,'TNT',120,142,50,'gold');
  c.strokeStyle='#efe2c4';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(120,44);c.bezierCurveTo(126,20,160,34,172,16);c.stroke();
  Art.star4(c,174,14,16,'#fff3b0');
}
function gambleRefresh(){
  $('gStake').textContent=eur(GB.stake);$('gNext').textContent=eur(cents(GB.stake*2));
  const can=!GB.locked&&GB.round<5&&GB.stake<curBet()*2000;
  $('gL').disabled=$('gR').disabled=!can;
  $('gTake').disabled=GB.locked||GB.stake<=0;
  $('gTake').textContent=GB.stake>0?'ENCAISSER '+eur(GB.stake):'FERMER';
}
function gambleOpen(){
  if(G.busy||G.lastWin<=0)return;
  Snd.setup();Snd.click();hideGamble();
  G.balance=cents(G.balance-G.lastWin);G.pending=G.lastWin;setCounter(ui.bal,G.balance,true);save();
  G.stats.won=cents(G.stats.won-G.lastWin);
  GB.stake=G.lastWin;GB.round=0;GB.locked=false;
  G.busy=true;updateControls();
  $('gMsg').textContent='';
  paintCrate($('gL').firstChild,'idle');paintCrate($('gR').firstChild,'idle');
  openModal('mGamble');gambleRefresh();
}
function gamblePick(btn,other){
  if(GB.locked)return;
  GB.locked=true;gambleRefresh();
  Snd.fuseStart();
  const cv=btn.firstChild,ov=other.firstChild;
  setTimeout(()=>{
    Snd.fuseStop();
    const b=elCenter(btn),win=rng()<.48;
    if(win){
      GB.stake=cents(GB.stake*2);GB.round++;G.pending=GB.stake;save();
      paintCrate(cv,'boom');paintCrate(ov,'dud');
      Snd.explosion(1.3);Snd.smallWin(10);FX.explode(b[0],b[1],1.2,{coins:30});FX.flash('gold',.4);FX.shake(.5);
      $('gMsg').textContent='Doublé !';
      GB.locked=false;gambleRefresh();
      setTimeout(()=>{if(!$('mGamble').hidden&&!GB.locked){paintCrate(cv,'idle');paintCrate(ov,'idle');}},900);
    }else{
      paintCrate(cv,'dud');paintCrate(ov,'boom');
      Snd.failFizz();
      $('gMsg').textContent='Pschitt. Tout est perdu.';
      GB.stake=0;G.pending=0;save();
      setTimeout(gambleClose,1200);
    }
  },850);
}
function gambleClose(){
  closeModal('mGamble');
  G.balance=cents(G.balance+GB.stake);G.pending=0;
  G.stats.won=cents(G.stats.won+GB.stake);if(GB.stake>G.stats.best)G.stats.best=GB.stake;
  G.lastWin=0;
  setCounter(ui.bal,G.balance);setCounter(ui.win,GB.stake,true);
  if(GB.stake>0)Snd.cashOut();
  GB.stake=0;GB.locked=false;G.busy=false;updateControls();refreshReport();save();
}

/* --- Fenêtres --- */
function openModal(id){$(id).hidden=false;const f=$(id).querySelector('button,input');if(f)f.focus({preventScroll:true});}
function closeModal(id){$(id).hidden=true;}
function openBroke(){Snd.denied();openModal('mBroke');}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{closeModal(b.closest('.modal').id);}));
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('pointerdown',e=>{if(e.target===m&&m.id!=='mGamble')closeModal(m.id);}));
function renderInfo(){
  const bet=curBet();
  const box=$('tPay');box.textContent='';
  const h=(t,tag)=>{const e=document.createElement(tag||'h3');e.textContent=t;return e;};
  const P=document.createElement('div');P.className='pay';
  const row=(sym,lines)=>{
    const d=document.createElement('div'),cv=document.createElement('canvas');cv.width=cv.height=116;
    cv.getContext('2d').drawImage(SYM[sym],0,0,116,116);
    const u=document.createElement('ul');lines.forEach(([a,b])=>{const li=document.createElement('li');li.append(a+' ');const v=document.createElement('b');v.textContent=b;li.append(v);u.appendChild(li);});
    d.append(cv,u);P.appendChild(d);
  };
  [E.WILD,E.MOLE,E.CART,E.LAMP,E.PICK,E.A,E.K,E.Q,E.J,E.T].forEach(s=>{
    const lines=[5,4,3].map(n=>[n+' :',eur(cents(E.PAY[s][n-1]/E.NLINES*bet))]);
    if(E.PAY[s][1])lines.push(['2 :',eur(cents(E.PAY[s][1]/E.NLINES*bet))]);
    row(s,lines);
  });
  row(E.BONUS,[[ '5 :',eur(50*bet)],['4 :',eur(10*bet)],['3 :',eur(2*bet)],['+ la Roue','']]);
  row(E.NUG,[['6 ou plus :','Hold & Blast']]);
  box.append(h('Gains pour la mise actuelle'),P);
  const p=document.createElement('p');p.textContent='Le Wild remplace tout sauf le Détonateur et la Pépite. Les gains se comptent de gauche à droite, le meilleur gain par ligne.';box.appendChild(p);
  const li=document.createElement('div');li.className='lines';
  E.LINES.forEach((L0,n)=>{
    const cv=document.createElement('canvas');cv.width=100;cv.height=66;const c=cv.getContext('2d');
    c.fillStyle='#1a0f2e';c.fillRect(0,0,100,66);
    for(let r=0;r<5;r++)for(let y=0;y<3;y++){c.fillStyle=L0[r]===y?'#ffd34d':'#3b2b57';c.fillRect(6+r*18,6+y*18,14,14);}
    c.strokeStyle='#ff3b5c';c.lineWidth=2.5;c.beginPath();L0.forEach((y,r)=>c[r?'lineTo':'moveTo'](13+r*18,13+y*18));c.stroke();
    cv.setAttribute('aria-label','Ligne '+(n+1));li.appendChild(cv);
  });
  box.append(h('Les 20 lignes'),li);

  const b2=$('tBonus');b2.textContent='';
  const sec=(t,x)=>{const a=h(t);const q=document.createElement('p');q.textContent=x;b2.append(a,q);};
  sec('La Roue','3 Détonateurs ouvrent la Galerie −1, 4 la Galerie −2, 5 la Galerie −3. La roue tire un bonus, un gain direct, un jackpot, ou la case CREUSE ENCORE qui fait descendre d\'un étage, avec des prix plus gros.');
  sec('Free spins','12 tours (15 en Super, 18 en Mega). Chaque Wild qui tombe envoie une boule de feu au multiplicateur. Il ne redescend jamais et s\'applique à tous les gains. 3 Détonateurs ajoutent 5 tours.');
  sec('Hold & Blast','Dès 6 pépites, elles se bloquent et tu as 3 relances. Chaque nouvelle pépite remet le compteur à 3. Le bâton de TNT fait exploser les cases voisines en pépites, la pépite ×2 ou ×3 multiplie tout ce qui est déjà posé. Remplir les 15 cases paie le Super Jackpot.');
  sec('Déflagration','Sur n\'importe quel spin, une mèche peut faire le tour des rouleaux et poser des Wilds. Elle paie toujours.');
  sec('Jackpots','Mini, Minor, Major, Grand et Super valent 10×, 40×, 200×, 2 000× et 10 000× la mise, plus ce que chaque spin verse dans les compteurs.');
  sec('Quitte ou double','Après un gain, tu peux miser le gain sur une des deux caisses, jusqu\'à 5 fois de suite. Tu as 48 % de chances de doubler.');
  sec('Max win','Un tour s\'arrête à '+E.MAX_WIN.toLocaleString('fr-FR')+'× la mise.');

  const m=$('tMath');m.textContent='';
  const tbl=(rows)=>{const t=document.createElement('table');t.className='t';rows.forEach(([a,b])=>{const tr=document.createElement('tr'),x=document.createElement('td'),y=document.createElement('td');x.textContent=a;y.textContent=b;tr.append(x,y);t.appendChild(tr);});return t;};
  const s=G.stats;
  m.append(h('Ta session'),tbl([['Spins joués',s.spins.toLocaleString('fr-FR')],['Total misé',eur(s.wagered)],['Total gagné',eur(s.won)],['Résultat',eur(cents(s.won-s.wagered))],['RTP observé',s.wagered?(s.won/s.wagered*100).toFixed(2).replace('.',',')+' %':'–'],['Bonus déclenchés',String(s.bonus)],['Meilleur gain',eur(s.best)]]));
  m.append(h('Le jeu, sur '+MATH.spins+' de spins simulés'),tbl([['Retour au joueur (RTP)',MATH.rtp],['Spins gagnants',MATH.hit+' (1 sur '+MATH.hitN+')'],['Volatilité','Élevée (écart-type '+MATH.sd+' la mise)'],['Roue',MATH.wheel+' spins'],['Hold & Blast',MATH.hold+' spins'],['Déflagration',MATH.blast+' spins'],['Gain de 100× ou plus',MATH.win100+' spins'],['Gain de 1 000× ou plus',MATH.win1000+' spins'],['Max win',E.MAX_WIN.toLocaleString('fr-FR')+'× la mise']]));
  m.append(h('Fréquence des jackpots'),tbl([['Mini',MATH.mini+' spins'],['Minor',MATH.minor+' spins'],['Major',MATH.major+' spins'],['Grand',MATH.grand+' spins'],['Super',MATH.super+' spins']]));
  const nt=document.createElement('p');nt.textContent='Argent fictif. Comme dans un vrai casino, le RTP est inférieur à 100 % : plus tu joues, plus le solde tend à baisser.';m.appendChild(nt);

  const f=$('tFx');f.textContent='';
  const tgl=(lab,val,fn)=>{const l=document.createElement('label');l.className='check';const c=document.createElement('input');c.type='checkbox';c.id='opt'+lab.length;c.checked=val;c.onchange=()=>fn(c.checked);l.append(c,' '+lab);return l;};
  f.append(h('Options'),tgl('Musique',G.music,v=>{G.music=v;Snd.setMusic(v);save();}),tgl('Effets réduits (moins de flashs et de secousses)',G.reduced,v=>{G.reduced=v;FX.setReduced(v);save();}));
  f.appendChild(h('Voir les animations, sans toucher au solde'));
  const de=document.createElement('div');de.className='demos';
  const demo=(t,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=async()=>{if(G.busy||G.auto){toast('Attends la fin du tour en cours');return;}closeModal('mInfo');Snd.setup();G.busy=true;updateControls();await fn();G.busy=false;updateControls();};de.appendChild(b);};
  const bw=x=>()=>FX.bigWin({multiple:x,maxWin:E.MAX_WIN,bet:curBet(),format:fmtBig,arm,disarm,fast:FAST[G.turbo],moodAfter:'base'});
  demo('Big Win',bw(22));demo('Mega Win',bw(72));demo('Epic Win',bw(260));demo('Insane Win',bw(1800));demo('Max Win',bw(E.MAX_WIN));
  demo('Mini Jackpot',()=>jackpotShow('mini',10,curBet()));demo('Grand Jackpot',()=>jackpotShow('grand',2000,curBet()));demo('Super Jackpot',()=>jackpotShow('super',10000,curBet()));
  f.appendChild(de);
  f.appendChild(h('Compte'));
  const rs_=document.createElement('button');rs_.type='button';rs_.className='ghost';rs_.textContent='Remettre le compte et les stats à zéro';
  rs_.onclick=()=>{if(G.busy||G.auto){toast('Attends la fin du tour en cours');return;}resetAccount();closeModal('mInfo');toast('Compte remis à 2 000,00 €');};
  f.appendChild(rs_);
}
function resetAccount(){
  G.balance=START_BALANCE;G.pending=0;G.stats=newStats();G.prog=E.newProg();G.lastWin=0;hideGamble();
  setCounter(ui.bal,G.balance,true);setCounter(ui.win,0,true);refreshReport();refreshJackpots();save();
}

/* --- Branchements --- */
function onSpinPress(){
  Snd.setup();
  if(G.auto){stopAuto();toast('Le mode auto s\'arrête à la fin du tour');return;}
  if(G.busy){if(G.spinning)G.slam=true;else skipWaits();return;}
  playRound(null);
}
function wire(){
  $('spinBtn').addEventListener('click',onSpinPress);
  $('betMax').addEventListener('click',()=>{let i=BETS.length-1;while(i>0&&BETS[i]>G.balance)i--;changeBet(i-G.betIdx);});
  $('betDown').addEventListener('click',()=>changeBet(-1));
  $('betUp').addEventListener('click',()=>changeBet(1));
  $('bBetDown').addEventListener('click',()=>changeBet(-1));
  $('bBetUp').addEventListener('click',()=>changeBet(1));
  $('turboBtn').addEventListener('click',()=>{Snd.setup();Snd.click();cycleTurbo();save();});
  $('soundBtn').addEventListener('click',()=>{Snd.setup();setSound(!G.sound);save();});
  $('buyBtn').addEventListener('click',()=>{if(G.busy||G.auto)return;Snd.setup();Snd.click();renderOffers();openModal('mBuy');});
  $('autoBtn').addEventListener('click',()=>{Snd.setup();Snd.click();if(G.auto){stopAuto();return;}if(G.busy)return;renderAuto();openModal('mAuto');});
  $('aGo').addEventListener('click',startAuto);
  $('infoBtn').addEventListener('click',()=>{Snd.setup();Snd.click();renderInfo();openModal('mInfo');});
  document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
    document.querySelectorAll('.tabbody').forEach(x=>{x.hidden=x.id!==b.dataset.tab;});
    Snd.click();
  }));
  $('gambleBtn').addEventListener('click',gambleOpen);
  $('gL').addEventListener('click',()=>gamblePick($('gL'),$('gR')));
  $('gR').addEventListener('click',()=>gamblePick($('gR'),$('gL')));
  $('gTake').addEventListener('click',gambleClose);
  $('refill').addEventListener('click',()=>{resetAccount();closeModal('mBroke');toast('Compte remis à 2 000,00 €');});
  document.addEventListener('pointerup',()=>{const a=document.activeElement;if(a&&a.tagName==='BUTTON')a.blur();});
  document.addEventListener('keydown',e=>{
    const open=document.querySelector('.modal:not([hidden])');
    if(e.key==='Escape'&&open&&open.id!=='mGamble'){closeModal(open.id);return;}
    if(open)return;
    if(e.code==='Space'||e.code==='Enter'){
      if(document.activeElement&&document.activeElement.tagName==='BUTTON')return;
      e.preventDefault();if(e.repeat)return;
      if(tapCb)tapCb();else onSpinPress();
    }
  });
  let rz=0;
  window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(layout,90);layout();});
}

function drawLogo(){
  const cv=$('logo'),c=cv.getContext('2d');
  c.clearRect(0,0,cv.width,cv.height);
  const size=150,A='T.N.',B='THUNE';
  c.font=size+'px '+Art.DISPLAY;
  const wa=c.measureText(A).width,wb=c.measureText(B).width,gap=22,x0=(cv.width-wa-wb-gap)/2;
  Art.fancy(c,A,x0+wa/2,160,size,'gold');
  Art.fancy(c,B,x0+wa+gap+wb/2,160,size,'fire');
}
function bulbs(){
  const mk=col=>{const s=Art.mk(52,52),x=s.getContext('2d');x.fillStyle=Art.rad(x,26,26,1,26,[[0,'#fff'],[.3,col],[.62,col+'55'],[1,col+'00']]);x.fillRect(0,0,52,52);return s;};
  bulbOn=[mk('#ffd34d'),mk('#ff4fa8'),mk('#47e6ff')];
  bulbOff=Art.mk(52,52);const x=bulbOff.getContext('2d');Art.circle(x,26,26,9);Art.paint(x,Art.rad(x,26,26,1,10,[[0,'#7a5a30'],[1,'#32200f']]),'#120812',2.5);
}

async function start(data){
  const saved=Object.assign({},load()||{},data&&data.balance!==undefined?data:{});
  if(typeof saved.balance==='number'&&isFinite(saved.balance)&&saved.balance>=0)G.balance=cents(saved.balance);
  if(Number.isInteger(saved.betIdx)&&BETS[saved.betIdx])G.betIdx=saved.betIdx;
  if(saved.prog&&E.JP_ORDER.every(k=>typeof saved.prog[k]==='number'))G.prog=saved.prog;
  if(saved.stats&&typeof saved.stats.spins==='number')G.stats=Object.assign(newStats(),saved.stats);
  if([0,1,2].includes(saved.turbo))G.turbo=saved.turbo;
  if(typeof saved.sound==='boolean')G.sound=saved.sound;
  if(typeof saved.music==='boolean')G.music=saved.music;
  if(typeof saved.reduced==='boolean')G.reduced=saved.reduced;
  if(document.fonts&&document.fonts.load){
    await Promise.race([Promise.all([document.fonts.load('40px "Titan One"'),document.fonts.load('700 20px "Barlow Condensed"')]).catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);
  }
  while(!hasSize())await new Promise(r=>setTimeout(r,100)); // une vue intégrée ou un onglet caché peut démarrer à 0 pixel
  const built=Art.buildSymbols();SYM=built.sym;BLUR=built.blur;
  TNT_NUG=Art.tntNug();reelBackImg=Art.reelBack();frameImg=Art.frame();
  rctx=reelsCv.getContext('2d');
  bulbs();
  FX.init($('fx'),Art.sprites());
  if(G.reduced)FX.setReduced(true);
  initReels();drawLogo();
  wire();layout();
  setCounter(ui.bal,G.balance,true);setCounter(ui.win,0,true);
  $('turboBtn').classList.toggle('on',G.turbo>0);$('turboLvl').textContent=['off','×2','×3'][G.turbo];
  setSound(G.sound);Snd.setMusic(G.music);Snd.mood('base');
  refreshBet();refreshReport();
  if(window.claude&&window.claude.hot&&window.claude.hot.snapshot)window.claude.hot.snapshot(()=>({balance:cents(G.balance+G.pending),betIdx:G.betIdx,prog:G.prog,stats:G.stats,turbo:G.turbo,sound:G.sound,music:G.music,reduced:G.reduced}));
  requestAnimationFrame(t=>{last=t;frame(t);});
  $('boot').classList.add('gone');setTimeout(()=>{$('boot').remove();},400);
  /*DEV*/window.__t={G,E,R,FX,Snd,tick,playRound,jackpotShow,HS,refreshJackpots,fmtBig,wait,findRound(pred,buy){const c={rng:Math.random,prog:E.newProg()};for(let i=0;i<5e6;i++){const o=buy?E.buy(c,buy):E.spin(c);if(pred(o))return o;}return null;}};/*ENDDEV*/
}
if(window.claude&&window.claude.hot&&window.claude.hot.ready)window.claude.hot.ready(start);
else start((window.claude&&window.claude.hot&&window.claude.hot.data)||{});
})();
