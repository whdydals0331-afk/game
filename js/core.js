/* 딱맞음 — 공통 엔진
   소리 · 진동 · 무대(캔버스) · 효과 · "뻑뻑하게 걸렸다가 딱 들어가는" 물리(Press, Inserter) · 화면 전환 */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const store={
  get(k,d){try{const v=localStorage.getItem('ddak:'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('ddak:'+k,JSON.stringify(v))}catch(e){}}
};
const rand=(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const util={rand,randi,clamp,lerp,pick,shuffle};

/* ---------------- 소리 ---------------- */
const A={ctx:null,master:null,verb:null,noise:null,muted:store.get('muted',false),scr:null};
function ac(){
  if(!A.ctx){
    try{
      const C=window.AudioContext||window.webkitAudioContext;A.ctx=new C();
      const comp=A.ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=4;comp.connect(A.ctx.destination);
      A.master=A.ctx.createGain();A.master.gain.value=.9;A.master.connect(comp);
      const sr=A.ctx.sampleRate,len=Math.floor(sr*1.3),ir=A.ctx.createBuffer(2,len,sr);
      for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
      A.verb=A.ctx.createConvolver();A.verb.buffer=ir;const vg=A.ctx.createGain();vg.gain.value=.4;A.verb.connect(vg).connect(A.master);
      A.noise=A.ctx.createBuffer(1,sr*2,sr);const nd=A.noise.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
    }catch(e){return null}
  }
  if(A.ctx.state==='suspended')A.ctx.resume();
  return A.ctx;
}
function out(node,wet){node.connect(A.master);if(wet){const g=A.ctx.createGain();g.gain.value=wet;node.connect(g).connect(A.verb)}}
function tone({f=440,f2=0,t=.12,type='sine',vol=.2,delay=0,wet=0,attack=.004}){
  if(A.muted)return;const a=ac();if(!a)return;
  const now=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();
  o.type=type;o.frequency.setValueAtTime(f,now);if(f2)o.frequency.exponentialRampToValueAtTime(f2,now+t);
  g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(vol,now+attack);g.gain.exponentialRampToValueAtTime(.0001,now+t);
  o.connect(g);out(g,wet);o.start(now);o.stop(now+t+.05);
}
function noise({freq=2000,f2=0,q=1,t=.05,vol=.2,delay=0,type='bandpass',wet=0}){
  if(A.muted)return;const a=ac();if(!a)return;
  const now=a.currentTime+delay,s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
  s.buffer=A.noise;f.type=type;f.frequency.setValueAtTime(freq,now);if(f2)f.frequency.exponentialRampToValueAtTime(f2,now+t);f.Q.value=q;
  g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(.0001,now+t);
  s.connect(f).connect(g);out(g,wet);s.start(now,Math.random()*1.5);s.stop(now+t+.05);
}
/* 계속 나는 마찰음: 매 프레임 scrape(크기, 높이)를 부르면 그만큼 난다 */
const S={vol:0,freq:800};
function scrape(vol,freq){if(vol>S.vol){S.vol=vol;S.freq=freq}}
function scrapeFrame(){
  if(A.ctx&&!A.scr&&S.vol>0&&!A.muted){
    const a=A.ctx,s=a.createBufferSource();s.buffer=A.noise;s.loop=true;
    const bp=a.createBiquadFilter();bp.type='bandpass';bp.Q.value=2.2;bp.frequency.value=800;
    const g=a.createGain();g.gain.value=0;s.connect(bp).connect(g).connect(A.master);s.start();A.scr={g,bp};
  }
  if(A.scr){const t=A.ctx.currentTime;A.scr.g.gain.setTargetAtTime(A.muted?0:Math.min(S.vol,.22),t,.025);A.scr.bp.frequency.setTargetAtTime(S.freq,t,.03)}
  S.vol=0;
}
const sfx={
  tap(){tone({f:600,f2:780,t:.06,vol:.06})},
  tink(){tone({f:1900,t:.1,vol:.07,type:'triangle'});tone({f:2850,t:.07,vol:.035,delay:.01})},
  bump(){tone({f:150,f2:85,t:.09,vol:.3});noise({freq:900,t:.035,vol:.14})},
  creak(m=1){noise({freq:rand(450,1300),q:7,t:.035+.03*m,vol:.07+.09*m});tone({f:rand(85,140),t:.05,vol:.05*m,type:'triangle'})},
  thunk(p=1){tone({f:150,f2:40,t:.34,vol:.6*p,wet:.3});noise({freq:2600,q:.8,t:.035,vol:.35*p});noise({freq:500,f2:110,q:.7,t:.2,vol:.3*p,type:'lowpass'})},
  click(p=1){noise({freq:3800,q:3,t:.02,vol:.35*p});tone({f:2400,t:.03,vol:.09*p});tone({f:230,f2:120,t:.06,vol:.2*p})},
  chime(){[1047,1319,1568].forEach((f,i)=>tone({f,t:.7,vol:.06,delay:.06+i*.06,type:'triangle',wet:.6}))},
  win(){[523,659,784,1047,1319].forEach((f,i)=>tone({f,t:.45,vol:.09,delay:i*.08,type:'triangle',wet:.45}))},
  whoosh(){noise({freq:300,f2:2400,t:.22,vol:.09,q:.7})},
  hiss(){noise({freq:7000,f2:1600,t:.8,vol:.07,type:'highpass'})},
  pop(){tone({f:380,f2:950,t:.08,vol:.25});noise({freq:1600,t:.03,vol:.16})},
  tonk(){tone({f:330,f2:290,t:.2,vol:.18,type:'triangle',wet:.25});noise({freq:2000,t:.02,vol:.12})},
  crumb(){tone({f:900+Math.random()*700,f2:2000,t:.05,vol:.05});noise({freq:4000,t:.015,vol:.06})},
  snug(){tone({f:360,f2:250,t:.09,vol:.16});noise({freq:1400,t:.025,vol:.14})},
  near(){tone({f:990,t:.05,vol:.035,type:'triangle'})},
  back(){tone({f:320,f2:220,t:.1,vol:.06,type:'triangle'})},
};
function buzz(p){try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}}

/* ---------------- 물리: 뻑뻑함 ----------------
   손가락이 물체보다 앞서 나간 만큼(push, px) "힘"이 쌓이고,
   그 힘이 문턱을 넘으면 물체가 찔끔 미끄러진다(stick-slip).
   profile(p) 가 클수록 빡빡하다. snapAt 을 넘으면 남은 거리를 빨려 들어가듯 한 번에 들어간다. */
function Press(o){
  const P={p:0,stress:0,thr:1,strain:0,vel:0,snapping:false,done:false,atWall:false,
    len:o.len,T:o.T??2.4,jump:o.jump??o.len*.032,snapAt:o.snapAt??.88,wallAt:o.wallAt??1,snapDur:o.snapDur??.13,profile:o.profile||(()=>1)};
  const nt=()=>{P.thr=Math.max(.002,P.T*P.profile(P.p)*(.55+Math.random()*.9))};nt();
  P.step=(push,dt)=>{
    if(P.done||P.snapping)return;
    push=clamp(push,0,36);
    if(P.p>=P.wallAt-1e-6){
      P.strain=clamp(push/50,0,1);
      if(push>22&&!P.atWall){P.atWall=true;o.onWall&&o.onWall()}
      if(push<8)P.atWall=false;
      return;
    }
    P.stress+=push*dt;
    P.strain=clamp(P.stress/P.thr,0,1)*clamp(push/18,0,1);
    if(P.stress>=P.thr){
      const r=P.profile(P.p),j=P.jump*(.5+Math.random()),before=P.p;
      P.p=Math.min(P.wallAt,P.p+j/P.len);P.stress=0;nt();P.vel+=j*14;
      o.onSlip&&o.onSlip(j,P.p,r,before);
      if(P.p>=P.snapAt){P.snapping=true;P.t=0;P.from=P.p;o.onSnapStart&&o.onSnapStart()}
    }
  };
  P.update=dt=>{
    P.vel*=Math.exp(-dt*9);
    if(P.snapping){
      P.t+=dt/P.snapDur;P.p=lerp(P.from,1,Math.min(1,P.t*P.t));
      if(P.t>=1){P.snapping=false;P.done=true;P.p=1;P.strain=0;o.onSnap&&o.onSnap()}
    }
  };
  return P;
}

/* ---------------- 물리: 끼워 넣기 ----------------
   조각을 끌다가 입구(contactY)에 닿으면 표면 위를 미끄러지듯 천천히 움직이고(정밀 조준),
   어긋난 채로 밀면 턱 걸리고, 맞으면 Press 로 들어간다. dir = 1 이면 아래로, -1 이면 위로 꽂는다. */
function Inserter(o){
  const s={x:o.x,y:o.y,mode:'free',tilt:0,err:0,press:null,grab:null,contact:false,bumpArmed:true,slideV:0,o};
  const lead=y=>o.dir>0?y+o.h:y;
  const before=y=>o.dir*(lead(y)-o.contactY)<=.5;
  s.wasBefore=before(s.y);
  s.down=(fx,fy)=>{
    s.grab={fx,fy,ox:fx-s.x,oy:fy-s.y,lastFx:fx};
    if(s.mode==='insert')s.grab.base=fy-o.dir*s.press.p*o.len;
  };
  s.move=(fx,fy)=>{
    const g=s.grab;if(!g)return;
    if(s.mode==='free'){
      const dx=fx-g.lastFx;g.lastFx=fx;
      const ny=fy-g.oy,over=o.dir*(lead(ny)-o.contactY);
      if(over>=0&&(s.contact||s.wasBefore)){
        if(!s.contact){s.contact=true;o.onTouch&&o.onTouch()}
        s.x+=dx*(o.damp??.45);s.slideV+=Math.abs(dx);
        s.y=o.contactY-(o.dir>0?o.h:0);
        s.err=s.x-o.slotX;
        if(over>8){
          const ok=o.canEnter?o.canEnter():true;
          if(Math.abs(s.err)<=o.tol&&ok===true){
            s.x=o.slotX;s.mode='insert';s.tilt=0;g.base=fy;
            s.press=Press({...o.press,len:o.len,onSlip:o.onSlip,onWall:o.onWall,onSnapStart:o.onSnapStart,
              onSnap:()=>{s.mode='done';o.onSnap&&o.onSnap()}});
            o.onEnter&&o.onEnter();
          }else{
            s.tilt=clamp(-s.err/10,-1,1);
            if(s.bumpArmed){s.bumpArmed=false;o.onCaught&&o.onCaught(ok===true?null:ok,s.err)}
          }
        }else if(over<4){s.bumpArmed=true;s.tilt*=.8}
      }else{
        if(s.contact){s.contact=false;g.ox=fx-s.x}
        s.x=fx-g.ox;s.y=ny;s.tilt*=.7;s.bumpArmed=true;
      }
      if(o.minX!=null)s.x=Math.max(o.minX,s.x);
      if(o.maxX!=null)s.x=Math.min(o.maxX,s.x);
      s.wasBefore=s.contact||before(s.y);
    }else if(s.mode==='insert'){
      g.push=o.dir*(fy-g.base)-s.press.p*o.len;
      if(g.push<-46&&o.onPull)o.onPull();
    }
  };
  s.up=()=>{s.grab=null;if(s.mode==='free'){s.tilt=0}o.onRelease&&o.onRelease(s.mode)};
  s.update=dt=>{
    if(s.press){
      if(s.mode==='insert')s.press.step(s.grab?Math.max(0,s.grab.push||0):0,dt);
      s.press.update(dt);
      s.y=o.dir>0?o.contactY-o.h+s.press.p*o.len:o.contactY-s.press.p*o.len;
    }
    s.slideV*=Math.exp(-dt*12);
  };
  s.reset=(x,y)=>{s.x=x;s.y=y;s.mode='free';s.press=null;s.tilt=0;s.contact=false;s.grab=null;s.wasBefore=before(y)};
  return s;
}

/* ---------------- 재질(텍스처) ---------------- */
const texCache={};
function seeded(s){s=s||1;return()=>{s=(s*16807)%2147483647;return s/2147483647}}
function tex(key,w,h,fn){
  const d=stage.dpr,k=key+'|'+w+'x'+h+'@'+d;
  if(!texCache[k]){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*d));c.height=Math.max(1,Math.ceil(h*d));const x=c.getContext('2d');x.scale(d,d);fn(x,w,h);texCache[k]=c}
  return texCache[k];
}
const mat={
  tex,seeded,
  wood(w,h,{base='#d9ad74',dark='#8a5a2b',light='#f0d3a2',seed=7,vertical=false}={}){
    return tex('wood'+base+seed+(vertical?'v':'h'),w,h,(x,w,h)=>{
      const R=seeded(seed*9973+1),L=vertical?w:h,M=vertical?h:w;
      x.fillStyle=base;x.fillRect(0,0,w,h);
      for(let i=0;i<L;i++){const n=Math.sin(i*.09+R()*.4)*.5+Math.sin(i*.31)*.3+(R()-.5);x.globalAlpha=.05+.08*Math.abs(n);x.fillStyle=n>0?light:dark;vertical?x.fillRect(i,0,1,h):x.fillRect(0,i,w,1)}
      x.strokeStyle=dark;
      for(let i=0,n=Math.floor(L/4);i<n;i++){
        const p0=R()*L,amp=1+R()*3.5,f=.006+R()*.02,ph=R()*6;x.lineWidth=.4+R()*.9;x.globalAlpha=.1+R()*.28;x.beginPath();
        for(let m=0;m<=M+6;m+=6){const q=p0+Math.sin(m*f+ph)*amp+Math.sin(m*f*3.1+ph)*amp*.3;vertical?(m?x.lineTo(q,m):x.moveTo(q,m)):(m?x.lineTo(m,q):x.moveTo(m,q))}
        x.stroke();
      }
      x.globalAlpha=.16;x.fillStyle=dark;for(let i=0;i<w*h/50;i++){const a=R()*w,b=R()*h;vertical?x.fillRect(a,b,.7,2+R()*4):x.fillRect(a,b,2+R()*5,.7)}
      x.globalAlpha=1;
    });
  },
  metal(ctx,x0,x1,stops=[[0,'#8f6d22'],[.18,'#e9cf7c'],[.4,'#b8922f'],[.62,'#fff0b8'],[.8,'#c29a35'],[1,'#7d5e1a']]){
    const g=ctx.createLinearGradient(x0,0,x1,0);stops.forEach(([p,c])=>g.addColorStop(p,c));return g;
  },
  shade(hex,amt){const n=parseInt(hex.slice(1),16);return 'rgb('+[16,8,0].map(sft=>clamp((n>>sft&255)+amt,0,255)).join(',')+')'},
  /* 부드러운 그림자: fn 안에서 그린 도형 아래로 그림자가 진다 */
  shadow(ctx,blur,ox,oy,alpha,fn){const d=stage.dpr;ctx.save();ctx.shadowColor=`rgba(0,0,0,${alpha})`;ctx.shadowBlur=blur*d;ctx.shadowOffsetX=ox*d;ctx.shadowOffsetY=oy*d;fn();ctx.restore()},
};

