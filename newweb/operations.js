window.OPERATIONS_CASES = {
  'mimoon-party': {
    title: 'Mimoon Party', subtitle: '海外社交平台运营', featured: true,
    activities: [{title: '活动 01', text: ''}, {title: '活动 02', text: ''}]
  },
  'merchant-operations': {title: '医美商家运营', subtitle: '本地生活 / 商家运营'},
  'bar-events': {title: '线下酒吧运营', subtitle: '线下活动策划与执行'},
  'jidaichufa': {
    title: '亟待出发', subtitle: '微信公众号内容运营', earlier: true,
    credit: '2020 年 · 团队项目', contribution: ''
  }
};

window.operationsViews = function (esc) {
  const entries = Object.entries(window.OPERATIONS_CASES);
  const sections = {
    overview: 'Project Overview · 项目概览',
    background: 'Background & Objectives · 项目背景与目标',
    role: 'My Role · 个人职责与参与范围',
    strategy: 'Strategy & Execution · 运营策略与执行',
    results: 'Results & Impact · 成果与数据',
    reflection: 'Reflection · 项目复盘',
    gallery: 'Gallery · 活动物料与图片'
  };
  function card([id, item]) {
    const route = '#operations/' + id;
    const cover = item.cover
      ? '<img src="' + esc(item.cover) + '" alt="">'
      : '<div class="ops-cover"><img src="assets/work.webp" alt=""></div>';
    return `<a class="explorer-card ops-card ${item.featured ? 'ops-featured' : ''}" href="${route}" data-route="${route}">
      ${cover}<h2>${esc(item.title)}</h2><p>${esc(item.subtitle)}</p>${item.credit ? '<small>' + esc(item.credit) + '</small>' : ''}</a>`;
  }
  function catalog() {
    return `<div class="explorer-catalog"><header><h1>Operations</h1></header>
      <div class="explorer-grid">${entries.filter(([,p]) => !p.earlier).map(card).join('')}</div>
      <h2 class="ops-earlier">Earlier Work</h2><div class="explorer-grid">${entries.filter(([,p]) => p.earlier).map(card).join('')}</div></div>`;
  }
  function detail(item) {
    const blocks = (item.sectionOrder || Object.keys(sections)).map(key => {
      const heading = item.sectionTitles?.[key] || sections[key] || key;
      let content = esc(item.copy?.[key] || '待补充');
      if (key === 'overview') content = esc(item.copy?.overview || item.subtitle);
      if (key === 'role' && 'contribution' in item) content = '个人贡献 · ' + esc(item.contribution || '待补充');
      if (key === 'strategy' && item.activities) content += '<ul>' + item.activities.map(activity =>
        '<li>' + esc(activity.title) + ' · ' + esc(activity.text || '待补充') + '</li>').join('') + '</ul>';
      if (key === 'gallery' && item.images?.length) content = item.images.map(img =>
        '<img loading="lazy" src="' + esc(img.src) + '" alt="' + esc(img.alt || '') + '">').join('');
      return '<section class="detail-section"><h2>' + esc(heading) + '</h2><div class="detail-copy">' + content + '</div></section>';
    });
    return `<article class="explorer-detail"><header><h1>${esc(item.title)}</h1><p>${esc(item.subtitle)}</p>${item.credit ? '<p>' + esc(item.credit) + '</p>' : ''}</header>${blocks.join('')}</article>`;
  }
  return {entries, catalog, detail};
};
