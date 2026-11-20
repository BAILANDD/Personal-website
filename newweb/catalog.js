const operations=new URLSearchParams(location.search).get('category')==='operations';
const category=operations?'Operations':'Design';
document.title=`${category} — My Portfolio`;
document.querySelector('#folder-title').textContent=`▣ ${category}`;
document.querySelector('#folder-path').textContent=`My Portfolio / ${category}`;
document.querySelector('#catalog-title').textContent=category;
document.querySelectorAll('.folder-tabs a')[operations?1:0].setAttribute('aria-current','page');
const items=document.querySelector('#catalog-items');
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
if(operations){
 document.querySelector('#catalog-description').textContent='围绕目标与问题，记录运营策略、执行过程和结果复盘。';
 items.innerHTML='<div class="case-structure" aria-label="运营案例阅读结构"><div>01 背景与目标<small>业务问题与项目目标</small></div><div>02 角色与职责<small>负责范围与协作关系</small></div><div>03 策略与行动<small>关键决策与执行过程</small></div><div>04 结果与复盘<small>结果证据与经验总结</small></div></div><section class="empty-state"><h2>案例正在整理中</h2><p>这里将按项目展示运营实践，完整记录从目标到复盘的过程。</p></section>';
 document.querySelector('#catalog-count').textContent='0 cases · 待更新';
}else{
 document.querySelector('#catalog-description').textContent='品牌、视觉与数字体验。打开一个项目，看看设计背后的故事。';
 items.className='design-grid';
 items.innerHTML=Object.entries(window.PORTFOLIO_PROJECTS).sort(([,a],[,b]) => (Number(b.year) || 0) - (Number(a.year) || 0)).map(([id,p])=>`<a class="project-card" href="project.html?project=${encodeURIComponent(id)}"><img src="${escape(p.thumbnail || p.hero.src)}" alt="${escape(p.hero.alt)}"><h2>${escape(p.title)} ↗</h2><p>${escape(p.subtitle)}</p><div class="card-meta"><span>${escape(p.type)}</span><span>${escape(p.year)}</span></div></a>`).join('');
 document.querySelector('#catalog-count').textContent=`${Object.keys(window.PORTFOLIO_PROJECTS).length} project · 点击封面打开详情`;
}
