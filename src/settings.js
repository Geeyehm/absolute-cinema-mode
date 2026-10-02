// Shared between the content script and the popup.
const BCM_DEFAULTS = {
  enabled: true,
  autoTheater: false,
  autoHideMasthead: true,
  chatWidth: 400,
};

const BCM_CHAT_WIDTH_MIN = 200;
const BCM_CHAT_WIDTH_MAX = 800;

function bcmClampChatWidth(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return BCM_DEFAULTS.chatWidth;
  return Math.min(BCM_CHAT_WIDTH_MAX, Math.max(BCM_CHAT_WIDTH_MIN, n));
}

function bcmLoadSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(BCM_DEFAULTS, (items) => resolve({ ...BCM_DEFAULTS, ...items }));
    } catch {
      resolve({ ...BCM_DEFAULTS });
    }
  });
}
