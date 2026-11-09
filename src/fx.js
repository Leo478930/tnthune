/* ===== EFFETS =====
   Calque plein écran au-dessus du jeu : particules, explosions, éclairs, écrans de big win. */
const FX=(function(){
'use strict';
const TAU=Math.PI*2;
let cv,c,W=1,H=1,DPR=1,spr,reduced=false,time=0;
const P=[],EM=[],RING=[],BOLT=[],TRAIL=[],FLOAT=[];
let flashA=0,flashCol='255,255,255',trauma=0,scene=null,wasEmpty=false;
const MAXP=2600;
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.random()*a.length|0];
const COLORS={pink:'255,70,170',cyan:'70,220,255',green:'90,255,130',gold:'255,205,70',violet:'190,110,255',white:'255,255,255',red:'255,80,50'};
const tint={},rayT={};
const STYLE_RAY={gold:'gold',fire:'red',violet:'violet',ice:'cyan',green:'green',white:'white'};

function init(canvas,sprites){
  cv=canvas;c=cv.getContext('2d');spr=sprites;
  reduced=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  for(const k in COLORS){
    const s=Art.mk(64,64),x=s.getContext('2d');
    x.fillStyle=Art.rad(x,32,32,0,32,[[0,'rgba(255,255,255,1)'],[.22,'rgba('+COLORS[k]+',.98)'],[.6,'rgba('+COLORS[k]+',.34)'],[1,'rgba('+COLORS[k]+',0)']]);
    x.fillRect(0,0,64,64);tint[k]=s;
  }
  const base=Art.rays(14);
  for(const k in COLORS){
    const s=Art.mk(1024,1024),x=s.getContext('2d');
    x.drawImage(base,0,0);x.globalCompositeOperation='source-in';x.fillStyle='rgb('+COLORS[k]+')';x.fillRect(0,0,1024,1024);rayT[k]=s;
  }
  resize();
}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,1.5);W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
}
function setReduced(v){reduced=v;}
function add(p){
  if(P.length>=MAXP)return;
  p.l=0;p.a=p.a||0;p.va=p.va||0;p.g=p.g||0;p.drag=p.drag===undefined?1:p.drag;p.al=p.al===undefined?1:p.al;p.se=p.se===undefined?p.s:p.se;
  P.push(p);
}
function emitter(rate,dur,fn){EM.push({rate:reduced?rate*.35:rate,d:dur,t:0,acc:0,fn});}
function clearEmitters(){EM.length=0;}

