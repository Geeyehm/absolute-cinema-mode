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
  let infoObserver = null;

  // ---- Layout state ----

  function isWatchPage() {
    return location.pathname === '/watch' && flexy && !flexy.hidden;
  }

  function update() {
    const watch = settings.enabled && isWatchPage();
    const theater = watch && flexy.hasAttribute('theater');
    // Twitch mode only applies to livestreams and replays, which YouTube marks with should-stamp-chat
    // (still set while the chat is closed).
    const twitch = watch && settings.twitchMode && flexy.hasAttribute('should-stamp-chat');
    const chatOpen = (theater || twitch) && flexy.hasAttribute('live-chat-present-and-expanded');

    const enteringTwitchTheater =
      twitch && theater && !(root.classList.contains('bcm-twitch') && root.classList.contains('bcm-theater'));
    const changed =
      root.classList.contains('bcm-theater') !== theater ||
      root.classList.contains('bcm-twitch') !== twitch ||
      root.classList.contains('bcm-chat-open') !== chatOpen;

    root.classList.toggle('bcm-theater', theater);
    root.classList.toggle('bcm-twitch', twitch);
    root.classList.toggle('bcm-chat-open', chatOpen);
    // Twitch mode's Cinema view never shows the top bar, whatever the auto-hide setting.
    root.classList.toggle('bcm-hide-masthead', settings.autoHideMasthead || (twitch && theater));
    root.style.setProperty('--bcm-chat-w', `${bcmClampChatWidth(settings.chatWidth)}px`);

    if (chatOpen) attachGrabber();
    if (!chatOpen) root.classList.remove('bcm-chat-collapsing');
    if (twitch) {
      measureInfo();
      if (!chatOpen) attachShowChatButton();
    }
    // Twitch mode's Cinema view doesn't scroll; start it at the top.
    if (enteringTwitchTheater) window.scrollTo(0, 0);
    if (!theater || (twitch && theater)) setMastheadShown(false);
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
        attributeFilter: ['theater', 'live-chat-present-and-expanded', 'should-stamp-chat', 'hidden'],
      });
    }
    update();
  }

  // ---- Twitch mode ----

  // The regular view sizes the player so the title and the channel/buttons row fit below it on the
  // first screen. Their height changes with the title length and window width, so measure it.
  function measureInfo() {
    const metadata = flexy.querySelector('ytd-watch-metadata');
    const title = metadata?.querySelector('#title');
    const row = metadata?.querySelector('#top-row');
    if (!title || !row) return;
    infoObserver ??= new ResizeObserver(() => {
      if (root.classList.contains('bcm-twitch')) measureInfo();
    });
    infoObserver.observe(title);
    infoObserver.observe(row);

    const height = Math.ceil(row.getBoundingClientRect().bottom - title.getBoundingClientRect().top);
    if (height <= 0) return;
    const value = `${height}px`;
    if (root.style.getPropertyValue('--bcm-info-h') === value) return;
    root.style.setProperty('--bcm-info-h', value);
    nudgePlayerSize();
  }

  // With the chat closed, YouTube's own Show chat button ends up out of reach (below the comments, or
  // hidden in Cinema mode), so put one on the corner of the video like Twitch does. It presses
  // YouTube's button, and borrows its label so it matches the page language.
  function attachShowChatButton() {
    let button = document.getElementById('bcm-show-chat');
    if (!button) {
      button = document.createElement('button');
      button.id = 'bcm-show-chat';
      button.type = 'button';
      button.addEventListener('click', () => youTubeShowChatButton()?.click());
    }
    button.textContent = youTubeShowChatButton()?.textContent.trim() || 'Show chat';
    if (button.parentElement !== flexy) flexy.append(button);
  }

  function youTubeShowChatButton() {
    return flexy.querySelector('ytd-live-chat-frame#chat #show-hide-button button');
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
      const chatRight = (flexy.querySelector('#chat-container') || flexy).getBoundingClientRect().right;
      const rawWidth = chatRight - event.clientX;
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
    if (root.classList.contains('bcm-twitch') && root.classList.contains('bcm-theater')) shown = false;
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
