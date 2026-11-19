/*
 * shop.js - Buy buttons for iansheridan.art
 *
 * Flow: buyer clicks a Buy button for a size (e.g. "Buy 10×10 — $100") ->
 * this script asks the checkout server (web-gallery on Vercel) for a Square
 * payment page -> the browser goes to Square. After paying, Square sends the
 * buyer to /shop/thanks/.
 *
 * Request sent (matches web-gallery/api/create-checkout.js):
 *   POST {endpoint}  Content-Type: application/json
 *   { "artworkId": "<piece page name>", "type": "print", "variantKey": "10x10" }
 * Response: { "checkoutUrl": "https://square.link/..." }
 *
 * No prices are sent: the server decides the price (and adds the flat shipping fee).
 *
 * The Buy panel is shown only for square images (within 2%:
 * abs(width - height) / max(width, height) <= 0.02), using dimensions stored
 * at build time and a runtime check of naturalWidth/naturalHeight.
 */
(function () {
  'use strict';

  var SQUARE_TOLERANCE = 0.02;
  var config = window.SHOP_CONFIG || {};
  var busy = false;

  function setStatus(container, message) {
    var status = container.querySelector('.buy-status');
    if (status) status.textContent = message || '';
  }

  function setButtonsDisabled(container, disabled) {
    var els = container.querySelectorAll('.buy-go');
    for (var i = 0; i < els.length; i++) els[i].disabled = disabled;
  }

  // 2% tolerance; if the image has not loaded yet, trust the build-time data-artwork-id.
  function isVisuallySquare(img) {
    if (!img) return false;
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return true;
    return Math.abs(w - h) / Math.max(w, h) <= SQUARE_TOLERANCE;
  }

  function showProblem(container) {
    var email = config.email || '';
    var status = container.querySelector('.buy-status');
    if (!status) return;
    status.textContent = 'Sorry, checkout is not working right now. ';
    if (email) {
      var link = document.createElement('a');
      link.href = 'mailto:' + email;
      link.textContent = 'Email ' + email + ' to buy.';
      status.appendChild(link);
    }
  }

  // Google Analytics: tell GA a buyer is starting checkout. Never blocks or breaks checkout:
  // if GA is blocked or fails, this quietly does nothing. Google's script sends any waiting
  // events when the page unloads, so the hit still goes out as the buyer moves to Square.
  function trackBeginCheckout(container, artworkId, variantKey, button) {
    try {
      if (typeof window.gtag !== 'function') return;
      var wrap = container.parentNode;
      var titleEl = (wrap && wrap.querySelector('.buy-dialog-piece')) || document.querySelector('.piece h2');
      var name = (titleEl && titleEl.textContent || '').trim() || artworkId;
      var price = Number(button && button.getAttribute('data-price')) || 0;
      window.gtag('event', 'begin_checkout', {
        currency: 'USD',
        value: price,
        items: [{ item_id: artworkId, item_name: name, item_variant: variantKey, item_category: 'Fine Art Print', price: price, quantity: 1 }],
        piece_name: name,
        size: variantKey,
        price: price
      });
    } catch (e) { /* analytics must never break checkout */ }
  }

  function startCheckout(container, type, variantKey, button) {
    if (busy) return; // ignore double clicks
    var artworkId = container.getAttribute('data-artwork-id');
    if (!artworkId || !type || !variantKey || !config.endpoint) {
      showProblem(container);
      return;
    }

    busy = true;
    setButtonsDisabled(container, true);
    if (button) button.classList.add('is-loading');
    setStatus(container, 'Opening secure checkout\u2026');

    fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId: artworkId, type: type, variantKey: variantKey })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok || !data.checkoutUrl) throw new Error(data.error || ('HTTP ' + res.status));
          return data;
        });
      })
      .then(function (data) {
        trackBeginCheckout(container, artworkId, variantKey, button);
        window.location.assign(data.checkoutUrl);
      })
      .catch(function (err) {
        if (window.console) console.error('Checkout failed:', err);
        busy = false;
        setButtonsDisabled(container, false);
        if (button) button.classList.remove('is-loading');
        showProblem(container);
      });
  }

  var modalBuy = document.getElementById('modal-buy');
  // Called by showModal(src, img) on the home page: show the buy panel only for for-sale square pieces.
  window.shopShowFor = function (img) {
    if (!modalBuy) return;
    var id = img && img.getAttribute && img.getAttribute('data-artwork-id');
    if (!id || !isVisuallySquare(img)) { modalBuy.hidden = true; return; }
    var options = modalBuy.querySelector('.buy-options');
    options.setAttribute('data-artwork-id', id);
    setStatus(options, '');
    var piece = modalBuy.querySelector('.buy-dialog-piece');
    if (piece) piece.textContent = img.getAttribute('data-title') || '';
    modalBuy.hidden = false;
    if (img && !img.naturalWidth && !img.complete) {
      img.addEventListener('load', function onLoad() {
        img.removeEventListener('load', onLoad);
        if (modalBuy && !modalBuy.hidden && !isVisuallySquare(img)) modalBuy.hidden = true;
      });
    }
  };

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var go = target.closest('.buy-go');
    if (go) {
      event.preventDefault();
      var c = go.closest('.buy-options');
      startCheckout(c, go.getAttribute('data-type') || (c && c.getAttribute('data-type')), go.getAttribute('data-variant'), go);
    }
  }, true); // capture: the pop-up panel stops clicks from bubbling (so it doesn't close the pop-up)

  // Coming back with the browser Back button from Square: re-enable buttons.
  window.addEventListener('pageshow', function () {
    busy = false;
    var lists = document.querySelectorAll('.buy-options');
    for (var i = 0; i < lists.length; i++) {
      setButtonsDisabled(lists[i], false);
      setStatus(lists[i], '');
    }
  });
})();
