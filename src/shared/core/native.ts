import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Alert, Image, Platform, Share } from 'react-native';
import { Media, sampleFromName } from './data';
import { markExternal } from './lifecycle';

const MAX_PHOTO = 10 * 1024 * 1024; // FR-6: 10 MB per photo
const MAX_VIDEO = 50 * 1024 * 1024; // FR-6: 50 MB video

type PickOpts = { limit: number; allowVideo: boolean; videoMaxDuration?: number; videoOnly?: boolean };
const kinds = (o: PickOpts): ImagePicker.MediaType[] => o.videoOnly ? ['videos'] : o.allowVideo ? ['images', 'videos'] : ['images'];

function toMedia(res: ImagePicker.ImagePickerResult): { ok: Media[]; rejected: number } {
  if (res.canceled) return { ok: [], rejected: 0 };
  let rejected = 0;
  const ok = res.assets.flatMap(a => {
    const type = a.type === 'video' ? 'video' : 'image';
    if (a.fileSize && a.fileSize > (type === 'video' ? MAX_VIDEO : MAX_PHOTO)) { rejected++; return []; }
    return [{ uri: a.uri, type, name: a.fileName, size: a.fileSize, sample: sampleFromName(a.fileName) } as Media];
  });
  return { ok, rejected };
}

async function fromLibrary(o: PickOpts) {
  markExternal();
  // The system photo picker runs out of process: it needs no library permission, and the user only shares what they pick.
  return toMedia(await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kinds(o), allowsMultipleSelection: o.limit > 1, selectionLimit: o.limit,
    videoMaxDuration: o.videoMaxDuration ?? 60, quality: 0.7, // client-side compression (sprint retro action item)
  }));
}

async function fromCamera(o: PickOpts) {
  markExternal();
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) { Alert.alert('Camera access needed', 'Allow camera access in Settings to take a photo.'); return { ok: [], rejected: 0 }; }
  try {
    return toMedia(await ImagePicker.launchCameraAsync({
      mediaTypes: kinds(o), videoMaxDuration: o.videoMaxDuration ?? 60, quality: 0.7,
      // Full screen: the default sheet style can leave the iOS camera frozen (no shutter, no Cancel).
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    }));
  } catch {
    Alert.alert('Camera unavailable', 'This device has no camera (e.g. the iOS Simulator). Choose from the library instead.');
    return { ok: [], rejected: 0 };
  }
}

/** Camera / library action sheet. Resolves with the accepted media (oversized files are dropped with a warning). */
export function pickMedia(o: PickOpts): Promise<Media[]> {
  if (o.limit <= 0) { Alert.alert('Limit reached', 'Delete one first by tapping the ✕ on a thumbnail.'); return Promise.resolve([]); }
  return new Promise(resolve => {
    const done = (r: { ok: Media[]; rejected: number }) => {
      if (r.rejected) Alert.alert('Some files were too large', 'Photos can be up to 10 MB and videos up to 50 MB.');
      // Kept on the device until the form is sent; the API stores them with the request, claim or report.
      resolve(r.ok.slice(0, o.limit));
    };
    // Browsers have no camera/library choice: open the file picker straight away.
    if (Platform.OS === 'web') { fromLibrary(o).then(done); return; }
    Alert.alert(o.videoOnly ? 'Add a video' : o.allowVideo ? 'Add photos or video' : 'Add photos', undefined, [
      // Let the menu finish closing first: opening the camera while it animates out freezes it on iOS.
      { text: o.videoOnly ? 'Record video' : o.allowVideo ? 'Take photo or video' : 'Take photo', onPress: () => setTimeout(() => fromCamera(o).then(done), 450) },
      { text: 'Choose from library', onPress: () => setTimeout(() => fromLibrary(o).then(done), 450) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve([]) },
    ]);
  });
}

/** Technician navigation: hands off to Google Maps if installed, otherwise Apple Maps / Android navigation. */
export async function openDirections(lat: number, lng: number) {
  markExternal();
  const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  // Browsers can't open native map apps: open Google Maps directions in a new tab instead.
  if (Platform.OS === 'web') { window.open(web, '_blank', 'noopener'); return; }
  const candidates = Platform.OS === 'ios'
    ? [`comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, `maps://?daddr=${lat},${lng}&dirflg=d`]
    : [`google.navigation:q=${lat},${lng}`];
  for (const url of candidates) {
    try { if (await Linking.canOpenURL(url)) return Linking.openURL(url); } catch { /* try next */ }
  }
  return Linking.openURL(web);
}

/** Place a call; devices without a phone (iPad, Simulator, web) get a clear message instead of a silent no-op. */
export async function call(phone: string) {
  markExternal();
  const url = `tel:${phone.replace(/\s/g, '')}`;
  const ok = Platform.OS === 'web' || await Linking.canOpenURL(url).catch(() => false);
  if (!ok) { Alert.alert('Calling isn’t available on this device', `Call ${phone} from your phone.`); return; }
  Linking.openURL(url).catch(() => Alert.alert('Couldn’t start the call', `Call ${phone} from your phone.`));
}

/**
 * Share text (receipts, warranties). Native: system share sheet. Web: Web Share API where available,
 * otherwise copy to clipboard. Resolves with what happened so the caller can confirm it to the user.
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  markExternal();
  if (Platform.OS !== 'web') {
    try { const r = await Share.share({ message: text, title }); return r.action === Share.dismissedAction ? 'cancelled' : 'shared'; } catch { return 'failed'; }
  }
  const nav = (globalThis as { navigator?: { share?: (d: object) => Promise<void>; clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
  if (nav?.share) { try { await nav.share({ title, text }); return 'shared'; } catch { /* dismissed or blocked: fall back to copy */ } }
  try { await nav?.clipboard?.writeText(text); return 'copied'; } catch { return 'failed'; }
}

/** Ask for notification permission at a moment the user understands why (iOS shows the prompt once). */
export async function askNotifications() {
  if (Platform.OS === 'web') return;
  try {
    const N = await import('expo-notifications');
    const cur = await N.getPermissionsAsync();
    if (cur.status === 'undetermined') await N.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  } catch { /* notifications unavailable */ }
}

/** Documents (receipts, reports) as evidence: up to 10 MB each. */
export async function pickFiles(limit: number): Promise<{ name: string; size: number | null }[]> {
  if (limit <= 0) { Alert.alert('Limit reached', 'Remove a file first.'); return []; }
  markExternal();
  const r = await DocumentPicker.getDocumentAsync({ multiple: limit > 1, copyToCacheDirectory: false, type: ['application/pdf', 'image/*', 'text/plain'] });
  if (r.canceled) return [];
  const ok = r.assets.filter(a => !a.size || a.size <= MAX_PHOTO);
  if (ok.length < r.assets.length) Alert.alert('Some files were too large', 'Files can be up to 10 MB.');
  return ok.slice(0, limit).map(a => ({ name: a.name, size: a.size ?? null }));
}

/** Copies text to the clipboard. */
export async function copyText(t: string) { try { await Clipboard.setStringAsync(t); return true; } catch { return false; } }

/** A bundled sample photo (demo), treated like a picked photo. */
export async function sampleMedia(mod: number, name: string): Promise<Media> {
  const m = mod as unknown as number | string | { uri?: string; default?: string };
  const uri = (Platform.OS !== 'web' && Image.resolveAssetSource?.(m as number)?.uri)
    || (typeof m === 'string' ? m : (m as { uri?: string; default?: string }).uri ?? (m as { default?: string }).default ?? '');
  return { uri, type: 'image', name, sample: sampleFromName(name) };
}
