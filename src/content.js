(() => {
  const root = document.documentElement;
  const HIDE_DELAY_MS = 400;

  let settings = { ...BCM_DEFAULTS };
  let flexy = null;
  let flexyObserver = null;
  let hideTimer = null;
  let settingsLoaded = false;
  let autoTheaterVideoId = null;

  // ---- Layout state ----

  function isWatchPage() {
    return location.pathname === '/watch' && flexy && !flexy.hidden;
  }

  function update() {
    const theater = settings.enabled && isWatchPage() && flexy.hasAttribute('theater');
    const chatOpen = theater && flexy.hasAttribute('live-chat-present-and-expanded');

    const changed =
      root.classList.contains('bcm-theater') !== theater ||
      root.classList.contains('bcm-chat-open') !== chatOpen;

    root.classList.toggle('bcm-theater', theater);
    root.classList.toggle('bcm-chat-open', chatOpen);
    root.classList.toggle('bcm-hide-masthead', settings.autoHideMasthead);
    root.style.setProperty('--bcm-chat-w', `${bcmClampChatWidth(settings.chatWidth)}px`);

    if (!theater) setMastheadShown(false);
    if (changed) nudgePlayerSize();
  }

  // The player computes its video size from its container; tell it the container changed.
  function nudgePlayerSize() {
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  function attachFlexy() {
    const found = document.querySelector('ytd-watch-flexy');
    if (found === flexy) return;
    flexyObserver?.disconnect();
    flexy = found;
    if (flexy) {
      flexyObserver = new MutationObserver(() => {
        update();
        maybeAutoTheater();
      });
      flexyObserver.observe(flexy, {
        attributes: true,
        attributeFilter: ['theater', 'live-chat-present-and-expanded', 'hidden'],
      });
    }
    update();
  }

  // ---- Auto-enable Cinema mode ----

  // Switch to Cinema mode once per video by pressing YouTube's own button, so YouTube's state stays
  // consistent. If the user turns it off again on that video, leave it off until the next video.
  function maybeAutoTheater() {
    if (!settingsLoaded || !settings.enabled || !settings.autoTheater || !isWatchPage()) return;
    const videoId = new URLSearchParams(location.search).get('v');
    if (!videoId || videoId === autoTheaterVideoId) return;
    autoTheaterVideoId = videoId;
    if (flexy.hasAttribute('theater') || document.fullscreenElement) return;

    // The player controls can render after the watch page; give the button a few seconds to appear.
    let tries = 0;
    const timer = setInterval(() => {
      const button = document.querySelector('#movie_player .ytp-size-button');
      if (flexy.hasAttribute('theater') || ++tries > 20) return clearInterval(timer);
      if (button) {
        clearInterval(timer);
        button.click();
      }
    }, 250);
  }

  // ---- Auto-hiding top bar ----

  function setMastheadShown(shown) {
    clearTimeout(hideTimer);
    root.classList.toggle('bcm-masthead-shown', shown);
  }

  function scheduleMastheadHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      const masthead = document.getElementById('masthead-container');
      // Keep it open while the user is typing in search or a menu is focused.
      if (masthead && (masthead.matches(':hover') || masthead.contains(document.activeElement))) return;
      root.classList.remove('bcm-masthead-shown');
    }, HIDE_DELAY_MS);
  }

  function setUpMasthead() {
    if (!document.getElementById('bcm-hot-zone')) {
      const hotZone = document.createElement('div');
      hotZone.id = 'bcm-hot-zone';
      hotZone.addEventListener('mouseenter', () => setMastheadShown(true));
      document.body.append(hotZone);
    }

    const masthead = document.getElementById('masthead-container');
    if (!masthead || masthead.dataset.bcmBound) return;
    masthead.dataset.bcmBound = '1';
    masthead.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    masthead.addEventListener('mouseleave', scheduleMastheadHide);
    masthead.addEventListener('focusin', () => setMastheadShown(true));
    masthead.addEventListener('focusout', scheduleMastheadHide);
  }

  // ---- Settings ----

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (key in BCM_DEFAULTS) settings[key] = newValue ?? BCM_DEFAULTS[key];
    }
    update();
    nudgePlayerSize();
    if (changes.autoTheater?.newValue) maybeAutoTheater();
  });

  // ---- Boot ----

  function onPageChange() {
    attachFlexy();
    setUpMasthead();
    maybeAutoTheater();
  }

  bcmLoadSettings().then((loaded) => {
    settings = loaded;
    settingsLoaded = true;
    update();
    maybeAutoTheater();
  });

  // YouTube is a single-page app: watch for the watch page being created and for in-app navigation.
  document.addEventListener('yt-navigate-finish', () => {
    bootObserver.disconnect();
    onPageChange();
  });
  const bootObserver = new MutationObserver(() => {
    if (document.querySelector('ytd-watch-flexy') && document.getElementById('masthead-container')) {
      onPageChange();
      bootObserver.disconnect();
    }
  });
  bootObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
