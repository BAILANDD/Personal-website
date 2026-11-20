(() => {
 const projects=window.PORTFOLIO_PROJECTS;
 const ordered=Object.entries(projects).sort(([,a],[,b])=>Number(b.year)-Number(a.year));
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const operations=window.operationsViews(esc);
 const overlay=document.createElement('dialog');overlay.className='explorer';overlay.setAttribute('aria-label','作品文件浏览器');
 overlay.innerHTML='<header class="explorer-title"><span>▣ <b id="explorer-name">Design</b> — File Explorer</span><button class="explorer-close" aria-label="关闭文件浏览器">×</button></header><div class="explorer-toolbar"><button id="explorer-back" aria-label="后退">←</button><button id="explorer-forward" aria-label="前进">→</button><nav class="explorer-path" aria-label="路径导航"></nav></div><div class="explorer-menu" hidden></div><div class="explorer-scroll" tabindex="0"></div><footer class="explorer-status"></footer>';
 document.body.append(overlay);
 const pane=overlay.querySelector('.explorer-scroll'),path=overlay.querySelector('.explorer-path'),menu=overlay.querySelector('.explorer-menu');
 const back=overlay.querySelector('#explorer-back'),forward=overlay.querySelector('#explorer-forward');
 const positions=new Map();let current='',index=0,maxIndex=0,trigger=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const motion=window.createExplorerMotion?.(overlay,pane,reduced);
 const lightbox=window.createExplorerLightbox?.(overlay,pane,reduced);
 function parse(){const parts=location.hash.slice(1).split('/').filter(Boolean).map(decodeURIComponent);if(!['design','operations'].includes(parts[0]))return null;return {root:parts[0],id:parts[1]||null};}
 history.replaceState({...history.state,explorerIndex:0},'');
 function save(){if(current)positions.set(current,pane.scrollTop);}
 function go(target,cover){if(location.hash===target)return;save();index++;maxIndex=index;history.pushState({explorerIndex:index},'',target||location.pathname+location.search);render(cover);}
 window.openExplorer=root=>{trigger=document.activeElement;go('#'+root.toLowerCase());};
 function close(){go('');}
 function render(cover){
  const route=parse();const wasOpen=overlay.open;menu.hidden=true;
  motion?.reset();lightbox?.reset();
  index=history.state?.explorerIndex??0;back.disabled=index<=0;forward.disabled=index>=maxIndex;
  if(!route){
   current='';document.title='Zhuanz · Personal Space';
   overlay.close();
   trigger?.focus({preventScroll:true});
   return;
  }
  const root=route.root==='design'?'Design':'Operations',project=route.root==='design'?projects[route.id]:window.OPERATIONS_CASES[route.id];
  current=location.hash;document.title=(project?.title||root)+' — My Portfolio';
  overlay.querySelector('#explorer-name').textContent=root;
  path.innerHTML=`<button data-route="#${route.root}" ${!route.id?'aria-current="page"':''}>${root}</button><button class="path-expand" aria-label="展开 ${root} 下级目录" aria-expanded="false">▾</button>`+(route.id?`<span>/</span><span aria-current="page">${esc(project?.title||'未找到作品')}</span>`:'');
  if(project && route.root==='operations'){
   pane.innerHTML=operations.detail(project);
  }else if(project){
   pane.innerHTML=`<article class="explorer-detail${route.id==='tastoid'?' explorer-detail--preview':''}"><header><p class="explorer-eyebrow">DESIGN / ${esc(project.year)}</p><h1>${esc(project.title)}</h1><p>${esc(project.subtitle)}</p></header>${project.bodyHtml}</article>`;
   pane.querySelectorAll('img').forEach((img,i)=>{img.loading=i?'lazy':'eager';img.decoding='async';});
  }else if(route.id){pane.innerHTML='<div class="explorer-empty"><h1>未找到作品</h1><p>点击上方路径返回目录。</p></div>';}
  else if(route.root==='design'){
   pane.innerHTML='<div class="explorer-catalog"><header><h1>Design</h1></header><div class="explorer-grid">'+ordered.map(([id,p])=>`<a class="explorer-card" href="#design/${id}" data-route="#design/${id}"><img src="${esc(p.thumbnail||p.hero.src)}" alt="${esc(p.hero.alt)}" loading="lazy"><h2>${esc(p.title)}</h2><p>${esc(p.subtitle)}</p><small>${esc(p.type)} · ${esc(p.year)}</small></a>`).join('')+'</div></div>';
  }else{pane.innerHTML=operations.catalog();}
  overlay.querySelector('.explorer-status').textContent=route.root==='operations'?(project?project.subtitle:operations.entries.length+' cases'):project?`${project.sections.length} sections · ${project.imageCount} images`:route.root==='design'?`${ordered.length} projects`:'0 cases';
  if(!wasOpen){
   overlay.showModal();
   overlay.querySelector('.explorer-close').focus();
  }else if((!motion||route.root==='operations')&&!reduced.matches)pane.animate([{opacity:.4,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});
  pane.scrollTop=positions.get(current)||0;
  if(!route.id)motion?.reveal();
  if(route.root==='design'&&project){
   if(route.id==='tastoid')lightbox?.enable();
   if(cover&&!pane.scrollTop)motion?.share(cover,pane.querySelector('.explorer-detail img'));
  }
 }
 overlay.addEventListener('click',event=>{
  const target=event.target.closest('[data-route]');if(target){
   if(target.tagName==='A'&&(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey))return;
   const cover=current==='#design'&&target.dataset.route.startsWith('#design/')?motion?.capture(target.querySelector?.('img')):null;
   event.preventDefault();go(target.dataset.route,cover);menu.hidden=true;path.querySelector('.path-expand')?.setAttribute('aria-expanded','false');return;
  }
  const expand=event.target.closest('.path-expand');if(expand){menu.hidden=!menu.hidden;expand.setAttribute('aria-expanded',String(!menu.hidden));const route=parse();const entries=route.root==='design'?ordered:operations.entries;
   const other=route.root==='design'?'Operations':'Design';
   menu.innerHTML=entries.map(([id,p])=>`<a href="#${route.root}/${id}" data-route="#${route.root}/${id}">${esc(p.title)}</a>`).join('')+`<a class="explorer-switch" href="#${other.toLowerCase()}" data-route="#${other.toLowerCase()}">${other}</a>`;return;}
  menu.hidden=true;path.querySelector('.path-expand')?.setAttribute('aria-expanded','false');
 });
 overlay.querySelector('.explorer-close').onclick=close;
 overlay.addEventListener('cancel',event=>{event.preventDefault();if(!menu.hidden){menu.hidden=true;path.querySelector('.path-expand')?.setAttribute('aria-expanded','false');}else close();});
 back.onclick=()=>history.back();forward.onclick=()=>history.forward();
 pane.addEventListener('scroll',save,{passive:true});
 window.addEventListener('popstate',()=>{save();render();});
 window.addEventListener('hashchange',()=>{if(location.hash!==current){save();render();}});
 render();
})();
