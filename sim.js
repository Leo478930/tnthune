// Simulation Monte-Carlo : node sim.js [spins] [runsParBonus]
const E=require('./src/engine.js');
const N=+process.argv[2]||5e6, NB=+process.argv[3]||3e5;
const rng=Math.random;

function fmt(x,d=2){return x.toFixed(d);}
function oneIn(c,n){return c?('1/'+Math.round(n/c).toLocaleString('fr-FR')):'jamais';}

// --- Jeu de base
{
  const ctx={rng,prog:E.newProg()};
  const jp={mini:0,minor:0,major:0,grand:0,super:0};
  ctx.onJackpot=n=>jp[n]++;
  let sum=0,sq=0,line=0,scat=0,hit=0,blast=0,blastPay=0,wheel=0,wheelPay=0,hold=0,holdPay=0,fsPay=0,fsN=0,hN=0,capN=0,featNat=0,scN=[0,0,0,0,0,0],full=0;
  const tiers=[1,5,15,40,100,500,1000,5000,10000,25000],tc=tiers.map(()=>0);
  const c6=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  let lost=0,maxW=0;
  const t0=Date.now();
  for(let i=0;i<N;i++){
    const o=E.spin(ctx);
    const w=o.total;
    sum+=w;sq+=w*w;line+=o.linePay;scat+=o.scat;
    if(w>0)hit++;
    if(w<1)lost++;
    if(w>maxW)maxW=w;
    if(o.blast){blast++;blastPay+=o.linePay;}
    c6[o.nc]++;scN[o.nb]++;
    if(o.feature){
      if(o.feature.kind==='wheel'){wheel++;wheelPay+=o.feature.total;
        const r=o.feature.result;
        if(r.kind==='fs'){fsN++;fsPay+=r.total;}
        if(r.kind==='hold'){hN++;if(r.full)full++;}
      }else{hold++;holdPay+=o.feature.total;if(o.feature.full)full++;}
    }
    if(o.capped)capN++;
    for(let t=0;t<tiers.length;t++)if(w>=tiers[t])tc[t]++;
  }
  const progPaid=Object.values(E.newProg()).length; void progPaid;
  console.log(`\n=== JEU DE BASE (${N.toLocaleString('fr-FR')} spins, ${((Date.now()-t0)/1000).toFixed(1)} s) ===`);
  console.log('RTP total          ',fmt(sum/N*100),'%');
  console.log('  lignes (hors feature)',fmt((line-blastPay)/N*100),'%');
  console.log('  déflagration     ',fmt(blastPay/N*100),'%  freq',oneIn(blast,N));
  console.log('  scatter          ',fmt(scat/N*100),'%');
  console.log('  roue             ',fmt(wheelPay/N*100),'%  freq',oneIn(wheel,N),' moy',fmt(wheelPay/wheel),'x');
  console.log('  hold (pépites)   ',fmt(holdPay/N*100),'%  freq',oneIn(hold,N),' moy',fmt(holdPay/hold),'x');
  console.log('Hit frequency      ',fmt(hit/N*100),'%  (1 sur',fmt(N/hit),')');
  console.log('Ecart-type par spin',fmt(Math.sqrt(sq/N-(sum/N)**2)),'x');
  console.log('Plus gros gain     ',fmt(maxW,0),'x   Max win atteint:',capN);
  console.log('Détonateurs 3/4/5  ',oneIn(scN[3],N),oneIn(scN[4],N),oneIn(scN[5],N));
  console.log('Pépites >=',[3,4,5,6].map(k=>{let s=0;for(let j=k;j<16;j++)s+=c6[j];return k+':'+oneIn(s,N);}).join('  '));
  console.log('Jackpots           ',Object.entries(jp).map(([k,v])=>k+' '+oneIn(v,N)).join(' | '),'| plein écran',full);
  console.log('Gain >=            ',tiers.map((t,i)=>t+'x:'+oneIn(tc[i],N)).join('  '));
}

// --- Features isolées
function feature(name,fn,cost){
  const ctx={rng,prog:E.newProg()};
  let s=0,q=0,cap=0,zero=0,mx=0;
  const tiers=[20,50,100,500,1000,5000,10000],tc=tiers.map(()=>0);
  let extra=0;
  for(let i=0;i<NB;i++){
    const r=fn(ctx);const w=r.total;
    s+=w;q+=w*w;if(r.capped)cap++;if(w>mx)mx=w;if(r.full)extra++;
    for(let t=0;t<tiers.length;t++)if(w>=tiers[t])tc[t]++;
    if(w<cost/2)zero++;
  }
  const m=s/NB;
  console.log(`${name.padEnd(18)} moy ${fmt(m).padStart(8)}x  sd ${fmt(Math.sqrt(q/NB-m*m)).padStart(8)}  max ${fmt(mx,0).padStart(6)}x  prix ${String(cost).padStart(4)}x -> RTP ${fmt(m/cost*100)}%  <prix/2: ${fmt(zero/NB*100,1)}%  full:${extra}  cap:${cap}\n     >= ${tiers.map((t,i)=>t+'x:'+oneIn(tc[i],NB)).join(' ')}`);
}
console.log('\n=== FEATURES ===');
E.FS.forEach((f,i)=>feature(f.name,c=>E.playFS(c,i,0),[100,200,500][i]));
E.HOLD.forEach((f,i)=>feature(f.name,c=>E.playHold(c,i,null,0),[60,150,400][i]));
E.WHEELS.forEach((f,i)=>feature('ROUE '+f.name,c=>E.playWheel(c,i,0),[100,300,800][i]));
console.log('\n=== OFFRES ===');
E.OFFERS.forEach(o=>feature('BUY '+o.name,c=>E.buy(c,o.id),o.price));
