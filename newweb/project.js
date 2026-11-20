const projectId = new URLSearchParams(location.search).get('project') || 'tastoid';
const project = window.PORTFOLIO_PROJECTS[projectId];
const article = document.querySelector('#project-content');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
if (!project) {
  document.title = '未找到作品 — My Portfolio';
  article.innerHTML = '<h1>File not found</h1><p>这个作品尚未收录。</p><a href="project.html?project=tastoid">查看 TASTOID →</a>';
} else {
  document.title = `${project.title} — My Portfolio`;
  document.querySelector('meta[name="description"]').content = project.sections[0]?.copy || project.subtitle;
  document.querySelector('#window-name').textContent = `▧ ${project.title}.project`;
  document.querySelector('#breadcrumb').textContent = project.title;
  document.querySelector('#file-name').textContent = project.title;
  document.querySelector('#file-status').textContent = `${project.sections.length} sections · ${project.imageCount} images`;
  article.innerHTML = `<header class="project-heading"><div><p class="eyebrow">SELECTED WORK / DESIGN</p><h1>${escape(project.title)}</h1><p class="subtitle">${escape(project.subtitle)}</p></div><span class="year">${escape(project.year)}</span></header>` + project.bodyHtml;
  article.querySelectorAll('.detail-section').forEach((section,i) => {
    section.id = `section-${i}`;
    const heading=section.querySelector('h2');
    heading.classList.add('section-heading');
    const number=document.createElement('span');
    number.className='section-number';number.textContent=String(i+1).padStart(2,'0');
    heading.prepend(number);
  });
  article.querySelectorAll('img').forEach((image,i) => {
    image.loading=i===0?'eager':'lazy';image.decoding='async';
    const button=document.createElement('button');button.className='artwork';
    button.setAttribute('aria-label',`放大查看：${image.alt}`);
    image.replaceWith(button);button.append(image);
  });
  document.querySelector('#contents').innerHTML = project.sections.map((section,i) => `<a href="#section-${i}"><span>${String(i+1).padStart(2,'0')}</span>${escape(section.title)}</a>`).join('');
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top-b.boundingClientRect.top)[0];
    if (!visible) return;
    document.querySelectorAll('#contents a').forEach(a => {
      if (a.hash === '#' + visible.target.id) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
  }, { rootMargin: '-5% 0px -55% 0px' });
  document.querySelectorAll('.detail-section').forEach(section => observer.observe(section));
}
const viewer = document.querySelector('#image-viewer');
article.addEventListener('click', event => {
  const button = event.target.closest('.artwork');
  if (!button) return;
  const image = button.querySelector('img');
  viewer.querySelector('img').src = image.src;
  viewer.querySelector('img').alt = image.alt;
  viewer.querySelector('p').textContent = image.alt;
  viewer.showModal();
});
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
