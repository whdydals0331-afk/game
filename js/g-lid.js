/* 꾹 딸깍 — 홀수 단계: 밀폐용기 뚜껑을 얹고 날개 네 개를 꾹꾹 눌러 딸깍.
              짝수 단계: 잼 병 뚜껑을 돌려 잠그다가 마지막에 뻑뻑해지고 '뽁'. */
(()=>{
const {clamp,rand,randi,lerp}=DDAK.util;
const CX=180,CY=300;

DDAK.register({
  id:'lid',name:'꾹 딸깍',desc:'뚜껑을 덮고 꾹꾹, 마지막에 밀폐 딸깍',color:'#d39a2b',W:360,H:560,
  icon:'<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M3 8h18M9 5h6M12 5v3"/></svg>',
  create(api){
    const {sfx,buzz,fx}=api;
    const g={};
    let mode,state,t;
    // 용기
    let C,lid,drag,flaps,active,sealT;
    // 병
    let ang,fingA,lastA,jarP,tickAcc,btn,label;
    g.start=lv=>{
      mode=lv%2===1?'box':'jar';t=0;state='play';api.actions([]);
      if(mode==='box'){
        C={w:Math.min(260,230+lv*4),h:190};
        lid={x:CX+rand(-70,70),y:120,seated:false,seatT:0};drag=null;active=null;sealT=0;
        flaps=['top','right','bottom','left'].map(s=>({s,P:null,p:0,done:false}));
        api.hint('뚜껑을 끌어서 통 위에 딱 맞게 얹어요');api.gauge('뚜껑 얹기');
      }else{
        ang=0;fingA=null;jarP=null;tickAcc=0;btn=0;label=['딸기잼','블루베리','사과잼','유자청','땅콩버터'][randi(0,4)];
        api.hint('뚜껑을 시계 방향으로 돌려요. 나사산에 걸리면 스르륵 잠겨요');api.gauge('0° / 330°');
      }
    };
    // ---------- 용기 ----------
    function flapRect(f){
      const hw=C.w/2,hh=C.h/2;
      if(f.s==='top')return {x:CX-46,y:CY-hh-40,w:92,h:52};
      if(f.s==='bottom')return {x:CX-46,y:CY+hh-12,w:92,h:52};
      if(f.s==='left')return {x:CX-hw-40,y:CY-40,w:52,h:80};
      return {x:CX+hw-12,y:CY-40,w:52,h:80};
    }
    function boxDown(x,y){
      if(!lid.seated){
        if(Math.abs(x-lid.x)<C.w/2+20&&Math.abs(y-lid.y)<C.h/2+20){drag={ox:x-lid.x,oy:y-lid.y};sfx.tap();buzz(4)}
        return;
      }
      const f=flaps.find(f=>{if(f.done)return false;const r=flapRect(f);return x>r.x-14&&x<r.x+r.w+14&&y>r.y-14&&y<r.y+r.h+14});
      if(f){
        active=f;sfx.tap();
        if(!f.P)sfx.suck(),f.P=api.Press({auto:true,v0:.9,v1:3,len:30,jump:2.3,profile:p=>p<.25?.6:p<.72?1.35:.45,snapAt:.86,T:2.2,
          onSlip(){buzz(4)},
          onSnapStart(){fx.slow(.15,.35)},
          onSnap(){
            f.done=true;active=null;api.hit(CX,CY,true);sfx.click(1.2);sfx.thunk(.35);buzz([25,30,40]);fx.shake(3.5);
            const r=flapRect(f);fx.burst(r.x+r.w/2,r.y+r.h/2,{n:8,colors:['#fff','#ffe9b0'],speed:80,size:2,grav:0});
            fx.text('딸깍',r.x+r.w/2,r.y+r.h/2-30,{size:34,color:'#fff6c9'});
            const left=flaps.filter(q=>!q.done).length;
            if(left)api.hint(`딸깍! ${left}개 남았어요`);else seal();
          }});
      }
    }
    function seal(){
      state='sealed';sealT=0;
      setTimeout(()=>{sfx.hiss();fx.seam(CX-C.w/2,CY-C.h/2-2,CX+C.w/2,CY-C.h/2-2);fx.seam(CX+C.w/2,CY+C.h/2+2,CX-C.w/2,CY+C.h/2+2)},260);
      setTimeout(()=>{sfx.chime();fx.text('밀폐 완료',CX,CY,{size:46,color:'#fff6c9'})},500);
      api.hint('공기 한 점 안 들어가요');
      api.complete('밀폐 완료','날개 네 개가 딸깍딸깍, 뚜껑이 통에 딱 붙었어요.',1600);
    }
    function boxMove(x,y){
      if(drag&&!lid.seated){
        lid.x=x-drag.ox;lid.y=y-drag.oy;
        const d=Math.hypot(lid.x-CX,lid.y-CY);
        if(d<11){
          lid.seated=true;drag=null;lid.fromX=lid.x;lid.fromY=lid.y;lid.seatT=0;
          sfx.thunk(.4);sfx.whoosh();buzz([15,20,25]);fx.shake(2.5);
          for(let i=0;i<4;i++)fx.burst(CX+(i%2?1:-1)*C.w/2,CY+(i<2?-1:1)*C.h/2,{n:6,colors:['rgba(255,255,255,.9)'],speed:90,size:3,grav:0,life:.4});
          api.hint('푹! 이제 날개를 하나씩 톡 눌러요');
        }else if(d<50){api.scrape(.03,1200)}
      }
    }
    function boxUpdate(dt){
      if(lid.seated&&lid.seatT<1){lid.seatT=Math.min(1,lid.seatT+dt/.12);lid.x=lerp(lid.fromX,CX,lid.seatT);lid.y=lerp(lid.fromY,CY,lid.seatT)}
      flaps.forEach(f=>{if(f.P){f.P.step(f===active?42:0,dt);f.P.update(dt);f.p=f.P.p;if(f===active)api.scrape(Math.min(.1,f.P.vel*.006),500+f.p*600)}});
      if(state==='sealed')sealT+=dt;
      api.gauge(lid.seated?`잠금 ${flaps.filter(f=>f.done).length} / 4`:`뚜껑까지 ${Math.round(Math.hypot(lid.x-CX,lid.y-CY)*.5)}mm`);
    }
    function boxDraw(ctx){
      // 주방 타일
      ctx.fillStyle='#eef1ef';ctx.fillRect(0,0,360,560);
      ctx.strokeStyle='#d5dcd9';ctx.lineWidth=2;for(let x=0;x<=360;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,560);ctx.stroke()}for(let y=0;y<=560;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke()}
      const hw=C.w/2,hh=C.h/2;
      // 통
      ctx.fillStyle='rgba(0,0,0,.14)';api.rr(ctx,CX-hw+8,CY-hh+12,C.w,C.h,26);ctx.fill();
      ctx.fillStyle='rgba(220,236,240,.95)';api.rr(ctx,CX-hw,CY-hh,C.w,C.h,26);ctx.fill();
      ctx.strokeStyle='#b8cdd3';ctx.lineWidth=3;ctx.stroke();
      ctx.fillStyle='#e9b25a';api.rr(ctx,CX-hw+26,CY-hh+30,C.w-52,C.h-60,18);ctx.fill();
      ctx.fillStyle='#d98f3f';for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(CX-hw+50+i*((C.w-100)/6),CY+(i%2?18:-14),12,0,7);ctx.fill()}
      // 날개 (열림 → 접힘)
      flaps.forEach(f=>drawFlap(ctx,f,true));
      // 뚜껑
      const s=lid.seated?1+(1-lid.seatT)*.04-(state==='sealed'?Math.min(.012,sealT*.04):0):1.06;
      ctx.save();ctx.translate(lid.x,lid.y);ctx.scale(s,s);
      if(!lid.seated){ctx.fillStyle='rgba(0,0,0,.2)';api.rr(ctx,-hw+10,-hh+16,C.w,C.h,26);ctx.fill()}
      ctx.fillStyle='rgba(120,190,205,.55)';api.rr(ctx,-hw,-hh,C.w,C.h,26);ctx.fill();
      ctx.strokeStyle='rgb(92,158,176)';ctx.lineWidth=4;ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;api.rr(ctx,-hw+14,-hh+14,C.w-28,C.h-28,18);ctx.stroke();
      ctx.restore();
      flaps.forEach(f=>drawFlap(ctx,f,false));
      if(!lid.seated){ctx.setLineDash([6,6]);ctx.strokeStyle='rgba(70,140,160,.45)';ctx.lineWidth=2;api.rr(ctx,CX-hw,CY-hh,C.w,C.h,26);ctx.stroke();ctx.setLineDash([])}
    }
    function drawFlap(ctx,f,under){
      const hw=C.w/2,hh=C.h/2,p=f.p,out=34*(1-p),inn=22*p;
      const tr=f===active&&f.P?(Math.random()-.5)*f.P.strain*1.5:0;
      ctx.save();ctx.translate(CX+tr,CY);
      const rot={top:0,right:Math.PI/2,bottom:Math.PI,left:-Math.PI/2}[f.s];ctx.rotate(rot);
      const edge=(f.s==='top'||f.s==='bottom')?hh:hw,half=f.s==='top'||f.s==='bottom'?44:34;
      if(under&&p<.5){ctx.fillStyle='rgb(92,158,176)';api.rr(ctx,-half,-edge-out,half*2,out+4,8);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(-half+10,-edge-out+8,half*2-20,4)}
      if(!under&&p>=.5){ctx.fillStyle='rgb(92,158,176)';api.rr(ctx,-half,-edge-4,half*2,inn+4,8);ctx.fill();
        ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(-half+10,-edge+inn-6,half*2-20,3)}
      if(!under&&p<.5&&lid.seated&&!f.done){ctx.strokeStyle=`rgba(255,211,107,${.5+.4*Math.sin(t*6)})`;ctx.lineWidth=2;api.rr(ctx,-half-3,-edge-out-3,half*2+6,out+10,10);ctx.stroke()}
      ctx.restore();
    }
    // ---------- 병 ----------
    const FREE=240,TOTAL=330;
    function jarDown(x,y){if(state!=='play')return;fingA=Math.atan2(y-CY,x-CX);lastA=ang;sfx.tap();buzz(4);g.fingTotal=ang}
    function jarMove(x,y){
      if(fingA==null||state!=='play')return;
      const a=Math.atan2(y-CY,x-CX);let d=(a-fingA)*180/Math.PI;if(d>180)d-=360;if(d<-180)d+=360;fingA=a;
      g.fingTotal+=d;
      if(!jarP){
        const before=ang;ang=clamp(g.fingTotal,0,FREE);g.fingTotal=Math.max(0,Math.min(g.fingTotal,FREE+60));
        tickAcc+=Math.abs(ang-before);
        if(tickAcc>24){tickAcc=0;sfx.creak(.2);buzz(3)}
        api.scrape(Math.min(.08,Math.abs(ang-before)*.01),900);
        if(ang>=FREE){
          sfx.suck();jarP=api.Press({auto:true,v0:.5,v1:2.6,len:TOTAL-FREE,jump:3.2,T:2.3,profile:p=>p<.3?.8:p<.75?1.6:.5,snapAt:.9,
            onSlip(){buzz(4)},
            onSnapStart(){fx.slow(.25,.3)},
            onSnap(){
              state='done';btn=0;api.hit(CX,CY+170,true);sfx.pop();sfx.thunk(.5);buzz([20,30,60]);fx.shake(5);
              fx.text('뽁!',CX,CY-150,{size:66,color:'#fff6c9'});setTimeout(()=>sfx.chime(),220);
              g.doneAt=t;
              api.hint('가운데 단추가 쏙 들어갔어요. 완전 밀폐');
              api.complete('뽁!',`${label} 뚜껑을 끝까지 돌려 잠갔어요. 가운데 단추가 쏙 들어갔어요.`);
            }});
          api.hint('걸렸다… 스르륵');sfx.tink();
        }
      }
    }
    function jarUp(){fingA=null}
    function jarUpdate(dt){
      if(jarP){
        const push=fingA!=null?clamp(g.fingTotal-ang,0,90)*1.1:0;
        jarP.step(push,dt);jarP.update(dt);ang=FREE+jarP.p*(TOTAL-FREE);
        api.scrape(Math.min(.15,jarP.vel*.004),400+jarP.p*500);
        if(fingA==null)g.fingTotal=ang;
      }
      if(state==='done')btn=Math.min(1,btn+dt*8);
      api.gauge(`${Math.round(ang)}° / ${TOTAL}°`);
    }
    function jarDraw(ctx){
      ctx.fillStyle='#eef1ef';ctx.fillRect(0,0,360,560);
      ctx.strokeStyle='#d5dcd9';ctx.lineWidth=2;for(let x=0;x<=360;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,560);ctx.stroke()}for(let y=0;y<=560;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke()}
      const R=118,a=ang*Math.PI/180,tr=jarP&&!jarP.done?(Math.random()-.5)*jarP.strain*.02:0;
      // 병 몸통(유리)
      ctx.fillStyle='rgba(0,0,0,.12)';ctx.beginPath();ctx.arc(CX+8,CY+14,R+12,0,7);ctx.fill();
      ctx.fillStyle='#c0922b';ctx.beginPath();ctx.arc(CX,CY,R+12,0,7);ctx.fill();
      ctx.save();ctx.translate(CX,CY);ctx.rotate(a+tr);
      // 뚜껑
      const gr=ctx.createRadialGradient(-30,-40,10,0,0,R);gr.addColorStop(0,'#f1d27b');gr.addColorStop(1,'#c99a2e');
      ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,R,0,7);ctx.fill();
      ctx.strokeStyle='rgba(120,80,10,.55)';ctx.lineWidth=2;
      for(let i=0;i<72;i++){const q=i*Math.PI*2/72;ctx.beginPath();ctx.moveTo(Math.cos(q)*(R-9),Math.sin(q)*(R-9));ctx.lineTo(Math.cos(q)*R,Math.sin(q)*R);ctx.stroke()}
      ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,R-16,0,7);ctx.stroke();
      ctx.fillStyle='rgba(90,50,10,.75)';ctx.font='26px Jua, "Noto Sans KR", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,0,-62);
      // 가운데 단추
      ctx.beginPath();ctx.arc(0,18,34,0,7);
      const bg=ctx.createRadialGradient(btn?8:-10,btn?26:6,4,0,18,34);
      bg.addColorStop(0,btn?'#b7891f':'#fbe7a6');bg.addColorStop(1,btn?'#e8c463':'#c99a2e');ctx.fillStyle=bg;ctx.fill();
      ctx.fillStyle='rgba(90,50,10,.6)';ctx.font='13px "Noto Sans KR",sans-serif';ctx.fillText(btn?'밀폐됨':'누름',0,18);
      ctx.restore();
      if(state==='done'&&g.doneAt!=null){const k=clamp((t-g.doneAt)/.7,0,1);ctx.save();ctx.strokeStyle=`rgba(255,246,201,${1-k})`;ctx.lineWidth=5;ctx.shadowColor='#fff6c9';ctx.shadowBlur=18;
        ctx.beginPath();ctx.arc(CX,CY,R+4,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,k*2.2));ctx.stroke();ctx.restore()}
      // 회전 안내 화살표
      if(state==='play'){
        ctx.strokeStyle=`rgba(63,143,122,${.35+.25*Math.sin(t*4)})`;ctx.lineWidth=5;ctx.lineCap='round';
        ctx.beginPath();ctx.arc(CX,CY,R+34,-Math.PI*.8,-Math.PI*.2);ctx.stroke();
        const e=-Math.PI*.2,ex=CX+Math.cos(e)*(R+34),ey=CY+Math.sin(e)*(R+34);
        ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-14,ey-6);ctx.moveTo(ex,ey);ctx.lineTo(ex-4,ey-16);ctx.stroke();
      }
      // 각도 눈금
      ctx.fillStyle='rgba(0,0,0,.08)';api.rr(ctx,40,500,280,10,5);ctx.fill();
      ctx.fillStyle=ang>=FREE?'#d39a2b':'#3f8f7a';api.rr(ctx,40,500,280*ang/TOTAL,10,5);ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(40+280*FREE/TOTAL,494,2,22);
    }
    g._dbg=()=>({mode,state,lid,flaps,ang,C,flapRect});
    g.down=(x,y)=>mode==='box'?boxDown(x,y):jarDown(x,y);
    g.move=(x,y)=>mode==='box'?boxMove(x,y):jarMove(x,y);
    g.up=()=>{if(mode==='box'){drag=null;active=null}else jarUp()};
    g.update=dt=>{t+=dt;mode==='box'?boxUpdate(dt):jarUpdate(dt)};
    g.draw=ctx=>mode==='box'?boxDraw(ctx):jarDraw(ctx);
    return g;
  }
});
})();
