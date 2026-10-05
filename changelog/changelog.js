// Labels the release that's installed, so it's easy to see what's new since an update.
const installed = chrome.runtime.getManifest().version;
const section = document.querySelector(`section[data-version="${installed}"]`);
if (section) {
  section.classList.add('installed');
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = 'Installed';
  section.querySelector('h2').append(badge);
}
