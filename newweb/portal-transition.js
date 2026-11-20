(() => {
  const desktop = document.querySelector('.desktop');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let trip;

  function reset() {
    if (!trip) return;
    cancelAnimationFrame(trip.frame);
    trip.zoom?.cancel();
    trip.overlay.remove();
    trip.gallery.remove();
    window.removeEventListener('message', trip.onGalleryReady);
    trip.glow.remove();
    document.documentElement.classList.remove('portal-in-transit');
    trip = undefined;
  }

  // Back may restore the departure frame from the browser's page cache.
  window.addEventListener('pageshow', reset);

  for (const link of document.querySelectorAll('.arch-entry a, .photography-fallback')) {
    link.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
          event.ctrlKey || event.shiftKey || event.altKey ||
          reducedMotion.matches || document.body.classList.contains('paused') ||
          !Element.prototype.animate) return;
      event.preventDefault();
      if (trip) return;

      const target = (link.querySelector('path') || link).getBoundingClientRect();
      const x = target.left + target.width / 2;
      const y = target.top + target.height * .63;
      const origin = `${x}px ${y}px`;
      const radius = Math.ceil(Math.hypot(innerWidth, innerHeight));
      const overlay = document.createElement('div');
      overlay.className = 'portal-travel';
      overlay.style.clipPath = `circle(0px at ${origin})`;
      overlay.setAttribute('aria-hidden', 'true');

      const vault = document.createElement('canvas');
      const glow = document.createElement('div');
      glow.className = 'portal-gate-glow';
      const paintVault = window.createPortalTunnel?.(vault, {grid: true});
      if (!paintVault) {
        location.assign(link.getAttribute('href'));
        return;
      }
      const destination = new URL(link.getAttribute('href'), location.href);
      const galleryOrigin = destination.protocol === 'file:' ? 'null' : destination.origin;
      const gallery = document.createElement('iframe');
      gallery.className = 'portal-gallery';
      gallery.title = 'Photography';
      gallery.setAttribute('aria-hidden', 'true');
      gallery.tabIndex = -1;
      let galleryReady = false;
      function onGalleryReady(event) {
        if (event.source === gallery.contentWindow && event.origin === galleryOrigin &&
            event.data === 'photography-ready') galleryReady = true;
      }
      window.addEventListener('message', onGalleryReady);
      const previewUrl = new URL(destination);
      previewUrl.searchParams.set('preview', 'portal');
      gallery.src = previewUrl.href;
      document.body.append(gallery, overlay, glow);
      overlay.append(vault);
      document.documentElement.classList.add('portal-in-transit');

      const flightDuration = 2670;
      const exitDuration = 1000;
      const maxGalleryWait = 6500;
      const revealDuration = 1120;
      const zoom = desktop.animate([
        {transform: 'scale(1)', transformOrigin: origin},
        {transform: 'scale(2.1)', transformOrigin: origin}
      ], {duration: revealDuration, easing: 'ease-in', fill: 'forwards'});
      const current = trip = {overlay, glow, zoom, gallery, onGalleryReady};
      const start = performance.now();
      let exitStart;
      function frame(now) {
        if (trip !== current) return;
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / (flightDuration + exitDuration));
        const reveal = Math.min(1, elapsed / revealDuration);
        const spread = reveal * reveal * (3 - 2 * reveal);
        const cx = x + (innerWidth / 2 - x) * spread;
        const cy = y + (innerHeight / 2 - y) * spread;
        const size = radius * .6 * spread;
        overlay.style.clipPath = reveal < 1 ? `circle(${size}px at ${cx}px ${cy}px)` : 'none';
        glow.style.opacity = Math.max(0, Math.min(1, reveal * 8, (1 - reveal) * 4));
        Object.assign(glow.style, {left: cx+'px', top: cy+'px', width: size*2+'px', height: size*2+'px'});
        paintVault(progress);
        vault.style.filter = `brightness(${1 + Math.max(0, progress - .87) * 2.2})`;
        if (galleryReady && elapsed >= flightDuration) {
          exitStart ??= now;
          const exit = Math.min(1, (now - exitStart) / exitDuration);
          const fade = exit * exit * (3 - 2 * exit);
          gallery.style.visibility = 'visible';
          overlay.style.opacity = 1 - fade;
          if (exit === 1) {
            location.assign(destination.href);
            return;
          }
        } else if (elapsed >= flightDuration + maxGalleryWait) {
          location.assign(destination.href);
          return;
        }
        current.frame = requestAnimationFrame(frame);
      }
      frame(start);
    });
  }
})();
