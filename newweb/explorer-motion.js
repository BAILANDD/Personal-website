(() => {
 const {gsap,Flip,ScrollTrigger}=window;
 if(!gsap||!Flip||!ScrollTrigger)return;
 gsap.registerPlugin(Flip,ScrollTrigger);

 window.createExplorerMotion=(overlay,pane,reduced)=>{
  let shared,reveals=[];
  function clearShare(){
   if(!shared)return;
   const {layer,hero,tween}=shared;shared=null;
   tween?.kill();hero.style.removeProperty('opacity');layer.remove();
  }
  function reset(){
   clearShare();
   for(const dispose of reveals)dispose();
   reveals=[];
  }
  function reveal(){
   if(reduced.matches)return;
   const bottom=pane.getBoundingClientRect().bottom;
   pane.querySelectorAll('.explorer-card').forEach((card,i)=>{
    if(card.getBoundingClientRect().top<bottom)return;
    const tween=gsap.fromTo(card,{y:14,opacity:0},{y:0,opacity:1,duration:.42,delay:(i%2)*.065,ease:'power2.out',paused:true,clearProps:'transform,opacity'});
    const trigger=ScrollTrigger.create({trigger:card,scroller:pane,start:'top 99%',onEnter:()=>tween.play()});
    const show=()=>tween.progress(1);
    card.addEventListener('focus',show);
    reveals.push(()=>{trigger.kill();tween.kill();card.removeEventListener('focus',show);gsap.set(card,{clearProps:'transform,opacity'});});
   });
  }
  function capture(img){
   if(reduced.matches||!img?.complete||!img.naturalWidth)return null;
   const rect=img.getBoundingClientRect(),area=pane.getBoundingClientRect();
   const top=Math.max(0,area.top-rect.top),bottom=Math.max(0,rect.bottom-area.bottom);
   if(top+bottom>=rect.height)return null;
   return {src:img.currentSrc||img.src,rect};
  }
  function share(cover,hero){
   if(reduced.matches||!hero)return;
   const destination=hero.getBoundingClientRect();
   if(!destination.width||!destination.height)return;
   const area=pane.getBoundingClientRect();
   const layer=document.createElement('div');
   layer.className='explorer-share-layer';
   layer.setAttribute('aria-hidden','true');
   Object.assign(layer.style,{left:`${area.left}px`,top:`${area.top}px`,width:`${pane.clientWidth}px`,height:`${pane.clientHeight}px`});
   const place=(img,rect)=>Object.assign(img.style,{left:`${rect.left-area.left}px`,top:`${rect.top-area.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
   const ghost=new Image();ghost.className='explorer-shared-cover';ghost.alt='';ghost.src=cover.src;
   place(ghost,cover.rect);layer.append(ghost);overlay.append(layer);
   const first=Flip.getState(ghost);
   hero.style.opacity='0';place(ghost,destination);
   shared={layer,hero,scrollTop:pane.scrollTop};
   const tween=gsap.timeline({onComplete:clearShare});
   shared.tween=tween;
   tween.add(Flip.from(first,{scale:true,duration:.56,ease:'power3.inOut',paused:true}).paused(false),0);
   tween.to(hero,{opacity:1,duration:.15},.41);
   tween.to(ghost,{opacity:0,duration:.15},.41);
  }
  reduced.addEventListener('change',()=>{
   if(!reduced.matches)return;
   reset();
  });
  pane.addEventListener('scroll',()=>{
   if(shared&&pane.scrollTop!==shared.scrollTop)clearShare();
  },{passive:true});
  window.addEventListener('resize',clearShare);
  return {reveal,capture,share,reset};
 };
})();
