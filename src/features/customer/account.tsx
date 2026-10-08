// Customer account: first-time set-up, profile photo, profile tab, notifications.
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View, Alert } from 'react-native';
import { NotificationList } from '../../shared/components/notifications';
import { Avatar, C, Bold, Btn, Card, Field, FadeIn, Input, Muted, Screen, Title, IconTile, Row, T } from '../../shared/components/ui';
import { shortRef } from '../../shared/core/api';
import * as backend from '../../shared/core/backend';
import { JobStatus, notesFor } from '../../shared/core/data';
import { pickMedia } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';
import { useLogout } from '../auth/login';
import { enterApp } from '../auth/session';


/** Tap-to-change profile photo (camera or library). */
export function ProfilePhoto({ size = 88 }: { size?: number }) {
  const { s, set, toast } = useStore();
  const change = async () => {
    const [m] = await pickMedia({ limit: 1, allowVideo: false });
    if (m) { set(p => ({ custPhoto: m.uri, accounts: p.accounts.map(x => x.role === 'customer' && x.phone === p.phone ? { ...x, photo: m.uri } : x) })); toast('Profile photo updated'); }
  };
  return (
    <Pressable onPress={change} accessibilityRole="button" accessibilityLabel="Change profile photo" style={{ alignItems: 'center' }}>
      <View>
        <Avatar label={s.fullName} uri={s.custPhoto} size={size} />
        <View style={{ position: 'absolute', right: -2, bottom: -2, width: size / 3, height: size / 3, borderRadius: size / 6, backgroundColor: C.primary, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: size / 7 }}>📷</Text></View>
      </View>
      <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13, marginTop: 8 }}>{s.custPhoto ? 'Change photo' : 'Add a profile photo'}</Text>
    </Pressable>
  );
}

/* ───────── New customer: complete your profile before using the app ───────── */

export function CustomerSetup() {
  const { s, set, get, toast, run, busy } = useStore();
  const [address, setAddress] = React.useState(s.custAddress);
  const [tried, setTried] = React.useState(false);
  const addrErr = address.trim().length < 8 ? 'Enter your street address, area and city' : null;
  // The same screen edits the address later (from Profile), once set-up is done.
  const editing = s.custOnboarded;
  const finish = async () => {
    setTried(true);
    if (addrErr) return;
    const a = address.trim();
    if (!(await run(() => backend.saveAddress(get, a)))) return;
    // Only a draft (no open request) picks up the new address; a booked visit keeps its own.
    const openRequest = s.status >= JobStatus.Requested && s.status < JobStatus.Released && !s.cancelled;
    set(p => ({ custAddress: a, ...(openRequest ? {} : { location: a }), custOnboarded: true, accounts: p.accounts.map(x => x.role === 'customer' && x.phone === p.phone ? { ...x, onboarded: true, address: a } : x) }));
    if (editing) { toast('Address updated'); router.back(); return; }
    toast(`Welcome to RepairHub, ${s.fullName.split(' ')[0]}!`);
    enterApp('/home');
  };
  return (
    <Screen title={editing ? 'Home address' : 'Set up your account'} back={editing} footer={<Btn title={busy ? 'Saving…' : editing ? 'Save' : 'Continue'} disabled={busy} onPress={finish} />}>
      <FadeIn>
        {editing ? null : <Title style={{ fontSize: 20 }}>Complete your profile</Title>}
        <Muted style={{ marginBottom: 16 }}>{editing ? 'Used for home-service visits on your next repair requests.' : 'Technicians see your name and photo when you book. Your address is used for home-service visits.'}</Muted>
        <ProfilePhoto />
        <Card tone="soft" style={{ marginTop: 16 }}><Bold>{s.fullName}</Bold><Muted>+234 {s.phone}{s.email ? ` · ${s.email}` : ''}</Muted></Card>
        <Field label="Home address" required error={tried && addrErr}>
          <Input icon="📍" value={address} onChangeText={setAddress} invalid={tried && !!addrErr} placeholder="e.g. 46 Abraham Street, Surulere, Lagos" textContentType="fullStreetAddress" />
        </Field>
      </FadeIn>
    </Screen>
  );
}

/** One row of the profile menu. */
const MenuRow = ({ icon, label, sub, to, badge }: { icon: string; label: string; sub?: string; to: string; badge?: React.ReactNode }) => (
  <Card onPress={() => router.push(to as never)} style={{ paddingVertical: 12 }}><Row><Row style={{ justifyContent: 'flex-start', gap: 12, flex: 1 }}><IconTile glyph={icon} size={38} /><View style={{ flex: 1 }}><T style={{ fontSize: 15, fontWeight: '600' }}>{label}</T>{sub ? <Muted style={{ fontSize: 12 }}>{sub}</Muted> : null}</View></Row>{badge}<T style={{ color: C.mute, marginLeft: 6 }}>›</T></Row></Card>
);

export function CustomerProfile() {
  const { s } = useStore();
  const logout = useLogout();
  return (
    <Screen title="Profile" back={false}>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <ProfilePhoto />
        <Bold style={{ fontSize: 18, marginTop: 8 }}>{s.fullName}</Bold>
        <Muted>+234 {s.phone}{s.email ? ` · ${s.email}` : ''}</Muted>
      </View>
      <MenuRow icon="📍" label="Home address" sub={s.custAddress || 'Not set'} to="/cust-setup" />
      <MenuRow icon="🗓" label="Appointments" sub={s.status >= JobStatus.Accepted && s.status < JobStatus.Released ? `${s.date}, ${s.time}` : 'None upcoming'} to="/appointments" />
      <MenuRow icon="🛡" label="Warranties" sub={s.status >= JobStatus.Released ? `${shortRef(s.warrantyId, 'WR')} active` : 'None yet'} to="/warranty" />
      <MenuRow icon="🔔" label="Notifications" to="/alerts" />
      <MenuRow icon="🔑" label="Change password" to="/new-password" />
      <Btn title="Log out" variant="ghost" onPress={() => Alert.alert('Log out of RepairHub?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
    </Screen>
  );
}

export function Alerts() {
  const { s, set } = useStore();
  const list = notesFor(s, 'customer');
  React.useEffect(() => { if (list.some(n => !n.read)) backend.markAllRead(set); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen title="Notifications">
      <NotificationList list={list} emptySub="Updates about your repairs will show up here." />
    </Screen>
  );
}

/* ───────── C-18 Appointments (appointment management deliverable) ───────── */
