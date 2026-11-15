/* 빙글 쏙 — 돌고 있는 조각을 딱 맞는 순간에 톡. 살짝 어긋나면 모서리에 걸려 버티다가 드르륵 돌아 쑥. */
(()=>{
const {clamp,rand,randi,lerp,pick}=DDAK.util;
const CX=180,CY=300;
const poly=(n,R)=>Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [Math.cos(a)*R,Math.sin(a)*R]});
const star=(n,R,r)=>Array.from({length:n*2},(_,i)=>{const a=-Math.PI/2+i*Math.PI/n,q=i%2?r:R;return [Math.cos(a)*q,Math.sin(a)*q]});
const cross=(R,t)=>[[-t,-R],[t,-R],[t,-t],[R,-t],[R,t],[t,t],[t,R],[-t,R],[-t,t],[-R,t],[-R,-t],[-t,-t]];
const gear=(n,R,r)=>{const p=[];for(let i=0;i<n;i++){const a=i*2*Math.PI/n,d=Math.PI/n*.55;
  p.push([Math.cos(a-d)*R,Math.sin(a-d)*R],[Math.cos(a+d)*R,Math.sin(a+d)*R],[Math.cos(a+Math.PI/n-d*.3)*r,Math.sin(a+Math.PI/n-d*.3)*r],[Math.cos(a+Math.PI/n+d*.3)*r,Math.sin(a+Math.PI/n+d*.3)*r])}return p};
const SHAPES=[
  {pts:poly(4,74),sym:90,c:'#e0764f',name:'네모'},
  {pts:poly(3,84),sym:120,c:'#4a8fd0',name:'세모'},
  {pts:poly(5,76),sym:72,c:'#5aa36b',name:'오각'},
  {pts:cross(80,26),sym:90,c:'#d9a52f',name:'십자'},
  {pts:star(5,84,38),sym:72,c:'#a46ad1',name:'별'},
  {pts:poly(6,76),sym:60,c:'#d65a7a',name:'육각'},
  {pts:gear(8,82,62),sym:45,c:'#3d9aa6',name:'톱니'},
  {pts:star(4,86,30),sym:90,c:'#ef8c3a',name:'반짝'},
];
const PER=5;

