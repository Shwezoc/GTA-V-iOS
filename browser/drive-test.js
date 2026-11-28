import * as THREE from 'three';
import { GLTFLoader } from './vendor/examples/jsm/loaders/GLTFLoader.js';

const canvas=document.querySelector('#world');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9aafbd);
scene.fog=new THREE.Fog(0x9aafbd,45,150);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.05,300);
scene.add(new THREE.HemisphereLight(0xd8eaff,0x3c4650,2.1));
const sun=new THREE.DirectionalLight(0xfff0d8,3.0);sun.position.set(-18,28,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;scene.add(sun);
const fill=new THREE.DirectionalLight(0x9bcaff,1.1);fill.position.set(12,9,-20);scene.add(fill);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:0x59665d,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const road=new THREE.Mesh(new THREE.PlaneGeometry(12,180),new THREE.MeshStandardMaterial({color:0x252c32,roughness:.94}));
road.rotation.x=-Math.PI/2;road.position.y=.012;road.receiveShadow=true;scene.add(road);
const lineMat=new THREE.MeshBasicMaterial({color:0xd9d2b9});
for(const x of [-5.65,5.65]){const m=new THREE.Mesh(new THREE.BoxGeometry(.07,.025,180),lineMat);m.position.set(x,.03,0);scene.add(m)}
for(let z=-85;z<85;z+=9){const m=new THREE.Mesh(new THREE.BoxGeometry(.12,.026,4),lineMat);m.position.set(0,.035,z);scene.add(m)}
const buildingMat=[0x566571,0x777b78,0x465968,0x8a8275].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.9}));
for(let i=0;i<34;i++){const side=i%2?1:-1,z=12-Math.floor(i/2)*7.4,w=3.5+(i%3),h=4+(i*7%10),d=3.4+(i%2);const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),buildingMat[i%4]);b.position.set(side*(10+(i%3)*2),h/2,z);b.castShadow=true;b.receiveShadow=true;scene.add(b)}
const loader=new GLTFLoader();
const state=document.querySelector('#load-state'),objective=document.querySelector('#objective'),detail=document.querySelector('#detail'),enterBtn=document.querySelector('#enter');
let car=null,player=null,mixer=null,walkAction=null,idleAction=null,runAction=null,currentAction=null,inside=false;
let speed=0,steer=0,camYaw=0,camPitch=.22,drag=null,stickX=0,stickY=0,last=performance.now();
const keys={};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fitAsset(root,height){const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const scale=height/Math.max(size.y,.001);root.scale.setScalar(scale);root.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);return {size:size.multiplyScalar(scale)}}
function setAction(action){if(!action||currentAction===action)return;if(currentAction)currentAction.fadeOut(.16);currentAction=action;action.reset().fadeIn(.16).play()}
function makeEnvironment(){const treeMat=new THREE.MeshStandardMaterial({color:0x304c3b,roughness:1});for(let i=0;i<24;i++){const x=(i%2?1:-1)*(8+Math.floor(i/2)%4*3),z=18-Math.floor(i/2)*8;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.2,1.8,7),new THREE.MeshStandardMaterial({color:0x554331}));trunk.position.set(x,.9,z);scene.add(trunk);const crown=new THREE.Mesh(new THREE.SphereGeometry(1.05,9,7),treeMat);crown.position.set(x,2.35,z);crown.scale.y=1.25;crown.castShadow=true;scene.add(crown)}}
makeEnvironment();

