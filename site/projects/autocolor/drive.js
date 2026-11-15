// Google Drive input: Google Identity Services token client plus the Google Picker.
// Google's scripts load only when the user presses the Drive button (no Google requests before that).
import { SCOPE, PICKER_MIME_TYPES } from './drive-config.js';

const loaded = new Map();
function loadScript(src) {
  if (!loaded.has(src)) {
    loaded.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`Could not load ${src}`));
        document.head.append(s);
      }),
    );
  }
  return loaded.get(src);
}

export class DriveAuthError extends Error {
  name = 'DriveAuthError';
}

export function createDrive(cfg) {
  let token = null;
  let tokenClient = null;

  async function getToken(prompt) {
    await loadScript('https://accounts.google.com/gsi/client');
    tokenClient ??= google.accounts.oauth2.initTokenClient({ client_id: cfg.GOOGLE_CLIENT_ID, scope: SCOPE, callback: () => {} });
    return new Promise((resolve, reject) => {
      tokenClient.callback = (r) => (r.error ? reject(new Error(r.error_description || r.error)) : resolve((token = r.access_token)));
      tokenClient.error_callback = (e) => reject(new Error(e?.message || e?.type || 'Sign in was cancelled'));
      tokenClient.requestAccessToken({ prompt });
    });
  }

  async function pick() {
    await getToken(token ? '' : 'consent');
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise((resolve) => gapi.load('picker', resolve));
    return new Promise((resolve) => {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes(PICKER_MIME_TYPES)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMode(google.picker.DocsViewMode.GRID);
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(token)
        .setDeveloperKey(cfg.GOOGLE_API_KEY)
        .setAppId(cfg.GOOGLE_APP_ID)
        .setTitle('Select photos (open a folder, then select the photos in it)')
        .setCallback((d) => {
          if (d.action === google.picker.Action.PICKED) resolve(d.docs.map((doc) => ({ id: doc.id, name: doc.name, mimeType: doc.mimeType })));
          else if (d.action === google.picker.Action.CANCEL) resolve([]);
        })
        .build();
      picker.setVisible(true);
    });
  }

  /** Downloads one picked file. Throws DriveAuthError when the token has expired. */
  async function download(file) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) throw new DriveAuthError('Google Drive access has expired.');
    if (!res.ok) throw new Error(`Google Drive returned ${res.status}`);
    return res.blob();
  }

  return { pick, download, reconnect: () => getToken('') };
}
