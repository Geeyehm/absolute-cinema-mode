// Runs in the page itself (world: MAIN), so it can change how YouTube's own code moves elements.
// Switching between Cinema and regular mode, YouTube moves #chat-container to another parent with
// appendChild/insertBefore, and moving an iframe that way reloads the chat. moveBefore moves it
// without reloading. Only active while content.js marks <html> with bcm-enabled.
(() => {
  'use strict';
  if (!('moveBefore' in Element.prototype)) return;

  const root = document.documentElement;
  const proto = Node.prototype;
  let ourAppendChild = null;
  let ourInsertBefore = null;

  function tryMove(parent, node, ref) {
    if (node?.id !== 'chat-container' || !root.classList.contains('bcm-enabled')) return false;
    if (!node.isConnected || !parent.isConnected) return false;
    try {
      parent.moveBefore(node, ref);
      return true;
    } catch {
      return false;
    }
  }

  // YouTube's web components polyfill replaces these methods while the page loads, calling the
  // browser's originals directly, so wrap whatever is there again once it has.
  function wrap() {
    if (proto.appendChild !== ourAppendChild) {
      const appendChild = proto.appendChild;
      ourAppendChild = function (node) {
        return tryMove(this, node, null) ? node : appendChild.call(this, node);
      };
      proto.appendChild = ourAppendChild;
    }
    if (proto.insertBefore !== ourInsertBefore) {
      const insertBefore = proto.insertBefore;
      ourInsertBefore = function (node, ref) {
        return tryMove(this, node, ref ?? null) ? node : insertBefore.call(this, node, ref);
      };
      proto.insertBefore = ourInsertBefore;
    }
  }

  wrap();
  document.addEventListener('DOMContentLoaded', wrap);
  window.addEventListener('load', wrap);
  document.addEventListener('yt-navigate-finish', wrap);
})();