async function loadCar(){const gltf=await loader.loadAsync('./assets/models/bmw-m5-f90/bmwm5f90_hi.glb');car=new THREE.Group();const model=gltf.scene;fitAsset(model,1.55);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material)o.material.side=THREE.DoubleSide}});car.add(model);scene.add(car);car.position.set(0,0,0);car.rotation.y=Math.PI;return model}
async function loadPlayer(){const gltf=await loader.loadAsync('./assets/models/franklin/franklin_niko_animated.glb');player=new THREE.Group();const model=gltf.scene;fitAsset(model,1.82);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material)o.material.side=THREE.DoubleSide}});player.add(model);scene.add(player);player.position.set(3.2,0,1.7);mixer=new THREE.AnimationMixer(model);const clips=gltf.animations;const idle=clips.find(c=>/idle/i.test(c.name))||clips[0];const walk=clips.find(c=>/walk/i.test(c.name))||clips[1]||clips[0];const run=clips.find(c=>/run|sprint/i.test(c.name))||walk;idleAction=mixer.clipAction(idle);walkAction=mixer.clipAction(walk);runAction=mixer.clipAction(run);setAction(idleAction)}
function nearCar(){if(!player||!car)return false;const p=player.position,c=car.position;return Math.hypot(p.x-c.x,p.z-c.z)<3.15}
function updateInteraction(){if(inside){enterBtn.disabled=false;enterBtn.innerHTML='ВЫЙТИ <small>ИЗ BMW · E</small>';objective.textContent='BMW M5 F90 · ЗА РУЛЁМ';detail.textContent='WASD / джойстик — управление автомобилем';document.body.classList.add('in-car')}else{const near=nearCar();enterBtn.disabled=!near;enterBtn.innerHTML='СЕСТЬ <small>В BMW · E</small>';objective.textContent=near?'Сядь за руль BMW':'Подойди к BMW M5 F90';detail.textContent=near?'Нажми E или кнопку «СЕСТЬ»':'Исследуй сцену и подойди к водительской двери';document.body.classList.remove('in-car')}}
function enterExit(){if(!car||!player)return;if(!inside){if(!nearCar())return;inside=true;player.visible=false;speed=0}else{inside=false;const side=new THREE.Vector3(-1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),car.rotation.y);player.position.copy(car.position).add(side.multiplyScalar(2.35));player.position.y=0;player.rotation.y=car.rotation.y;player.visible=true;speed=0}updateInteraction()}
enterBtn.addEventListener('click',enterExit);
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')enterExit()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function hold(id,key){const el=document.querySelector(id);if(!el)return;el.addEventListener('pointerdown',e=>{e.preventDefault();keys[key]=true;el.setPointerCapture(e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>keys[key]=false)}
hold('#gas','w');hold('#brake','s');hold('#left','a');hold('#right','d');
const stick=document.querySelector('#stick'),knob=document.querySelector('#knob');let stickId=null;
function moveStick(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,m=34,l=Math.hypot(dx,dy),s=l>m?m/l:1;stickX=dx*s/m;stickY=dy*s/m;knob.style.transform='translate('+dx*s+'px,'+dy*s+'px)'}
stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);moveStick(e)});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)moveStick(e)});
function releaseStick(){stickId=null;stickX=stickY=0;knob.style.transform='translate(0,0)'}
stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);
canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;camYaw-=dx*.006;camPitch=clamp(camPitch+dy*.003,-.08,.72)});
for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>drag=null);
function updatePlayer(dt){const ix=clamp(stickX+(keys.d?1:0)-(keys.a?1:0),-1,1),iy=clamp(stickY+(keys.s?1:0)-(keys.w?1:0),-1,1);const moving=Math.hypot(ix,iy)>.13;if(moving){const forward=new THREE.Vector3(-Math.sin(camYaw),0,-Math.cos(camYaw)),right=new THREE.Vector3(Math.cos(camYaw),0,-Math.sin(camYaw));const dir=right.multiplyScalar(ix).add(forward.multiplyScalar(-iy)).normalize();const run=keys.shift?4.7:2.6;player.position.addScaledVector(dir,run*dt);player.rotation.y=Math.atan2(dir.x,dir.z);setAction(keys.shift?runAction:walkAction)}else setAction(idleAction);if(mixer)mixer.update(dt)}
function updateCar(dt){const throttle=(keys.w?1:0)+(stickY<-.18?-stickY:0),brake=(keys.s?1:0)+(stickY>.18?stickY:0),turn=clamp((keys.d?1:0)-(keys.a?1:0)+stickX,-1,1);speed+=throttle*8*dt;speed-=brake*13*dt;speed*=Math.pow(.985,dt*60);speed=clamp(speed,-5,22);const turnFactor=clamp(Math.abs(speed)/5,0,1);car.rotation.y+=turn*1.35*turnFactor*dt*Math.sign(speed||1);const forward=new THREE.Vector3(-Math.sin(car.rotation.y),0,-Math.cos(car.rotation.y));car.position.addScaledVector(forward,speed*dt)}
function updateCamera(dt){const target=inside?car.position:player.position;const yaw=inside?car.rotation.y+camYaw:camYaw;const dist=inside?8.2:6.4;const focus=target.clone().add(new THREE.Vector3(0,inside?1.25:1.15,0));const desired=focus.clone().add(new THREE.Vector3(Math.sin(yaw)*Math.cos(camPitch)*dist,Math.sin(camPitch)*dist+1.1,Math.cos(yaw)*Math.cos(camPitch)*dist));camera.position.lerp(desired,1-Math.pow(.001,dt));camera.lookAt(focus)}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;if(car&&player){if(inside)updateCar(dt);else updatePlayer(dt);updateCamera(dt);if(Math.floor(now/250)!==Math.floor((now-dt*1000)/250))updateInteraction()}renderer.render(scene,camera)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(innerWidth,innerHeight,false)});
(async()=>{try{state.textContent='BMW…';await loadCar();state.textContent='FRANKLIN…';await loadPlayer();state.textContent='СЦЕНА ГОТОВА';state.classList.add('ready');updateInteraction();}catch(e){console.error(e);state.textContent='ОШИБКА';document.querySelector('#error').hidden=false;document.querySelector('#error').textContent='Не удалось загрузить модель: '+(e?.message||e);detail.textContent='Проверьте доступность файлов моделей'}requestAnimationFrame(frame)})();
