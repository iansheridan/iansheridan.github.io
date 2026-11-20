// Home page: sticky bottom bar that shows where you are in "Shop the work".
// Self-contained: remove this file, its <script> tag and the "Crumb bar" CSS to undo.
(function () {
  var shopHead = document.getElementById('shop-the-work');
  var groups = Array.prototype.slice.call(document.querySelectorAll('.shop-group'));
  if (!shopHead || !groups.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var modal = document.getElementById('modal');

  var bar = document.createElement('nav');
  bar.className = 'crumb-bar';
  bar.setAttribute('aria-label', 'Where you are in Shop the work');
  bar.innerHTML =
    '<div class="crumb-inner">' +
      '<span class="crumb-root">Shop the work<span class="crumb-sep"> › </span></span>' +
      '<a href="#shop-the-work" class="crumb-group"></a>' +
      '<span class="crumb-sep crumb-sep-2"> › </span>' +
      '<a href="#shop-the-work" class="crumb-coll"></a>' +
    '</div>';
  document.body.appendChild(bar);
  document.body.classList.add('has-crumb');

  var inner = bar.querySelector('.crumb-inner');
  var groupBtn = bar.querySelector('.crumb-group');
  var collBtn = bar.querySelector('.crumb-coll');
  var sep2 = bar.querySelector('.crumb-sep-2');
  var groupTarget = null, collTarget = null, last = '';

  // Line in the screen that counts as "here": a bit above the middle.
  function line() { return window.innerHeight * 0.45; }

  function update() {
    var y = line();
    var lastGroup = groups[groups.length - 1];
    // Show once the section heading is near the middle, and hide as soon as the
    // last row of art has scrolled above the bar (so it never sits over NFTs/contact).
    var inShop = shopHead.getBoundingClientRect().top < y &&
                 lastGroup.getBoundingClientRect().bottom > window.innerHeight - bar.offsetHeight;
    var popup = modal && modal.classList.contains('active');

    var g = groups[0];
    groups.forEach(function (el) { if (el.getBoundingClientRect().top < y) g = el; });
    var heads = g.querySelectorAll('h2');
    var c = heads[0] || null;
    Array.prototype.forEach.call(heads, function (h) { if (h.getBoundingClientRect().top < y) c = h; });

    var gTitle = g.querySelector('.shop-group-title');
    groupTarget = gTitle || g;
    collTarget = c;
    var key = (gTitle ? gTitle.textContent : '') + '|' + (c ? c.textContent : '');
    if (key !== last) {
      last = key;
      groupBtn.textContent = gTitle ? gTitle.textContent.trim() : '';
      collBtn.textContent = c ? c.textContent.trim() : '';
      collBtn.hidden = sep2.hidden = !c;
      if (groupTarget.id) groupBtn.setAttribute('href', '#' + groupTarget.id);
      else if (g.id) groupBtn.setAttribute('href', '#' + g.id);
      if (c && c.id) collBtn.setAttribute('href', '#' + c.id);
      fit();
    }

    var show = inShop && !popup;
    bar.classList.toggle('is-shown', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    groupBtn.tabIndex = collBtn.tabIndex = show ? 0 : -1;
  }

  // If the full line doesn't fit, drop "Shop the work ›"; CSS then truncates with "…".
  function fit() {
    inner.classList.remove('is-short');
    if (inner.scrollWidth > inner.clientWidth + 1) inner.classList.add('is-short');
  }

  function go(el) {
    if (el) el.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  }
  groupBtn.addEventListener('click', function (e) { e.preventDefault(); go(groupTarget); });
  collBtn.addEventListener('click', function (e) { e.preventDefault(); go(collTarget); });

  // IntersectionObserver drives the updates as headings and galleries move through the screen.
  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }
  if ('IntersectionObserver' in window) {
    var steps = [];
    for (var i = 0; i <= 20; i++) steps.push(i / 20);
    var io = new IntersectionObserver(schedule, { threshold: steps });
    io.observe(shopHead);
    groups.forEach(function (el) {
      io.observe(el);
      Array.prototype.forEach.call(el.querySelectorAll('.shop-group-title, h2, .gallery'), function (n) { io.observe(n); });
    });
  }
  // Backup for fast flings past small headings.
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () { fit(); schedule(); });
  if (modal && 'MutationObserver' in window) {
    new MutationObserver(schedule).observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
  // iOS Safari ignores user-scalable=no. After a pinch or double-tap zoom, a fixed bar stays
  // at the bottom of the page view instead of the screen. While zoomed, pin it to the visible bottom.
  var vv = window.visualViewport, pinned = false;
  function pin() {
    // Does nothing (no style writes) unless the page is zoomed, or was and just stopped being.
    if (vv.scale > 1.01) {
      bar.style.transform = 'translate(' + vv.offsetLeft + 'px,' + (vv.offsetTop + vv.height - window.innerHeight) +
        'px) scale(' + (1 / vv.scale) + ')';
      pinned = true;
    } else if (pinned) {
      bar.style.transform = '';
      pinned = false;
    }
  }
  if (vv) {
    vv.addEventListener('resize', pin);
    vv.addEventListener('scroll', pin);
  }
  update();
})();
