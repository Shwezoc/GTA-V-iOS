const canvas=document.createElement('canvas');
const ctx=canvas.getContext('2d',{alpha:false});
document.querySelector('#game').appendChild(canvas);
const loading=document.querySelector('#loading');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min((devicePixelRatio||1)*(window.GTAVRenderScale||.85),1.5);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const player={x:0,z:2,yaw:0};
let cameraYaw=0,cameraPitch=.18,running=false,axisX=0,axisY=0,lookPointer=null,lastX=0,lastY=0;
const keys={};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Shift')running=true});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;if(e.key==='Shift')running=false});
const stick=document.querySelector('#stick'),knob=document.querySelector('#knob');
let stickId=null;
function stickMove(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,m=38,l=Math.hypot(dx,dy),s=l>m?m/l:1;axisX=dx*s/m;axisY=dy*s/m;knob.style.transform=`translate(${dx*s}px,${dy*s}px)`}
stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);stickMove(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)stickMove(e)});
function releaseStick(){stickId=null;axisX=axisY=0;knob.style.transform='translate(0,0)'}
stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);
const runBtn=document.querySelector('#run');
runBtn.addEventListener('pointerdown',()=>{running=true;runBtn.classList.add('active')});
for(const ev of ['pointerup','pointercancel','pointerleave'])runBtn.addEventListener(ev,()=>{running=false;runBtn.classList.remove('active')});
document.querySelector('#reset').addEventListener('click',()=>{player.x=0;player.z=2;player.yaw=0;cameraYaw=0;cameraPitch=.18});
canvas.addEventListener('pointerdown',e=>{if(e.clientX<W*.35&&e.clientY>H*.55)return;lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(lookPointer)});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;cameraYaw-=dx*.006*(window.GTAVCameraSensitivity||1);cameraPitch=clamp(cameraPitch+dy*.003*(window.GTAVCameraSensitivity||1),-.12,.65)});
for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>lookPointer=null);
const buildings=[];
for(let i=0;i<34;i++){const side=i%2?1:-1,z=8-Math.floor(i/2)*6.2,w=3.2+(i%3)*.8,h=4+(i*7%9),d=3.2+(i%2);buildings.push({x:side*(9+(i%3)*2),z,w,h,d,c:['#596875','#777c7c','#4a5b68','#8b8274'][i%4]})}
const camera={x:0,y:0,z:0,forward:[0,0,-1],right:[1,0,0],up:[0,1,0],f:0};
function setupCamera(){
 const target=[player.x,1.05,player.z],dist=7,cp=Math.cos(cameraPitch),sp=Math.sin(cameraPitch);
 camera.x=target[0]+Math.sin(cameraYaw)*dist*cp;camera.y=target[1]+2+sp*dist;camera.z=target[2]+Math.cos(cameraYaw)*dist*cp;
 const norm=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l)};
 camera.forward=norm([target[0]-camera.x,target[1]-camera.y,target[2]-camera.z]);
 camera.right=norm([camera.forward[2],0,-camera.forward[0]]);
 camera.up=norm([camera.right[1]*camera.forward[2]-camera.right[2]*camera.forward[1],camera.right[2]*camera.forward[0]-camera.right[0]*camera.forward[2],camera.right[0]*camera.forward[1]-camera.right[1]*camera.forward[0]]);
 camera.f=Math.min(W,H)*.92;
}
function project(p){const v=[p[0]-camera.x,p[1]-camera.y,p[2]-camera.z],x=v[0]*camera.right[0]+v[1]*camera.right[1]+v[2]*camera.right[2],y=v[0]*camera.up[0]+v[1]*camera.up[1]+v[2]*camera.up[2],z=v[0]*camera.forward[0]+v[1]*camera.forward[1]+v[2]*camera.forward[2];if(z<.2)return null;return [W/2+x*camera.f/z,H*.49-y*camera.f/z,z]}
function polygon(points,color){const p=points.map(project);if(p.some(v=>!v))return;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);ctx.closePath();ctx.fill()}
function box(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],A=[x-w/2,y+h,z-d/2],B=[x+w/2,y+h,z-d/2],C=[x+w/2,y+h,z+d/2],E=[x-w/2,y+h,z+d/2];polygon([A,B,C,E],color);polygon([a,b,B,A],shade(color,.78));polygon([b,c,C,B],shade(color,.62));polygon([c,e,E,C],shade(color,.85))}
function shade(hex,k){const n=parseInt(hex.slice(1),16),r=clamp((n>>16)*k,0,255),g=clamp((n>>8&255)*k,0,255),b=clamp((n&255)*k,0,255);return `rgb(${r|0},${g|0},${b|0})`}
function drawGround(){polygon([[-90,0,-110],[90,0,-110],[90,0,30],[-90,0,30]],'#53645b');polygon([[-6,0,-110],[6,0,-110],[6,0,30],[-6,0,30]],'#252c32');for(const x of [-5.7,5.7])polygon([[x-.045,.02,-110],[x+.045,.02,-110],[x+.045,.02,30],[x-.045,.02,30]],'#d1c7a2');for(let z=-105;z<25;z+=9)polygon([[-.06,.025,z],[.06,.025,z],[.06,.025,z+4],[-.06,.025,z+4]],'#e4dfc7')}
function drawBuildings(){const sorted=buildings.map(b=>({...b,dist:Math.hypot(b.x-player.x,b.z-player.z)})).sort((a,b)=>b.dist-a.dist);for(const b of sorted){box(b.x,0,b.z,b.w,b.h,b.d,b.c);for(let y=1.4;y<b.h-.5;y+=1.7){for(let xx=-b.w/2+.55;xx<b.w/2;xx+=1.15){const z=b.z+(b.x>0?-b.d/2-.015:b.d/2+.015),x=b.x+xx;polygon([[x-.24,y,z],[x+.24,y,z],[x+.24,y+.72,z],[x-.24,y+.72,z]],'#a7c8d4')}}}}
function drawPerson(t,moving){const x=player.x,z=player.z,step=moving?Math.sin(t*(running?12:8))*.32:0;const yaw=player.yaw;function pt(lx,y,lz){return [x+lx*Math.cos(yaw)+lz*Math.sin(yaw),y,z-lx*Math.sin(yaw)+lz*Math.cos(yaw)]}function limb(lx,y,len,angle,width,color){const mid=pt(lx,y,Math.sin(angle)*len*.35);const end=pt(lx,y-len,Math.sin(angle)*len);const p1=project([mid[0]-width,mid[1],mid[2]]),p2=project([mid[0]+width,mid[1],mid[2]]),p3=project([end[0]+width*.7,end[1],end[2]]),p4=project([end[0]-width*.7,end[1],end[2]]);if([p1,p2,p3,p4].some(v=>!v))return;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(p1[0],p1[1]);ctx.lineTo(p2[0],p2[1]);ctx.lineTo(p3[0],p3[1]);ctx.lineTo(p4[0],p4[1]);ctx.fill()}box(x,.83,z,.48,.72,.3,'#293b4c');const head=project([x,1.94,z]);if(head){ctx.fillStyle='#b9825d';ctx.beginPath();ctx.arc(head[0],head[1],Math.max(3, camera.f*.17/head[2]),0,Math.PI*2);ctx.fill()}limb(-.14,.8,.78,step,.12,'#26384b');limb(.14,.8,.78,-step,.12,'#26384b');limb(-.34,1.55,.58,-step*.7,.085,'#293b4c');limb(.34,1.55,.58,step*.7,.085,'#293b4c')}
let last=performance.now(),elapsed=0;
function frame(now){const dt=Math.min((now-last)/1000,.04);last=now;elapsed+=dt;const kx=(keys.d?1:0)-(keys.a?1:0),ky=(keys.s?1:0)-(keys.w?1:0),ix=clamp(axisX+kx,-1,1),iy=clamp(axisY+ky,-1,1),moving=Math.hypot(ix,iy)>.12;if(moving){const speed=running?5.2:2.7,fx=Math.sin(cameraYaw),fz=Math.cos(cameraYaw),rx=fz,rz=-fx,dx=rx*ix+fx*iy,dz=rz*ix+fz*iy,l=Math.hypot(dx,dz)||1;player.x+=dx/l*speed*dt;player.z+=dz/l*speed*dt;player.yaw=Math.atan2(dx,dz)}
setupCamera();ctx.fillStyle='#9ab4c8';ctx.fillRect(0,0,W,H);const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#8daabd');sky.addColorStop(.55,'#c1c9c5');sky.addColorStop(1,'#53645b');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);drawGround();drawBuildings();drawPerson(elapsed,moving);requestAnimationFrame(frame)}
loading.textContent='ЗАПУСК ЛЁГКОЙ 3D-СЦЕНЫ…';requestAnimationFrame(frame);setTimeout(()=>loading.classList.add('hidden'),250);

/* Live build telemetry: the browser scene is independent from the native RAGE build. */
(async()=>{
 const state=document.querySelector('#rage-state'),detail=document.querySelector('#rage-detail'),link=document.querySelector('#rage-link');
 try{
  const response=await fetch('https://api.github.com/repos/Shwezoc/GTA-V-iOS/actions/runs?per_page=20&branch=minimal-runtime',{headers:{Accept:'application/vnd.github+json'}});
  if(!response.ok)throw new Error('GitHub API: '+response.status);
  const data=await response.json();
  const run=(data.workflow_runs||[]).find(x=>(x.path||'').includes('rage-ios-runtime.yml'));
  if(!run){state.textContent='НЕТ ЗАПУСКА';state.className='state unknown';detail.textContent='Запуск RAGE runtime пока не найден.';return}
  link.href=run.html_url;
  const labels={queued:['В ОЧЕРЕДИ','pending'],in_progress:['СБОРКА ИДЁТ','pending'],completed:run.conclusion==='success'?['СБОРКА УСПЕШНА','success']:['СБОРКА НЕ ПРОШЛА','failure']};
  const [label,kind]=labels[run.status]||['СТАТУС НЕИЗВЕСТЕН','unknown'];
  state.textContent=label;state.className='state '+kind;
  const when=new Date(run.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  detail.textContent=run.status==='completed'?(run.conclusion==='success'?'iOS runtime shell собран. Это не готовая GTA V IPA.':'Последняя попытка завершилась ошибкой. Открой лог для деталей.'):(run.status==='queued'?'GitHub выделяет macOS runner. Сборка ещё не началась.':'GitHub собирает зависимости и iOS runtime.')+' Запуск: '+when+'.';
 }catch(error){state.textContent='НЕТ СВЯЗИ';state.className='state unknown';detail.textContent='Не удалось получить статус GitHub. Сама 3D-сцена работает автономно.'}
})();