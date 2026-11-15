/* 책꽂이 — 빈틈에 꼭 맞는 책은 하나뿐. 두꺼우면 안 들어가고, 얇으면 헐렁. 딱 맞는 책은 양옆을 밀어내며 쑤욱. */
(()=>{
const {clamp,rand,randi,lerp,pick,shuffle}=DDAK.util;
const SHELF=300,DESK=548;
const COLORS=['#c9584a','#3f6e8f','#d8a64a','#5b8a5f','#7a5c99','#2f4858','#b86b3c','#8a9aa6','#e3c9a8','#8c3b4a','#4f7d7a','#c98a9a'];
const ROUNDS=3;

DDAK.register({
  id:'book',name:'책꽂이',desc:'빈틈에 꼭 맞는 책을 골라 쑤욱 꽂아요',color:'#c9584a',W:360,H:560,
  icon:'<svg viewBox="0 0 24 24"><path d="M3 4h4v16H3zM7.5 6h4v14h-4zM15 4h3v16h-3zM12.5 20l-.5-11"/><path d="M2 20h20"/></svg>',
  create(api){
    const {sfx,buzz,fx}=api;
    const g={};
    let lv,round,books,gap,L,R,cands,active,ins,state,lean,wob,anim,contactY,said;
    g.start=l=>{lv=l;round=0;newRound();api.actions([])};
    function newRound(){
      const gw=randi(24,32);books=[];let x=12,i=0;const gi=randi(3,6);
      while(x<348){
        if(i===gi){gap={x,w:gw};x+=gw;i++;continue}
        const w=randi(16,32);if(x+w>348){if(books.length)books[books.length-1].w+=348-x;break}
        books.push({x,w,h:randi(140,186),c:pick(COLORS),band:Math.random()<.5});x+=w;i++;
      }
      L=books.find(b=>Math.abs(b.x+b.w-gap.x)<.5);R=books.find(b=>Math.abs(b.x-(gap.x+gap.w))<.5);
      contactY=SHELF-Math.min(L.h,R.h);
      const thick=Math.max(3,8-Math.floor(lv/2)),thin=Math.max(3,9-Math.floor(lv/2));
      const kinds=shuffle([{k:'exact',w:gw},{k:'thick',w:gw+thick},{k:'thin',w:gw-thin}]);
      cands=kinds.map((c,j)=>{const h=randi(150,182),cx=70+j*110;return {...c,h,c:pick(COLORS),band:Math.random()<.5,hx:cx-c.w/2,hy:DESK-h,x:cx-c.w/2,y:DESK-h}});
      active=null;ins=null;state='pick';lean=0;wob=0;anim=null;said=false;
      api.hint(round?'다음 빈틈이에요. 딱 맞는 책을 골라요':'빈틈에 꼭 맞을 것 같은 책을 골라 위로 끌어 올려요');
      api.gauge(`빈틈 ${(gw*.6).toFixed(1)}mm`);
    }
    function profileFor(k){
      if(k==='exact')return {profile:p=>p<.08?.3:p<.75?.85+.75*p:.4,snapAt:.9};
      if(k==='thick')return {profile:p=>p<.06?.45:1.6,wallAt:.26};
      return {profile:()=>.03,snapAt:2,wallAt:1};
    }
    function grab(c,x,y){
      active=c;
      ins=api.Inserter({x:c.x,y:c.y,w:c.w,h:c.h,dir:1,contactY,slotX:gap.x+(gap.w-c.w)/2,tol:7,len:SHELF-contactY,
        press:profileFor(c.k),
        onTouch(){sfx.tap()},
        onCaught(msg,err){sfx.bump();buzz(10);api.hint('빈틈 바로 위로 옮겨 봐요')},
        onEnter(){sfx.tink();buzz(8);api.hint(c.k==='thin'?'어… 술술 들어가는데?':'들어간다… 꾹 밀어요')},
        onSlip(j,p,r){
          if(c.k==='thin'){if(Math.random()<.3)sfx.creak(.25);return}
          sfx.creak(clamp(r/1.5,.3,1.1));buzz(r>1.1?11:5);
          if(c.k==='exact'&&p>.45&&!said){said=true;api.hint('양옆 책이 밀려나요… 조금만 더')}
        },
        onWall(){sfx.bump();buzz(25);fx.shake(2.5);api.hint('너무 두꺼워요. 양옆 책이 버티고 있어요')},
        onSnapStart(){fx.slow(.25,.33)},
        onSnap(){
          state='snapped';sfx.thunk(.85);buzz([30,40,60]);fx.shake(5);wob=1;
          fx.burst(gap.x+gap.w/2,contactY,{n:12,colors:['#fff6e0','#e9dcc3'],speed:90,up:40,size:2});
          fx.seam(gap.x-2,SHELF,gap.x+gap.w+2,SHELF);
          fx.text('쑤욱!',180,140,{size:62,color:'#fff6c9'});
          setTimeout(()=>sfx.chime(),250);
          round++;api.hint(round>=ROUNDS?'책꽂이가 꽉 찼어요':'딱 맞았어요!');
          if(round>=ROUNDS)api.complete('꽉 찼어요',`빈틈 ${ROUNDS}곳에 꼭 맞는 책만 골라 꽂았어요.`);
          else setTimeout(()=>{if(state==='snapped')newRound()},1300);
        },
        onRelease(mode){
          if(mode==='free')goHome();
          else if(mode==='insert'&&c.k==='thick')springOut();
        }
      });
      ins.down(x,y);state='drag';sfx.tap();buzz(4);
    }
    function goHome(){
      if(!active)return;const c=active;anim={c,fx:ins.x,fy:ins.y,t:0,dur:.25};state='anim';sfx.back();
    }
    function springOut(){
      sfx.tonk();buzz(15);api.hint('퉁! 튕겨 나왔어요. 다른 책을 골라 봐요');
      const c=active;anim={c,fx:ins.x,fy:ins.y,t:0,dur:.35,spring:true};state='anim';
    }
    function loose(){
      state='loose';anim={t:0};sfx.tonk();buzz(20);api.hint('헐렁해요… 딱 맞는 책이 아니에요');
    }
    g.down=(x,y)=>{
      if(state==='drag'||state==='insert'){ins.down(x,y);return}
      if(state==='hold'){ins.down(x,y);state='drag';return}
      if(state!=='pick')return;
      const c=cands.find(c=>x>c.x-10&&x<c.x+c.w+10&&y>c.y-10&&y<c.y+c.h+10);
      if(c)grab(c,x,y);
    };
    g._dbg=()=>({ins,gap,cands,state,contactY,round});
    g.move=(x,y)=>{if(state==='drag')ins.move(x,y)};
    g.up=()=>{if(state==='drag'){ins.up();if(state==='drag'&&ins.mode==='insert')state='hold'}};
    g.update=dt=>{
      if(ins&&(state==='drag'||state==='hold'||state==='snapped')){
        ins.update(dt);if(active){active.x=ins.x;active.y=ins.y}
        if(ins.mode==='free'&&ins.contact)api.scrape(Math.min(.08,ins.slideV*.004),1900);
        if(ins.press&&!ins.press.done){
          const P=ins.press;api.scrape(Math.min(.15,P.vel*.0035),active.k==='thin'?1500:380+P.p*700);
          if(active.k==='thin'&&P.p>=.999&&state!=='loose')loose();
        }
      }
      // 양옆 책이 밀려나는 각도
      const P=ins&&ins.press;
      if(state==='snapped'){wob=Math.max(0,wob-dt*1.2);lean=Math.sin((1-wob)*30)*wob*2.2}
      else if(P&&active){
        const sq=active.k==='exact'?Math.sin(Math.PI*clamp(P.p/.9,0,1))*1.6+P.strain*1.2:active.k==='thick'?P.strain*5+P.p*4:0;
        lean=lerp(lean,sq,1-Math.exp(-dt*20));
      }else lean=lerp(lean,0,1-Math.exp(-dt*10));
      if(state==='anim'){
        anim.t+=dt;const k=clamp(anim.t/anim.dur,0,1),e=1-(1-k)*(1-k);const c=anim.c;
        if(anim.spring&&k<.4){c.x=anim.fx;c.y=anim.fy-Math.sin(k/.4*Math.PI)*24}
        else{const kk=anim.spring?(k-.4)/.6:e;c.x=lerp(anim.fx,c.hx,kk);c.y=lerp(anim.spring?anim.fy:anim.fy,c.hy,kk)}
        if(k>=1){c.x=c.hx;c.y=c.hy;state='pick';active=null;ins=null}
      }
      if(state==='loose'){
        anim.t+=dt;
        if(anim.t>1){anim={c:active,fx:active.x,fy:active.y,t:0,dur:.35};state='anim';sfx.back()}
      }
    };
    function drawBook(ctx,b,x,y,ang,pivotX){
      ctx.save();
      if(ang){ctx.translate(pivotX,SHELF);ctx.rotate(ang);ctx.translate(-pivotX,-SHELF)}
      ctx.fillStyle=b.c;api.rr(ctx,x,y,b.w,b.h,[3,3,1,1]);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(x+2,y+2,3,b.h-4);
      ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+b.w-3,y+2,3,b.h-4);
      ctx.fillStyle='rgba(255,240,200,.45)';
      ctx.fillRect(x+3,y+16,b.w-6,3);ctx.fillRect(x+3,y+b.h-24,b.w-6,3);
      if(b.band){ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x+3,y+b.h*.38,b.w-6,b.h*.16)}
      else{ctx.fillStyle='rgba(255,240,200,.35)';ctx.fillRect(x+b.w/2-1.5,y+34,3,b.h*.35)}
      ctx.restore();
    }
    g.draw=ctx=>{
      ctx.fillStyle='#dde4e8';ctx.fillRect(0,0,360,560);
      ctx.fillStyle='rgba(255,255,255,.35)';for(let x=0;x<360;x+=36)ctx.fillRect(x,0,14,SHELF+20);
      // 책들
      books.forEach(b=>{
        let a=0,pv=0;
        if(b===L){a=-lean*Math.PI/180;pv=b.x}else if(b===R){a=lean*Math.PI/180;pv=b.x+b.w}
        drawBook(ctx,b,b.x,SHELF-b.h,a,pv);
      });
      // 빈틈 그림자
      if(state!=='snapped'){ctx.fillStyle='rgba(30,25,20,.18)';ctx.fillRect(gap.x,contactY+6,gap.w,SHELF-contactY-6)}
      // 선반
      ctx.fillStyle='#9b6a3f';ctx.fillRect(0,SHELF,360,16);ctx.fillStyle='#b98250';ctx.fillRect(0,SHELF,360,4);
      ctx.fillStyle='rgba(0,0,0,.15)';ctx.fillRect(0,SHELF+16,360,6);
      // 책상과 후보 책
      ctx.fillStyle='#cfb08a';ctx.fillRect(0,DESK,360,12);ctx.fillStyle='#e1c59f';ctx.fillRect(0,DESK,360,3);
      cands.forEach(c=>{
        if(c===active)return;
        ctx.fillStyle='rgba(0,0,0,.15)';ctx.fillRect(c.x+4,c.y+6,c.w,c.h-6);
        drawBook(ctx,c,c.x,c.y,0,0);
        ctx.fillStyle='rgba(40,40,40,.55)';ctx.font='11px "Noto Sans KR",sans-serif';ctx.textAlign='center';
        ctx.fillText((c.w*.6).toFixed(1)+'mm',c.x+c.w/2,DESK-c.h-8);
      });
      if(active){
        let tilt=ins&&ins.mode==='free'?ins.tilt*.05:0;
        if(state==='loose'){tilt=Math.sin(Math.min(1,anim.t*3)*Math.PI/2)*.12*(1-Math.max(0,anim.t-.7))}
        const P=ins&&ins.press,tr=P&&active.k==='exact'?(Math.random()-.5)*P.strain*1.4:0;
        if(ins&&ins.mode==='free'&&!ins.contact){ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(active.x+8,active.y+12,active.w,active.h)}
        drawBook(ctx,active,active.x+tr,active.y,tilt,active.x+active.w/2);
      }
    };
    return g;
  }
});
})();
