# Chrome Web Store submission

Everything to paste into the developer dashboard, by tab. Upload file: `dist/absolute-cinema-mode-1.0.3.zip` (build with `pwsh scripts/package.ps1`).

## Package tab

Upload the zip. Name, version, short description and icon come from `manifest.json`:

- **Name:** Absolute Cinema Mode for YouTube
- **Short description (from manifest, max 132 chars):** Makes YouTube's Cinema mode fill the window, auto-hide the top bar, and dock live chat to the right.

## Store listing tab

**Description:**

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

No accounts, no tracking, no data collection. Your settings are stored in your browser and synced by Chrome if you have sync turned on.

Not affiliated with or endorsed by YouTube or Google.
```

- **Category:** Fun
- **Language:** English
- **Store icon:** `icons/icon-128.png`
- **Screenshots:** `store/screenshot-1.png` (1280×800)
- **Small promo tile:** `store/promo-small.png` (440×280)
- **Marquee promo tile:** leave empty (optional)
- **Official URL / Homepage URL / Support URL:** leave empty, or add a GitHub repo link if you publish the source
- **Mature content:** No

## Privacy tab

**Single purpose:**

```
Improves YouTube's Cinema (theater) mode: the video fills the browser window, the top bar auto-hides, and live chat is docked beside the video at a user-chosen width.
```

**Permission justification: `storage`:**

```
Saves the user's settings for the extension (on/off, auto-enable Cinema mode, auto-hide top bar, chat view, chat width) so they persist between visits and apply across YouTube tabs.
```

**Host permission justification (content scripts on https://www.youtube.com/*):**

```
The extension only works on YouTube. Its content script changes the layout of YouTube watch pages when Cinema mode is on (resizing the player and positioning the live chat panel) and removes a stray border inside YouTube's chat replay frame. It does not read or transmit any page content.
```

**Are you using remote code?** No, I am not using remote code.

**Data usage:** tick none of the data categories (the extension collects nothing). Then tick all three certifications:

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** not required when no user data is collected; leave empty.

## Distribution tab

- **Payments:** Free
- **Visibility:** Public (or Unlisted for a soft launch: only people with the link can install)
- **Regions:** All regions

## Account tab (one-time)

- Publisher display name, contact email, and verify that email. The contact email is required before you can publish.
