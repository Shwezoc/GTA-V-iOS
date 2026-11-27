(()=> {
  const root=document.querySelector('#gtav-loading');
  if(!root) return;
  const stage=root.querySelector('.gtav-stage');
  const screens=root.querySelector('.gtav-screens');
  const logo=root.querySelector('.gtav-logo');
  const spinner=root.querySelector('.gtav-spinner');
  const label=root.querySelector('.gtav-load-label');
  const percent=root.querySelector('.gtav-load-percent');
  const fill=root.querySelector('.gtav-load-fill');
  const status=root.querySelector('.gtav-load-status');
  const base='./assets/gtav-loading/title/';
  const art=base+'art/';
  const scenes=[
    [{file:'beach_bg',w:1024,h:512,x:98,y:95,ry:20,toX:98,toY:0,toRY:-6,rx:5},{file:'beach_fg',w:343,h:629,x:480,y:95,toX:720,toY:95}],
    [{file:'ls0_background',w:1024,h:512,x:98,y:95,ry:7,toX:98,toY:95,toRY:-7},{file:'ls0_foreground',w:299,h:599,x:360,y:140,toX:560,toY:140}],
    [{file:'ls1_background',w:1024,h:512,x:98,y:95,ry:6,toX:98,toY:95,toRY:-12},{file:'ls1_foreground',w:503,h:206,x:300,y:465,toX:480,toY:465},{file:'ls1_foreground_franklin',w:368,h:588,x:440,y:140,toX:745,toY:140}]
  ];
  let current=null, nextIndex=0, progress=0, frame=0, started=false, complete=false;
  const imageCache=new Map();
  const loadImage=(name)=>{
    if(!imageCache.has(name)){
      const img=new Image();
      img.src=art+name+'.webp';
      imageCache.set(name,img);
    }
    const img=imageCache.get(name);
    return img.decode().then(()=>img);
  };
  const fit=()=>{
    const scale=Math.min(innerWidth/1280,innerHeight/720);
    stage.style.transform='translate('+((innerWidth-1280*scale)/2)+'px,'+((innerHeight-720*scale)/2)+'px) scale('+scale+')';
  };
  const renderScene=async(index)=>{
    const defs=scenes[index%scenes.length];
    const loaded=await Promise.all(defs.map(async d=>({d,img:await loadImage(d.file)})));
    const panel=document.createElement('div');
    panel.className='gtav-slide';
    const layers=[];
    for(const {d,img} of loaded){
      const camera=document.createElement('div');
      camera.className='gtav-layer-camera';
      const layer=document.createElement('div');
      layer.className='gtav-art-layer';
      layer.style.width=d.w+'px'; layer.style.height=d.h+'px';
      layer.style.backgroundImage='url("'+img.src+'")';
      layer.style.transform='translate3d('+d.x+'px,'+d.y+'px,0) rotateY('+(-(d.ry||0))+'deg)';
      camera.appendChild(layer); panel.appendChild(camera);
      layers.push({el:layer,d});
    }
    panel.style.transform='translateX(1280px)';
    screens.appendChild(panel);
    const start=performance.now(), duration=1150;
    const animate=(now)=>{
      const t=Math.min(1,(now-start)/duration);
      const ease=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
      panel.style.transform='translateX('+(1280*(1-ease))+'px)';
      for(const {el,d} of layers){
        const x=d.x+(d.toX-d.x)*ease;
        const y=d.y+(d.toY-d.y)*ease;
        const ry=(d.ry||0)+((d.toRY||0)-(d.ry||0))*ease;
        el.style.transform='translate3d('+x+'px,'+y+'px,0) rotateY('+(-ry)+'deg) rotateX('+(-(d.rx||0)*ease)+'deg)';
      }
      if(t<1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    if(current) setTimeout(()=>current.remove(),1200);
    current=panel;
  };
  const setProgress=(value,text)=>{
    progress=Math.max(progress,Math.min(100,value));
    fill.style.width=progress+'%'; percent.textContent=Math.round(progress)+'%';
    if(text) label.textContent=text;
  };
  const showMenu=()=>{
    if(complete) return;
    complete=true;
    root.classList.add('is-leaving');
    setTimeout(()=>{
      root.hidden=true;
      document.querySelector('#main-menu').style.display='block';
      document.body.classList.add('menu-open');
    },850);
  };
  const start=async()=>{
    if(started) return;
    started=true;
    fit(); addEventListener('resize',fit);
    const required=['logo.png','spinner.png','chalet.woff'];
    const checks=await Promise.all(required.map(async file=>{
      try{const response=await fetch(base+file,{method:'HEAD',cache:'no-store'});return response.ok;}
      catch(_){return false;}
    }));
    if(checks.some(ok=>!ok)){
      status.textContent='НЕТ ОРИГИНАЛЬНЫХ РЕСУРСОВ · СМ. assets/gtav-loading/README.md';
      label.textContent='ОЖИДАЮ ИГРОВЫЕ ТЕКСТУРЫ';
      percent.textContent='—'; fill.style.width='0';
      root.classList.add('assets-missing');
      return;
    }
    logo.src=base+'logo.png'; spinner.style.backgroundImage='url("'+base+'spinner.png")';
    await document.fonts.load('12px Chalet');
    try{
      for(let i=0;i<scenes.length;i++){
        setProgress(8+i*12,'ЗАГРУЗКА ИЛЛЮСТРАЦИЙ');
        await renderScene(i);
        await new Promise(resolve=>setTimeout(resolve,3000));
      }
      setProgress(70,'ПОДГОТОВКА ИНТЕРФЕЙСА');
      await new Promise(resolve=>setTimeout(resolve,500));
      setProgress(100,'ГОТОВО');
      showMenu();
    }catch(error){
      status.textContent='ОШИБКА ЧТЕНИЯ ТЕКСТУР · ПРОВЕРЬТЕ НАБОР ФАЙЛОВ';
      label.textContent='ЗАГРУЗКА ОСТАНОВЛЕНА';
      console.error('GTAV loading assets:',error);
    }
  };
  window.GTAVLoading={start,showMenu};
  start();
})();