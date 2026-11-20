(() => {
 const photos=window.PHOTOGRAPHY,albums=['全部',...new Set(photos.map(p=>p.album))];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const grid=document.querySelector('#photo-grid'),viewer=document.querySelector('#photo-viewer');
 let visible=[],index=0,lastTrigger=null;
 function media(p){return p.src?`<img class="photo-media" src="${esc(p.src)}" alt="${esc(p.title)}" loading="lazy">`:'<div class="photo-media photo-placeholder"><strong>▧</strong><span>PHOTO PLACEHOLDER</span><span>摄影占位 · 待上传</span></div>';}
 function render(){
  const chosen=new URLSearchParams(location.search).get('album')||'全部';
  const album=albums.includes(chosen)?chosen:'全部';
  visible=photos.filter(p=>album==='全部'||p.album===album);
  document.querySelector('.album-tabs').innerHTML=albums.map(a=>`<a href="?album=${encodeURIComponent(a)}" ${a===album?'aria-current="page"':''}>${esc(a)}</a>`).join('');
  grid.innerHTML=visible.map((p,i)=>`<button class="photo-card" data-photo="${i}" aria-label="预览 ${esc(p.title)}${p.src?'':'，占位内容'}">${media(p)}<h2>${esc(p.title)}</h2><p>${esc(p.album)} · ${esc(p.date)} · ${esc(p.location)}</p></button>`).join('');
  document.querySelector('#photo-count').textContent=`${visible.length} 项 · ${visible.filter(p=>!p.src).length} 项占位`;
 }
 function preview(){const p=visible[index];document.querySelector('#preview-image').innerHTML=media(p);document.querySelector('#photo-caption').textContent=p.title+(p.src?'':' · 占位内容');document.querySelector('#preview-meta').textContent=`相册：${p.album} · 拍摄时间：${p.date} · 地点：${p.location}`;document.querySelector('#preview-index').textContent=`${index+1} / ${visible.length}`;document.querySelector('#preview-prev').disabled=index===0;document.querySelector('#preview-next').disabled=index===visible.length-1;}
 grid.addEventListener('click',e=>{const b=e.target.closest('[data-photo]');if(!b)return;lastTrigger=b;index=Number(b.dataset.photo);preview();viewer.showModal();});
 document.querySelector('.album-tabs').addEventListener('click',e=>{const a=e.target.closest('a');if(!a||e.metaKey||e.ctrlKey)return;e.preventDefault();history.pushState(null,'',a.href);render();});
 document.querySelector('#preview-close').onclick=()=>viewer.close();
 document.querySelector('#preview-prev').onclick=()=>{if(index>0){index--;preview();}};
 document.querySelector('#preview-next').onclick=()=>{if(index<visible.length-1){index++;preview();}};
 viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=index+(e.key==='ArrowLeft'?-1:1);if(next>=0&&next<visible.length){index=next;preview();}}});
 viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close();});
 viewer.addEventListener('close',()=>lastTrigger?.focus());
 window.addEventListener('popstate',()=>{if(viewer.open)viewer.close();render();});render();
 if (window.parent !== window) {
  requestAnimationFrame(() => window.parent.postMessage('photography-ready', location.protocol === 'file:' ? '*' : location.origin));
 }
})();
