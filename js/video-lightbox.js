/**
 * ============================================================
 *  COWORKDOC — Video Lightbox
 *  js/video-lightbox.js
 *
 *  Click-to-play fullscreen video overlay for surgical
 *  demonstration videos. Supports both self-hosted MP4 files
 *  and YouTube embeds.
 *
 *  HOW TO USE IN HTML:
 *  Add class="video-slot" and data-src to any clickable
 *  video placeholder element:
 *
 *  Self-hosted:
 *  <div class="video-slot"
 *       data-src="assets/videos/turbilon-demo.mp4"
 *       data-poster="assets/posters/turbilon-poster.jpg"
 *       data-title="Turbilon — RF Turbinate Ablation"
 *       data-duration="3:42">
 *
 *  YouTube:
 *  <div class="video-slot"
 *       data-src="https://www.youtube.com/embed/PXQ1BV_uk4E"
 *       data-title="Turbilon — RF Turbinate Ablation"
 *       data-duration="3:42">
 *
 *  ATTRIBUTES:
 *  data-src       — MP4 path or YouTube embed URL (required)
 *  data-poster    — path to poster/thumbnail image (optional, MP4 only)
 *  data-title     — procedure title shown in overlay (optional)
 *  data-duration  — duration shown in overlay, e.g. "3:42" (optional)
 *
 *  EVENTS:
 *  The lightbox dispatches custom events on document:
 *  - 'lightbox:opened'  — when lightbox opens
 *  - 'lightbox:closed'  — when lightbox closes
 * ============================================================
 */

