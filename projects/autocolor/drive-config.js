// Drive settings that do not need a browser (kept apart from drive.js so they can be tested).

export const SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const PICKER_MIME_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export function driveState(cfg) {
  const ready = Boolean(cfg?.GOOGLE_CLIENT_ID && cfg?.GOOGLE_API_KEY && cfg?.GOOGLE_APP_ID);
  return { ready, label: ready ? 'Choose from Google Drive' : 'Google Drive setup pending' };
}
