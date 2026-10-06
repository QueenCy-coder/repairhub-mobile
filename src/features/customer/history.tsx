// Repair history and repair details.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { C, Avatar, Bold, Btn, Card, CatTile, Chip, FadeIn, Muted, Row, Screen, Segments, T, Thumb, KV, MediaGrid, Timeline } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import { escrowTotal, JobStatus, repairDate, selectedQuote, shortDate, State, statusLabel, validUntil, warrantyEnd, myPastRequests, plural, N } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import { activeRoute } from './common';
import { Warranty } from './warranty';

/** One row of the customer's history: the live repair (RH-0841) or a past one. */
export type Item = {
  id: string; model: string; cat: string; service: string; date: string; amount: number | null; tech: string;
  status: 'Active' | 'Completed' | 'Cancelled'; label: string; warrantyUntil?: string; warrantyDays?: number; note?: string; live: boolean;
};

export const liveItem = (s: State): Item | null => {
  if (!s.rid) return null;
  if (s.status < JobStatus.Requested && !s.cancelled) return null;
  const booked = s.status >= JobStatus.Accepted, done = s.status >= JobStatus.Released;
  const q = booked ? selectedQuote(s) : null;
  return {
    id: shortRef(s.rid), model: s.model, cat: s.cat, service: s.desc.split(/[,.]/)[0] || 'Repair request', live: true,
    date: done ? repairDate(s).replace(/^\w+ /, '') : shortDate(s.requestAt), amount: booked ? escrowTotal(s) : null, tech: q?.name ?? '',
    status: s.status < JobStatus.Requested ? 'Cancelled' : done ? 'Completed' : 'Active',
    label: s.status < JobStatus.Requested ? 'Cancelled' : done ? 'Completed' : statusLabel(s),
    ...(done ? { warrantyUntil: validUntil(s), warrantyDays: Math.ceil((warrantyEnd(s).getTime() - Date.now()) / 864e5) } : {}),
    ...(s.status < JobStatus.Requested ? { note: s.cancelled ? (s.refund ? `${N(s.refund)} refunded to you` : 'Cancelled before payment · nothing was paid') : undefined } : {}),
  };
};

export const historyItems = (s: State): Item[] => {
  const live = liveItem(s);
  // Earlier requests from the server (the live one is shown above them).
  const mine: Item[] = myPastRequests(s).filter(j => j.id !== shortRef(s.rid)).map(j => {
    const end = new Date(j.at); if (j.warrDays) end.setDate(end.getDate() + j.warrDays); else end.setMonth(end.getMonth() + (j.warr ?? 0));
    const warranty = j.status === 'Completed' && j.warr ? { warrantyUntil: shortDate(end.getTime()), warrantyDays: Math.ceil((end.getTime() - Date.now()) / 864e5) } : {};
    return { id: j.id, model: j.dev, cat: j.cat, service: j.service ?? 'Repair', date: shortDate(j.at), amount: j.status === 'Cancelled' ? null : j.gross || null, tech: j.techName ?? '',
      status: j.status ?? 'Completed', label: j.status ?? 'Completed', live: false, ...warranty, ...(j.status === 'Cancelled' ? { note: j.gross ? `${N(j.gross)} refunded to you` : 'Cancelled before payment · nothing was charged' } : {}) };
  });
  return live ? [live, ...mine] : mine;
};

export const toneOf = (i: Item) => i.status === 'Completed' ? 'ok' : i.status === 'Cancelled' ? 'bad' : 'warn';

export const warrantyText = (d?: number) => d === undefined ? null : d > 0 ? `Warranty · ${plural(d, 'day')} left` : 'Warranty expired';

/* ───────── C-13 Repair History (Figma) ───────── */

export function RepairHistory() {
  const { s } = useStore();
  const items = historyItems(s);
  const [tab, setTab] = React.useState<'all' | 'done' | 'cancelled'>('all');
  const shown = items.filter(i => tab === 'all' || (tab === 'done' ? i.status === 'Completed' : i.status === 'Cancelled'));
  return (
    <Screen title="Repair History" back={false}>
      <Segments items={[['all', `All (${items.length})`], ['done', 'Completed'], ['cancelled', 'Cancelled']]} value={tab} onChange={setTab} />
      {!items.length ? <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Ionicons name="construct-outline" size={44} color={C.mute} />
        <Bold style={{ marginTop: 10 }}>No repairs yet</Bold>
        <Muted style={{ textAlign: 'center', marginBottom: 16 }}>Something broken? Describe it once and get quotes from verified technicians.</Muted>
        <Btn title="Request a repair" onPress={() => router.push('/new-request')} />
      </View> : !shown.length ? <Muted style={{ textAlign: 'center', marginTop: 30 }}>No {tab === 'done' ? 'completed' : 'cancelled'} repairs.</Muted> : null}
      {shown.map((i, n) => (
        <FadeIn key={i.id} delay={n * 40}>
          <Card onPress={() => router.push({ pathname: '/repair', params: { id: i.id } })}>
            <Row style={{ alignItems: 'flex-start', gap: 12 }}>
              {i.live && s.photos[0] ? <Thumb m={s.photos[0]} size={64} /> : <CatTile model={i.model} cat={i.cat} size={64} />}
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{i.model}</T>
                <T style={{ fontSize: 13, color: C.mute }} numberOfLines={1}>{i.service}</T>
                <Muted style={{ fontSize: 12 }}>{i.date}{i.amount ? ` · ${N(i.amount)}` : ''}</Muted>
                <Row style={{ marginTop: 6 }}>
                  {i.tech ? <Row style={{ justifyContent: 'flex-start', gap: 6, flex: 1 }}><Avatar label={i.tech} size={22} /><T style={{ fontSize: 12 }} numberOfLines={1}>{i.tech}</T></Row> : <View style={{ flex: 1 }} />}
                  <Chip tone={toneOf(i)} label={i.label} />
                </Row>
                {warrantyText(i.warrantyDays) ? <Row style={{ justifyContent: 'flex-start', gap: 4, marginTop: 4 }}><Ionicons name="shield-checkmark-outline" size={13} color={i.warrantyDays! > 0 ? C.ok : C.mute} /><Text style={{ fontSize: 12, color: i.warrantyDays! > 0 ? C.ok : C.mute }}>{warrantyText(i.warrantyDays)}</Text></Row> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.mute} style={{ alignSelf: 'center' }} />
            </Row>
          </Card>
        </FadeIn>
      ))}
    </Screen>
  );
}