/* --- Émetteurs élémentaires --- */
function coin(x,y,vx,vy,front){add({img:spr.coin,x,y,vx,vy,g:1500,s:rand(26,50),m:rand(1.4,2.6),va:rand(5,16),flip:1,front,fadeLate:1});}
function coins(x,y,n,spd,front){
  n=reduced?n*.4|0:n;
  for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(.3,1)*(spd||620);coin(x,y,Math.cos(a)*s,Math.sin(a)*s-280,front);}
}
function spray(x,y,n,col,spd){
  for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(.2,1)*(spd||260);add({img:tint[col||'gold'],x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:380,drag:.98,s:rand(10,26),se:2,m:rand(.25,.7),add:1});}
}
function explode(x,y,pw,o){
  pw=pw===undefined?1:pw;o=o||{};
  const col=o.col||'gold';
  add({img:spr.flash,x,y,vx:0,vy:0,s:110*pw,se:520*pw,m:.3,add:1});
  RING.push({x,y,r:14,R:300*pw,l:0,m:.5,col:COLORS[col]});
  RING.push({x,y,r:6,R:170*pw,l:0,m:.34,col:'255,255,255'});
  const n=(reduced?22:70)*pw|0;
  for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(.15,1)*(780*Math.sqrt(pw));add({img:tint[Math.random()<.7?col:'white'],x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:520,drag:.965,s:rand(12,36)*Math.sqrt(pw),se:2,m:rand(.35,1.05),add:1});}
  const sm=(reduced?4:13)*pw|0;
  for(let i=0;i<sm;i++){const a=rand(0,TAU),s=rand(20,190)*Math.sqrt(pw);add({img:spr.smoke,x:x+rand(-20,20),y:y+rand(-20,20),vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,drag:.97,s:rand(90,170)*Math.sqrt(pw),se:rand(240,420)*Math.sqrt(pw),a:rand(0,TAU),va:rand(-1,1),m:rand(.6,1.5),al:.72});}
  const rk=(reduced?4:12)*pw|0;
  for(let i=0;i<rk;i++){const a=rand(0,TAU),s=rand(.3,1)*640;add({img:pick(spr.rocks),x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-200,g:1500,s:rand(14,34),a:rand(0,TAU),va:rand(-14,14),m:rand(.7,1.5)});}
  if(o.coins)coins(x,y,o.coins,820);
}
function firework(x,y,col){
  col=col||pick(['pink','cyan','green','gold','violet']);
  add({img:spr.flash,x,y,vx:0,vy:0,s:50,se:230,m:.2,add:1});
  const n=reduced?20:62,R=rand(420,640);
  for(let i=0;i<n;i++){const a=i/n*TAU+rand(-.04,.04),s=R*rand(.82,1);add({img:tint[col],x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,g:240,drag:.965,s:rand(14,28),se:3,m:rand(.8,1.4),add:1});}
}
function bolt(x0,y0,x1,y1,col){
  const pts=[[x0,y0]],seg=12,dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
  for(let i=1;i<seg;i++){const u=i/seg,o=rand(-1,1)*len*.09*Math.sin(u*Math.PI);pts.push([x0+dx*u+nx*o,y0+dy*u+ny*o]);}
  pts.push([x1,y1]);
  BOLT.push({pts,l:0,m:.17,col:COLORS[col||'cyan']});
}
function trail(x0,y0,x1,y1,dur,col,cb){TRAIL.push({x0,y0,x1,y1,l:0,m:dur,col:col||'gold',cb,arc:rand(-170,170)});}
function float(text,x,y,size,style){FLOAT.push({text,x,y,size,style,l:0,m:1.1});}
function flash(col,a){flashCol=COLORS[col]||COLORS.white;flashA=Math.max(flashA,reduced?a*.18:a);}
function shake(v){if(!reduced)trauma=Math.min(1,trauma+v);}
function getShake(){
  const k=trauma*trauma,S=26;
  return {x:rand(-1,1)*k*S,y:rand(-1,1)*k*S,r:rand(-1,1)*k*.012};
}

/* --- Lettres géantes : chaque glyphe est peint une fois puis réutilisé --- */
const GS=170,glyphs=new Map();
function glyph(ch,style){
  const key=style+'|'+ch;
  let g=glyphs.get(key);
  if(g)return g;
  const m=Art.mk(10,10).getContext('2d');m.font=GS+'px '+Art.DISPLAY;
  const adv=(ch===' '?GS*.32:m.measureText(ch).width)+GS*.05,pad=GS*.26,w=Math.ceil(adv+pad*2),h=Math.ceil(GS*1.56);
  const cv2=Art.mk(w,h),x=cv2.getContext('2d');
  if(ch!==' ')Art.fancy(x,ch,w/2,GS*1.14,GS,style);
  g={cv:cv2,adv,w,h,base:GS*1.14};
  glyphs.set(key,g);
  return g;
}
const STY_CYCLE=['fire','gold','green','ice','violet'];
const styleOf=(style,i)=>style==='cycle'?STY_CYCLE[i%STY_CYCLE.length]:style;
const digitAdv=()=>glyph('0','white').adv;
function advOf(ch,i,style,tab){const isD=tab&&ch>='0'&&ch<='9';return isD?glyph('0',styleOf(style,i)).adv:glyph(ch,styleOf(style,i)).adv;}
function textWidth(str,size,style,tab){let w=0;[...str].forEach((ch,i)=>{w+=advOf(ch,i,style,tab);});return w*size/GS;}
function drawText(x2,str,cx,y,size,style,o){
  o=o||{};
  const s=size/GS,chars=[...str];
  let xx=cx-textWidth(str,size,style,o.tab)/2;
  chars.forEach((ch,i)=>{
    const g=glyph(ch,styleOf(style,i)),a=advOf(ch,i,style,o.tab);
    const aw=a*s,cxx=xx+aw/2;
    const fx=o.fn?o.fn(i,chars.length):null;
    let sc=s,al=1,dy=0,rot=0;
    if(fx){sc*=fx.s;al=fx.a;dy=fx.y||0;rot=fx.r||0;}
    if(al>0&&ch!==' '){
      x2.save();x2.globalAlpha*=al;x2.translate(cxx,y+dy);x2.rotate(rot);x2.scale(sc,sc);
      x2.drawImage(g.cv,-g.w/2,-g.base);x2.restore();
    }
    xx+=aw;
  });
}
function fitSize(str,maxW,maxS,style,tab){
  const w=textWidth(str,GS,style,tab);
  return Math.min(maxS,maxW/w*GS);
}
const slam=(t,delay)=>(i)=>{
  const u=t-i*delay;
  if(u<0)return {s:0,a:0};
  const k=Math.min(u/.22,1),e=1-Math.pow(1-k,3);
  const s=3.2-2.2*e+(k>=1?Math.sin(Math.min((u-.22)/.32,1)*Math.PI)*.1*Math.pow(1-Math.min((u-.22)/.32,1),1):0);
  return {s,a:Math.min(u/.08,1)};
};