const VideoLightbox = (() => {

  let overlay = null;
  let videoEl = null;
  let isOpen = false;

  /**
   * Build and inject the lightbox overlay into the DOM.
   * Called once on first use.
   */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'video-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Surgical video player');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 500;
      background: rgba(4, 10, 20, 0.96);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      padding: 20px;
    `;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.id = 'lightbox-close';
    closeBtn.setAttribute('aria-label', 'Close video');
    closeBtn.style.cssText = `
      position: absolute;
      top: 24px;
      right: 28px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.7);
      font-size: 20px;
      transition: background 0.2s, color 0.2s;
      z-index: 10;
    `;
    closeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round">
        <path d="M1 1l16 16M17 1L1 17"/>
      </svg>
    `;
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.15)';
      closeBtn.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.background = 'rgba(255,255,255,0.08)';
      closeBtn.style.color = 'rgba(255,255,255,0.7)';
    });
    closeBtn.addEventListener('click', close);

    // Video info bar (title + duration)
    const infoBar = document.createElement('div');
    infoBar.id = 'lightbox-info';
    infoBar.style.cssText = `
      position: absolute;
      top: 24px;
      left: 28px;
      right: 80px;
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const titleEl = document.createElement('span');
    titleEl.id = 'lightbox-title';
    titleEl.style.cssText = `
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.75);
      letter-spacing: 0.02em;
    `;

    const durationEl = document.createElement('span');
    durationEl.id = 'lightbox-duration';
    durationEl.style.cssText = `
      font-family: 'Outfit', sans-serif;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.10);
      padding: 2px 8px;
      border-radius: 999px;
    `;

    infoBar.appendChild(titleEl);
    infoBar.appendChild(durationEl);

    // Video container
    const videoWrap = document.createElement('div');
    videoWrap.style.cssText = `
      position: relative;
      width: 100%;
      max-width: 960px;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    `;

    // Self-hosted video element
    videoEl = document.createElement('video');
    videoEl.id = 'lightbox-video';
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('controls', '');
    videoEl.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      object-fit: contain;
      background: #000;
    `;

    // YouTube iframe element
    const iframeEl = document.createElement('iframe');
    iframeEl.id = 'lightbox-iframe';
    iframeEl.setAttribute('frameborder', '0');
    iframeEl.setAttribute('allowfullscreen', '');
    iframeEl.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframeEl.style.cssText = `
      width: 100%;
      height: 100%;
      display: none;
      border: none;
    `;

    // Educational disclaimer strip below video
    const disclaimer = document.createElement('p');
    disclaimer.style.cssText = `
      margin-top: 14px;
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.22);
      text-align: center;
      max-width: 720px;
      line-height: 1.6;
    `;
    disclaimer.textContent =
      'Educational content for qualified healthcare professionals only. ' +
      'Not intended as medical advice or a substitute for professional clinical judgement.';

    // Keyboard shortcut hint
    const hint = document.createElement('p');
    hint.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 28px;
      font-family: 'Outfit', sans-serif;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.18);
    `;
    hint.textContent = 'Press ESC to close';

    videoWrap.appendChild(videoEl);
    videoWrap.appendChild(iframeEl);

    overlay.appendChild(closeBtn);
    overlay.appendChild(infoBar);
    overlay.appendChild(videoWrap);
    overlay.appendChild(disclaimer);
    overlay.appendChild(hint);

    document.body.appendChild(overlay);

    // Click outside video to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  /**
   * Open the lightbox with the given video source.
   */
  function open(src, options = {}) {
    if (!overlay) buildOverlay();

    const { poster = '', title = '', duration = '' } = options;

    const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
    const iframeEl = document.getElementById('lightbox-iframe');

    if (isYouTube) {
      // Show iframe, hide video element
      videoEl.style.display = 'none';
      videoEl.src = '';
      iframeEl.src = src + '?autoplay=1&rel=0';
      iframeEl.style.display = 'block';
    } else {
      // Show video element, hide iframe
      iframeEl.style.display = 'none';
      iframeEl.src = '';
      videoEl.style.display = 'block';
      videoEl.src = src;
      if (poster) videoEl.setAttribute('poster', poster);
      else videoEl.removeAttribute('poster');
    }

    // Update info bar
    const titleEl = document.getElementById('lightbox-title');
    const durationEl = document.getElementById('lightbox-duration');
    if (titleEl) titleEl.textContent = title;
    if (durationEl) {
      durationEl.textContent = duration;
      durationEl.style.display = duration ? 'inline' : 'none';
    }

    // Show overlay
    overlay.style.display = 'flex';
    isOpen = true;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Trap focus inside lightbox
    const closeBtn = document.getElementById('lightbox-close');
    if (closeBtn) closeBtn.focus();

    // Fade in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
      });
    });

    // Auto-play (MP4 only — YouTube handles its own autoplay via URL param)
    if (!isYouTube) {
      videoEl.play().catch(() => {
        // Autoplay blocked — video will play on user interaction via controls
      });
    }

    // Dispatch event
    document.dispatchEvent(new CustomEvent('lightbox:opened', {
      detail: { src, title }
    }));
  }

  /**
   * Close the lightbox and pause video.
   */
  function close() {
    if (!overlay || !isOpen) return;

    overlay.style.opacity = '0';
    isOpen = false;

    // Pause and clear video
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
    }

    // Stop YouTube iframe
    const iframeEl = document.getElementById('lightbox-iframe');
    if (iframeEl) {
      iframeEl.src = '';
      iframeEl.style.display = 'none';
    }

    // Restore body scroll
    document.body.style.overflow = '';

    // Hide after transition
    setTimeout(() => {
      if (overlay) overlay.style.display = 'none';
    }, 300);

    // Dispatch event — other JS listens to this to show toast
    document.dispatchEvent(new CustomEvent('lightbox:closed'));
  }

  /**
   * Attach click handlers to all .video-slot elements on the page.
   */
  function attachTriggers() {
    document.querySelectorAll('.video-slot[data-src]').forEach(slot => {
      // Avoid double-binding
      if (slot.dataset.lightboxBound) return;
      slot.dataset.lightboxBound = 'true';

      slot.style.cursor = 'pointer';
      slot.setAttribute('tabindex', '0');
      slot.setAttribute('role', 'button');
      slot.setAttribute('aria-label',
        `Play video: ${slot.dataset.title || 'Surgical demonstration'}`
      );

      const handleOpen = () => {
        open(slot.dataset.src, {
          poster:   slot.dataset.poster   || '',
          title:    slot.dataset.title    || 'Surgical Demonstration',
          duration: slot.dataset.duration || '',
        });
      };

      slot.addEventListener('click', handleOpen);

      // Keyboard: Enter or Space to open
      slot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      });
    });
  }

  /**
   * Keyboard handler — ESC closes the lightbox.
   */
  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  }

  /**
   * Initialise the lightbox system.
   */
  function init() {
    attachTriggers();
    document.addEventListener('keydown', handleKeydown);
  }

  // Public API
  return {
    init,
    open,
    close,
    attachTriggers,
  };

})();


/* ============================================================
 *  POST-VIDEO TOAST
 * ============================================================ */

function initVideoToast() {
  const toast = document.getElementById('video-toast');
  if (!toast) return;

  let toastTimer = null;

  document.addEventListener('lightbox:closed', () => {
    toast.classList.add('visible');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 8000);
  });

  toast.querySelectorAll('[data-toast-dismiss]').forEach(btn => {
    btn.addEventListener('click', () => {
      toast.classList.remove('visible');
      clearTimeout(toastTimer);
    });
  });
}


/* ============================================================
 *  STICKY CTA BAR
 * ============================================================ */

function initStickyCta() {
  const bar = document.getElementById('sticky-cta');
  if (!bar) return;

  try {
    if (sessionStorage.getItem('sticky_cta_dismissed') === 'true') {
      bar.classList.add('dismissed');
      return;
    }
  } catch (e) { /* silent */ }

  let shown = false;

  const onScroll = () => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const pct = scrolled / total;

    if (pct >= 0.60 && !shown) {
      bar.classList.add('visible');
      shown = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  const dismissBtn = bar.querySelector('.sticky-cta-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      bar.classList.add('dismissed');
      try {
        sessionStorage.setItem('sticky_cta_dismissed', 'true');
      } catch (e) { /* silent */ }
    });
  }
}


/* ============================================================
 *  NAV SCROLL SHADOW + HAMBURGER
 * ============================================================ */

function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  const hamburger = nav.querySelector('.nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  if (!hamburger || !drawer) return;

  hamburger.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';

    const lines = hamburger.querySelectorAll('span');
    if (isOpen) {
      lines[0].style.transform = 'translateY(7px) rotate(45deg)';
      lines[1].style.opacity = '0';
      lines[2].style.transform = 'translateY(-7px) rotate(-45deg)';
    } else {
      lines[0].style.transform = '';
      lines[1].style.opacity = '';
      lines[2].style.transform = '';
    }
  });

  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('.nav-links a, .nav-drawer a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}


/* ============================================================
 *  AUTO-INIT
 * ============================================================ */

function initAll() {
  VideoLightbox.init();
  initVideoToast();
  initStickyCta();
  initNav();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}