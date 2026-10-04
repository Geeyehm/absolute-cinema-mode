# Firefox Add-ons (AMO) submission

Submit at the AMO Developer Hub: **Submit a New Add-on**. Upload file: `dist/absolute-cinema-mode-1.0.3.zip` (build with `pwsh scripts/package.ps1`). It's the same package as Chrome; Chrome ignores the Firefox-only manifest keys.

## 1. How to distribute

**On this site** (listed on addons.mozilla.org).

## 2. Upload

- Upload the zip. The validator should report no errors or warnings (checked locally with `npx web-ext lint`).
- **Compatible platforms:** tick **Firefox** only. Leave **Firefox for Android** unticked: mobile Firefox gets the m.youtube.com site, which the extension doesn't change.

## 3. Source code

**Do you need to submit source code?** No. The package is the source: no build step, minification or bundling.

## 4. Describe your add-on

- **Name:** Absolute Cinema Mode for YouTube
- **Add-on URL:** `absolute-cinema-mode`
- **Summary (max 250 chars):**

```
Makes YouTube's Cinema mode fill the window, auto-hides the top bar, and docks live chat beside the video at the width you choose. Works on videos, livestreams and replays.
```

- **Description:**

```
Make YouTube's Cinema mode actually cinematic.

Press the Cinema mode button (or the T key) and Absolute Cinema Mode takes over the whole window:

• The video fills the window, edge to edge. Upcoming livestreams show their full thumbnail too.
• The YouTube top bar gets out of the way, and slides back when you move your mouse to the top of the screen. Scroll down and it stays put, like a normal header.
• Live chat and chat replay sit neatly to the right of the video, full height.
• Drag the chat's left edge to make it wider or narrower. Drag it all the way and the chat closes.
• Close the chat and the video takes the full width.
• Scroll down any time for the description, comments and recommendations.

Works on regular videos, livestreams and livestream replays.

Settings (click the toolbar icon):
• Turn the extension on or off
• Auto-enable Cinema mode on every video
• Auto-hide the top bar
• Twitch mode: on livestreams and replays, chat stays pinned to the side of the window, Twitch-style. The regular view keeps the title and buttons under the video, and Cinema mode becomes a no-scroll, video-and-chat-only view
• Chat view: always open Top chat or Live chat (or leave it to YouTube)
• Chat width in pixels (300–800, default 400)

No accounts, no tracking, no data collection. Your settings are stored in your browser.

Open source (MIT): https://github.com/Geeyehm/absolute-cinema-mode

Not affiliated with or endorsed by YouTube or Google.
```

- **Experimental:** No
- **Requires payment / non-free services:** No
- **Categories:** Photos, Music & Videos; Appearance
- **Support email:** leave empty, or use an address you're happy to publish (it's shown publicly)
- **Support website:** https://github.com/Geeyehm/absolute-cinema-mode/issues
- **License:** MIT License
- **Privacy policy:** No (the extension collects no data, declared in the manifest as `data_collection_permissions: none`)
- **Notes to reviewer:**

```
No build step: the uploaded files are the source (also at https://github.com/Geeyehm/absolute-cinema-mode).
Test: open any YouTube video or livestream and press T (Cinema mode). The player should fill the window, the top bar should hide until the mouse reaches the top edge, and live chat should dock on the right. Settings are in the toolbar popup.
The only permission is storage, for the settings. Content scripts run on www.youtube.com only.
```

## 5. After submitting: edit the listing

The icon comes from the manifest. On the add-on's **Edit Product Page**:

- **Screenshots:** upload `store/screenshot-1.png`. AMO shows screenshots at a 1.6:1 ratio, so it fits exactly.
- **Homepage:** https://github.com/Geeyehm/absolute-cinema-mode
- **Tags:** youtube, theater mode, live chat, video

## Review

The automated validation runs immediately, and listed add-ons usually go live within minutes to hours. A human reviewer may look at it later, even after it's public.
