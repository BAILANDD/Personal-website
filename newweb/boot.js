(() => {
  const root = document.documentElement;
  if (!root.classList.contains('booting')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const sources = [...document.querySelectorAll('link[data-layer]')].map(link => {
    const image = new Image();
    image.src = link.href;
    return {image, layer: link.dataset.layer};
  });
  for (const image of document.querySelectorAll('.desktop img')) sources.push({image});

  async function prepare({image, layer}) {
    try {
      await image.decode();
    } catch {
      const original = layer === 'scene' ? 'assets/背景2.png'
        : image.src.replace(/\.webp$/, '.png');
      image.src = original;
      await image.decode();
      if (layer) root.style.setProperty('--home-' + layer, 'url("' + original + '")');
    }
  }
  const animationReady = Promise.race([
    Promise.allSettled([...document.querySelectorAll('.dialing-window img')].map(image => image.decode())),
    delay(1000)
  ]).then(() => {
    if (reduced.matches || !root.classList.contains('booting')) return;
    return new Promise(resolve => {
      const lastDot = document.querySelector('.dialing-dots i:last-child');
      lastDot.addEventListener('animationend', resolve, {once: true});
      root.classList.add('dialing-running');
    });
  });
  Promise.race([
    Promise.all([Promise.allSettled(sources.map(prepare)), animationReady]),
    delay(8500)
  ]).then(() => {
    if (!root.classList.contains('booting')) return;
    root.classList.remove('booting');
    root.classList.remove('dialing-running');
    if (reduced.matches) return;
    root.classList.add('revealing');
    setTimeout(() => root.classList.remove('revealing'), 750);
  });
})();
