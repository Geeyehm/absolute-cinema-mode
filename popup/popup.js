const enabledInput = document.getElementById('enabled');
const autoTheaterInput = document.getElementById('autoTheater');
const mastheadInput = document.getElementById('autoHideMasthead');
const widthInput = document.getElementById('chatWidth');

widthInput.min = BCM_CHAT_WIDTH_MIN;
widthInput.max = BCM_CHAT_WIDTH_MAX;
document.getElementById('chatWidthHint').textContent =
  `${BCM_CHAT_WIDTH_MIN}–${BCM_CHAT_WIDTH_MAX} px. Default ${BCM_DEFAULTS.chatWidth}.`;

bcmLoadSettings().then((settings) => {
  enabledInput.checked = settings.enabled;
  autoTheaterInput.checked = settings.autoTheater;
  mastheadInput.checked = settings.autoHideMasthead;
  widthInput.value = bcmClampChatWidth(settings.chatWidth);
});

enabledInput.addEventListener('change', () => chrome.storage.sync.set({ enabled: enabledInput.checked }));
autoTheaterInput.addEventListener('change', () => chrome.storage.sync.set({ autoTheater: autoTheaterInput.checked }));
mastheadInput.addEventListener('change', () => chrome.storage.sync.set({ autoHideMasthead: mastheadInput.checked }));

// Apply while typing or using the arrows; clamp the displayed value once the field is left.
widthInput.addEventListener('input', () => {
  const n = Number(widthInput.value);
  if (n >= BCM_CHAT_WIDTH_MIN && n <= BCM_CHAT_WIDTH_MAX) chrome.storage.sync.set({ chatWidth: Math.round(n) });
});
widthInput.addEventListener('change', () => {
  const clamped = bcmClampChatWidth(widthInput.value);
  widthInput.value = clamped;
  chrome.storage.sync.set({ chatWidth: clamped });
});
