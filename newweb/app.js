const content=document.querySelector('#screen-content');
const routes={Experiments:'experiments.html'};
const utility=document.querySelector('#utility-window');
let utilityTrigger=null;
const utilityContent={
  Resume:'<h2>个人简历</h2><p>下载我的个人简历 · PDF</p><a class="resume-download resume-download-ready" href="assets/cv/运营实习_张文龙.pdf" download="运营实习_张文龙.pdf">↓ 下载简历 PDF</a><p class="empty-hint">运营实习 · 张文龙</p>',
  About:'<h2>Zhuanz</h2><p>欢迎来到我的个人空间。这里记录设计作品、运营实践与创意实验。</p><p>选择屏幕上的 Design 或 Operations，浏览不同方向的工作。</p>',
  Files:'<h2>Files</h2><p>这里将收录可下载的资料与文件。</p><p class="empty-hint">暂无公开文件。</p>',
  Links:'<h2>联系我</h2><p>欢迎交流想法、项目与合作。</p><ul class="contact-list"><li><span class="contact-name">Gmail</span><a href="mailto:giorgiozhangwl@gmail.com">giorgiozhangwl@gmail.com ↗</a></li><li><span class="contact-name">GitHub</span><a href="https://github.com/BAILANDD" target="_blank" rel="noopener noreferrer">github.com/BAILANDD ↗</a></li><li><span class="contact-name">抖音</span><span class="contact-pending">待补充</span></li><li><span class="contact-name">小红书</span><span class="contact-pending">待补充</span></li></ul>'
};
function closeUtility(){utility.hidden=true;utilityTrigger?.focus();}
document.querySelector('#utility-close').onclick=closeUtility;
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!utility.hidden)closeUtility();});
function show(page){
 if(page==='Design'||page==='Operations'){window.openExplorer(page);return;}
 if(routes[page]){location.href=routes[page];return;}
 if(utilityContent[page]){
  utilityTrigger=document.activeElement;
  document.querySelector('#utility-title').textContent=page==='Resume'?'个人简历 / CV':page;
  document.querySelector('#utility-content').innerHTML=utilityContent[page];
  utility.hidden=false;utility.style.zIndex=String(++topWindowLayer);
  document.querySelector('#utility-close').focus();return;
 }
 if(page!=='Home')return;
 utility.hidden=true;

 content.innerHTML='<h1 class="hello">Hello!</h1><p class="intro">A personal space for<br>my work, process,<br>and playful experiments.</p><div class="tiles primary-tiles">'+[['🎨','Design','设计作品'],['⚙️','Operations','运营案例']].map(([icon,name,label])=>`<button class="tile" data-page="${name}"><i>${icon}</i>${name}<small>${label}</small></button>`).join('')+'</div>';
}
document.addEventListener('click',e=>{const button=e.target.closest('[data-page]');if(button)show(button.dataset.page)});
const eq=document.querySelector('.equalizer');for(let i=0;i<12;i++){const bar=document.createElement('b');bar.style.animationDelay=`-${i*.17}s`;bar.style.animationDuration=`${.5+i%4*.2}s`;eq.append(bar)}
document.querySelector('#motion').onclick=e=>{const paused=document.body.classList.toggle('paused');e.currentTarget.textContent=paused?'▶':'Ⅱ';e.currentTarget.setAttribute('aria-pressed',String(!paused));e.currentTarget.setAttribute('aria-label',paused?'播放动态效果':'暂停动态效果')};show('Home');

// Match CSS background-size: cover, including its centered crop.
const desktop = document.querySelector('.desktop');
function alignScreen() {
  const width = desktop.clientWidth, height = desktop.clientHeight;
  const {scale,offsetX,offsetY,arch}=sceneGeometry(width,height);
  const scene = {left:offsetX, top:offsetY, width:1672*scale, height:941*scale};
  for (const [key,value] of Object.entries(scene)) desktop.style.setProperty('--scene-' + key, value + 'px');
  const entrance=document.querySelector('.arch-entry');
  Object.assign(entrance.style,{left:arch.x+'px',top:arch.y+'px',width:arch.width+'px',height:arch.height+'px'});
  const clipped=arch.x<0 || arch.x+arch.width>width || arch.y<0 || arch.y+arch.height>height;
  document.querySelector('.photography-fallback').hidden=!clipped;
  entrance.hidden=clipped;
  const values = {x:offsetX + 612 * scale, y:offsetY + 226 * scale, width:430 * scale, height:398 * scale, font:17 * scale};
  for (const [key,value] of Object.entries(values)) desktop.style.setProperty('--screen-' + key, value + 'px');
  // Project the UI rectangle onto the photographed screen plane.
  // Right edge starts 5% lower and ends 2% higher than the left edge.
  const perspective = 1 / .93;
  const horizontal = (perspective - 1) / values.width;
  const slope = .05 * values.height * perspective / values.width;
  desktop.style.setProperty('--screen-projection',
    `matrix3d(${perspective},${slope},0,${horizontal},0,1,0,0,0,0,1,0,0,0,0,1)`);

}
new ResizeObserver(alignScreen).observe(desktop);
alignScreen();

// Drag windows by their title bars and the star directly.
const movableWindows = [];
let topWindowLayer = 5;
for (const windowElement of document.querySelectorAll('.music, .utility-window, .star')) {
  const isStar = windowElement.classList.contains('star');
  const handle = isStar ? windowElement : windowElement.querySelector('.titlebar');
  if (isStar) windowElement.draggable = false;
  const position = { x: 0, y: 0 };
  let drag = null;
  handle.tabIndex = 0;
  handle.setAttribute('role', 'group');
  handle.setAttribute('aria-label', `${isStar ? '星星' : handle.firstChild.textContent.trim()}，拖动以移动，或使用方向键`);
  handle.title = isStar ? '拖动星星移动 · 方向键微调' : '拖动标题栏移动 · 方向键微调';
  function move(dx, dy) {
    if(windowElement.hidden)return;
    const bounds = windowElement.getBoundingClientRect();
    const area = desktop.getBoundingClientRect();
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    position.x += clamp(dx, area.left - bounds.left, area.right - bounds.right);
    position.y += clamp(dy, area.top - bounds.top, area.bottom - bounds.bottom);
    windowElement.style.translate = `${position.x}px ${position.y}px`;
  }
  function raise() { windowElement.style.zIndex = String(++topWindowLayer); }
  handle.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('button, a')) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    raise();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    handle.setPointerCapture(event.pointerId);
    windowElement.classList.add('dragging');
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    move(event.clientX - drag.x, event.clientY - drag.y);
    drag.x = event.clientX;
    drag.y = event.clientY;
  });
  function stop(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    windowElement.classList.remove('dragging');
    if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
  }
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
  handle.addEventListener('lostpointercapture', stop);
  handle.addEventListener('keydown', event => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[event.key]) return;
    event.preventDefault();
    raise();
    const step = event.shiftKey ? 20 : 5;
    move(directions[event.key][0] * step, directions[event.key][1] * step);
  });
  movableWindows.push(() => move(0, 0));
}
window.addEventListener('resize', () => requestAnimationFrame(() => movableWindows.forEach(clamp => clamp())));
