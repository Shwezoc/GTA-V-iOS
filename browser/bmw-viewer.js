import * as THREE from 'three';
import { GLTFLoader } from './vendor/examples/jsm/loaders/GLTFLoader.js';

const canvas=document.querySelector('#viewport');
const status=document.querySelector('#load-state');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0b1118);
scene.fog=new THREE.Fog(0x0b1118,35,110);

const camera=new THREE.PerspectiveCamera(36,innerWidth/innerHeight,.01,1000);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;

scene.add(new THREE.HemisphereLight(0xc8e4ff,0x26303a,2.1));
const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(8,12,10);scene.add(key);
const fill=new THREE.DirectionalLight(0x8dbbe7,1.35);fill.position.set(-9,5,-8);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,2.2);rim.position.set(0,7,-12);scene.add(rim);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x151e26,roughness:.88,metalness:.08}));
ground.rotation.x=-Math.PI/2;ground.position.y=-.12;scene.add(ground);
const grid=new THREE.GridHelper(100,100,0x344653,0x263640);grid.position.y=-.105;scene.add(grid);

let model=null,center=new THREE.Vector3(),distance=8,yaw=.65,pitch=.24,autoRotate=true,drag=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function fitModel(root){
 const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
 bounds.getCenter(center);
 root.position.sub(center);
 const maxDim=Math.max(size.x,size.y,size.z);
 distance=maxDim*2.45;
 ground.position.y=-size.y*.5-.12;
 grid.position.y=ground.position.y+.01;
 camera.near=Math.max(.005,maxDim/1000);camera.far=maxDim*100;camera.updateProjectionMatrix();
}
function updateCamera(){
 const maxDim=model?.userData.maxDim||4;
 const r=distance;
 camera.position.set(Math.sin(yaw)*Math.cos(pitch)*r,Math.sin(pitch)*r+maxDim*.08,Math.cos(yaw)*Math.cos(pitch)*r);
 camera.lookAt(0,0,0);
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setSize(innerWidth,innerHeight,false)}
addEventListener('resize',resize);
canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);autoRotate=false;document.querySelector('#auto-rotate').textContent='АВТОВРАЩЕНИЕ: ВЫКЛ';document.querySelector('#auto-rotate').classList.remove('active')});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;yaw-=dx*.008;pitch=clamp(pitch+dy*.006,-.08,1.15)});
for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>drag=null);
canvas.addEventListener('wheel',e=>{distance=clamp(distance+e.deltaY*.012,1,80);e.preventDefault()},{passive:false});
document.querySelector('#reset-view').addEventListener('click',()=>{yaw=.65;pitch=.24;distance=(model?.userData.maxDim||4)*2.45});
document.querySelector('#auto-rotate').addEventListener('click',e=>{autoRotate=!autoRotate;e.currentTarget.textContent='АВТОВРАЩЕНИЕ: '+(autoRotate?'ВКЛ':'ВЫКЛ');e.currentTarget.classList.toggle('active',autoRotate)});

const loader=new GLTFLoader();
loader.load('./assets/models/bmw-m5-f90/bmwm5f90_hi.glb',gltf=>{
 model=gltf.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.side=THREE.DoubleSide}}});
 scene.add(model);fitModel(model);
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());model.userData.maxDim=Math.max(size.x,size.y,size.z);
 status.textContent='МОДЕЛЬ ЗАГРУЖЕНА';status.classList.add('ready');updateCamera();
},event=>{if(event.total){status.textContent='ЗАГРУЗКА '+Math.round(event.loaded/event.total*100)+'%'}},error=>{console.error(error);status.textContent='ОШИБКА GLB';status.classList.add('error')});

function frame(){requestAnimationFrame(frame);if(autoRotate&&!drag)yaw+=.0025;updateCamera();renderer.render(scene,camera)}
frame();
