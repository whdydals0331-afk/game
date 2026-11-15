/* 틈새 밀기 — 나무 블록에 파인 홈 여러 개를 조각으로 하나씩 메운다.
   틈은 0.1mm 남짓. 표면에서 살살 맞추고, 꾹 밀면 뻑뻑하게 들어가다 딱! 다 메우면 이음새 없는 한 덩어리. */
(()=>{
const {clamp,randi,lerp,shuffle}=DDAK.util;
const U=20,SURF=320,BX=14,BW=332,BB=548;
const SHAPES=[
  [[0,0,4,4]],
  [[0,0,3,6]],
  [[0,0,6,2],[2,2,2,4]],
  [[0,0,5,2],[0,2,2,4]],
  [[0,0,6,2],[1,2,4,2],[2,4,2,2]],
  [[0,0,6,2],[0,2,2,3],[4,2,2,3]],
  [[0,0,7,1],[1,1,5,1],[2,2,3,4]],
  [[0,0,4,2],[1,2,2,5]],
  [[0,0,2,7]],
  [[0,0,5,1],[1,1,3,1],[2,2,1,5]],
];
const MATS=[
  {k:'wood',name:'호두나무',o:{base:'#6e452a',dark:'#2b170a',light:'#a5744a',seed:3,vertical:true}},
  {k:'brass',name:'황동'},
  {k:'wood',name:'체리나무',o:{base:'#a8482e',dark:'#5a1c10',light:'#d47a55',seed:5,vertical:true}},
  {k:'paint',name:'옻칠',c:'#2c7f8f'},
  {k:'paint',name:'붉은 옻칠',c:'#b23a48'},
];
const dimsOf=rs=>({w:Math.max(...rs.map(r=>r[0]+r[2])),h:Math.max(...rs.map(r=>r[1]+r[3]))});
const rot90=rs=>{const {h}=dimsOf(rs);return rs.map(([x,y,w,hh])=>[h-y-hh,x,hh,w])};
const cellsOf=rs=>{const s=new Set();rs.forEach(([x,y,w,h])=>{for(let i=0;i<w;i++)for(let j=0;j<h;j++)s.add((x+i)+','+(y+j))});return s};
const sig=rs=>[...cellsOf(rs)].sort().join(';');

DDAK.register({
  id:'slot',name:'틈새 밀기',desc:'0.1mm 틈. 걸릴 듯 말 듯 꾹 밀어 넣어요',color:'#2f8f7a',W:360,H:560,
  icon:'<svg viewBox="0 0 24 24"><path d="M3 14h6v6h6v-6h6v7H3z"/><path d="M9.5 4h5v9h-5z"/><path d="M12 1v2"/></svg>',
  create(api){
    const {sfx,buzz,fx,mat}=api;
    const g={};
    let lv,slots,idx,target,cur,ins,M,clear,tol,slotX,state,rotVis=0,miss,tightSaid,nextT,allT;
    g.start=L=>{
      lv=L;miss=0;allT=0;
      // 홈 개수: 1단계 1개 → 점점 늘어 3개. 블록 너비에 안 들어가면 줄인다
      let k=lv<=1?1:lv<=3?2:3,pool=shuffle(SHAPES.map((s,i)=>i)),pickd;
      for(;;){
        pickd=[];for(let i=0;i<k;i++)pickd.push(SHAPES[(lv-1+i*3+(i?pool[i]:0))%SHAPES.length]);
        const total=pickd.reduce((a,s)=>a+dimsOf(s).w*U,0)+(k-1)*26;
        if(total<=BW-36||k===1)break;k--;
      }
      const total=pickd.reduce((a,s)=>a+dimsOf(s).w*U,0)+(k-1)*26;
      let x=Math.round(180-total/2);
      slots=pickd.map((shape,i)=>{const s={shape,x,filled:false,t:0,mat:MATS[(lv-1+i)%MATS.length]};x+=dimsOf(shape).w*U+26;return s});
      clear=Math.max(.02,.5/Math.pow(lv,.8));tol=Math.max(2.5,7-lv*.5);
      spawn(0);
      api.hint(slots.length>1?`홈 ${slots.length}개를 차례로 메워요. 빛나는 홈 위에서 아래로 꾹`:'조각을 홈 위에 맞추고, 아래로 꾹 밀어요');
    };
    function spawn(i){
      idx=i;const S=slots[i];target=S.shape;cur=target;M=S.mat;slotX=S.x;
      const canRot=lv>=4;
      if(canRot){const k=randi(1,3);for(let j=0;j<k;j++)cur=rot90(cur)}
      const td=dimsOf(target),cd=dimsOf(cur);
      state='play';rotVis=0;tightSaid=false;nextT=0;
      fx.focus(slotX+td.w*U/2,SURF+td.h*U/2);
      ins=api.Inserter({
        x:clamp(slotX+randi(-70,70),4,356-cd.w*U),y:Math.max(20,150-cd.h*U),w:cd.w*U,h:cd.h*U,dir:1,contactY:SURF,slotX,tol,len:td.h*U,
        minX:4,maxX:356-cd.w*U,
        press:{profile:p=>p<.06?.3:p<.6?.9+.4*p:p<.78?1.75:.45,snapAt:.88},
        canEnter:()=>sig(cur)===sig(target)?true:'모양 방향이 달라요. 돌려 보세요',
        onTouch(){sfx.tap()},
        onCaught(msg,err){miss++;sfx.bump();buzz(12);fx.shake(1.5);if(msg)api.pulse('rot');api.hint(msg||(Math.abs(err)>tol*3?'빛나는 홈 위로 옮겨서 맞춰요':'턱! 살짝 어긋났어요. 옆으로 조금만'))},
        onEnter(){sfx.tink();buzz(10);api.hint('들어간다… 계속 꾹 밀어요')},
        onSlip(j,p,r){
          sfx.creak(clamp(r/1.6,.3,1.2));buzz(r>1.2?12:5);
          fx.burst(slotX+(Math.random()<.5?0:td.w*U),SURF,{n:1,colors:['#f1dcb4','#d9b07a'],speed:40,up:30,size:1.6,life:.4});
          if(r>1.2&&!tightSaid){tightSaid=true;api.hint('빡빡해요… 조금만 더')}
        },
        onSnapStart(){fx.slow(.28,.32)},
        onSnap(){
          S.filled=true;S.t=0;state='wait';
          const last=idx===slots.length-1,w=td.w*U;
          sfx.thunk(last?1:.8);buzz(last?[35,40,70]:[25,30,40]);fx.shake(last?8:5);
          fx.burst(slotX,SURF,{n:14,colors:['#f1dcb4','#d9b07a','#fff6e0'],speed:150,up:80,angle:-Math.PI*.75,spread:1.2,size:2.6});
          fx.burst(slotX+w,SURF,{n:14,colors:['#f1dcb4','#d9b07a','#fff6e0'],speed:150,up:80,angle:-Math.PI*.25,spread:1.2,size:2.6});
          fx.seam(slotX-6,SURF,slotX+w+6,SURF);
          fx.text(last?'딱!':'쿵',slotX+w/2,SURF-90,{size:last?72:54,color:'#fff6c9'});
          if(last){
            state='done';setTimeout(()=>sfx.chime(),260);
            setTimeout(()=>{fx.seam(BX,SURF,BX+BW,SURF,{w:4})},500);
            api.hint('이음새 없는 한 덩어리가 됐어요');
            api.complete('딱 맞았어요',`틈 ${clear.toFixed(2)}mm 홈 ${slots.length}개를 끝까지, 높이까지 딱 맞게 메웠어요.`,1500,miss);
          }else{nextT=.95;api.hint(`좋아요! 남은 홈 ${slots.length-idx-1}개`)}
        },
      });
      api.actions(canRot?[{id:'rot',label:'↻ 돌리기',onClick:rotate}]:[]);
    }
    function rotate(){
      if(state!=='play'||ins.mode!=='free')return;
      const cx=ins.x+ins.o.w/2,cy=ins.y+ins.o.h/2;
      cur=rot90(cur);const d=dimsOf(cur);ins.o.w=d.w*U;ins.o.h=d.h*U;
      ins.o.maxX=356-ins.o.w;ins.x=clamp(cx-ins.o.w/2,4,ins.o.maxX);ins.y=Math.max(10,Math.min(cy-ins.o.h/2,SURF-ins.o.h-12));
      ins.contact=false;ins.wasBefore=true;
      rotVis=-Math.PI/2;sfx.tap();buzz(5);
    }
    g.update=dt=>{
      ins.update(dt);
      rotVis*=Math.exp(-dt*16);if(Math.abs(rotVis)<.002)rotVis=0;
      slots.forEach(s=>{if(s.filled)s.t+=dt});
      if(state==='wait'){nextT-=dt;if(nextT<=0)spawn(idx+1)}
      if(state==='done')allT+=dt;
      if(state==='play'){
        if(ins.mode==='free'&&ins.contact)api.scrape(Math.min(.09,ins.slideV*.004),2100);
        if(ins.mode==='insert'){const P=ins.press;api.scrape(Math.min(.16,P.vel*.0035),420+P.p*900)}
      }
      const head=slots.length>1?`${Math.min(idx+1,slots.length)}/${slots.length} · `:'';
      api.gauge(head+`틈 ${clear.toFixed(2)}mm`+(state==='play'&&ins.mode==='free'&&ins.contact?` · 어긋남 ${(Math.abs(ins.err)*.1).toFixed(2)}mm`:state==='play'&&ins.mode==='insert'?` · 깊이 ${Math.round(ins.press.p*100)}%`:state==='done'?' · 단차 0.00mm':''));
    };
    function fillMat(ctx,rs,m){
      const d=dimsOf(rs),w=d.w*U,h=d.h*U;
      ctx.save();ctx.beginPath();rs.forEach(([a,b,ww,hh])=>ctx.rect(a*U,b*U,ww*U,hh*U));ctx.clip();
      if(m.k==='wood')ctx.drawImage(mat.wood(w,h,m.o),0,0,w,h);
      else if(m.k==='brass'){ctx.fillStyle=mat.metal(ctx,0,w);ctx.fillRect(0,0,w,h);ctx.globalAlpha=.07;ctx.fillStyle='#000';for(let y=0;y<h;y+=3)ctx.fillRect(0,y,w,1);ctx.globalAlpha=1}
      else{ctx.fillStyle=m.c;ctx.fillRect(0,0,w,h);const q=ctx.createLinearGradient(0,0,w,h);q.addColorStop(0,'rgba(255,255,255,.4)');q.addColorStop(.4,'rgba(255,255,255,0)');q.addColorStop(1,'rgba(0,0,0,.3)');ctx.fillStyle=q;ctx.fillRect(0,0,w,h)}
      ctx.restore();
    }
    function drawPiece(ctx,rs,m,edgeA){
      fillMat(ctx,rs,m);
      const cells=cellsOf(rs);
      cells.forEach(k=>{
        const [i,j]=k.split(',').map(Number),px=i*U,py=j*U;
        ctx.fillStyle=`rgba(255,255,255,${.42*edgeA})`;
        if(!cells.has(i+','+(j-1)))ctx.fillRect(px,py,U,2.5);
        if(!cells.has((i-1)+','+j))ctx.fillRect(px,py,2,U);
        ctx.fillStyle=`rgba(0,0,0,${.34*edgeA})`;
        if(!cells.has(i+','+(j+1)))ctx.fillRect(px,py+U-2.5,U,2.5);
        if(!cells.has((i+1)+','+j))ctx.fillRect(px+U-2,py,2,U);
      });
    }
    g.draw=ctx=>{
      // 작업대: 커팅 매트
      ctx.drawImage(mat.tex('cutmat',360,560,(x,w,h)=>{
        const bg=x.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#346b5b');bg.addColorStop(1,'#1e4338');x.fillStyle=bg;x.fillRect(0,0,w,h);
        const R=mat.seeded(41);for(let i=0;i<7000;i++){x.fillStyle=R()<.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.05)';x.fillRect(R()*w,R()*h,1.2,1.2)}
        x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=1;
        for(let a=0;a<=w;a+=20){x.beginPath();x.moveTo(a+.5,0);x.lineTo(a+.5,h);x.stroke()}
        for(let b=0;b<=h;b+=20){x.beginPath();x.moveTo(0,b+.5);x.lineTo(w,b+.5);x.stroke()}
        x.strokeStyle='rgba(255,255,255,.16)';for(let a=0;a<=w;a+=100){x.beginPath();x.moveTo(a+.5,0);x.lineTo(a+.5,h);x.stroke()}
        x.fillStyle='rgba(255,255,255,.22)';x.font='9px sans-serif';for(let a=0;a<w;a+=100)x.fillText(String(a/2),a+4,12);
      }),0,0,360,560);
      // 나무 블록
      mat.shadow(ctx,22,0,12,.5,()=>{ctx.fillStyle='#8d5d2e';ctx.fillRect(BX,SURF,BW,BB-SURF)});
      ctx.drawImage(mat.wood(BW,BB-SURF,{base:'#dcb37c',dark:'#8d5d2e',light:'#f6dfb6',seed:11}),BX,SURF,BW,BB-SURF);
      const sh=ctx.createLinearGradient(0,SURF,0,BB);sh.addColorStop(0,'rgba(255,255,255,.16)');sh.addColorStop(.25,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(60,30,5,.3)');ctx.fillStyle=sh;ctx.fillRect(BX,SURF,BW,BB-SURF);
      const ed=ctx.createLinearGradient(BX,0,BX+BW,0);ed.addColorStop(0,'rgba(60,30,5,.3)');ed.addColorStop(.04,'rgba(60,30,5,0)');ed.addColorStop(.96,'rgba(60,30,5,0)');ed.addColorStop(1,'rgba(60,30,5,.35)');ctx.fillStyle=ed;ctx.fillRect(BX,SURF,BW,BB-SURF);
      // 홈
      slots.forEach((S,i)=>{
        if(S.filled){
          const a=Math.max(.1,1-S.t*.9);
          ctx.save();ctx.translate(S.x,SURF);drawPiece(ctx,S.shape,S.mat,a);ctx.restore();return;
        }
        ctx.save();ctx.beginPath();
        S.shape.forEach(([x,y,w,h])=>ctx.rect(S.x+x*U-1.2,SURF+y*U-(y?1.2:0),w*U+2.4,h*U+(y?2.4:1.2)));
        ctx.fillStyle='#1c1008';ctx.fill();ctx.clip();
        // 홈 안쪽: 오른쪽 벽에 빛, 위쪽에 그늘
        const d=dimsOf(S.shape),wg=ctx.createLinearGradient(S.x,0,S.x+d.w*U,0);wg.addColorStop(0,'rgba(0,0,0,.5)');wg.addColorStop(.5,'rgba(0,0,0,0)');wg.addColorStop(1,'rgba(190,130,70,.28)');
        ctx.fillStyle=wg;ctx.fillRect(S.x-2,SURF,d.w*U+4,d.h*U+4);
        const tg=ctx.createLinearGradient(0,SURF,0,SURF+26);tg.addColorStop(0,'rgba(0,0,0,.6)');tg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=tg;ctx.fillRect(S.x-2,SURF,d.w*U+4,26);
        ctx.restore();
        if(i===idx&&state==='play'&&slots.length>1){
          const p=.45+.3*Math.sin(api.stage.time*5);
          ctx.strokeStyle=`rgba(255,211,107,${p})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(S.x-3,SURF-3);ctx.lineTo(S.x+d.w*U+3,SURF-3);ctx.stroke();
        }
      });
      ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(BX,SURF,BW,1.5);
      if(state!=='play')return;
      // 맞춤 안내선
      if(ins.mode==='free'&&ins.contact){
        const a=clamp(1-Math.abs(ins.err)/40,0,1),ok=Math.abs(ins.err)<=tol&&sig(cur)===sig(target),tw=dimsOf(target).w*U;
        ctx.strokeStyle=ok?`rgba(140,240,200,${.4+a*.5})`:`rgba(255,211,107,${a*.7})`;ctx.lineWidth=1.5;ctx.setLineDash([5,5]);
        [slotX,slotX+tw].forEach(x=>{ctx.beginPath();ctx.moveTo(x,SURF);ctx.lineTo(x,SURF-190);ctx.stroke()});ctx.setLineDash([]);
      }
      // 조각
      const P=ins.press,strain=P?P.strain:0,tr=(ins.mode==='insert'?(Math.random()-.5)*strain*1.8:0);
      const w=ins.o.w,h=ins.o.h;
      ctx.save();
      ctx.translate(ins.x+tr+w/2,ins.y+h);
      ctx.rotate(ins.tilt*.07);
      if(rotVis){ctx.translate(0,-h/2);ctx.rotate(rotVis);ctx.translate(0,h/2)}
      ctx.scale(1,1-strain*.025);
      ctx.translate(-w/2,-h);
      if(ins.mode==='free'){
        const lift=ins.contact?.25:1;
        mat.shadow(ctx,6+16*lift,6*lift,4+14*lift,.45,()=>{ctx.fillStyle='#000';cur.forEach(([x,y,ww,hh])=>ctx.fillRect(x*U,y*U,ww*U,hh*U))});
      }
      drawPiece(ctx,cur,M,1);
      ctx.restore();
    };
    g.down=(x,y)=>{
      if(state!=='play')return;
      const inside=x>ins.x-30&&x<ins.x+ins.o.w+30&&y>ins.y-30&&y<ins.y+ins.o.h+40;
      if(ins.mode==='insert'||inside){ins.down(x,y);sfx.tap();buzz(4)}
      else{ins.down(ins.x+ins.o.w/2,ins.y+ins.o.h/2);ins.grab.ox=ins.o.w/2;ins.grab.oy=ins.o.h/2;ins.move(x,y)}
    };
    g._dbg=()=>({ins,slotX,state,cur,target,slots,idx,miss});
    g.move=(x,y)=>{if(state==='play')ins.move(x,y)};
    g.up=()=>{if(ins)ins.up()};
    return g;
  }
});
})();
