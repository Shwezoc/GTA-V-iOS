import * as THREE from 'three';

const mount = document.querySelector('#game');
const loading = document.querySelector('#loading');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ab4c8);
scene.fog = new THREE.Fog(0x9ab4c8, 28, 115);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 180);
const renderer = new THREE.WebGLRenderer({antialias:false, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcce5ff, 0x3c4140, 2.0));
const sun = new THREE.DirectionalLight(0xffe3bd, 2.1);
sun.position.set(-12, 24, 8); scene.add(sun);

const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat(0x52645a));
ground.rotation.x=-Math.PI/2; ground.position.y=-.04; scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(12,150),mat(0x242a30));
road.rotation.x=-Math.PI/2; road.position.set(0,.005,-25); scene.add(road);
for(const x of [-5.7,5.7]){
 const line=new THREE.Mesh(new THREE.PlaneGeometry(.09,145),mat(0xd1c7a2));
 line.rotation.x=-Math.PI/2; line.position.set(x,.02,-25); scene.add(line);
}
for(let z=12;z>-105;z-=9){
 const dash=new THREE.Mesh(new THREE.PlaneGeometry(.12,4.2),mat(0xe4dfc7));
 dash.rotation.x=-Math.PI/2; dash.position.set(0,.025,z); scene.add(dash);
}
const buildingMats=[0x596875,0x777c7c,0x4a5b68,0x8b8274].map(c=>mat(c));
for(let i=0;i<34;i++){
 const side=i%2?1:-1, z=8-Math.floor(i/2)*6.2;
 const w=3.2+(i%3)*.8,h=4+(i*7%9),d=3.2+(i%2);
 const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingMats[i%buildingMats.length]);
 b.position.set(side*(9+(i%3)*2),h/2,z); scene.add(b);
 for(let y=1.4;y<h-.5;y+=1.7) for(let xx=-w/2+.55;xx<w/2;xx+=1.15){
  const win=new THREE.Mesh(new THREE.PlaneGeometry(.48,.72),mat(0x9fc4d5));
  win.position.set(b.position.x+xx,y,z+(side===1?-d/2-.012:d/2+.012));
  if(side===1)win.rotation.y=Math.PI; scene.add(win);
 }
}
function makePerson(){
 const root=new THREE.Group(); scene.add(root);
 const jacket=mat(0x293b4c),pants=mat(0x26384b),skin=mat(0xb9825d),shoe=mat(0x101820);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.25,.55,4,8),jacket);torso.position.y=1.32;root.add(torso);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.17,12,10),skin);head.position.y=1.91;root.add(head);
 const limbs=[];
 for(const x of [-.14,.14]){
  const leg=new THREE.Group();leg.position.set(x,.83,0);
  const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.55,3,7),pants);mesh.position.y=-.32;leg.add(mesh);
  const foot=new THREE.Mesh(new THREE.BoxGeometry(.19,.1,.3),shoe);foot.position.set(0,-.68,-.07);leg.add(foot);root.add(leg);limbs.push(leg);
 }
 for(const x of [-.34,.34]){
  const arm=new THREE.Group();arm.position.set(x,1.57,0);
  const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.08,.48,3,7),jacket);mesh.position.y=-.28;arm.add(mesh);root.add(arm);limbs.push(arm);
 }
 return {root,limbs};
}
const player=makePerson();
player.root.position.set(0,0,2);
let yaw=0, cameraYaw=0, cameraPitch=.22, moving=false, running=false;
const keys={};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key==='Shift')running=true});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;if(e.key==='Shift')running=false});
const stick=document.querySelector('#stick'),knob=document.querySelector('#knob');
let stickId=null,axisX=0,axisY=0;
function stickMove(e){
 const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 let dx=e.clientX-cx,dy=e.clientY-cy;const max=38,len=Math.hypot(dx,dy);
 if(len>max){dx=dx/len*max;dy=dy/len*max}
 axisX=dx/max;axisY=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`;
}
stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);stickMove(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)stickMove(e)});
function resetStick(){stickId=null;axisX=axisY=0;knob.style.transform='translate(0,0)'}
stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
const runBtn=document.querySelector('#run');
runBtn.addEventListener('pointerdown',()=>{running=true;runBtn.classList.add('active')});
for(const ev of ['pointerup','pointercancel','pointerleave'])runBtn.addEventListener(ev,()=>{running=false;runBtn.classList.remove('active')});
document.querySelector('#reset').addEventListener('click',()=>{player.root.position.set(0,0,2);yaw=0;cameraYaw=0;cameraPitch=.22});
let lookPointer=null,lastX=0,lastY=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.35&&e.clientY>innerHeight*.55)return;lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(lookPointer)});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==lookPointer)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;cameraYaw-=dx*.006;cameraPitch=Math.max(-.15,Math.min(.8,cameraPitch+dy*.004));
for(const ev of ['pointerup','pointercancel'])renderer.domElement.addEventListener(ev,()=>lookPointer=null);
const clock=new THREE.Clock();
function frame(){
 requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.04);
 const kx=(keys.d?1:0)-(keys.a?1:0),ky=(keys.s?1:0)-(keys.w?1:0);
 const ix=THREE.MathUtils.clamp(axisX+kx,-1,1),iy=THREE.MathUtils.clamp(axisY+ky,-1,1);
 moving=Math.hypot(ix,iy)>.12;
 if(moving){
  const speed=running?5.2:2.7;
  const forward=new THREE.Vector3(Math.sin(cameraYaw),0,Math.cos(cameraYaw));
  const right=new THREE.Vector3(forward.z,0,-forward.x);
  const dir=right.multiplyScalar(ix).add(forward.multiplyScalar(iy)).normalize();
  player.root.position.addScaledVector(dir,speed*dt);
  yaw=Math.atan2(dir.x,dir.z);player.root.rotation.y=yaw;
 }
 const t=clock.elapsedTime,walk=moving?Math.sin(t*(running?12:8))*.55:0;
 player.limbs[0].rotation.x=walk;player.limbs[1].rotation.x=-walk;
 player.limbs[2].rotation.x=-walk*.7;player.limbs[3].rotation.x=walk*.7;
 const target=new THREE.Vector3(player.root.position.x,1.1,player.root.position.z);
 const dist=6.3,cp=Math.cos(cameraPitch),sp=Math.sin(cameraPitch);
 camera.position.set(target.x+Math.sin(cameraYaw)*dist*cp,target.y+2.1+sp*dist,target.z+Math.cos(cameraYaw)*dist*cp);
 camera.lookAt(target);
 renderer.render(scene,camera);
}
frame();loading.classList.add('hidden');
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5))});
