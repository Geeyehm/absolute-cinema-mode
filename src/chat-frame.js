// Runs inside the live chat and chat replay iframes (/live_chat, /live_chat_replay).
// Picks Top chat or Live chat from the chat's view menu when the chat loads.
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
    stopWaiting();
    if (trySelect()) return;
    observer = new MutationObserver(() => {
      if (trySelect()) stopWaiting();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(stopWaiting, GIVE_UP_MS);
  }

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