/* --- Écran de big win --- */
const U=[40,100,500];
const TIER=[
  {name:'BIG WIN',style:'gold',ray:'gold'},
  {name:'MEGA WIN',style:'fire',ray:'red'},
  {name:'EPIC WIN',style:'violet',ray:'violet'},
  {name:'INSANE WIN',style:'ice',ray:'cyan'},
  {name:'MAX WIN',style:'cycle',ray:'pink'},
];
function bigWin(o){
  return new Promise(resolve=>{
    const isJP=!!o.title,fast=o.fast||1;
    const segs=[];
    if(isJP)segs.push({a:0,b:o.multiple,d:o.dur*fast});
    else{
      const D=[3,3.3,3.8,5.2];
      const bounds=[...U,o.maxWin];
      let a=0;
      for(let i=0;i<bounds.length;i++){
        const b=bounds[i];
        if(o.multiple<b){const f=(o.multiple-a)/(b-a);segs.push({a,b:o.multiple,d:D[i]*(.4+.6*f)*fast});a=o.multiple;break;}
        segs.push({a,b,d:D[i]*fast});a=b;
        if(o.multiple===b)break;
      }
    }
    const S={t:0,phase:'count',val:0,seg:0,segT:0,tier:0,tierT:0,alpha:0,pulse:0,boomT:.3,fwT:.6,boltT:.5,tick:0,skipped:false,hold:0,end:0};
    const L=()=>isJP?o.level:S.tier;
    const fmt=v=>o.format(v*o.bet);
    function rainStart(){
      EM.length=0;
      const lv=L(),rc=[45,70,100,130,165][lv],rr=[18,32,50,70,95][lv],fr=reduced?.35:1;
      EM.push({rate:rc*fr,d:1e9,t:0,acc:0,fn(){const left=Math.random()<.5,x=left?W*.08:W*.92;coin(x,H+12,(left?1:-1)*rand(120,560),-rand(1050,1700)*Math.min(1.25,H/720),Math.random()<.05);}});
      EM.push({rate:rr*fr,d:1e9,t:0,acc:0,fn(){coin(rand(0,W),-30,rand(-60,60),rand(150,520),Math.random()<.06);}});
      if(lv>=1)EM.push({rate:11*lv*fr,d:1e9,t:0,acc:0,fn(){add({img:spr.note,x:rand(0,W),y:-40,vx:rand(-60,60),vy:rand(90,260),g:120,s:rand(52,84),m:rand(2.5,4.5),a:rand(0,TAU),va:rand(-3,3),flip:0,front:Math.random()<.05,swing:rand(1.4,3)});}});
      if(lv>=2)EM.push({rate:20*(lv-1)*fr,d:1e9,t:0,acc:0,fn(){add({img:pick(spr.gems),x:rand(0,W),y:-30,vx:rand(-90,90),vy:rand(180,560),g:640,s:rand(20,44),a:rand(0,TAU),va:rand(-10,10),m:rand(1.4,2.4),front:Math.random()<.1});}});
    }
    function tierUp(first){
      S.tierT=0;
      const lv=L();
      rainStart();
      Snd.mood('big',lv);
      Snd.stinger(lv);
      if(!first||isJP){
        Snd.explosion(1.2+lv*.4);
        flash(lv>=3?'white':'gold',.9);
        shake(.55+lv*.12);
        for(let i=0;i<2+lv*2;i++)explode(rand(W*.12,W*.88),rand(H*.14,H*.86),1+lv*.25,{col:pick(['gold','red','pink','cyan']),coins:lv>=2?40:18});
      }else{flash('gold',.5);shake(.35);explode(W/2,H*.42,1.5,{coins:40});Snd.explosion(1);}
    }
    const scene_={
      update(dt){
        S.t+=dt;S.tierT+=dt;S.alpha=Math.min(1,S.alpha+dt*3.2);S.pulse*=Math.pow(.02,dt);
        const lv=L();
        if(S.phase==='count'){
          const G=segs[S.seg];
          S.segT+=dt;
          const u=Math.min(S.segT/G.d,1);
          const e=isJP?1-Math.pow(1-u,2.4):.5-.5*Math.cos(u*Math.PI);
          S.val=G.a+(G.b-G.a)*e;
          S.tick+=dt;
          if(S.tick>.055){S.tick=0;Snd.countTick(Math.min(1,S.val/(isJP?o.multiple:Math.max(o.multiple,500))));S.pulse=Math.min(1,S.pulse+.1);}
          if(u>=1){
            S.seg++;S.segT=0;
            if(S.seg>=segs.length){finishCount();}
            else if(!isJP){S.tier++;tierUp(false);}
          }
        }else if(S.phase==='hold'){
          S.hold-=dt;
          if(S.hold<=0)leave();
        }else if(S.phase==='end'){
          S.end+=dt;S.alpha=Math.max(0,1-S.end/.42);
          if(S.end>=.46){scene=null;EM.length=0;resolve();return;}
        }
        if(S.phase!=='end'){
          const bi=[2,1.15,.7,.36,.16][lv],fi=[9,2,1.1,.5,.18][lv];
          S.boomT-=dt;S.fwT-=dt;S.boltT-=dt;
          if(S.boomT<=0){S.boomT=bi*rand(.7,1.3);explode(rand(W*.08,W*.92),rand(H*.1,H*.9),rand(.7,1.4),{col:pick(['gold','red']),coins:lv>=1?22:10});Snd.explosion(.5+lv*.2);shake(.16+lv*.05);}
          if(S.fwT<=0){S.fwT=fi*rand(.7,1.3);firework(rand(W*.1,W*.9),rand(H*.08,H*.55));}
          if(lv>=3&&!reduced&&S.boltT<=0){S.boltT=rand(.2,.7)/(lv-2);const x=rand(0,W);bolt(x,0,x+rand(-180,180),rand(H*.4,H),pick(['cyan','violet','white']));flash('cyan',.16);}
        }
      },
      back(x){
        const t=isJP?o.ray:TIER[S.tier].ray,lv=L();
        x.globalAlpha=S.alpha*.82;x.fillStyle='#0a0314';x.fillRect(0,0,W,H);
        const R=Math.max(W,H)*1.5;
        x.globalCompositeOperation='lighter';
        x.globalAlpha=S.alpha*(.4+lv*.09+S.pulse*.2);
        x.save();x.translate(W/2,H*.47);x.rotate(S.t*.22);x.drawImage(rayT[t],-R/2,-R/2,R,R);x.restore();
        x.globalAlpha=S.alpha*.28;
        x.save();x.translate(W/2,H*.47);x.rotate(-S.t*.37+.4);x.drawImage(rayT[lv>=2?'gold':t],-R*.4,-R*.4,R*.8,R*.8);x.restore();
        const gs=Math.min(W,H)*(1.2+S.pulse*.15+Math.sin(S.t*5)*.04);
        x.globalAlpha=S.alpha*.8;x.drawImage(spr.flash,W/2-gs/2,H*.47-gs/2,gs,gs);
        x.globalCompositeOperation='source-over';x.globalAlpha=1;
      },
      front(x){
        const name=isJP?o.title:(S.phase==='hold'&&o.multiple>=o.maxWin?'MAX WIN':TIER[S.tier].name),st=isJP?o.style:(name==='MAX WIN'?'cycle':TIER[S.tier].style);
        x.globalAlpha=S.alpha;
        const ty=H*.36,sz=fitSize(name,W*.92,Math.min(H*.25,W*.2),st);
        const wob=Math.sin(S.t*6)*.018*(1+L()*.4);
        const sl=slam(S.tierT,.05);
        drawText(x,name,W/2,ty,sz,st,{fn:(i)=>{const r=sl(i);return {s:r.s*(1+wob*Math.sin(i*1.3+S.t*9)),a:r.a,y:Math.sin(S.t*7+i*.8)*sz*.022};}});
        const str=fmt(S.val),nsz=fitSize(str,W*.9,Math.min(H*.18,W*.15),'white',true)*(1+S.pulse*.05);
        drawText(x,str,W/2,H*.62,nsz,'white',{tab:true});
        if(!isJP&&S.phase==='count'&&S.tier<3){
          const nxt=[U[0],U[1],U[2]][S.tier];
          const u=Math.min(1,S.val/nxt);
          const bw=Math.min(W*.46,440),bh=Math.max(10,H*.02),bx=W/2-bw/2,by=H*.72;
          x.globalAlpha=S.alpha*.92;
          Art.rr(x,bx-3,by-3,bw+6,bh+6,(bh+6)/2);x.fillStyle='rgba(8,3,20,.85)';x.fill();
          if(u>0){Art.rr(x,bx,by,Math.max(bh,bw*u),bh,bh/2);x.fillStyle=Art.lin(x,bx,0,bx+bw,0,[[0,'#ffd34d'],[1,'#ff3f7a']]);x.fill();}
          x.globalAlpha=S.alpha;
        }
        x.globalAlpha=1;
      },
    };
    function finishCount(){
      S.val=o.multiple;
      if(!isJP&&o.multiple>=o.maxWin&&S.tier<4){S.tier=4;tierUp(false);for(let i=0;i<8;i++)firework(rand(W*.1,W*.9),rand(H*.1,H*.7));Snd.siren();}
      S.phase='hold';S.hold=(1.5+L()*.75)*Math.min(1.4,fast+.3);
      flash('gold',.5);shake(.4);Snd.explosion(1);S.pulse=1;
      o.arm(()=>leave());
    }
    function skip(){
      if(S.phase!=='count')return;
      S.skipped=true;
      const target=isJP?0:(o.multiple>=500?3:o.multiple>=100?2:o.multiple>=40?1:0);
      if(!isJP&&target!==S.tier){S.tier=target;tierUp(false);}
      S.seg=segs.length-1;S.segT=segs[S.seg].d;
      finishCount();
    }
    function leave(){
      if(S.phase==='end')return;
      o.disarm();
      S.phase='end';S.end=0;
      Snd.mood(o.moodAfter||'base');
      Snd.cashOut();
      if(o.onExit)o.onExit();
    }
    scene=scene_;
    o.arm(skip);
    tierUp(true);
  });
}

