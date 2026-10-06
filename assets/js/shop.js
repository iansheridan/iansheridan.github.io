/*
 * shop.js - Buy buttons for iansheridan.art
 *
 * Flow: buyer clicks "Buy print" -> picks a size -> this script asks the
 * checkout server (web-gallery on Vercel) for a Square payment page -> the
 * browser goes to Square. After paying, Square sends the buyer to /shop/thanks/.
 *
 * Request sent (matches web-gallery/api/create-checkout.js):
 *   POST {endpoint}  Content-Type: application/json
 *   { "artworkId": "<piece page name>", "type": "print", "variantKey": "8x10" }
 * Response: { "checkoutUrl": "https://square.link/..." }
 *
 * No prices are sent: the server decides the price.
 */
(function () {
  'use strict';

  var config = window.SHOP_CONFIG || {};
  var dialog = document.getElementById('buy-dialog');
  var busy = false;

  function setStatus(container, message) {
    var status = container.querySelector('.buy-status');
    if (status) status.textContent = message || '';
  }

  function setButtonsDisabled(container, disabled) {
    var buttons = container.querySelectorAll('.buy-size');
    for (var i = 0; i < buttons.length; i++) buttons[i].disabled = disabled;
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

  function startCheckout(container, variantKey, button) {
    if (busy) return; // ignore double clicks
    var artworkId = container.getAttribute('data-artwork-id');
    var type = container.getAttribute('data-product-type') || 'print';
    if (!artworkId || !variantKey || !config.endpoint) {
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

  function openDialog(artworkId, title) {
    if (!dialog) return;
    var options = dialog.querySelector('.buy-options');
    options.setAttribute('data-artwork-id', artworkId);
    setStatus(options, '');
    var piece = dialog.querySelector('.buy-dialog-piece');
    if (piece) piece.textContent = title || '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    var first = dialog.querySelector('.buy-size');
    if (first) first.focus();
  }

  function closeDialog() {
    if (!dialog || busy) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    var opener = target.closest('[data-buy-open]');
    if (opener) {
      event.preventDefault();
      openDialog(opener.getAttribute('data-artwork-id'), opener.getAttribute('data-title'));
      return;
    }

    var size = target.closest('.buy-size');
    if (size) {
      event.preventDefault();
      startCheckout(size.closest('.buy-options'), size.getAttribute('data-variant'), size);
      return;
    }

    if (target.closest('[data-buy-close]') || target === dialog) {
      // a click on the dark area around the dialog also closes it
      closeDialog();
    }
  });

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
