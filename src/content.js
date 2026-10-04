(() => {
  const root = document.documentElement;
  const HIDE_DELAY_MS = 400;

  let settings = { ...BCM_DEFAULTS };
  let flexy = null;
  let flexyObserver = null;
  let hideTimer = null;
  let settingsLoaded = false;
  let autoTheaterVideoId = null;
  let resizeQueued = false;

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

    if (chatOpen) attachGrabber();
    if (!chatOpen) root.classList.remove('bcm-chat-collapsing');
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

  // ---- Chat width grabber ----

  // A handle on the chat's left edge. Dragging resizes the chat live; the width is saved on release
  // (sync storage limits how often it can be written). Dragging below the minimum width previews the
  // chat closed, and releasing there closes it with YouTube's own button so "Show chat" brings it back.
  function attachGrabber() {
    if (flexy.querySelector(':scope > #bcm-chat-grabber')) return;
    const grabber = document.getElementById('bcm-chat-grabber') || createGrabber();
    flexy.append(grabber);
  }

  function createGrabber() {
    const grabber = document.createElement('div');
    grabber.id = 'bcm-chat-grabber';
    grabber.title = 'Drag to resize chat';

    const onMove = (event) => {
      const rawWidth = flexy.getBoundingClientRect().right - event.clientX;
      const collapsing = rawWidth < BCM_CHAT_WIDTH_MIN;
      if (root.classList.contains('bcm-chat-collapsing') !== collapsing) {
        root.classList.toggle('bcm-chat-collapsing', collapsing);
        queuePlayerResize();
      }
      if (collapsing) return;
      const width = bcmClampChatWidth(rawWidth);
      if (width === settings.chatWidth) return;
      settings.chatWidth = width;
      root.style.setProperty('--bcm-chat-w', `${width}px`);
      queuePlayerResize();
    };

    const onEnd = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      window.removeEventListener('blur', onEnd);
      root.classList.remove('bcm-resizing-chat');
      chrome.storage.sync.set({ chatWidth: settings.chatWidth });
      if (root.classList.contains('bcm-chat-collapsing')) closeChat();
    };

    grabber.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      root.classList.add('bcm-resizing-chat');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
      window.addEventListener('blur', onEnd);
    });

    return grabber;
  }

  // update() clears the collapsed preview once YouTube reports the chat closed. If the button
  // isn't found or doesn't work, bring the chat back rather than leaving it invisible.
  function closeChat() {
    const chatDoc = document.getElementById('chatframe')?.contentDocument;
    const button =
      chatDoc?.querySelector('yt-live-chat-header-renderer #close-button button') ||
      document.querySelector('ytd-live-chat-frame#chat #show-hide-button button');
    button?.click();
    setTimeout(() => {
      if (!root.classList.contains('bcm-chat-collapsing')) return;
      root.classList.remove('bcm-chat-collapsing');
      nudgePlayerSize();
    }, 1000);
  }

  // One resize event per frame while dragging.
  function queuePlayerResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      window.dispatchEvent(new Event('resize'));
    });
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

  // Once the page is scrolled away from the player, keep the top bar shown like a normal sticky header.
  function updateScrolled() {
    root.classList.toggle('bcm-scrolled', window.scrollY > 0);
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

  window.addEventListener('scroll', updateScrolled, { passive: true });

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
    updateScrolled();
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
