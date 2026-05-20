(function () {
  /* ── Dropdown ── */
  var wrap = document.getElementById('ent-dd-wrap');
  var trigger = document.getElementById('ent-dd-trigger');
  if (wrap && trigger) {
    function open() {
      wrap.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close() {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      wrap.classList.contains('open') ? close() : open();
    });
    wrap.addEventListener('mouseenter', open);
    wrap.addEventListener('mouseleave', close);
    document.addEventListener('click', function () { close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ── Hamburger reset on drawer link click ──
     video-lightbox.js already closes the drawer; this resets the
     hamburger icon/aria for same-page anchor navigation where
     the page doesn't reload and the icon stays stuck as ✕. */
  var hamburger = document.querySelector('.nav-hamburger');
  var drawer = document.getElementById('nav-drawer');
  if (hamburger && drawer) {
    drawer.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        hamburger.setAttribute('aria-expanded', 'false');
        var lines = hamburger.querySelectorAll('span');
        lines[0].style.transform = '';
        lines[1].style.opacity = '';
        lines[2].style.transform = '';
      });
    });
  }
})();
