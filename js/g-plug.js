/* 딸깍 꽂기 — 플러그를 단자에. 방향이 틀리면 툭 막히고, 맞으면 뻑뻑하다가 딸깍! 불이 들어온다. */
(()=>{
const {clamp,rand,randi,lerp}=DDAK.util;
const FACE=236;
const TYPES=[
  {id:'c',name:'USB-C',dev:'보조배터리',mw:30,ml:34,bw:40,bh:74,body:'#33383d',metal:'#c9ced3',orient:false,
    prof:p=>p<.1?.3:p<.68?.8:p<.82?1.9:.4,snap:.9,det:[]},
  {id:'a',name:'USB-A',dev:'충전기',mw:46,ml:42,bw:56,bh:80,body:'#1f2326',metal:'#d2d6da',orient:true,wrong:.14,
    prof:p=>p<.1?.35:p<.7?.9:p<.84?1.8:.45,snap:.9,det:[]},
  {id:'power',name:'전원 플러그',dev:'벽 콘센트',mw:44,ml:52,bw:64,bh:78,body:'#f1efe9',metal:'#d8c7a0',orient:false,
    prof:p=>p<.08?.4:p<.55?1.1:p<.8?2.1:.4,snap:.88,det:[],lamp:true},
  {id:'lan',name:'랜선',dev:'공유기',mw:40,ml:46,bw:44,bh:70,body:'rgba(190,220,240,.85)',metal:'#e3b341',orient:true,wrong:.18,
    prof:p=>p<.1?.3:p<.75?.85:p<.86?1.7:.35,snap:.9,det:[],latch:true},
  {id:'jack',name:'이어폰',dev:'스피커',mw:12,ml:62,bw:22,bh:84,body:'#f4f4f4',metal:'#c9ced3',orient:false,
    prof:p=>(p>.28&&p<.36)||(p>.55&&p<.63)?2.2:p<.82?.6:p<.88?1.6:.4,snap:.92,det:[.36,.63]},
];

DDAK.register({
  id:'plug',name:'딸깍 꽂기',desc:'방향 맞춰 꾹, 딸깍 하고 불이 들어와요',color:'#3a6fb0',W:360,H:560,
  icon:'<svg viewBox="0 0 24 24"><path d="M8 2v5M16 2v5M6 7h12v5a6 6 0 0 1-12 0z"/><path d="M12 18v4"/></svg>',
  create(api){
    const {sfx,buzz,fx}=api;
    const g={};
    let T,ins,slotX,state,flipped,sockSide,flipA,flipping,wrongTries,led,lamp,latchA,passed,said,doneT,round,LV,nextT,caught;
    const ROUNDS=3;
    g.start=lv=>{LV=lv;round=0;wrongTries=0;caught=0;setup()};
    function setup(){
      T=TYPES[(LV-1+round)%TYPES.length];nextT=0;
      slotX=Math.round(180-T.mw/2);
      sockSide=Math.random()<.5?-1:1;
      flipped=T.orient&&Math.random()<.72?sockSide:-sockSide; // 처음엔 대개 반대
      state='play';flipA=1;flipping=0;led=0;lamp=0;latchA=0;passed={};said=false;doneT=0;
      make(180-T.mw/2+randi(-60,60),FACE+120);
      api.actions(T.orient?[{id:'flip',label:'⇋ 뒤집기',onClick:flip}]:[]);
      api.hint(`${T.name}를 단자 입구에 딱 맞추면 쏘옥 빨려 들어가요`);
      fx.focus(180,FACE);
    }
    const correct=()=>!T.orient||flipped!==sockSide;
    function make(x,y){
      ins=api.Inserter({x,y,w:T.mw,h:T.ml,dir:-1,contactY:FACE,slotX,tol:Math.max(3,6-api.lv*.12),len:T.ml,
        minX:20,maxX:340-T.mw,damp:.4,
        press:correct()?{profile:T.prof,snapAt:T.snap}:{profile:p=>p<.1?.4:1,wallAt:T.wrong},
        onTouch(){sfx.tap()},
        onCaught(){caught++;sfx.bump();buzz(10);api.hint('단자 입구에 안 맞아요. 옆으로 살짝')},
        onEnter(){sfx.tink();buzz(8);api.hint(correct()?'맞았다… 쏘옥':'들어가나…?')},
        onSlip(j,p,r,before){
          buzz(4);
          T.det.forEach(d=>{if(before<d&&p>=d&&!passed[d]){passed[d]=true;sfx.click(.45);buzz(15);fx.shake(1);api.hint('톡… 아직이에요, 조금 더')}});
          if(r>1.5&&!said){said=true;api.hint('빡빡해요… 거의 다 왔어요')}
        },
        onWall(){wrongTries++;sfx.bump();buzz(30);fx.shake(3);api.hint('툭. 반대 방향이에요! 뒤집어 보세요');api.pulse('flip');const me=ins;setTimeout(()=>{if(ins===me&&state==='play'&&!flipping){make(slotX,FACE+30);sfx.back()}},420)},
        onSnapStart(){fx.slow(.25,.3)},
        onSnap(){
          state='done';
          sfx.click(1.2);sfx.thunk(T.lamp?1:.55);buzz([20,30,60]);fx.shake(T.lamp?7:4);
          fx.seam(slotX-T.bw/2+T.mw/2,FACE,slotX+T.mw/2+T.bw/2,FACE);
          fx.text('딸깍!',180,FACE+170,{size:64,color:'#fff6c9'});
          setTimeout(()=>{sfx.chime()},220);
          round++;
          if(round>=ROUNDS){api.hint(T.lamp?'불이 켜졌어요':'전부 연결됐어요');
            api.complete('딸깍!',wrongTries+caught?`플러그 ${ROUNDS}개 연결. 막히거나 걸린 건 ${wrongTries+caught}번.`:`플러그 ${ROUNDS}개를 전부 한 번에 꽂았어요.`,1500,wrongTries+caught)}
          else{nextT=1.3;api.hint(`연결! 다음 플러그 (${round}/${ROUNDS})`)}
        },
        onPull(){if(state==='play'&&ins.press&&!ins.press.done){make(slotX,FACE+16);ins.down(...lastF);sfx.back();api.hint(correct()?'빠졌어요. 다시 꾹':'뺐어요. 뒤집어서 다시')}},
      });
    }
    let lastF=[0,0];
    function flip(){
      if(state!=='play'||flipping)return;
      if(ins.mode==='insert'){make(slotX,FACE+18)}
      flipping=1;sfx.whoosh();buzz(6);
    }
    g.down=(x,y)=>{
      if(state!=='play'||flipping)return;lastF=[x,y];
      const inside=x>ins.x-T.bw/2-20&&x<ins.x+T.mw+T.bw/2+20&&y>ins.y-30&&y<ins.y+T.ml+T.bh+30;
      if(ins.mode==='insert'||inside){ins.down(x,y);buzz(4)}
      else{ins.down(ins.x+T.mw/2,ins.y+T.ml);ins.grab.ox=T.mw/2;ins.grab.oy=T.ml;ins.move(x,y)}
    };
    g._dbg=()=>({ins,slotX,state,T,flipped,sockSide,correct:correct()});
    g.move=(x,y)=>{lastF=[x,y];if(state==='play'&&!flipping)ins.move(x,y)};
    g.up=()=>{ins&&ins.up()};
    g.update=dt=>{
      ins.update(dt);
      if(flipping){
        flipping+=dt/.24;flipA=Math.max(.04,Math.abs(Math.cos(Math.min(1,flipping-1)*Math.PI)));
        if(flipping>=1.5&&!g._half){g._half=true;flipped=-flipped;make(ins.x,ins.y)}
        if(flipping>=2){flipping=0;flipA=1;g._half=false}
      }
      if(ins.mode==='free'&&ins.contact)api.scrape(Math.min(.07,ins.slideV*.004),2300);
      if(ins.mode==='insert'){const P=ins.press;api.scrape(Math.min(.14,P.vel*.0033),600+P.p*1100)}
      if(state==='done'&&nextT>0){nextT-=dt;if(nextT<=0){setup();return}}
      if(state==='done'){doneT+=dt;led=Math.min(1,led+dt*4);if(T.lamp)lamp=Math.min(1,lamp+dt*2.5);if(T.latch)latchA=Math.min(1,latchA+dt*8)}
      api.gauge(ins.mode==='insert'?`${T.name} · 깊이 ${Math.round(ins.press.p*100)}%`:state==='done'?`${T.name} · 연결됨`:`${T.name} · ${T.orient?(flipped>0?'오른쪽':'왼쪽')+' 면 위':'방향 상관없음'}`);
    };
    g.draw=ctx=>{
      // 책상 매트
      const bg=ctx.createLinearGradient(0,0,0,560);bg.addColorStop(0,lamp?mix('#2a2f35','#6b5434',lamp):'#2a2f35');bg.addColorStop(1,'#1d2125');
      ctx.fillStyle=bg;ctx.fillRect(0,0,360,560);
      if(lamp){const r=ctx.createRadialGradient(180,120,10,180,120,320);r.addColorStop(0,`rgba(255,214,140,${.55*lamp})`);r.addColorStop(1,'rgba(255,214,140,0)');ctx.fillStyle=r;ctx.fillRect(0,0,360,560)}
      // 기기
      const devC=T.id==='power'?'#ece9e2':T.id==='lan'?'#f2f2f0':'#3b4046';
      api.mat.shadow(ctx,26,0,14,.55,()=>{ctx.fillStyle=devC;api.rr(ctx,30,26,300,FACE-26,22);ctx.fill()});
      const dg=ctx.createLinearGradient(30,0,330,0);dg.addColorStop(0,'rgba(0,0,0,.22)');dg.addColorStop(.08,'rgba(255,255,255,.10)');dg.addColorStop(.5,'rgba(255,255,255,0)');dg.addColorStop(.94,'rgba(0,0,0,.08)');dg.addColorStop(1,'rgba(0,0,0,.3)');
      ctx.fillStyle=dg;api.rr(ctx,30,26,300,FACE-26,22);ctx.fill();
      const bt=ctx.createLinearGradient(0,FACE-40,0,FACE);bt.addColorStop(0,'rgba(0,0,0,0)');bt.addColorStop(1,'rgba(0,0,0,.28)');ctx.fillStyle=bt;api.rr(ctx,30,FACE-40,300,40,[0,0,22,22]);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.12)';api.rr(ctx,30,26,300,10,[22,22,0,0]);ctx.fill();
      ctx.fillStyle=T.id==='power'||T.id==='lan'?'rgba(0,0,0,.45)':'rgba(255,255,255,.55)';ctx.font='15px Jua, "Noto Sans KR", sans-serif';ctx.textAlign='left';
      ctx.fillText(T.dev,52,62);
      // LED
      for(let i=0;i<ROUNDS;i++){const on=i<round-(state==='done'?1:0)?1:(i===round-1&&state==='done'?led:0);
        ctx.beginPath();ctx.arc(300-(ROUNDS-1-i)*18,56,5.5,0,7);ctx.fillStyle=on?`rgba(80,230,150,${.4+.6*on})`:'rgba(0,0,0,.35)';ctx.fill();
        if(on){ctx.shadowColor='#5ef0a4';ctx.shadowBlur=18*on*api.stage.dpr;ctx.fill();ctx.shadowBlur=0}}
      if(T.lamp){ctx.beginPath();ctx.arc(180,110,26,0,7);ctx.fillStyle=lamp?`rgba(255,226,150,${.3+.7*lamp})`:'rgba(0,0,0,.12)';ctx.fill();
        if(lamp){ctx.shadowColor='#ffe08a';ctx.shadowBlur=40*lamp;ctx.fill();ctx.shadowBlur=0}}
      // 단자(단면)
      drawSocket(ctx);
      // 플러그
      drawPlug(ctx);
    };
    function drawSocket(ctx){
      const x=slotX,top=FACE-T.ml-3;
      if(T.id==='power'){
        [x+4,x+T.mw-12].forEach(px=>{ctx.fillStyle='#1b1b1b';ctx.fillRect(px-1.5,top,11,T.ml+3);ctx.fillStyle='#b9a77a';ctx.fillRect(px-1.5,top+10,2,T.ml-14);ctx.fillRect(px+7.5,top+10,2,T.ml-14)});
        return;
      }
      ctx.fillStyle='#121417';ctx.fillRect(x-1.5,top,T.mw+3,T.ml+3);
      ctx.strokeStyle='#8e959c';ctx.lineWidth=1.5;ctx.strokeRect(x-1.5,top,T.mw+3,T.ml+3);
      if(T.orient){
        const half=T.mw/2,tx=sockSide>0?x+half:x;
        ctx.fillStyle=T.id==='lan'?'#30343a':'#2b5fbf';ctx.fillRect(tx+3,top+3,half-6,T.ml-6);
        if(T.id==='lan'){ctx.fillStyle='#d9b448';for(let i=0;i<4;i++)ctx.fillRect(tx+5+i*4.4,top+8,2,10)}
      }else if(T.id==='c'){ctx.fillStyle='#4a4f55';ctx.fillRect(x+7,top+4,T.mw-14,T.ml-14)}
      else if(T.id==='jack'){ctx.fillStyle='#3a3f45';ctx.fillRect(x+1,top+T.ml*.3,2,8);ctx.fillRect(x+T.mw-3,top+T.ml*.6,2,8)}
    }
    function drawPlug(ctx){
      const P=ins.press,tr=P&&!P.done?(Math.random()-.5)*P.strain*1.6:0;
      const x=ins.x+tr,y=ins.y,cx=x+T.mw/2;
      ctx.save();
      ctx.translate(cx,y+T.ml);ctx.rotate(ins.tilt*.06);ctx.scale(flipA,1);ctx.translate(-cx,-(y+T.ml));
      // 케이블
      ctx.strokeStyle=T.id==='power'||T.id==='jack'?'#e8e6e0':'#2b2f33';ctx.lineWidth=T.id==='jack'?6:10;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(cx,y+T.ml+T.bh-4);ctx.bezierCurveTo(cx,y+T.ml+T.bh+90,180+(cx-180)*.3,560,180,620);ctx.stroke();
      // 몸통
      api.mat.shadow(ctx,ins.contact||ins.mode!=='free'?8:20,ins.contact||ins.mode!=='free'?2:8,ins.contact||ins.mode!=='free'?4:14,.5,()=>{ctx.fillStyle=T.body;api.rr(ctx,cx-T.bw/2,y+T.ml,T.bw,T.bh,[6,6,12,12]);ctx.fill()});
      const pg=ctx.createLinearGradient(cx-T.bw/2,0,cx+T.bw/2,0);pg.addColorStop(0,'rgba(0,0,0,.3)');pg.addColorStop(.2,'rgba(255,255,255,.22)');pg.addColorStop(.55,'rgba(255,255,255,0)');pg.addColorStop(1,'rgba(0,0,0,.35)');
      ctx.fillStyle=pg;api.rr(ctx,cx-T.bw/2,y+T.ml,T.bw,T.bh,[6,6,12,12]);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(cx-T.bw/2+3,y+T.ml+3,4,T.bh-12);
      ctx.fillStyle='rgba(0,0,0,.15)';for(let i=0;i<4;i++)ctx.fillRect(cx-T.bw/2+8,y+T.ml+T.bh-30+i*6,T.bw-16,2);
      // 금속부
      if(T.id==='power'){
        [x+4,x+T.mw-12].forEach(px=>{const gr=ctx.createLinearGradient(px,0,px+8,0);gr.addColorStop(0,'#f0e2bd');gr.addColorStop(1,'#a8946a');ctx.fillStyle=gr;api.rr(ctx,px,y,8,T.ml,[4,4,0,0]);ctx.fill()});
      }else if(T.id==='jack'){
        const gr=ctx.createLinearGradient(x,0,x+T.mw,0);gr.addColorStop(0,'#f1f3f5');gr.addColorStop(1,'#9aa1a8');ctx.fillStyle=gr;api.rr(ctx,x,y,T.mw,T.ml,[6,6,0,0]);ctx.fill();
        ctx.fillStyle='#2a2d31';ctx.fillRect(x,y+T.ml*.22,T.mw,3);ctx.fillRect(x,y+T.ml*.45,T.mw,3);ctx.fillRect(x,y+T.ml*.7,T.mw,3);
      }else if(T.id==='lan'){
        ctx.fillStyle='rgba(200,230,250,.9)';ctx.fillRect(x,y,T.mw,T.ml);
        const half=T.mw/2,side=flipped;ctx.fillStyle='#e3b341';for(let i=0;i<4;i++)ctx.fillRect((side>0?x+half:x)+5+i*4.4,y+4,2,12);
        // 걸쇠
        const lx=side>0?x:x+T.mw,dir=side>0?-1:1,ang=lerp(.5,.12,latchA);
        ctx.strokeStyle='rgba(170,210,235,.95)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(lx,y+T.ml-6);ctx.lineTo(lx+dir*Math.sin(ang)*30,y+T.ml-6-Math.cos(ang)*30);ctx.stroke();
      }else{
        const gr=ctx.createLinearGradient(x,0,x+T.mw,0);gr.addColorStop(0,'#eef0f2');gr.addColorStop(.5,T.metal);gr.addColorStop(1,'#9097a0');
        ctx.fillStyle=gr;api.rr(ctx,x,y,T.mw,T.ml,T.id==='c'?[8,8,0,0]:1);ctx.fill();
        if(T.id==='a'){const half=T.mw/2,side=flipped;ctx.fillStyle='#2b5fbf';ctx.fillRect((side>0?x+half:x)+3,y+3,half-6,T.ml-6)}
        if(T.id==='c'){ctx.fillStyle='#22262a';api.rr(ctx,x+4,y+4,T.mw-8,T.ml-10,5);ctx.fill()}
      }
      ctx.restore();
    }
    function mix(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);const c=[16,8,0].map(s=>Math.round(lerp(pa>>s&255,pb>>s&255,t)));return `rgb(${c.join(',')})`}
    return g;
  }
});
})();
