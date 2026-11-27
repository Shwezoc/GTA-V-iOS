(()=> {
 const $=s=>document.querySelector(s);
 const boot=$('#boot-screen'),menu=$('#main-menu'),progress=$('#boot-progress'),caption=$('#boot-caption');
 const settings=Object.assign({quality:'medium',sensitivity:1},JSON.parse(localStorage.getItem('gtav-port-settings')||'{}'));
 window.GTAVRenderScale={low:.65,medium:.85,high:1}[settings.quality]||.85;
 window.GTAVCameraSensitivity=Number(settings.sensitivity)||1;
 document.body.classList.add('menu-open');
 let value=0;
 const bootMessages=['ПОДГОТОВКА ИНТЕРФЕЙСА…','ПРОВЕРКА БРАУЗЕРНОГО HOST…','ЗАГРУЗКА МЕНЮ…'];
 const timer=setInterval(()=>{
  value=Math.min(100,value+Math.ceil(Math.random()*9)+3);
  progress.style.width=value+'%';
  caption.textContent=bootMessages[Math.min(2,Math.floor(value/36))];
  if(value>=100){clearInterval(timer);setTimeout(()=>{boot.style.opacity='0';setTimeout(()=>{boot.style.display='none';menu.style.display='block'},560)},250)}
 },115);
 function showPanel(name){document.querySelectorAll('.menu-panel').forEach(p=>p.classList.remove('open'));const p=$('#'+name);if(p)p.classList.add('open')}
 function save(){localStorage.setItem('gtav-port-settings',JSON.stringify(settings));window.GTAVRenderScale={low:.65,medium:.85,high:1}[settings.quality];window.GTAVCameraSensitivity=Number(settings.sensitivity)||1;$('#menu-toast').textContent='НАСТРОЙКИ СОХРАНЕНЫ'}
 $('#quality').value=settings.quality;
 $('#sensitivity').value=settings.sensitivity;
 $('#quality').addEventListener('change',e=>{settings.quality=e.target.value;save()});
 $('#sensitivity').addEventListener('input',e=>{settings.sensitivity=Number(e.target.value);save()});
 $('#start-test').addEventListener('click',()=>{document.body.classList.remove('menu-open');document.body.classList.add('menu-playing');$('#menu-toast').textContent='';});
 $('#continue-game').addEventListener('click',()=>$('#start-test').click());
 $('#open-modes').addEventListener('click',()=>showPanel('mode-panel'));
 $('#open-settings').addEventListener('click',()=>showPanel('settings-panel'));
 $('#back-from-settings').addEventListener('click',()=>showPanel(''));
 $('#back-from-modes').addEventListener('click',()=>showPanel(''));
 $('#mode-test').addEventListener('click',()=>$('#start-test').click());
 $('#reset-settings').addEventListener('click',()=>{settings.quality='medium';settings.sensitivity=1;$('#quality').value='medium';$('#sensitivity').value='1';save()});
 $('#exit-menu').addEventListener('click',()=>{$('#menu-toast').textContent='В БРАУЗЕРНОЙ ВЕРСИИ ВЫХОД НЕДОСТУПЕН';});
})();