/* Carton d'annonce : FREE SPINS, HOLD & BLAST, résultat de roue... */
function titleCard(o){
  return new Promise(resolve=>{
    const S={t:0,alpha:0,left:o.dur||2.2,end:-1};
    function leave(){if(S.end<0){S.end=0;o.disarm&&o.disarm();}}
    scene={
      update(dt){
        S.t+=dt;
        if(S.end>=0){S.end+=dt;S.alpha=Math.max(0,1-S.end/.26);if(S.end>=.28){scene=null;resolve();}return;}
        S.alpha=Math.min(1,S.alpha+dt*5);S.left-=dt;if(S.left<=0)leave();
      },
      back(x){
        x.globalAlpha=S.alpha*.8;x.fillStyle='#0a0314';x.fillRect(0,0,W,H);
        const R=Math.max(W,H)*1.4,ray=STYLE_RAY[o.style==='cycle'?'gold':o.style]||'gold';
        x.globalCompositeOperation='lighter';x.globalAlpha=S.alpha*.5;
        x.save();x.translate(W/2,H*.45);x.rotate(S.t*.3);x.drawImage(rayT[ray],-R/2,-R/2,R,R);x.restore();
        x.globalCompositeOperation='source-over';x.globalAlpha=1;
      },
      front(x){
        x.globalAlpha=S.alpha;
        const sz=fitSize(o.text,W*.9,Math.min(H*.2,W*.16),o.style),sl=slam(S.t,.035);
        drawText(x,o.text,W/2,H*.46,sz,o.style,{fn:sl});
        if(o.sub){
          const ss=Math.max(16,Math.min(H*.05,W*.05));
          x.font='700 '+ss+'px "Barlow Condensed","Arial Narrow",Arial,sans-serif';x.textAlign='center';x.textBaseline='middle';
          x.lineJoin='round';x.lineWidth=ss*.3;x.strokeStyle='rgba(10,3,20,.9)';
          const lines=[];let cur='';
          for(const w of o.sub.split(' ')){const t=cur?cur+' '+w:w;if(x.measureText(t).width>W*.88&&cur){lines.push(cur);cur=w;}else cur=t;}
          lines.push(cur);
          x.fillStyle='#fff3cf';
          lines.forEach((l,i)=>{const yy=H*.58+i*ss*1.22;x.strokeText(l,W/2,yy);x.fillText(l,W/2,yy);});
        }
        x.globalAlpha=1;
      },
    };
    o.arm&&o.arm(leave);
  });
}

