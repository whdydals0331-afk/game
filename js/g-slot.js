/* 틈새 밀기 — 홈과 조각의 틈은 0.1mm 남짓. 표면에서 살살 맞추고, 꾹 밀면 뻑뻑하게 들어가다 딱! */
(()=>{
const {clamp,randi,lerp}=DDAK.util;
const U=20,SURF=330,BX=24,BW=312,BB=540;
const SHAPES=[
  [[0,0,4,4]],
  [[0,0,3,6]],
  [[0,0,6,2],[2,2,2,4]],
  [[0,0,5,2],[0,2,2,4]],
  [[0,0,6,2],[1,2,4,2],[2,4,2,2]],
  [[0,0,6,2],[0,2,2,3],[4,2,2,3]],
  [[0,0,7,1],[1,1,5,1],[2,2,3,4]],
  [[0,0,4,2],[1,2,2,5]],
];
const COLORS=['#2f8f7a','#3a6fb0','#c7543f','#7b5bb3','#d39a2b','#2d7d9a'];
const dimsOf=rs=>({w:Math.max(...rs.map(r=>r[0]+r[2])),h:Math.max(...rs.map(r=>r[1]+r[3]))});
const rot90=rs=>{const {h}=dimsOf(rs);return rs.map(([x,y,w,hh])=>[h-y-hh,x,hh,w])};
const cellsOf=rs=>{const s=new Set();rs.forEach(([x,y,w,h])=>{for(let i=0;i<w;i++)for(let j=0;j<h;j++)s.add((x+i)+','+(y+j))});return s};
const sig=rs=>[...cellsOf(rs)].sort().join(';');

DDAK.register({
  id:'slot',name:'틈새 밀기',desc:'0.1mm 틈. 걸릴 듯 말 듯 꾹 밀어 넣어요',color:'#2f8f7a',W:360,H:560,
  icon:'<svg viewBox="0 0 24 24"><path d="M3 14h6v6h6v-6h6v7H3z"/><path d="M9.5 4h5v9h-5z"/><path d="M12 1v2"/></svg>',
  create(api){
    const {sfx,buzz,fx}=api;
    const g={};
    let target,cur,ins,color,clear,tol,slotX,state,rotVis=0,doneT=0,grain=null,seamA=1,tightSaid=false;
    function makeGrain(){
      const c=document.createElement('canvas'),d=api.stage.dpr;c.width=BW*d;c.height=(BB-SURF)*d;const x=c.getContext('2d');x.scale(d,d);
      const gr=x.createLinearGradient(0,0,0,BB-SURF);gr.addColorStop(0,'#e4c08d');gr.addColorStop(1,'#c99a62');x.fillStyle=gr;x.fillRect(0,0,BW,BB-SURF);
      x.strokeStyle='rgba(120,74,30,.18)';x.lineWidth=1;
      for(let i=0;i<26;i++){const y0=Math.random()*(BB-SURF);x.beginPath();for(let X=0;X<=BW;X+=8){const y=y0+Math.sin(X/40+i)*3+Math.sin(X/13+i*2)*1.2;X?x.lineTo(X,y):x.moveTo(X,y)}x.stroke()}
      x.fillStyle='rgba(255,255,255,.35)';x.fillRect(0,0,BW,2);
      return c;
    }
    function setPieceDims(){const d=dimsOf(cur);ins.o.w=d.w*U;ins.o.h=d.h*U}
    g.start=lv=>{
      target=SHAPES[(lv-1)%SHAPES.length];cur=target;
      if(lv>=4){const k=randi(1,3);for(let i=0;i<k;i++)cur=rot90(cur)}
      color=COLORS[(lv-1)%COLORS.length];
      clear=Math.max(.02,.5/Math.pow(lv,.8));tol=Math.max(2.5,7-lv*.5);
      const td=dimsOf(target);slotX=Math.round(180-td.w*U/2);
      const cd=dimsOf(cur);
      state='play';doneT=0;seamA=1;rotVis=0;tightSaid=false;grain=makeGrain();
      ins=api.Inserter({
        x:Math.round(180-cd.w*U/2)+randi(-50,50),y:120-cd.h*U/2+40,w:cd.w*U,h:cd.h*U,dir:1,contactY:SURF,slotX,tol,len:td.h*U,
        minX:4,maxX:356-cd.w*U,
        press:{profile:p=>p<.06?.3:p<.6?.9+.4*p:p<.78?1.75:.45,snapAt:.88},
        canEnter:()=>sig(cur)===sig(target)?true:'모양 방향이 달라요. 돌려 보세요',
        onTouch(){sfx.tap()},
        onCaught(msg,err){sfx.bump();buzz(12);fx.shake(1.5);api.hint(msg||(Math.abs(err)>tol*3?'홈 위로 옮겨서 맞춰요':'턱! 살짝 어긋났어요. 옆으로 조금만'))},
        onEnter(){sfx.tink();buzz(10);api.hint('들어간다… 계속 꾹 밀어요')},
        onSlip(j,p,r){
          sfx.creak(clamp(r/1.6,.3,1.2));buzz(r>1.2?12:5);
          if(r>1.2&&!tightSaid){tightSaid=true;api.hint('빡빡해요… 조금만 더')}
        },
        onSnapStart(){fx.slow(.28,.32)},
        onSnap(){
          state='done';sfx.thunk(1);buzz([35,40,70]);fx.shake(8);
          const w=dimsOf(target).w*U;
          fx.burst(slotX,SURF,{n:16,colors:['#f1dcb4','#d9b07a','#fff6e0'],speed:150,up:80,angle:-Math.PI*.75,spread:1.2,size:2.6});
          fx.burst(slotX+w,SURF,{n:16,colors:['#f1dcb4','#d9b07a','#fff6e0'],speed:150,up:80,angle:-Math.PI*.25,spread:1.2,size:2.6});
          fx.seam(slotX-6,SURF,slotX+w+6,SURF);
          fx.text('딱!',180,250,{size:72,color:'#fff6c9'});
          setTimeout(()=>sfx.chime(),260);
          api.hint('완전히 하나가 됐어요');
          api.complete('딱 맞았어요',`틈 ${clear.toFixed(2)}mm 홈에 끝까지, 높이까지 딱 맞게 들어갔어요.`);
        },
        onRelease(mode){if(mode==='free'&&!ins.contact)api.hint('홈 바로 위에서 아래로 밀어 보세요')}
      });
      api.hint(lv>=4?'조각 방향을 홈과 같게 돌린 다음, 홈 위에서 꾹 밀어요':'조각을 홈 위에 맞추고, 아래로 꾹 밀어요');
      api.actions(lv>=4?[{id:'rot',label:'↻ 돌리기',onClick:rotate}]:[]);
    };
    function rotate(){
      if(state!=='play'||ins.mode!=='free')return;
      const cx=ins.x+ins.o.w/2,cy=ins.y+ins.o.h/2;
      cur=rot90(cur);setPieceDims();
      ins.x=cx-ins.o.w/2;ins.y=Math.min(cy-ins.o.h/2,SURF-ins.o.h);ins.o.maxX=356-ins.o.w;ins.wasBefore=true;
      rotVis=-Math.PI/2;sfx.tap();buzz(5);
    }
    g.update=dt=>{
      ins.update(dt);
      rotVis*=Math.exp(-dt*16);if(Math.abs(rotVis)<.002)rotVis=0;
      if(ins.mode==='free'&&ins.contact)api.scrape(Math.min(.09,ins.slideV*.004),2100);
      if(ins.mode==='insert'){const P=ins.press;api.scrape(Math.min(.16,P.vel*.0035),420+P.p*900)}
      if(state==='done'){doneT+=dt;seamA=Math.max(.12,1-doneT*.9)}
      const errMm=Math.abs(ins.err)*.1;
      api.gauge(`틈 ${clear.toFixed(2)}mm`+(ins.mode==='free'&&ins.contact?` · 어긋남 ${errMm.toFixed(2)}mm`:ins.mode==='insert'?` · 깊이 ${Math.round(ins.press.p*100)}%`:state==='done'?' · 단차 0.00mm':''));
    };
    g.draw=ctx=>{
      // 커팅 매트
      ctx.fillStyle='#2c5a4d';ctx.fillRect(0,0,360,560);
      ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;
      for(let x=0;x<=360;x+=20){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,560);ctx.stroke()}
      for(let y=0;y<=560;y+=20){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(360,y+.5);ctx.stroke()}
      ctx.strokeStyle='rgba(255,255,255,.14)';
      for(let x=0;x<=360;x+=100){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,560);ctx.stroke()}
      // 나무 블록(단면)
      ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(BX+6,SURF+8,BW,BB-SURF);
      ctx.drawImage(grain,BX,SURF,BW,BB-SURF);
      // 홈
      const caA=state==='done'?Math.max(0,1-doneT*2):1;
      ctx.globalAlpha=caA;ctx.fillStyle='#24180e';
      target.forEach(([x,y,w,h])=>ctx.fillRect(slotX+x*U-1.2,SURF+y*U-(y?1.2:0),w*U+2.4,h*U+(y?2.4:1.2)));
      ctx.fillStyle='rgba(0,0,0,.35)';target.forEach(([x,y,w,h])=>ctx.fillRect(slotX+x*U-1.2,SURF+y*U,w*U+2.4,6));
      ctx.globalAlpha=1;
      // 맞춤 안내선
      if(state==='play'&&ins.mode==='free'&&ins.contact){
        const a=clamp(1-Math.abs(ins.err)/40,0,1),ok=Math.abs(ins.err)<=tol&&sig(cur)===sig(target);
        const tw=dimsOf(target).w*U;
        ctx.strokeStyle=ok?`rgba(140,240,200,${.4+a*.5})`:`rgba(255,211,107,${a*.7})`;ctx.lineWidth=1.5;ctx.setLineDash([5,5]);
        [slotX,slotX+tw].forEach(x=>{ctx.beginPath();ctx.moveTo(x,SURF);ctx.lineTo(x,SURF-180);ctx.stroke()});ctx.setLineDash([]);
      }
      // 조각
      const P=ins.press,strain=P?P.strain:0,tr=(ins.mode==='insert'?(Math.random()-.5)*strain*1.8:0);
      const w=ins.o.w,h=ins.o.h,px=ins.x+tr,py=ins.y;
      ctx.save();
      ctx.translate(px+w/2,py+h);
      ctx.rotate(ins.tilt*.07);
      if(rotVis){ctx.translate(0,-h/2);ctx.rotate(rotVis);ctx.translate(0,h/2)}
      ctx.scale(1,1-strain*.025);
      ctx.translate(-w/2,-h);
      if(ins.mode==='free'&&!ins.contact){ctx.fillStyle='rgba(0,0,0,.28)';cur.forEach(([x,y,ww,hh])=>ctx.fillRect(x*U+8,y*U+12,ww*U,hh*U))}
      drawCells(ctx,cur,0,0,color,seamA);
      ctx.restore();
      // 블록 윗면 하이라이트(조각 위로 다시)
      if(state==='done'){ctx.fillStyle=`rgba(255,255,255,${.25*seamA})`;ctx.fillRect(BX,SURF,BW,1.5)}
    };
    function drawCells(ctx,rs,x,y,fill,edgeA){
      const cells=cellsOf(rs);
      ctx.fillStyle=fill;rs.forEach(([a,b,w,h])=>ctx.fillRect(x+a*U,y+b*U,w*U,h*U));
      cells.forEach(k=>{
        const [i,j]=k.split(',').map(Number),px=x+i*U,py=y+j*U;
        ctx.fillStyle=`rgba(255,255,255,${.35*edgeA})`;
        if(!cells.has(i+','+(j-1)))ctx.fillRect(px,py,U,3);
        if(!cells.has((i-1)+','+j))ctx.fillRect(px,py,2,U);
        ctx.fillStyle=`rgba(0,0,0,${.28*edgeA})`;
        if(!cells.has(i+','+(j+1)))ctx.fillRect(px,py+U-3,U,3);
        if(!cells.has((i+1)+','+j))ctx.fillRect(px+U-2,py,2,U);
      });
    }
    g.down=(x,y)=>{
      if(state!=='play')return;
      const inside=x>ins.x-30&&x<ins.x+ins.o.w+30&&y>ins.y-30&&y<ins.y+ins.o.h+40;
      if(ins.mode==='insert'||inside){ins.down(x,y);sfx.tap();buzz(4)}
      else{ins.down(ins.x+ins.o.w/2,ins.y+ins.o.h/2);ins.grab.ox=ins.o.w/2;ins.grab.oy=ins.o.h/2;ins.move(x,y)}
    };
    g._dbg=()=>({ins,slotX,state,cur,target});
    g.move=(x,y)=>{if(state==='play')ins.move(x,y)};
    g.up=()=>{if(ins)ins.up()};
    return g;
  }
});
})();
