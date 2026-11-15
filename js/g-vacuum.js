/* 싹싹 청소 — 헤드가 지나간 자리는 먼지가 사라지고 카펫 결이 남는다. 가구 사이 틈은 헤드보다 딱 4px 넓다. */
(()=>{
const {clamp,randi}=DDAK.util;
const VW=360,VH=600,HW=64,HH=20,G=6;
const ROOMS=[
  {name:'거실 카펫',obs:[]},
  {name:'소파 옆',obs:[{x:0,y:120,w:292,h:96,k:'sofa'},{x:110,y:340,w:140,h:96,k:'table'}]},
  {name:'책장 사이',obs:[{x:68,y:150,w:78,h:260,k:'shelf'},{x:214,y:150,w:78,h:260,k:'shelf'}]},
  {name:'침실',obs:[{x:0,y:0,w:170,h:250,k:'bed'},{x:238,y:0,w:122,h:72,k:'drawer'},{x:100,y:400,w:80,h:70,k:'chair'},{x:248,y:400,w:112,h:70,k:'plant'}]},
  {name:'서재',obs:[{x:0,y:90,w:124,h:60,k:'shelf'},{x:192,y:90,w:168,h:60,k:'shelf'},{x:68,y:250,w:224,h:110,k:'table'},{x:0,y:460,w:150,h:70,k:'sofa'},{x:218,y:460,w:142,h:70,k:'drawer'}]}
];
const FURN={sofa:['#7f9cb3','#94b0c6'],table:['#b58a62','#c79c74'],shelf:['#8a6b52','#a0806a'],bed:['#e6dfd3','#f3eee6'],drawer:['#a47c5b','#b88f6d'],chair:['#6f8f7f','#86a594'],plant:['#5e8f5a','#79a874']};

DDAK.register({
  id:'vac',name:'싹싹 청소',desc:'헤드로 먼지를 밀면 카펫 결이 줄무늬로',color:'#7a8f6a',W:VW,H:VH,
  icon:'<svg viewBox="0 0 24 24"><path d="M14 3l-4 12"/><rect x="4" y="15" width="12" height="4" rx="1.5"/><path d="M3 22h18" stroke-dasharray="2 3"/></svg>',
  create(api){
    const {sfx,buzz,fx}=api;
    const v={};
    let room,lv,floor,trail,tx,dust,dx,napUp,napDown,x,y,dir,snug,flash,parts,done,dustA,dragging,speed,lastSnd,crumbs,grid,cols,rows,total,clean,lastP;
    function layer(){const d=api.stage.dpr,c=document.createElement('canvas');c.width=VW*d;c.height=VH*d;const q=c.getContext('2d');q.setTransform(d,0,0,d,0,0);return [c,q]}
    v.start=L=>{
      lv=L;room=ROOMS[(lv-1)%ROOMS.length];api.actions([]);
      const [f,fq]=layer();floor=f;
      fq.fillStyle='#c8b699';fq.fillRect(0,0,VW,VH);
      for(let i=0;i<9000;i++){fq.fillStyle=Math.random()<.5?'rgba(255,255,255,.08)':'rgba(80,60,30,.08)';fq.fillRect(Math.random()*VW,Math.random()*VH,1,1+Math.random()*2)}
      const nap=(base,line)=>{const c=document.createElement('canvas');c.width=c.height=6;const q=c.getContext('2d');q.fillStyle=base;q.fillRect(0,0,6,6);q.fillStyle=line;q.fillRect(0,0,1,6);q.fillRect(3,0,1,6);return fq.createPattern(c,'repeat')};
      napUp=nap('#dac9ad','rgba(255,255,255,.18)');napDown=nap('#baa688','rgba(90,70,40,.12)');
      [trail,tx]=layer();[dust,dx]=layer();
      dx.fillStyle='rgba(122,113,104,.78)';dx.fillRect(0,0,VW,VH);
      for(let i=0;i<6000;i++){const r=Math.random();dx.fillStyle=r<.5?'rgba(70,64,58,.35)':r<.85?'rgba(200,195,188,.35)':'rgba(40,36,32,.5)';dx.beginPath();dx.arc(Math.random()*VW,Math.random()*VH,Math.random()*2.2+.4,0,7);dx.fill()}
      dx.strokeStyle='rgba(50,45,40,.45)';dx.lineWidth=.8;
      for(let i=0;i<26;i++){let a=Math.random()*VW,b=Math.random()*VH;dx.beginPath();dx.moveTo(a,b);for(let j=0;j<4;j++){a+=randi(-14,14);b+=randi(-14,14);dx.quadraticCurveTo(a+randi(-8,8),b+randi(-8,8),a,b)}dx.stroke()}
      dx.globalCompositeOperation='destination-out';dx.fillStyle='#000';room.obs.forEach(o=>dx.fillRect(o.x,o.y,o.w,o.h));
      cols=VW/G;rows=VH/G;grid=new Uint8Array(cols*rows);total=0;clean=0;
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const cx=c*G+G/2,cy=r*G+G/2;if(room.obs.some(o=>cx>o.x&&cx<o.x+o.w&&cy>o.y&&cy<o.y+o.h))grid[r*cols+c]=2;else total++}
      crumbs=[];const n=26+((lv-1)%5)*4;
      while(crumbs.length<n){const a=randi(6,VW-6),b=randi(6,VH-6);if(room.obs.some(o=>a>o.x-4&&a<o.x+o.w+4&&b>o.y-4&&b<o.y+o.h+4))continue;
        crumbs.push({x:a,y:b,r:1.5+Math.random()*2.5,a:Math.random()*6,c:['#e8c27a','#d9a35f','#f2e6c9','#6b5a48','#c4553f'][randi(0,4)]})}
      x=(VW-HW)/2;y=VH-HH-24;dir=-1;snug=false;flash=0;parts=[];done=false;dustA=1;dragging=null;speed=0;lastSnd=0;
      sweep();
      api.hint('화면 아무 데나 대고 끌면 헤드가 따라와요. 틈새에 쏙 넣어 봐요');
    };
    v.stats=()=>({x,y,clean,total,done,snug,room});
    const hit=(a,b)=>a<0||b<0||a+HW>VW||b+HH>VH||room.obs.some(o=>a<o.x+o.w&&a+HW>o.x&&b<o.y+o.h&&b+HH>o.y);
    v.hit=hit;
    v.down=(a,b)=>{if(done)return;dragging={x:a,y:b}};
    v.move=(a,b)=>{if(!dragging||done)return;const ddx=a-dragging.x,ddy=b-dragging.y;dragging.x=a;dragging.y=b;move(ddx,ddy)};
    v.up=()=>{dragging=null};
    function move(mx,my){
      if(Math.abs(my)>Math.abs(mx)*.35&&my!==0)dir=my<0?-1:1;
      const steps=Math.max(1,Math.ceil(Math.max(Math.abs(mx),Math.abs(my))/5)),sx=mx/steps,sy=my/steps;
      for(let i=0;i<steps;i++){
        let nx=x+sx;
        if(hit(nx,y)){nx=clamp(nx,0,VW-HW);room.obs.forEach(o=>{if(y<o.y+o.h&&y+HH>o.y&&nx<o.x+o.w&&nx+HW>o.x)nx=sx>0?Math.min(nx,o.x-HW):Math.max(nx,o.x+o.w)});if(hit(nx,y))nx=x}
        x=nx;
        let ny=y+sy;
        if(hit(x,ny)){ny=clamp(ny,0,VH-HH);room.obs.forEach(o=>{if(x<o.x+o.w&&x+HW>o.x&&ny<o.y+o.h&&ny+HH>o.y)ny=sy>0?Math.min(ny,o.y-HH):Math.max(ny,o.y+o.h)});if(hit(x,ny))ny=y}
        y=ny;sweep();
      }
      speed=Math.min(1,speed*.6+Math.hypot(mx,my)/30);
      checkSnug();
    }
    v.move2=move;
    function sweep(){
      dx.fillRect(x,y,HW,HH);
      tx.fillStyle=dir<0?napUp:napDown;tx.fillRect(x,y,HW,HH);
      const c0=Math.max(0,Math.floor(x/G)),c1=Math.min(cols-1,Math.floor((x+HW)/G)),r0=Math.max(0,Math.floor(y/G)),r1=Math.min(rows-1,Math.floor((y+HH)/G));
      for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){const i=r*cols+c;if(grid[i])continue;const cx=c*G+G/2,cy=r*G+G/2;if(cx>=x&&cx<=x+HW&&cy>=y&&cy<=y+HH){grid[i]=1;clean++}}
      const now=performance.now();
      for(let i=crumbs.length-1;i>=0;i--){const k=crumbs[i];if(k.x>x-3&&k.x<x+HW+3&&k.y>y-3&&k.y<y+HH+3){crumbs.splice(i,1);parts.push({x:k.x,y:k.y,c:k.c,r:k.r,t:0});if(now-lastSnd>40){sfx.crumb();lastSnd=now}}}
      if(!done&&clean/total>=.99)finish();
    }
    v.sweepAt=(a,b)=>{x=a;y=b;sweep()};
    function checkSnug(){
      const vo=o=>y<o.y+o.h&&y+HH>o.y;
      const Lt=x<=.5||room.obs.some(o=>vo(o)&&x-(o.x+o.w)>=-.5&&x-(o.x+o.w)<=4.5);
      const Rt=x+HW>=VW-.5||room.obs.some(o=>vo(o)&&o.x-(x+HW)>=-.5&&o.x-(x+HW)<=4.5);
      const s=Lt&&Rt;
      if(s&&!snug){sfx.snug();buzz(14);flash=1;fx.burst(x+HW/2,y,{n:5,colors:['#ffd36b'],speed:50,size:2,grav:0,life:.35});api.hint('쏙! 틈새에 딱 맞게 들어갔어요')}
      snug=s;
    }
    function finish(){
      done=true;clean=total;dragging=null;crumbs=[];sfx.win();buzz([10,60,20]);
      for(let i=0;i<40;i++)parts.push({x:Math.random()*VW,y:Math.random()*VH,c:'#fff7d6',r:2+Math.random()*2,t:0,star:true});
      api.hint('반짝반짝');
      api.complete('반짝반짝',`"${room.name}" 먼지 하나 없이 깨끗해졌어요. 카펫 결이 예쁘게 남았네요.`,900);
    }
    v.update=dt=>{
      if(dragging&&!done){speed*=.92;api.scrape(.05+speed*.07,520+speed*700)}
      flash*=Math.exp(-dt*6);
      if(done&&dustA>0)dustA=Math.max(0,dustA-dt*2.4);
      const p=Math.min(100,Math.floor(clean/total*100));if(p!==lastP){lastP=p;api.gauge(`${room.name} · ${p}%`)}
    };
    v.draw=(ctx,dt)=>{
      ctx.drawImage(floor,0,0,VW,VH);ctx.drawImage(trail,0,0,VW,VH);
      if(dustA>0){ctx.globalAlpha=dustA;ctx.drawImage(dust,0,0,VW,VH);ctx.globalAlpha=1}
      crumbs.forEach(k=>{ctx.fillStyle=k.c;ctx.beginPath();ctx.ellipse(k.x,k.y,k.r,k.r*.7,k.a,0,7);ctx.fill()});
      room.obs.forEach(o=>furniture(ctx,o));
      const hx=x+HW/2,hy=y+HH/2;
      parts=parts.filter(p=>{
        p.t+=dt*4.8;
        if(p.star){const a=Math.sin(Math.min(1,p.t/2)*Math.PI);ctx.fillStyle=p.c;ctx.globalAlpha=a;ctx.beginPath();ctx.arc(p.x,p.y,p.r*a,0,7);ctx.fill();ctx.globalAlpha=1;return p.t<2}
        const px=p.x+(hx-p.x)*p.t,py=p.y+(hy-p.y)*p.t;ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(px,py,Math.max(.3,p.r*(1-p.t*.7)),0,7);ctx.fill();return p.t<1;
      });
      if(!done||dustA>0)head(ctx);
    };
    function furniture(c,o){
      const [a,b]=FURN[o.k]||FURN.table;
      c.fillStyle='rgba(40,30,20,.22)';api.rr(c,o.x+3,o.y+5,o.w,o.h,10);c.fill();
      c.fillStyle=a;api.rr(c,o.x,o.y,o.w,o.h,10);c.fill();c.fillStyle=b;
      if(o.k==='sofa'){api.rr(c,o.x+8,o.y+8,o.w-16,o.h*.38,8);c.fill();const n=Math.max(2,Math.round(o.w/90));for(let i=0;i<n;i++){api.rr(c,o.x+8+i*(o.w-16)/n+2,o.y+o.h*.5,(o.w-16)/n-4,o.h*.42,8);c.fill()}}
      else if(o.k==='bed'){c.fillStyle='#fff';api.rr(c,o.x+14,o.y+12,o.w-28,40,10);c.fill();c.fillStyle='#9fb7c9';api.rr(c,o.x+6,o.y+64,o.w-12,o.h-72,10);c.fill()}
      else if(o.k==='shelf'){const vert=o.h>o.w;for(let i=0;i<(vert?6:3);i++){if(vert)api.rr(c,o.x+6,o.y+8+i*(o.h-16)/6,o.w-12,(o.h-16)/6-6,3);else api.rr(c,o.x+8+i*(o.w-16)/3,o.y+8,(o.w-16)/3-6,o.h-16,3);c.fill()}}
      else if(o.k==='plant'){c.fillStyle='#7aa874';for(let i=0;i<5;i++){c.beginPath();c.ellipse(o.x+o.w/2+Math.cos(i*1.3)*o.w*.25,o.y+o.h/2+Math.sin(i*1.3)*o.h*.22,o.w*.18,o.h*.2,i,0,7);c.fill()}}
      else{api.rr(c,o.x+7,o.y+7,o.w-14,o.h-14,7);c.fill()}
    }
    function head(c){
      const cx=x+HW/2;
      c.strokeStyle='rgba(45,52,50,.85)';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(cx,y+HH-2);c.lineTo(VW/2+(cx-VW/2)*.55,VH+40);c.stroke();
      c.fillStyle='rgba(0,0,0,.25)';api.rr(c,x+1,y+3,HW,HH,6);c.fill();
      c.fillStyle=snug||flash>.05?'#2f5f52':'#38423f';api.rr(c,x,y,HW,HH,6);c.fill();
      c.fillStyle='#55625e';api.rr(c,x+3,y+3,HW-6,5,3);c.fill();
      c.fillStyle='#1d2422';for(let i=0;i<10;i++)c.fillRect(x+5+i*5.6,y+HH-5,3,3);
      c.fillStyle=snug?'#8cf0c8':'#f6c45a';c.beginPath();c.arc(cx,y+HH/2+1,2.4,0,7);c.fill();
      if(flash>.05){c.strokeStyle=`rgba(255,211,107,${flash})`;c.lineWidth=3;api.rr(c,x-3,y-3,HW+6,HH+6,8);c.stroke()}
    }
    return v;
  }
});
})();
