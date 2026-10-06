// Helpers shared by the customer screens.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Modal, Text } from 'react-native';
import { C } from '../../shared/components/ui';
import { LIVE_CATEGORIES, JobStatus } from '../../shared/core/data';

/** “Laptops” → “laptop”, for sentences like “7 verified laptop technicians”. */
export const catNoun = (cat: string) => cat.replace(/s$/, '').toLowerCase();

/** Common phone model names, used to catch a phone filed under Laptops/Tablets/etc. */
export const PHONE_MODEL = /\b(iphone|galaxy [asmz]|redmi|tecno|infinix|itel|pixel [0-9]|oppo|vivo|nokia)\b/i;

/** Repair-request validation (FR-6 + team rule: at least one photo). Shared by all three steps. */
export function requestErrors(s: { cat: string; model: string; modelOther?: boolean; desc: string; photos: { type: string }[]; location: string; prefDate: string; prefTime: string }) {
  const step1 = {
    cat: !LIVE_CATEGORIES.includes(s.cat) ? 'Choose the type of device'
      : PHONE_MODEL.test(s.model) && s.cat !== 'Smartphones' ? `“${s.model.trim()}” looks like a phone. Choose Smartphones so the right technicians are notified.` : null,
    model: s.model.trim().length < 2 ? 'Type or choose your brand and model' : null,
    desc: s.desc.trim().length < 20 ? `Describe the problem in at least 20 characters (${20 - s.desc.trim().length} more)` : null,
    photos: !s.photos.some(p => p.type === 'image') ? 'Add at least one photo so technicians can see the problem' : null,
  };
  const step2 = {
    location: s.location.trim().length < 5 ? 'Enter where the repair is needed' : null,
    date: !s.prefDate ? 'Choose a preferred date' : null,
    time: !s.prefTime ? 'Choose a preferred time' : null,
  };
  return { step1, step2, step1Ok: !Object.values(step1).some(Boolean), step2Ok: !Object.values(step2).some(Boolean) };
}

/** Where a refund goes: the method the customer paid with. */
export const payLabel = (p: string) => ({ card: 'card', transfer: 'bank account', ussd: 'bank account' } as Record<string, string>)[p] ?? 'original payment method';

export const activeRoute = (st: JobStatus) => st === JobStatus.Requested ? '/waiting' : st === JobStatus.Quoted ? '/compare' : st === JobStatus.Completed ? '/complete' : '/track';

/** Icon-only edit button (pencil); the “Edit” label stays for screen readers. */
export const EditLink = ({ to, what = 'details' }: { to: string; what?: string }) => (
  <Pressable onPress={() => router.push(to as never)} accessibilityRole="button" accessibilityLabel={`Edit ${what}`} hitSlop={10}
    style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
    <Ionicons name="pencil" size={15} color={C.primary} />
  </Pressable>
);

/* ───────── C-01 Home ───────── */

/** Full-screen image viewer (certificates, before/after photos). */
export function Viewer({ items, index, onClose }: { items: { src: number | { uri: string }; caption: string }[]; index: number | null; onClose: () => void }) {
  const it = index === null ? null : items[index];
  return (
    <Modal visible={!!it} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.92)', justifyContent: 'center', padding: 16 }} accessibilityLabel="Close">
        {it ? <>
          <Image source={it.src} style={{ width: '100%', height: '70%' }} contentFit="contain" />
          <Text style={{ color: '#fff', textAlign: 'center', fontSize: 15, fontWeight: '600', marginTop: 14 }}>{it.caption}</Text>
          <Text style={{ color: '#ffffffaa', textAlign: 'center', fontSize: 13, marginTop: 6 }}>Tap anywhere to close</Text>
        </> : null}
      </Pressable>
    </Modal>
  );
}

/** When the technician set off (from the job log), so the map shows how far along they are. */
export const onTheWayAt = (s: { jobLog: { label: string; at: string; stage?: number }[]; requestAt: number }) => {
  const e = [...s.jobLog].reverse().find(l => l.stage === 1 || /on the way/i.test(l.label));
  const m = e && /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(e.at);
  if (!m) return Date.now() - 30_000;
  const d = new Date(); let h = Number(m[1]) % 12; if (m[3].toUpperCase() === 'PM') h += 12;
  d.setHours(h, Number(m[2]), 0, 0);
  return d.getTime() > Date.now() ? Date.now() - 30_000 : d.getTime();
};

/* ───────── C-10 Track repair (Figma) ───────── */
