/* 빈칸 채우기 — 조각은 자기 모양과 정확히 같은 빈자리에만 들어간다. 가볍게 쉬어 가는 판. */
(()=>{
const {randi}=DDAK.util;
const PIECES=[
  [[0,0]],[[0,0],[0,1]],[[0,0],[1,0]],
  [[0,0],[0,1],[0,2]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[1,1]],[[0,1],[1,0],[1,1]],[[0,0],[0,1],[1,0]],[[0,0],[0,1],[1,1]],
  [[0,0],[0,1],[1,0],[1,1]],[[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[1,1]],[[1,0],[1,1],[1,2],[0,1]],
  [[0,0],[1,0],[2,0],[2,1]],[[0,1],[1,1],[2,1],[2,0]],[[0,0],[0,1],[1,1],[1,2]],[[1,0],[1,1],[0,1],[0,2]],[[0,0],[1,0],[1,1],[2,1]],
  [[0,1],[1,0],[1,1],[1,2],[2,1]],[[0,0],[0,1],[0,2],[1,0],[2,0]],[[0,0],[1,0],[1,1],[1,2],[0,2]],[[0,0],[0,1],[0,2],[1,2],[1,1]]
];
const COLORS=['#f2a07b','#7fb8dd','#a9d47f','#f6c45a','#b79ad6','#ef9fc4','#6fc7b6','#f08a8a'];
const key=(r,c)=>r+','+c;
const dims=sh=>({h:Math.max(...sh.map(c=>c[0]))+1,w:Math.max(...sh.map(c=>c[1]))+1});
const $=s=>document.querySelector(s);

DDAK.register({
  id:'blocks',name:'빈칸 채우기',desc:'가볍게 쉬어 가요. 꼭 맞는 자리에만 쏙',color:'#f2a07b',dom:true,domId:'blocks',
  icon:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke-dasharray="2 2"/></svg>',
  create(api){
    const {sfx,buzz}=api;
    const B={lv:1,size:5,holes:[],tray:[],cell:40,drag:null};
    function sparks(x,y,colors,n=14,spread=60){
      for(let i=0;i<n;i++){
        const s=document.createElement('div');s.className='spark';s.style.background=colors[i%colors.length];s.style.left=x+'px';s.style.top=y+'px';document.body.appendChild(s);
        const a=Math.random()*Math.PI*2,d=spread*(.5+Math.random()*.7);
        s.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d}px)) scale(.2)`,opacity:0}],{duration:500+Math.random()*250,easing:'cubic-bezier(.2,.8,.3,1)'}).onfinish=()=>s.remove();
      }
    }
    B.gen=lv=>{
      const size=Math.min(5+Math.floor((lv-1)/2),8),want=Math.min(2+Math.floor((lv-1)/1.5),8);
      const maxN=lv<=2?3:lv<=4?4:5,minN=lv<=1?1:2,pool=PIECES.filter(p=>p.length<=maxN&&p.length>=minN);
      let best=[];
      for(let at=0;at<60&&best.length<want;at++){
        const blocked=new Set(),got=[];
        for(let k=0;k<want*6&&got.length<want;k++){
          const shape=pool[randi(0,pool.length-1)],{h,w}=dims(shape),r0=randi(0,size-h),c0=randi(0,size-w);
          const cells=shape.map(([r,c])=>[r+r0,c+c0]);
          if(cells.some(([r,c])=>blocked.has(key(r,c))))continue;
          cells.forEach(([r,c])=>[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([a,b])=>blocked.add(key(r+a,c+b))));
          got.push({shape,cells});
        }
        if(got.length>best.length)best=got;
      }
      return {size,holes:best.map((p,i)=>({...p,keys:new Set(p.cells.map(([r,c])=>key(r,c))),filled:false,color:COLORS[i%COLORS.length]}))};
    };
    B.start=lv=>{
      B.lv=lv;const g=B.gen(lv);B.size=g.size;B.holes=g.holes;
      B.tray=g.holes.map((h,i)=>({id:i,shape:h.shape,color:h.color,used:false})).sort(()=>Math.random()-.5);
      api.title('빈칸 채우기 · '+lv+'단계');api.hint('조각을 끌어서 꼭 맞는 빈자리에 놓아 보세요');
      B.render();
    };
    B.measure=()=>{const availW=Math.min(innerWidth-32,480)-16,availH=innerHeight*.5;B.cell=Math.max(26,Math.floor(Math.min(availW,availH)/B.size));B.tcell=Math.min(Math.round(B.cell*.62),26)};
    B.render=()=>{
      B.measure();const b=$('#board'),n=B.size,cs=B.cell,gap=3;
      b.style.width=b.style.height=n*cs+'px';b.innerHTML='';
      const holeAt=new Map();B.holes.forEach(h=>h.keys.forEach(k=>holeAt.set(k,h)));B.cellEls=new Map();
      for(let r=0;r<n;r++)for(let c=0;c<n;c++){
        const d=document.createElement('div'),h=holeAt.get(key(r,c));
        d.className='cell '+(h?(h.filled?'filled':'hole'):'wall');
        if(h&&h.filled){d.style.background=h.color;d.style.animation='none'}
        Object.assign(d.style,{left:c*cs+gap/2+'px',top:r*cs+gap/2+'px',width:cs-gap+'px',height:cs-gap+'px'});
        d.dataset.rc=r+c;b.appendChild(d);B.cellEls.set(key(r,c),d);
      }
      const t=$('#tray');t.innerHTML='';
      B.tray.forEach(p=>{if(p.used)return;const el=B.pieceEl(p.shape,p.color,B.tcell,'piece');el.dataset.id=p.id;el.addEventListener('pointerdown',e=>B.down(e,p,el));t.appendChild(el)});
    };
    B.resize=()=>B.render();
    B.pieceEl=(shape,color,cs,cls)=>{
      const {h,w}=dims(shape),el=document.createElement('div'),gap=cs>30?3:2;
      el.className=cls;el.style.width=w*cs+'px';el.style.height=h*cs+'px';
      shape.forEach(([r,c])=>{const q=document.createElement('div');q.className='pc';Object.assign(q.style,{left:c*cs+gap/2+'px',top:r*cs+gap/2+'px',width:cs-gap+'px',height:cs-gap+'px',background:color});el.appendChild(q)});
      return el;
    };
    B.down=(e,p,el)=>{
      if(B.drag)return;e.preventDefault();sfx.pick?sfx.pick():sfx.tap();buzz(6);
      const fl=B.pieceEl(p.shape,p.color,B.cell,'floating');document.body.appendChild(fl);
      const {h,w}=dims(p.shape);B.drag={p,el,fl,w:w*B.cell,h:h*B.cell,match:null,id:e.pointerId};el.classList.add('away');
      const mv=ev=>{if(ev.pointerId===B.drag.id)B.move(ev)},up=ev=>{if(ev.pointerId!==B.drag.id)return;removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);B.up()};
      addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up);B.move(e);
    };
    B.move=e=>{
      const d=B.drag,lift=e.pointerType==='mouse'?d.h/2:d.h+28;d.x=e.clientX-d.w/2;d.y=e.clientY-lift;
      d.fl.style.transform=`translate(${d.x}px,${d.y}px)`;
      const br=$('#board').getBoundingClientRect(),c0=Math.round((d.x-br.left)/B.cell),r0=Math.round((d.y-br.top)/B.cell);
      const keys=d.p.shape.map(([r,c])=>key(r+r0,c+c0));
      const m=B.holes.find(h=>!h.filled&&h.keys.size===keys.length&&keys.every(k=>h.keys.has(k)))||null;
      if(m!==d.match){
        if(d.match)d.match.keys.forEach(k=>B.cellEls.get(k).classList.remove('preview'));
        if(m){m.keys.forEach(k=>B.cellEls.get(k).classList.add('preview'));sfx.near();buzz(4)}
        d.match=m;d.r0=r0;d.c0=c0;
      }
    };
    B.up=()=>{
      const d=B.drag;B.drag=null;
      if(d.match){
        const h=d.match,br=$('#board').getBoundingClientRect();
        h.keys.forEach(k=>B.cellEls.get(k).classList.remove('preview'));
        d.fl.classList.add('settle');d.fl.style.transform=`translate(${br.left+d.c0*B.cell}px,${br.top+d.r0*B.cell}px)`;
        setTimeout(()=>{
          d.fl.remove();h.filled=true;h.color=d.p.color;d.p.used=true;d.el.remove();sfx.thunk(.7);buzz(18);
          h.keys.forEach(k=>{const c=B.cellEls.get(k);c.className='cell filled';c.style.background=h.color});
          sparks(br.left+d.c0*B.cell+d.w/2,br.top+d.r0*B.cell+d.h/2,[h.color,'#ffd36b','#ffffff'],12,50);
          const left=B.holes.filter(x=>!x.filled).length;
          api.hint(left?['딱!','쏙!','좋아요','완벽해요'][randi(0,3)]+' 남은 자리 '+left+'개':'다 채웠어요');
          if(!left){B.cellEls.forEach(c=>{c.style.animationDelay=(+c.dataset.rc*45)+'ms';c.classList.add('wave')});setTimeout(()=>sfx.win(),200);buzz([10,60,20]);
            api.complete('다 채웠어요',B.lv+'단계 끝. 빈자리가 하나도 없어요.',700)}
        },140);
      }else{
        const r=d.el.getBoundingClientRect();d.fl.classList.add('home');d.fl.style.transformOrigin='0 0';
        d.fl.style.transform=`translate(${r.left}px,${r.top}px) scale(${B.tcell/B.cell})`;sfx.back();
        setTimeout(()=>{d.fl.remove();d.el.classList.remove('away')},220);
      }
    };
    B.stop=()=>{};
    $('#block-new').addEventListener('click',()=>{sfx.back();B.start(B.lv)});
    return B;
  }
});
})();
