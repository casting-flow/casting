import type { Metadata } from 'next';
import { Brand } from '@/components/brand';
import { koDateTime } from '@/lib/dates';
import { findGuardianConsent } from '@/lib/guardian-consent';
import { GUARDIAN_CONSENT_ITEMS, GUARDIAN_RELATIONS } from '@/lib/guardian-consent-rules';
import ConsentForm from './consent-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '보호자 동의 · 캐스팅플로우',
  // 링크에 토큰이 들어 있으니 검색에 남기지 않는다.
  robots: { index: false, follow: false },
};

/**
 * 만 14세 미만 배우의 보호자가 메일 링크로 들어와 동의(또는 철회)하는 화면. 로그인은 필요 없다.
 * 화면을 여는 것만으로는 아무것도 바뀌지 않는다(메일 미리보기가 링크를 열어도 안전).
 */
export default async function GuardianConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = '' } = await searchParams;
  const consent = await findGuardianConsent(token);
  return (
    <main className="auth-page">
      <header className="auth-top">
        <Brand />
      </header>
      <section className="auth-card wide-card">
        <h1>보호자 동의</h1>
        {!consent ? (
          <p className="form-error" role="alert">
            링크를 확인해 주세요. 메일에 있는 링크를 그대로 눌러 주세요.
          </p>
        ) : (
          <>
            <p className="muted">
              캐스팅플로우 계정 <b>{consent.accountName}</b> ({consent.accountEmail})에서 만 14세
              미만 자녀의 배우 프로필을 만들기 위해 보호자(
              {GUARDIAN_RELATIONS[consent.relation as keyof typeof GUARDIAN_RELATIONS] ??
                '법정대리인'}{' '}
              {consent.guardianName} 님)의 동의를 요청했어요. 법에 따라 만 14세 미만 아이의
              개인정보는 보호자의 동의가 있어야 받을 수 있어요.
            </p>
            <dl className="guardian-items">
              {GUARDIAN_CONSENT_ITEMS.map((item) => (
                <div key={item.title}>
                  <dt>{item.title}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
            <ConsentForm
              token={token}
              state={consent.state}
              consentedAt={consent.consentedAt ? koDateTime(consent.consentedAt) : ''}
            />
          </>
        )}
      </section>
    </main>
  );
}
