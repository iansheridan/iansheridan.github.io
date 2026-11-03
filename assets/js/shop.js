/*
 * shop.js - Buy buttons for iansheridan.art
 *
 * Flow: buyer clicks "Buy" -> picks Style + Size in two drop-downs, then one Buy button -> this script asks the
 * checkout server (web-gallery on Vercel) for a Square payment page -> the
 * browser goes to Square. After paying, Square sends the buyer to /shop/thanks/.
 *
 * Request sent (matches web-gallery/api/create-checkout.js):
 *   POST {endpoint}  Content-Type: application/json
 *   { "artworkId": "<piece page name>", "type": "print" | "canvas" | "matted", "variantKey": "10x10" }
 * Response: { "checkoutUrl": "https://square.link/..." }
 *
 * No prices are sent: the server decides the price (and adds the flat shipping fee).
 */
(function () {
  'use strict';

  var config = window.SHOP_CONFIG || {};
  var busy = false;

  function setStatus(container, message) {
    var status = container.querySelector('.buy-status');
    if (status) status.textContent = message || '';
  }

  function setButtonsDisabled(container, disabled) {
    var els = container.querySelectorAll('.buy-go, select');
    for (var i = 0; i < els.length; i++) els[i].disabled = disabled;
  }

  function prices(container) {
    try { return JSON.parse(container.getAttribute('data-prices')); } catch (e) { return {}; }
  }

  // Refresh the Buy button text, e.g. "Buy Canvas 10×10 — $176"
  function updateChoice(container) {
    var p = prices(container);
    var type = container.querySelector('.buy-style').value;
    var size = container.querySelector('.buy-size-select').value;
    var t = p[type], v = t && t.sizes[size];
    var label = container.querySelector('.buy-choice');
    if (label && v) label.textContent = t.label + ' ' + v.label + ' \u2014 ' + v.price;
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
  // Called by showModal(src, img) on the home page: show the buy panel only for for-sale pieces.
  window.shopShowFor = function (img) {
    if (!modalBuy) return;
    var id = img && img.getAttribute && img.getAttribute('data-artwork-id');
    if (!id) { modalBuy.hidden = true; return; }
    var options = modalBuy.querySelector('.buy-options');
    options.setAttribute('data-artwork-id', id);
    setStatus(options, '');
    var piece = modalBuy.querySelector('.buy-dialog-piece');
    if (piece) piece.textContent = img.getAttribute('data-title') || '';
    modalBuy.hidden = false;
  };

  document.addEventListener('change', function (event) {
    var c = event.target.closest && event.target.closest('.buy-options');
    if (c) updateChoice(c);
  });

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var go = target.closest('.buy-go');
    if (go) {
      event.preventDefault();
      var c = go.closest('.buy-options');
      startCheckout(c, c.querySelector('.buy-style').value, c.querySelector('.buy-size-select').value, go);
    }
  });

  // Coming back with the browser Back button from Square: re-enable buttons.
  window.addEventListener('pageshow', function () {
    busy = false;
    var lists = document.querySelectorAll('.buy-options');
    for (var i = 0; i < lists.length; i++) {
      setButtonsDisabled(lists[i], false);
      updateChoice(lists[i]);
      setStatus(lists[i], '');
    }
  });
})();