/* ---------------- 무대 · 효과 ---------------- */
const stage={cv:null,ctx:null,W:360,H:560,dpr:1,flash:0,punch:0,px:180,py:280,shakeAmt:0,slowT:0,slowF:1,parts:[],texts:[],seams:[],time:0};
function setupStage(W,H){
  stage.W=W;stage.H=H;stage.dpr=Math.min(window.devicePixelRatio||1,2);
  stage.cv.width=Math.round(W*stage.dpr);stage.cv.height=Math.round(H*stage.dpr);
  stage.parts=[];stage.texts=[];stage.seams=[];stage.shakeAmt=0;stage.slowT=0;stage.flash=0;stage.punch=0;stage.px=W/2;stage.py=H/2;
  fitStage();
}
function fitStage(){
  const wrap=$('#stage-wrap');if(!wrap||!stage.cv)return;
  const aw=wrap.clientWidth||innerWidth-32,ah=Math.max(260,wrap.clientHeight||innerHeight*.7);
  const s=Math.min(aw/stage.W,ah/stage.H);
  stage.cv.style.width=Math.floor(stage.W*s)+'px';stage.cv.style.height=Math.floor(stage.H*s)+'px';
}
const fx={
  /* 세게 흔들리는 순간(딱!)에는 화면이 번쩍하고 카메라가 살짝 당겨진다 */
  shake(a){stage.shakeAmt=Math.max(stage.shakeAmt,a);if(a>=4){stage.flash=Math.max(stage.flash,Math.min(.3,a*.035));stage.punch=Math.max(stage.punch,Math.min(.045,a*.006))}},
  focus(x,y){stage.px=x;stage.py=y},
  slow(dur,f){stage.slowT=dur;stage.slowF=f},
  burst(x,y,{n=14,colors=['#fff'],speed=120,life=.6,size=3,grav=200,up=0,spread=Math.PI*2,angle=0}={}){
    for(let i=0;i<n;i++){
      const a=angle+(Math.random()-.5)*spread,v=speed*(.4+Math.random()*.8);
      stage.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-up,life:life*(.6+Math.random()*.6),max:0,size:size*(.6+Math.random()*.8),c:pick(colors),g:grav});
    }
  },
  text(t,x,y,{size=54,color='#fff',stroke='rgba(0,0,0,.35)',dur=1.1}={}){stage.texts.push({t,x,y,size,color,stroke,dur,age:0})},
  seam(x1,y1,x2,y2,{color='#fff6c9',w=3}={}){stage.seams.push({x1,y1,x2,y2,color,w,t:0})},
};
function drawEffects(ctx,dt){
  stage.seams=stage.seams.filter(s=>{
    s.t+=dt*2.4;const h=Math.min(1,s.t),fade=1-clamp(s.t-1,0,1);
    ctx.save();ctx.globalAlpha=fade;ctx.strokeStyle=s.color;ctx.lineWidth=s.w;ctx.lineCap='round';ctx.shadowColor=s.color;ctx.shadowBlur=14;
    ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(lerp(s.x1,s.x2,h),lerp(s.y1,s.y2,h));ctx.stroke();ctx.restore();
    return s.t<2;
  });
  stage.parts=stage.parts.filter(p=>{
    p.max=p.max||p.life;p.life-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;
    ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();
    return p.life>0;
  });
  ctx.globalAlpha=1;
  stage.texts=stage.texts.filter(t=>{
    t.age+=dt;const k=t.age/t.dur,sc=k<.18?lerp(1.6,1,k/.18):1,a=k<.7?1:1-(k-.7)/.3;
    ctx.save();ctx.translate(t.x,t.y-k*24);ctx.scale(sc,sc);ctx.globalAlpha=clamp(a,0,1);
    ctx.font=`${t.size}px Jua, "Noto Sans KR", sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineWidth=6;ctx.strokeStyle=t.stroke;ctx.lineJoin='round';ctx.strokeText(t.t,0,0);ctx.fillStyle=t.color;ctx.fillText(t.t,0,0);ctx.restore();
    return t.age<t.dur;
  });
}
function rr(ctx,x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}

/* ---------------- 화면 · 게임 등록 ---------------- */
const games=[];
let current=null,inst=null,lv=1,raf=0,last=0,ptr=null,screenId='home',session=0;
function register(g){games.push(g)}
function show(id){
  if(screenId==='play'&&id!=='play'){cancelAnimationFrame(raf);inst&&inst.stop&&inst.stop();S.vol=0;scrapeFrame()}
  if(screenId==='dom'&&id!=='dom'){inst&&inst.stop&&inst.stop()}
  screenId=id;session++;
  document.querySelectorAll('.screen').forEach(s=>s.hidden=s.id!==id&&!(id==='dom'&&s.id===current?.domId));
  $('#overlay').hidden=true;
  if(id==='home')paintHome();
}
function paintHome(){
  const list=$('#game-list');list.innerHTML='';
  games.forEach(g=>{
    const b=document.createElement('button');b.type='button';b.className='g-card';
    b.innerHTML=`<span class="g-ico" style="--c:${g.color}">${g.icon}</span><span class="g-txt"><b>${g.name}</b><small>${g.desc}</small></span><span class="g-lv"><i>${store.get('lv:'+g.id,1)}</i><em>★ ${Object.values(store.get('st:'+g.id,{})).reduce((a,b)=>a+b,0)}</em></span>`;
    b.setAttribute('aria-label',`${g.name}, ${store.get('lv:'+g.id,1)}단계`);
    b.addEventListener('click',()=>{ac();open(g)});
    list.appendChild(b);
  });
}
const api={
  util,store,sfx,buzz,scrape,Press,Inserter,rr,fx,stage,mat,
  get lv(){return lv},
  hint(t){const h=$(current?.domId?'#'+current.domId+' .hint':'#play-hint');if(h&&h.textContent!==t)h.textContent=t},
  gauge(t){const g=$('#play-gauge');if(g.textContent!==t)g.textContent=t},
  actions(list){
    const box=$('#play-actions');box.innerHTML='';
    (list||[]).forEach(a=>{const b=document.createElement('button');b.type='button';b.className='act';b.id='act-'+a.id;b.textContent=a.label;
      b.addEventListener('click',()=>{ac();a.onClick()});box.appendChild(b)});
  },
  pulse(id){const b=$('#act-'+id);if(b){b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse')}},
  title(t){$(current?.domId?'#'+current.domId+' .t':'#play-title').textContent=t},
  complete(title,sub,delay=1300,miss=0){
    const done=lv,my=session;store.set('lv:'+current.id,done+1);
    const stars=miss<=0?3:miss<=2?2:1,best=store.get('st:'+current.id,{});
    if(!(best[done]>=stars)){best[done]=stars;store.set('st:'+current.id,best)}
    setTimeout(()=>{
      if(!inst||screenId==='home'||my!==session)return;
      $('#ov-title').textContent=title;$('#ov-sub').textContent=sub;
      $('#ov-lv').textContent=current.name+' · '+done+'단계';
      $('#ov-stars').innerHTML='<b>'+'★'.repeat(stars)+'</b>'+'★'.repeat(3-stars);
      $('#ov-note').textContent=stars===3?'실수 없이 한 번에':stars===2?'실수 '+miss+'번 · 한 번에 넣으면 별 셋':'실수 '+miss+'번 · 다시 하면 더 깔끔하게';
      $('#overlay').hidden=false;$('#ov-next').focus();
    },delay);
  }
};
function open(g){
  session++;current=g;lv=store.get('lv:'+g.id,1);
  if(g.dom){
    show('dom');inst=g.inst||(g.inst=g.create(api));inst.start(lv);return;
  }
  show('play');
  $('#play-title').textContent=g.name;$('#play-gauge').textContent='';$('#play-hint').textContent='';api.actions([]);
  setupStage(g.W||360,g.H||560);
  inst=g.inst||(g.inst=g.create(api));
  inst.start(lv);
  $('#play-title').textContent=g.name+' · '+lv+'단계';
  cancelAnimationFrame(raf);last=0;raf=requestAnimationFrame(frame);
}
function frame(t){
  raf=requestAnimationFrame(frame);
  let dt=last?Math.min(.05,(t-last)/1000):0;last=t;
  if(stage.slowT>0){stage.slowT-=dt;dt*=stage.slowF}
  stage.time+=dt;
  inst.update&&inst.update(dt);
  const ctx=stage.ctx;
  ctx.setTransform(stage.dpr,0,0,stage.dpr,0,0);
  ctx.clearRect(0,0,stage.W,stage.H);
  const a=stage.shakeAmt;stage.shakeAmt=a<.2?0:a*Math.exp(-dt*14);
  if(a)ctx.translate((Math.random()*2-1)*a,(Math.random()*2-1)*a);
  const z=stage.punch;stage.punch=z<.002?0:z*Math.exp(-dt*9);
  if(z){ctx.translate(stage.px,stage.py);ctx.scale(1+z,1+z);ctx.translate(-stage.px,-stage.py)}
  inst.draw(ctx,dt);
  drawEffects(ctx,dt);
  // 마무리: 가장자리 어둡게 + 위쪽 조명, 그리고 번쩍
  ctx.setTransform(stage.dpr,0,0,stage.dpr,0,0);
  ctx.drawImage(tex('vignette',stage.W,stage.H,(x,w,h)=>{
    const v=x.createRadialGradient(w/2,h*.45,Math.min(w,h)*.35,w/2,h/2,Math.max(w,h)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.34)');x.fillStyle=v;x.fillRect(0,0,w,h);
    const l=x.createLinearGradient(0,0,w*.6,h*.7);l.addColorStop(0,'rgba(255,248,230,.10)');l.addColorStop(1,'rgba(255,248,230,0)');x.fillStyle=l;x.fillRect(0,0,w,h);
  }),0,0,stage.W,stage.H);
  if(stage.flash>.01){ctx.fillStyle=`rgba(255,250,235,${stage.flash})`;ctx.fillRect(0,0,stage.W,stage.H);stage.flash*=Math.exp(-dt*10)}
  scrapeFrame();
}
function toLogical(e){const r=stage.cv.getBoundingClientRect();return [(e.clientX-r.left)*stage.W/r.width,(e.clientY-r.top)*stage.H/r.height]}
function bindStage(){
  const cv=stage.cv;
  cv.addEventListener('pointerdown',e=>{
    if(ptr!==null||!inst)return;e.preventDefault();ac();ptr=e.pointerId;try{cv.setPointerCapture(e.pointerId)}catch(_){}
    const [x,y]=toLogical(e);inst.down&&inst.down(x,y,e);
  });
  cv.addEventListener('pointermove',e=>{if(e.pointerId!==ptr)return;const [x,y]=toLogical(e);inst.move&&inst.move(x,y,e)});
  const end=e=>{if(e.pointerId!==ptr)return;ptr=null;inst.up&&inst.up()};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
}

const SPEAKER_ON='<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7"/></svg>';
const SPEAKER_OFF='<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
function paintMute(){
  document.querySelectorAll('.mute').forEach(b=>{b.innerHTML=A.muted?SPEAKER_OFF:SPEAKER_ON;b.setAttribute('aria-label',A.muted?'소리 켜기':'소리 끄기')});
}
function boot(){
  stage.cv=$('#stage');stage.ctx=stage.cv.getContext('2d');bindStage();
  document.querySelectorAll('.mute').forEach(b=>b.addEventListener('click',()=>{A.muted=!A.muted;store.set('muted',A.muted);paintMute();if(!A.muted)ac()}));
  document.querySelectorAll('.back').forEach(b=>b.addEventListener('click',()=>show('home')));
  $('#ov-next').addEventListener('click',()=>{
    session++;$('#overlay').hidden=true;lv=store.get('lv:'+current.id,1);
    inst.start(lv);api.title(current.name+' · '+lv+'단계');
  });
  $('#ov-home').addEventListener('click',()=>show('home'));
  addEventListener('resize',()=>{if(screenId==='play'){fitStage();inst&&inst.resize&&inst.resize()}if(screenId==='dom'){inst&&inst.resize&&inst.resize()}});
  document.fonts&&document.fonts.load('40px Jua').catch(()=>{});
  paintMute();paintHome();
  window.__ddak={games,open,show,get inst(){return inst},stage};
}
window.DDAK={register,boot,api,util};
})();
