'use client';

import { useState } from 'react';
import type { GuardianConsentInfo } from '@/lib/guardian-consent';
import { GUARDIAN_RELATIONS } from '@/lib/guardian-consent-rules';

/**
 * 생년월일이 만 14세 미만일 때 프로필 편집 화면에 뜨는 보호자 동의 카드.
 * 보호자 이메일로 동의 링크를 보내고, 보호자가 동의하면 프로필을 저장할 수 있다.
 */
export default function GuardianConsentCard({
  initial,
  defaultEmail,
}: {
  initial: GuardianConsentInfo;
  defaultEmail: string;
}) {
  const [consent, setConsent] = useState(initial);
  const [guardianName, setGuardianName] = useState(initial.guardianName);
  const [guardianEmail, setGuardianEmail] = useState(initial.guardianEmail || defaultEmail);
  const [relation, setRelation] = useState(initial.relation);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function refresh() {
    const response = await fetch('/api/me/guardian-consent');
    const data = await response.json().catch(() => ({}));
    if (data.consent) setConsent(data.consent);
  }

  async function request() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/me/guardian-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardianName, guardianEmail, relation }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '보내지 못했어요.');
      setConsent(data.consent);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (consent.state === 'consented')
    return (
      <div className="guardian-card" role="note">
        <p>
          <b>보호자 동의 완료</b> · {consent.guardianName} 님({consent.guardianEmail})이 동의했어요.
          프로필을 저장하고 공고에 지원할 수 있어요.
        </p>
      </div>
    );

  return (
    <div className="guardian-card" role="note">
      <p>
        <b>만 14세 미만은 보호자 동의가 필요해요.</b> 보호자(부모님) 이메일로 동의 링크를 보내
        드려요. 보호자가 메일에서 동의하면 프로필을 저장하고 공고에 지원할 수 있어요.
      </p>
      {consent.state === 'pending' && (
        <p>
          {sent ? '메일을 보냈어요. ' : ''}
          <b>{consent.guardianEmail}</b>으로 보낸 동의 요청을 기다리는 중이에요(7일 동안 유효).
          메일이 안 보이면 스팸함을 확인해 주세요.{' '}
          <button type="button" className="text-button" onClick={() => void refresh()}>
            동의했는지 다시 확인
          </button>
        </p>
      )}
      {consent.state === 'expired' && <p>지난 요청은 기간(7일)이 지났어요. 다시 보내 주세요.</p>}
      {consent.state === 'revoked' && <p>보호자가 동의를 철회했어요. 다시 요청할 수 있어요.</p>}
      <div className="form-three">
        <label>
          보호자 이름
          <input
            value={guardianName}
            maxLength={40}
            onChange={(event) => setGuardianName(event.target.value)}
          />
        </label>
        <label>
          관계
          <select value={relation} onChange={(event) => setRelation(event.target.value)}>
            <option value="">고르기</option>
            {Object.entries(GUARDIAN_RELATIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          보호자 이메일
          <input
            type="email"
            value={guardianEmail}
            onChange={(event) => setGuardianEmail(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="button button-soft full"
        disabled={busy}
        onClick={() => void request()}
      >
        {busy
          ? '보내는 중…'
          : consent.state === 'pending'
            ? '동의 요청 메일 다시 보내기'
            : '보호자에게 동의 요청 메일 보내기'}
      </button>
    </div>
  );
}