/* ───────── Repair details (tap on a history card) ───────── */

export function RepairDetail() {
  const { s } = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const i = historyItems(s).find(x => x.id === id);
  if (!i) return <Screen title="Repair details"><Muted>This repair is no longer available.</Muted></Screen>;
  const q = i.live && s.status >= JobStatus.Accepted ? selectedQuote(s) : null;
  const footer = i.live
    ? i.status === 'Active' ? <Btn title="Track repair" icon="navigate-outline" onPress={() => router.push(activeRoute(s.status) as never)} />
      : i.status === 'Completed' ? <>
        {!s.reviewed ? <Btn title="Rate this repair" icon="star-outline" onPress={() => router.push('/review')} /> : null}
        <Btn title="View warranty" variant={s.reviewed ? 'pri' : 'sec'} icon="shield-checkmark-outline" onPress={() => router.push({ pathname: '/warranty', params: { id: i.id } })} />
      </>
      : <Btn title="Request a repair" onPress={() => router.push('/new-request')} />
    : i.warrantyUntil ? <Btn title="View warranty" variant={i.warrantyDays! > 0 ? 'pri' : 'sec'} icon="shield-checkmark-outline" onPress={() => router.push({ pathname: '/warranty', params: { id: i.id } })} /> : undefined;
  return (
    <Screen title="Repair details" footer={footer}>
      <Card tone="strong">
        <Row style={{ alignItems: 'flex-start', gap: 12 }}>
          {i.live && s.photos[0] ? <Thumb m={s.photos[0]} size={60} /> : <CatTile model={i.model} cat={i.cat} size={60} />}
          <View style={{ flex: 1 }}><Bold style={{ fontSize: 17 }}>{i.model}</Bold><Muted>{i.service}</Muted><View style={{ marginTop: 6, alignSelf: 'flex-start' }}><Chip tone={toneOf(i)} label={i.label} /></View></View>
        </Row>
      </Card>
      <Card>
        <KV k="Repair ID" v={i.id} />
        <KV k="Category" v={i.cat} />
        <KV k={i.status === 'Completed' ? 'Repair date' : 'Requested'} v={i.date} />
        {i.live ? <KV k="Service" v={s.mode === 'home' ? 'Home service' : 'Visit shop'} /> : null}
        {i.amount ? <KV k={i.live && i.status === 'Active' ? 'Held in escrow' : 'Amount paid'} v={N(i.amount)} /> : null}
        {i.warrantyUntil ? <KV k="Warranty until" v={`${i.warrantyUntil}${i.warrantyDays! > 0 ? ` (${plural(i.warrantyDays!, 'day')} left)` : ' · expired'}`} /> : null}
        {i.note ? <KV k="Note" v={i.note} /> : null}
      </Card>
      {i.live && s.desc ? <><Bold style={{ marginTop: 6 }}>Problem described</Bold><T style={{ fontSize: 14, marginBottom: 8 }}>{s.desc}</T></> : null}
      {i.live && s.photos.length ? <View style={{ marginBottom: 12 }}><MediaGrid items={s.photos} max={s.photos.length} /></View> : null}
      {i.tech ? <Card><Row style={{ justifyContent: 'flex-start', gap: 12 }}><Avatar label={i.tech} size={44} verified /><View style={{ flex: 1 }}><Bold>{i.tech}</Bold><Muted style={{ fontSize: 12 }}>{q ? `${plural(q.warr, 'month')} warranty · ${plural(q.days, 'day')} repair` : 'Your technician'}</Muted></View></Row></Card> : null}
      {i.live && s.jobLog.length ? <><Bold style={{ marginTop: 6, marginBottom: 6 }}>Timeline</Bold><Timeline items={s.jobLog.map((l, n) => ({ label: l.label, sub: l.at, state: n === s.jobLog.length - 1 && i.status === 'Active' ? 'now' : 'done' }))} /></> : null}
    </Screen>
  );
}