DDAK.register({
  id:'spin',name:'빙글 쏙',desc:'돌고 있는 조각을 딱 맞는 순간에 톡',color:'#a46ad1',W:360,H:560,
  icon:'<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/><path d="M20 3a3 3 0 0 1 1 3"/></svg>',
  create(api){
    const {sfx,buzz,fx,mat}=api;
    const g={};
    let lv,sh,hole,ang,omega,t,state,h,err,grindT,wob,results,stT,pt,inT,perfTol,grindTol,miss,sinkA,nextAt;
    g.start=L=>{lv=L;results=[];miss=0;newShape();api.actions([])};
    function newShape(){
      sh=SHAPES[(lv-1+results.length)%SHAPES.length];
      if(results.length&&Math.random()<.4)sh=pick(SHAPES);
      hole=rand(0,Math.PI*2);ang=rand(0,Math.PI*2);t=0;state='spin';h=1;err=0;wob=0;sinkA=0;stT=0;
      omega=(1.5+lv*.28+results.length*.12)*(Math.random()<.5?1:-1);
      perfTol=Math.max(1.2,3-lv*.22);grindTol=Math.max(7,15-lv*.9);
      api.hint('맞을 것 같은 순간에 화면을 톡!');
    }
    const wrapDeg=(a,sym)=>{let e=((a*180/Math.PI)%sym+sym)%sym;if(e>sym/2)e-=sym;return e};
    g.down=()=>{
      if(state!=='spin')return;
      state='fall';stT=0;sfx.whoosh();buzz(5);
      err=wrapDeg(ang-hole,sh.sym);
    };
    g.update=dt=>{
      t+=dt;stT+=dt;
      if(state==='spin'){
        const w=lv>=3?omega*(1+.45*Math.sin(t*(1.3+lv*.15))):omega;
        ang+=w*dt;h=lerp(h,1,1-Math.exp(-dt*8));
      }else if(state==='fall'){
        const k=clamp(stT/.36,0,1);h=1-k*k;
        if(k>=1){
          const a=Math.abs(err);
          if(a<=perfTol){state='sink';stT=0;land(true)}
          else if(a<=grindTol){state='rim';stT=0;sfx.bump();buzz(15);fx.shake(2);api.hint('걸렸다… 버텨라…')}
          else{state='bounce';stT=0;sfx.tonk();buzz(20);fx.shake(3);miss++;api.miss();api.hint(`각도가 ${a.toFixed(1)}° 어긋났어요. 다시!`)}
        }
      }else if(state==='rim'){
        wob=Math.sin(stT*38)*Math.exp(-stT*3)*1.6;h=.05+Math.abs(wob)*.01;
        if(stT>.45){state='grind';stT=0;grindT=0;pt=0}
      }else if(state==='grind'){
        h=.05;grindT+=dt;
        pt-=dt;
        if(pt<=0){
          pt=rand(.05,.13);const step=Math.sign(err)*Math.min(Math.abs(err),rand(.5,1.6));
          err-=step;ang-=step*Math.PI/180;sfx.creak(.9);buzz(8);fx.shake(.8);
          if(Math.abs(err)<.25){ang-=err*Math.PI/180;err=0;state='sink';stT=0;fx.slow(.22,.35);land(false)}
        }
        api.scrape(.12,700+(1-Math.abs(err)/grindTol)*700);
      }else if(state==='sink'){
        h=-clamp(stT/.12,0,1)*.06;sinkA=clamp(stT/.12,0,1);
        if(nextAt&&stT>nextAt){nextAt=0;
          if(results.length>=PER)finishLevel();else newShape();
        }
      }else if(state==='bounce'){
        const k=stT/.5;h=k<1?Math.sin(k*Math.PI)*.35:lerp(h,1,1-Math.exp(-dt*6));
        ang+=Math.sign(omega)*dt*4*(1-clamp(k,0,1));
        if(stT>.8){state='spin';api.hint('다시 한 번, 딱 맞는 순간에 톡!')}
      }
    };
    function land(perfect){
      api.hit(CX,CY+130,perfect);
      results.push(perfect?2:1);
      sfx.thunk(perfect?1:.85);buzz(perfect?[30,40,60]:[25,30,40]);fx.shake(perfect?7:5);
      const c='#fff6c9';
      sh.pts.forEach((p,i)=>{if(i%2===0){const [x,y]=rotP(p,hole);fx.burst(CX+x,CY+y,{n:3,colors:['#e9e3d6','#fffaf0'],speed:70,size:2,grav:0})}});
      fx.text(perfect?'쏙!':'쑥!',CX,CY-130,{size:66,color:c});
      if(perfect){setTimeout(()=>sfx.chime(),220);api.hint(`각도 차 ${Math.abs(err).toFixed(1)}° — 완벽해요`)}
      else api.hint('버티다가 쑥! 들어갔어요');
      nextAt=1.05;
    }
    function finishLevel(){
      state='end';
      const perf=results.filter(r=>r===2).length;
      api.complete(perf===PER?'전부 쏙!':'다 넣었어요',`${PER}개 중 ${perf}개는 한 번에 쏙, ${PER-perf}개는 걸렸다가 쑥.${miss?` 튕겨 나간 건 ${miss}번.`:''}`,400,miss+Math.floor((PER-perf)/2));
    }
    const rotP=([x,y],a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
    function path(ctx,pts,a,s){ctx.beginPath();pts.forEach((p,i)=>{const [x,y]=rotP(p,a);i?ctx.lineTo(CX+x*s,CY+y*s):ctx.moveTo(CX+x*s,CY+y*s)});ctx.closePath()}
    g.draw=ctx=>{
      const dpr=api.stage.dpr;
      // 돌판
      const slab=mat.tex('slab',360,560,(x,w,h)=>{
        const bg=x.createRadialGradient(130,170,30,180,300,470);bg.addColorStop(0,'#f3efe8');bg.addColorStop(1,'#b5ad9f');x.fillStyle=bg;x.fillRect(0,0,w,h);
        const R=mat.seeded(77);
        for(let i=0;i<9000;i++){x.fillStyle=R()<.5?'rgba(255,255,255,.10)':'rgba(60,50,40,.07)';x.fillRect(R()*w,R()*h,1+R()*1.6,1+R()*1.6)}
        x.strokeStyle='rgba(110,95,80,.14)';
        for(let i=0;i<8;i++){x.lineWidth=.5+R();x.beginPath();let a=R()*w,b=0;x.moveTo(a,b);while(b<h){a+=(R()-.5)*46;b+=18+R()*30;x.lineTo(a,b)}x.stroke()}
      });
      ctx.drawImage(slab,0,0,360,560);
      // 진행 점
      for(let i=0;i<PER;i++){const x=180+(i-(PER-1)/2)*26,r=results[i];ctx.beginPath();ctx.arc(x,40,8,0,7);
        ctx.fillStyle=r===2?'#e2a92b':r===1?'#4f9b85':'rgba(0,0,0,.14)';ctx.fill();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1;ctx.stroke()}
      // 구멍: 벽이 보이는 깊이감
      const HP=sh.pts.map(([x,y])=>[x*1.012,y*1.012]);
      const holeA=state==='sink'?1-sinkA:1;
      if(holeA>0){ctx.globalAlpha=holeA;
      ctx.save();path(ctx,HP,hole,1);ctx.fillStyle='#57493c';ctx.fill();ctx.clip();
      ctx.translate(8,13);path(ctx,HP,hole,1);ctx.fillStyle='#14100c';ctx.fill();ctx.restore();
      path(ctx,HP,hole,1);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1.2;ctx.stroke();ctx.globalAlpha=1}
      // 조각
      const s=1+Math.max(0,h)*.32,hh=Math.max(0,h);
      const a=ang+(state==='rim'?wob*Math.PI/180:0);
      // 조각: 돌판에서 잘라낸 바로 그 돌. 각도가 맞으면 무늬까지 이어진다
      const lift=state==='sink'?(1-sinkA)*.3:.3+hh*.7;
      ctx.save();
      ctx.shadowColor=`rgba(0,0,0,${(.28+.2*(1-hh))*Math.min(1,lift*3.4)})`;ctx.shadowBlur=(4+hh*30)*dpr;ctx.shadowOffsetX=(2+hh*22)*dpr;ctx.shadowOffsetY=(3+hh*32)*dpr;
      path(ctx,sh.pts,a,s);ctx.fillStyle='#bdb5a8';ctx.fill();ctx.restore();
      ctx.save();path(ctx,sh.pts,a,s);ctx.clip();
      ctx.translate(CX,CY);ctx.rotate(a-hole);ctx.scale(s,s);ctx.translate(-CX,-CY);ctx.drawImage(slab,0,0,360,560);ctx.restore();
      path(ctx,sh.pts,a,s);ctx.fillStyle=`rgba(255,255,255,${.2*lift})`;ctx.fill();
      ctx.lineWidth=2;ctx.strokeStyle=`rgba(255,255,255,${.85*lift})`;ctx.stroke();
      ctx.save();ctx.translate(1.5,2.5);path(ctx,sh.pts,a,s);ctx.lineWidth=1.2;ctx.strokeStyle=`rgba(70,58,44,${.55*lift})`;ctx.stroke();ctx.restore();
      if(state==='sink'&&sinkA>=1&&stT<.6){path(ctx,sh.pts,hole,1.012);ctx.strokeStyle=`rgba(255,246,201,${1-stT/.6})`;ctx.lineWidth=4;ctx.shadowColor='#fff6c9';ctx.shadowBlur=16*dpr;ctx.stroke();ctx.shadowBlur=0}
    };
    function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=(n>>16)+amt,g2=(n>>8&255)+amt,b=(n&255)+amt;r=clamp(r,0,255);g2=clamp(g2,0,255);b=clamp(b,0,255);return `rgb(${r},${g2},${b})`}
    g._dbg=()=>({state,ang,hole,sh,results});
    g.move=()=>{};g.up=()=>{};
    return g;
  }
});
})();
