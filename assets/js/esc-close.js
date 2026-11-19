// Esc closes the single-picture pop-up (#modal), the same as clicking outside it.
// Self-contained: remove this file and its <script> tags to undo.
(function () {
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    var modal = document.getElementById('modal');
    if (!modal || !modal.classList.contains('active')) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    // Don't leave keyboard focus on a hidden Buy button.
    if (document.activeElement && modal.contains(document.activeElement)) document.activeElement.blur();
    if (typeof window.hideModal === 'function') window.hideModal();
    else modal.classList.remove('active');
  });
})();
