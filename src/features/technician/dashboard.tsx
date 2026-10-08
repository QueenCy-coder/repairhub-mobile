// Technician home dashboard and notifications.
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Logo } from '../../shared/components/logo';
import { NotificationList } from '../../shared/components/notifications';
import { AnimatedNumber, Avatar, IconBox, InfoTag, StatusPill, FadeIn, Bold, Btn, C, Card, H4, Link, Muted, Row, Screen, T, Title } from '../../shared/components/ui';
import { techStats, first, isMine, JobStatus, availableJobs, jobTitle, typicalPrice, displayName, greeting, todayLabel, custShort, N, statusLabel, notesFor, myDoneJobs } from '../../shared/core/data';
import { call } from '../../shared/core/native';
import * as backend from '../../shared/core/backend';
import { kmLabel } from '../../shared/core/geo';
import { useStore } from '../../shared/core/store';
import { ActionRow, JobPhoto, OfflineStrip, useWallet } from './common';

export const PERIODS = ['This week', 'This month', 'All time'] as const;

export function TechHome() {
  const { s, set } = useStore();
  const w = useWallet();
  const [period, setPeriod] = React.useState<(typeof PERIODS)[number]>('This week');
  const unread = s.unreadCount ?? notesFor(s, 'technician').filter(n => !n.read).length;
  const bell = (
    <Pressable onPress={() => router.push('/tech-alerts')} hitSlop={10} accessibilityLabel={`Notifications, ${unread}`}>
      <Ionicons name="notifications-outline" size={26} color={C.ink} />
      {unread ? <View style={{ position: 'absolute', right: 0, top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: C.bad, borderWidth: 2, borderColor: '#fff' }} /> : null}
    </Pressable>
  );
  if (s.techVerif !== 'verified') {
    const rejected = s.techVerif === 'rejected';
    return (
      <Screen>
        <Row style={{ marginBottom: 18 }}><Logo size={22} />{bell}</Row>
        <FadeIn><Title style={{ fontSize: 26, marginBottom: 2 }}>Hello, {first(s.techName)} 👋</Title>
          <Muted style={{ fontSize: 15 }}>{rejected ? 'Your application needs one fix.' : 'Your technician application is under review.'}</Muted></FadeIn>
        <FadeIn delay={60}>
          <Pressable onPress={() => router.push('/verification')} accessibilityRole="button"
            style={({ pressed }) => ({ marginTop: 16, borderRadius: 16, padding: 16, backgroundColor: rejected ? C.badBg : '#FEF3E2', flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.85 : 1 })}>
            <Ionicons name={rejected ? 'alert-circle-outline' : 'time-outline'} size={34} color={rejected ? C.bad : '#F79009'} />
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 16, fontWeight: '700' }}>{rejected ? 'Action needed' : 'Verification in progress'}</T>
              <T style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{rejected ? 'Upload a clearer ID photo to continue.' : 'We’re reviewing your documents. You’ll be notified once your account is verified.'}</T>
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.ink} />
          </Pressable>
        </FadeIn>
        <H4>What you can do now</H4>
        <ActionRow delay={100} icon="search-outline" color={C.primary} bg={C.primarySoft} title="Browse available jobs" sub="Explore job requests near you." onPress={() => router.push('/jobs')} />
        <ActionRow delay={150} icon="wallet-outline" color={C.okInk} bg={C.okBg} title="Check earnings" sub="Set up your earnings and view insights." onPress={() => router.push('/earnings')} />
        <ActionRow delay={200} icon="person-outline" color="#7F56D9" bg="#F4EBFF" title="Edit profile" sub="Keep your information up to date." onPress={() => router.push('/tech-register')} />
        <ActionRow delay={250} icon="help-circle-outline" color={C.bad} bg={C.badBg} title="Help and support" sub="Get answers or contact our support team." onPress={() => call('+2348000000000')} />
        <FadeIn delay={300}>
          <View style={{ marginTop: 6, borderRadius: 16, padding: 16, backgroundColor: C.primarySoft, flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '800' }}>i</Text></View>
            <View style={{ flex: 1 }}>
              <T style={{ fontSize: 15, fontWeight: '700' }}>Need help?</T>
              <T style={{ fontSize: 13, color: C.text, marginTop: 2 }}>If your verification takes longer than expected, contact our support team.</T>
              <Link style={{ marginTop: 6 }} onPress={() => call('+2348000000000')}>Contact support →</Link>
            </View>
          </View>
        </FadeIn>
      </Screen>
    );
  }
  const active = !!s.jobId && isMine(s) && s.status >= JobStatus.Accepted && s.status < JobStatus.Released;
  // A warranty claim notification that hasn't been read yet means a customer is waiting for an answer.
  const claimWaiting = s.notifications.some(n => n.title === 'Warranty' && /claim/i.test(n.body) && !n.read);
  const avail = availableJobs(s).list;
  const weekAgo = Date.now() - 7 * 864e5;
  const completed = period === 'This week' ? myDoneJobs(s).filter(j => j.at >= weekAgo).length : period === 'This month' ? w.monthJobs : w.completed;
  const stats: [React.ComponentProps<typeof Ionicons>['name'], string, string, string, string, unknown][] = [
    ['wallet-outline', String(avail.length), 'Available jobs', C.primary, '#EEF4FF', { pathname: '/jobs', params: { tab: 'available' } }],
    ['briefcase-outline', String(active ? 1 : 0), 'Active jobs', C.okInk, '#ECFDF3', { pathname: '/jobs', params: { tab: 'active' } }],
    ['checkmark-circle-outline', String(completed), 'Completed jobs', '#7F56D9', '#F4F3FF', { pathname: '/jobs', params: { tab: 'completed' } }],
    ['star', techStats(s).rating ? techStats(s).rating.toFixed(1) : 'New', 'Average rating', '#F79009', '#FFFAEB', '/reviews'],
  ];
  const statusTone = s.status === JobStatus.Booked ? 'warn' : s.status === JobStatus.Completed ? 'ok' : 'blue';
  return (
    <Screen>
      <OfflineStrip />
      <FadeIn>
        <Row style={{ marginBottom: 16 }}>
          <Row style={{ justifyContent: 'flex-start', gap: 12, flex: 1 }}>
            <Avatar label={s.techName} size={56} uri={s.techPhoto} />
            <View style={{ flex: 1 }}><Muted style={{ fontSize: 13 }}>{greeting()},</Muted><T style={{ fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{displayName(s.techName)} 👋</T><Muted style={{ fontSize: 13 }}>Ready for today’s repairs?</Muted></View>
          </Row>
          {bell}
        </Row>
      </FadeIn>
      <FadeIn delay={50}>
        <Pressable onPress={() => router.push('/earnings')} accessibilityRole="button" accessibilityLabel={`Available earnings ${N(w.available)}`}
          style={({ pressed }) => ({ backgroundColor: C.primary, borderRadius: 18, padding: 18, transform: [{ scale: pressed ? 0.98 : 1 }], shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } })}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Row style={{ justifyContent: 'flex-start', gap: 14, flex: 1 }}>
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="wallet-outline" size={26} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#D1E0FF', fontSize: 14 }}>Available earnings</Text>
                <AnimatedNumber value={w.available} format={N} style={{ color: '#fff', fontSize: 30, fontWeight: '800' }} />
              </View>
            </Row>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-forward" size={18} color="#fff" /></View>
          </Row>
          <Row style={{ marginTop: 12 }}>
            <Text style={{ color: '#D1E0FF', fontSize: 13, flex: 1 }}>Total earnings this month: <Text style={{ color: '#fff', fontWeight: '700' }}>{N(w.month)}</Text></Text>
            {s.techIsNew ? null : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(18,183,106,0.25)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}><Ionicons name="trending-up" size={13} color="#6CE9A6" /><Text style={{ color: '#D1FADF', fontSize: 12, fontWeight: '700' }}>+12.8%</Text></View>}
          </Row>
        </Pressable>
      </FadeIn>
      <H4 right={
        <Pressable onPress={() => setPeriod(PERIODS[(PERIODS.indexOf(period) + 1) % PERIODS.length])} accessibilityRole="button" accessibilityLabel={`Period: ${period}. Tap to change`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.soft, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
          <Text style={{ fontSize: 13, color: C.text }}>{period}</Text><Ionicons name="chevron-down" size={14} color={C.text} />
        </Pressable>}>Overview</H4>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map(([icon, v, l, color, bg, to], i) => (
          <FadeIn key={l} delay={80 + i * 50} style={{ width: '48%' }}>
            <Pressable onPress={() => router.push(to as never)} accessibilityRole="button" accessibilityLabel={`${l}: ${v}`}
              style={({ pressed }) => ({ backgroundColor: bg, borderRadius: 16, padding: 12, minHeight: 78, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(16,24,40,0.05)', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <Row>
                <Row style={{ justifyContent: 'flex-start', gap: 8, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={19} color={color} /></View>
                  <View style={{ flex: 1 }}><T style={{ fontSize: 20, fontWeight: '800' }}>{v}</T><T style={{ fontSize: 12, color: C.text, lineHeight: 15 }}>{l}</T></View>
                </Row>
                <Ionicons name="chevron-forward" size={14} color={C.mute} />
              </Row>
            </Pressable>
          </FadeIn>
        ))}
      </View>
      {claimWaiting ? (
        <FadeIn>
          <Card tone="hi" onPress={() => router.push('/tech-claim')} style={{ marginTop: 12 }}>
            <Row>
              <Row style={{ justifyContent: 'flex-start', gap: 10, flex: 1 }}>
                <IconBox name="shield-checkmark-outline" color="#B54708" bg="#FFF1D6" size={40} />
                <View style={{ flex: 1 }}><Bold style={{ fontSize: 15 }}>Warranty claim</Bold><Muted style={{ fontSize: 12 }}>A customer reported a problem with one of your repairs</Muted></View>
              </Row>
              <StatusPill tone="warn" label="Action needed" />
            </Row>
          </Card>
        </FadeIn>
      ) : null}
      <H4 right={<Link onPress={() => router.push({ pathname: '/jobs', params: { tab: 'active' } })} style={{ fontSize: 14 }}>View all</Link>}>{!active || todayLabel() === s.date ? 'Today’s job' : 'Next job'}</H4>
      {active ? (
        <FadeIn>
          <Card>
            <Row style={{ alignItems: 'flex-start', gap: 14 }}>
              <JobPhoto cat={s.cat} model={s.model} size={96} />
              <View style={{ flex: 1, gap: 6 }}>
                <T style={{ fontSize: 16, fontWeight: '700' }} numberOfLines={2}>{jobTitle({ dev: s.model, issue: s.desc, cat: s.cat })}</T>
                <Muted style={{ fontSize: 13 }}>{custShort(s)}</Muted>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <InfoTag icon={s.mode === 'home' ? 'home-outline' : 'storefront-outline'} label={s.mode === 'home' ? 'Home service' : 'Visit shop'} tone="blue" />
                  <InfoTag icon="calendar-outline" label={`${s.date === todayLabel() ? 'Today' : s.date}, ${s.time}`} />
                </View>
                <Row style={{ justifyContent: 'flex-start', gap: 8 }}><T style={{ fontSize: 13, fontWeight: '600' }}>Status</T><StatusPill tone={statusTone} label={s.status === JobStatus.Booked ? 'Needs your acceptance' : s.status === JobStatus.Accepted ? 'Accepted' : statusLabel(s)} /></Row>
              </View>
            </Row>
            <Btn title={s.status === JobStatus.Booked ? 'Respond to booking' : 'View job'} onPress={() => router.push(s.status === JobStatus.Booked ? '/booking-request' : '/job')} />
          </Card>
        </FadeIn>
      ) : (
        <Card tone="soft"><Row style={{ justifyContent: 'flex-start', gap: 12 }}><IconBox name="calendar-clear-outline" size={40} /><Muted style={{ flex: 1 }}>No job scheduled. Send quotes on nearby requests to get booked.</Muted></Row></Card>
      )}
      <H4 right={<Link onPress={() => router.push({ pathname: '/jobs', params: { tab: 'available' } })} style={{ fontSize: 14 }}>See all</Link>}>Available nearby</H4>
      {avail.slice(0, 3).map((j, i) => (
        <FadeIn key={j.id} delay={i * 60}>
          <Card onPress={() => { set({ viewJob: j.id }); router.push('/job-details'); }}>
            <Row style={{ gap: 12 }}>
              <JobPhoto cat={j.cat} model={j.dev} size={64} />
              <View style={{ flex: 1, gap: 3 }}>
                <T style={{ fontSize: 15, fontWeight: '700' }} numberOfLines={2}>{jobTitle(j)}</T>
                <InfoTag icon="location-outline" label={`${Number.isFinite(j.km) ? `${kmLabel(j.km)} · ` : ''}${j.area} • ${j.mode}`} />
                <T style={{ fontSize: 15, fontWeight: '800' }}>~{N(typicalPrice(j.cat, j.issue))}</T>
              </View>
              <View style={{ borderWidth: 1.5, borderColor: C.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ color: C.primary, fontWeight: '700' }}>View</Text>
              </View>
            </Row>
          </Card>
        </FadeIn>
      ))}
      {!avail.length ? <Card tone="soft"><Muted>No open requests in your skills right now.</Muted></Card> : null}
    </Screen>
  );
}

/* ───────── Warranty claim review (technician) ───────── */

export function TechAlerts() {
  const { s, set } = useStore();
  const list = notesFor(s, 'technician');
  React.useEffect(() => { if (list.some(n => !n.read && !(n.title === 'Warranty' && /claim/i.test(n.body)))) backend.markAllRead(set); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen title="Notifications">
      <NotificationList list={list} emptySub="New bookings, payments and reviews show up here." />
    </Screen>
  );
}

/* ───────── T-11 Profile ───────── */
