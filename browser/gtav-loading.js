(()=> {
  const root=document.querySelector('#gtav-loading');
  if(!root) return;
  const stage=root.querySelector('.gtav-stage');
  const fill=root.querySelector('.gtav-load-fill');
  const percent=root.querySelector('.gtav-load-percent');
  const label=root.querySelector('.gtav-load-label');
  const spinner=root.querySelector('.gtav-spinner');
  const skip=root.querySelector('#gtav-skip');
  let done=false, started=performance.now();
  const messages=['ИНИЦИАЛИЗАЦИЯ ИГРОВОГО МИРА','ЗАГРУЗКА ГОРОДА ЛОС-САНТОС','ПОДГОТОВКА ПЕРСОНАЖЕЙ','ЗАГРУЗКА ИНТЕРФЕЙСА','ПОЧТИ ГОТОВО'];
  const fit=()=>{const s=Math.min(innerWidth/1280,innerHeight/720);stage.style.transform='translate('+((innerWidth-1280*s)/2)+'px,'+((innerHeight-720*s)/2)+'px) scale('+s+')'};
  const showMenu=()=>{if(done)return;done=true;root.classList.add('is-leaving');setTimeout(()=>{root.hidden=true;const menu=document.querySelector('#main-menu');menu.style.display='block';document.body.classList.add('menu-open')},850)};
  skip.addEventListener('click',showMenu);addEventListener('resize',fit);fit();
  const tick=()=>{if(done)return;const t=Math.min(1,(performance.now()-started)/14500);const p=Math.min(99,Math.floor((1-Math.pow(1-t,2.4))*100));fill.style.width=p+'%';percent.textContent=p+'%';label.textContent=messages[Math.min(messages.length-1,Math.floor(t*messages.length))];if(t>=1){label.textContent='ГОТОВО';fill.style.width='100%';percent.textContent='100%';setTimeout(showMenu,900)}else requestAnimationFrame(tick)};
  requestAnimationFrame(tick);
  window.GTAVLoading={start:()=>{},showMenu};
})();