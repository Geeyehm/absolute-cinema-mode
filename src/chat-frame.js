// Runs inside the live chat and chat replay iframes (/live_chat, /live_chat_replay).
// Picks Top chat or Live chat from the chat's view menu when the chat loads, and marks <html> with
// bcm-enabled while the extension is on and bcm-page-chat-open while the page lays out the chat.
(() => {
  'use strict';

  // The view menu lists Top chat first and Live chat second, in every language.
  const ITEM_INDEX = { top: 0, live: 1 };
  const GIVE_UP_MS = 30000;

  let settings = { ...BCM_DEFAULTS };
  let observer = null;

  function viewItems() {
    return [...document.querySelectorAll('#view-selector a.yt-dropdown-menu')];
  }

  // Selects the wanted view. Returns false while the menu hasn't rendered yet.
  function trySelect() {
    const index = ITEM_INDEX[settings.chatMode];
    if (!settings.enabled || index === undefined) return true;
    const items = viewItems();
    if (items.length !== 2) return false;
    const item = items[index];
    if (item.getAttribute('aria-selected') !== 'true') item.click();
    return true;
  }

  function stopWaiting() {
    if (observer) observer.disconnect();
    observer = null;
  }

  function apply() {
    // Gates the rules in chat-messages.css.
    document.documentElement.classList.toggle('bcm-enabled', settings.enabled);
    stopWaiting();
    if (trySelect()) return;
    observer = new MutationObserver(() => {
      if (trySelect()) stopWaiting();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(stopWaiting, GIVE_UP_MS);
  }

  // Mirrors the page's bcm-chat-open (chat laid out by Cinema or Twitch mode) as bcm-page-chat-open,
  // which hides the chat's close button in favour of the button on the video (chat-messages.css).
  function watchPage() {
    let pageRoot;
    try {
      if (window.parent === window) return;
      pageRoot = window.parent.document.documentElement;
    } catch {
      return;
    }
    const sync = () =>
      document.documentElement.classList.toggle('bcm-page-chat-open', pageRoot.classList.contains('bcm-chat-open'));
    new MutationObserver(sync).observe(pageRoot, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  watchPage();

  bcmLoadSettings().then((loaded) => {
    settings = loaded;
    apply();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in BCM_DEFAULTS) settings[key] = newValue ?? BCM_DEFAULTS[key];
    }
    if ('chatMode' in changes || 'enabled' in changes) apply();
  });
})();
