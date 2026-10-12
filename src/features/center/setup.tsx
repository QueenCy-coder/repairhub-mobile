// Service center onboarding: business details, services, service area and verification documents.
import { router } from 'expo-router';
import React from 'react';
import { Alert, Text, View } from 'react-native';
import { Bold, Btn, C, Card, Chip, Chips, Field, H4, Input, MediaGrid, Muted, Opt, Row, Screen } from '../../shared/components/ui';
import { LIVE_CATEGORIES, LAGOS_AREAS } from '../../shared/core/data';
import * as backend from '../../shared/core/backend';
import { askNotifications, pickMedia } from '../../shared/core/native';
import { useStore } from '../../shared/core/store';

export function CenterSetup() {
  const { s, set, get, notify, run, busy } = useStore();
  const [bizName, setBizName] = React.useState(s.centerName);
  const [desc, setDesc] = React.useState(s.centerDesc);
  const [addr, setAddr] = React.useState(s.centerAddress);
  const [docs, setDocs] = React.useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [tried, setTried] = React.useState(false);
  const submit = async () => {
    setTried(true);
    if (!bizName.trim()) return Alert.alert('Check your business name', 'Customers search for you by this name.');
    if (!s.skills.length) return Alert.alert('Choose at least one repair service');
    if (!s.areas.length) return Alert.alert('Choose at least one service area');
    if (!docs.length) return Alert.alert('Documents required', 'Please add at least one business document (for example your CAC registration) so we can verify you.');
    const ok = await run(async () => {
      await backend.saveCenterProfile(get, set, { name: bizName.trim(), desc: desc.trim() || undefined, address: addr.trim() || undefined, skills: s.skills, areas: s.areas });
      await backend.submitCenterVerification(get, set, docs);
    });
    if (!ok) return;
    askNotifications(); // so the center hears about verification and new requests
    notify('Application submitted', 'RepairHub’s team will review your business documents.', '/center-profile', 'service_center');
    router.replace('/center-home');
  };
  return (
    <Screen title="Business profile" back={false} footer={<Btn title={busy ? 'Uploading…' : 'Submit for verification'} disabled={busy} onPress={submit} />}>
      <Muted style={{ marginBottom: 12 }}>Set up your business so customers can find and trust you. It takes about 3 minutes.</Muted>
      <H4>1 · Business details</H4>
      <Field label="Business name" required error={tried && !bizName.trim() ? 'Enter your business name' : null}><Input value={bizName} invalid={tried && !bizName.trim()} onChangeText={setBizName} placeholder="e.g. Gbagada Phone Repairs" autoCapitalize="words" /></Field>
      <Field label="What you do (optional)"><Input value={desc} onChangeText={setDesc} multiline placeholder="Phone and laptop repairs, screen replacements…" /></Field>
      <Field label="Address (optional)"><Input icon="◎" value={addr} onChangeText={setAddr} placeholder="e.g. 12 Adeola Odeku St, Victoria Island" autoCapitalize="words" /></Field>
      <H4>2 · Services & skills</H4>
      <Card><Row><Bold>Electronics</Bold><Chip tone="ok" label="Live in Lagos" /></Row>
        <View style={{ marginTop: 8 }}>{LIVE_CATEGORIES.map(k => <Opt key={k} check label={k} on={s.skills.includes(k)} onPress={() => set(p => ({ skills: p.skills.includes(k) ? p.skills.filter(x => x !== k) : [...p.skills, k] }))} />)}</View>
        <Muted>Home appliances, home services and furniture open later. You can add them when they launch.</Muted>
      </Card>
      <H4>3 · Service area</H4>
      <Muted style={{ marginBottom: 8 }}>Where does your team take jobs? Pick at least one area — you can change this later.</Muted>
      <Chips>{LAGOS_AREAS.slice(0, 10).map(a => <Chip key={a} label={s.areas.includes(a) ? `✓ ${a}` : a} tone={s.areas.includes(a) ? 'on' : undefined} onPress={() => set(p => ({ areas: p.areas.includes(a) ? p.areas.filter(x => x !== a) : [...p.areas, a] }))} />)}</Chips>
      {tried && !s.areas.length ? <Text style={{ color: C.bad, marginTop: 6 }}>⚠︎ Add at least one area</Text> : null}
      <H4>4 · Business documents</H4>
      <Field label="Business documents" required>
        <MediaGrid items={docs} max={4} addLabel="Add" onAdd={async () => setDocs([...docs, ...await pickMedia({ limit: 4 - docs.length, allowVideo: false })])} onRemove={i => setDocs(docs.filter((_, j) => j !== i))} />
        <Muted style={{ marginTop: 6 }}>Your CAC registration or business ID, so we can verify you. JPG, PNG or PDF, up to 5 MB each.</Muted>
      </Field>
    </Screen>
  );
}