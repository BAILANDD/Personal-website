(() => {
 window.createExplorerLightbox=(overlay,pane,reduced)=>{
  const dialog=document.createElement('dialog');
  dialog.className='explorer-lightbox';dialog.setAttribute('aria-label','TASTOID 图片预览');
  dialog.innerHTML=`<button class="lightbox-close" type="button" aria-label="关闭预览" autofocus>×</button>
   <button class="lightbox-prev" type="button" aria-label="上一张">←</button>
   <figure><img alt=""><figcaption aria-live="polite"></figcaption></figure>
   <button class="lightbox-next" type="button" aria-label="下一张">→</button>`;
  document.body.append(dialog);
  const image=dialog.querySelector('img'),counter=dialog.querySelector('figcaption');
  let gallery=[],index=0,opener=null,tween=null;
  function show(next,direction=0){
   index=(next+gallery.length)%gallery.length;
   const source=gallery[index];
   image.alt=source.alt;image.src=source.currentSrc||source.src;
   counter.textContent=`${index+1} / ${gallery.length}`;
   tween?.cancel();
   if(!reduced.matches)tween=image.animate([{opacity:.55,transform:direction?`translateX(${direction*10}px)`:'scale(.975)'},{opacity:1,transform:'none'}],{duration:230,easing:'ease-out'});
  }
  function close(restore=true){
   if(!dialog.open)return;
   tween?.cancel();dialog.close();image.removeAttribute('src');
   if(restore)opener?.focus({preventScroll:true});
   opener=null;
  }
  function enable(){
   gallery=Array.from(pane.querySelectorAll('.explorer-detail--preview img'));
   gallery.forEach((img,i)=>{
    const button=document.createElement('button');button.type='button';button.className='explorer-image-open';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-label',`放大图片：${img.alt||i+1}`);
    img.before(button);button.append(img);
    button.onclick=()=>{opener=button;dialog.showModal();show(i);};
   });
  }
  dialog.querySelector('.lightbox-close').onclick=()=>close();
  dialog.querySelector('.lightbox-prev').onclick=()=>show(index-1,-1);
  dialog.querySelector('.lightbox-next').onclick=()=>show(index+1,1);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  dialog.addEventListener('keydown',event=>{
   const direction=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0;
   if(direction){event.preventDefault();show(index+direction,direction);}
  });
  reduced.addEventListener('change',()=>{if(reduced.matches)tween?.cancel();});
  return {enable,reset(){close(false);gallery=[];}};
 };
})();