/* Boucle du calque */
function update(dt){
  time+=dt;
  for(let i=EM.length-1;i>=0;i--){
    const e=EM[i];e.t+=dt;
    if(e.t>=e.d){EM.splice(i,1);continue;}
    e.acc+=e.rate*dt;while(e.acc>=1){e.acc--;e.fn();}
  }
  for(let i=P.length-1;i>=0;i--){
    const p=P[i];p.l+=dt;
    if(p.l>=p.m||p.y>H+120){P[i]=P[P.length-1];P.pop();continue;}
    if(p.drag!==1){const k=Math.pow(p.drag,dt*60);p.vx*=k;p.vy*=k;}
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.a+=p.va*dt;
    if(p.swing)p.x+=Math.sin(p.l*p.swing*3)*1.5;
  }
  for(let i=RING.length-1;i>=0;i--){RING[i].l+=dt;if(RING[i].l>=RING[i].m)RING.splice(i,1);}
  for(let i=BOLT.length-1;i>=0;i--){BOLT[i].l+=dt;if(BOLT[i].l>=BOLT[i].m)BOLT.splice(i,1);}
  for(let i=FLOAT.length-1;i>=0;i--){FLOAT[i].l+=dt;FLOAT[i].y-=60*dt;if(FLOAT[i].l>=FLOAT[i].m)FLOAT.splice(i,1);}
  for(let i=TRAIL.length-1;i>=0;i--){
    const t=TRAIL[i];t.l+=dt;
    const u=Math.min(t.l/t.m,1),e=u*u*(3-2*u),x=t.x0+(t.x1-t.x0)*e,y=t.y0+(t.y1-t.y0)*e-Math.sin(u*Math.PI)*t.arc;
    t.x=x;t.y=y;
    for(let k=0;k<3;k++)add({img:tint[t.col],x:x+rand(-8,8),y:y+rand(-8,8),vx:rand(-50,50),vy:rand(-50,50),s:rand(16,34),se:2,m:rand(.2,.45),add:1,front:1});
    if(u>=1){TRAIL.splice(i,1);if(t.cb)t.cb();}
  }
  flashA*=Math.pow(.0009,dt);if(flashA<.004)flashA=0;
  trauma=Math.max(0,trauma-dt*1.15);
  if(scene)scene.update(dt);
}
function drawParticles(front){
  for(const p of P){
    if(!!p.front!==front)continue;
    const u=p.l/p.m;
    let a=p.al*(p.fadeLate?(u>.8?(1-u)/.2:1):1-u);
    if(a<=0)continue;
    const s=p.s+(p.se-p.s)*u,img=p.img,w=s,h=s*img.height/img.width;
    const ca=Math.cos(p.a),sa=Math.sin(p.a),fl=p.flip?Math.cos(p.a):1;
    c.globalCompositeOperation=p.add?'lighter':'source-over';
    c.globalAlpha=a;
    if(p.flip)c.setTransform(DPR*fl,0,0,DPR,DPR*p.x,DPR*p.y);
    else c.setTransform(DPR*ca,DPR*sa,-DPR*sa,DPR*ca,DPR*p.x,DPR*p.y);
    c.drawImage(img,-w/2,-h/2,w,h);
  }
  c.setTransform(DPR,0,0,DPR,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
}
function draw(){
  const empty=!P.length&&!RING.length&&!BOLT.length&&!TRAIL.length&&!FLOAT.length&&!scene&&flashA<=0;
  if(empty&&wasEmpty)return;
  wasEmpty=empty;
  c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);
  if(empty)return;
  if(scene)scene.back(c,W,H);
  drawParticles(false);
  if(scene)scene.front(c,W,H);
  drawParticles(true);
  c.globalCompositeOperation='lighter';
  for(const r of RING){const u=r.l/r.m,e=1-Math.pow(1-u,3),q=r.r+(r.R-r.r)*e;c.strokeStyle='rgba('+r.col+','+(1-u)*.9+')';c.lineWidth=Math.max(1,18*(1-u));c.beginPath();c.arc(r.x,r.y,q,0,TAU);c.stroke();}
  for(const b of BOLT){
    const a=1-b.l/b.m;
    c.beginPath();b.pts.forEach((p,i)=>{c[i?'lineTo':'moveTo'](p[0],p[1]);});
    c.strokeStyle='rgba('+b.col+','+a*.5+')';c.lineWidth=11;c.lineJoin='round';c.stroke();
    c.strokeStyle='rgba(255,255,255,'+a+')';c.lineWidth=3;c.stroke();
  }
  for(const t of TRAIL){if(t.x===undefined)continue;const s=64;c.globalAlpha=1;c.drawImage(tint[t.col],t.x-s/2,t.y-s/2,s,s);}
  c.globalCompositeOperation='source-over';
  for(const f of FLOAT){const u=f.l/f.m;c.globalAlpha=u>.7?(1-u)/.3:1;drawText(c,f.text,f.x,f.y,f.size,f.style,{fn:()=>({s:u<.12?1.7-5.8*u:1,a:1})});}
  c.globalAlpha=1;
  if(flashA>0){c.fillStyle='rgba('+flashCol+','+flashA+')';c.fillRect(0,0,W,H);}
}
function setScene(s){scene=s;}
function clearAll(){P.length=0;EM.length=0;RING.length=0;BOLT.length=0;TRAIL.length=0;FLOAT.length=0;scene=null;flashA=0;}
return {init,resize,setReduced,add,emitter,clearEmitters,coin,coins,spray,explode,firework,bolt,trail,float,flash,shake,getShake,drawText,fitSize,textWidth,bigWin,titleCard,update,draw,setScene,clearAll,
  get W(){return W;},get H(){return H;},get reduced(){return reduced;},rand,pick,tint,spr:()=>spr,rayT};
})();
