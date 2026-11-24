'use client';

import { useState } from 'react';
import type { GuardianConsentState } from '@/lib/guardian-consent-rules';

export default function ConsentForm({
  token,
  state: initialState,
  consentedAt,
}: {
  token: string;
  state: GuardianConsentState;
  consentedAt: string;
}) {
  const [state, setState] = useState(initialState);
  const [guardianName, setGuardianName] = useState('');
  const [isGuardian, setIsGuardian] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/guardian-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...body }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '처리하지 못했어요.');
      setState(data.state);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '처리하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (state === 'consented')
    return (
      <div className="guardian-done">
        <p>
          <b>동의가 완료되었어요.</b>
          {consentedAt && ` (${consentedAt})`} 이제 아이의 프로필을 저장하고 공고에 지원할 수
          있어요. 확인 메일도 보내 드렸어요.
        </p>
        <p className="muted">
          동의를 철회하면 프로필이 바로 비공개로 바뀌고 새 지원을 할 수 없어요. 정보를 모두 지우려면
          계정의 ‘회원 탈퇴’를 이용해 주세요.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="button button-outline full"
          disabled={busy}
          onClick={() => {
            if (confirm('동의를 철회할까요? 아이의 프로필이 바로 비공개로 바뀌어요.'))
              void send({ action: 'revoke' });
          }}
        >
          {busy ? '처리 중…' : '동의 철회하기'}
        </button>
      </div>
    );
  if (state === 'revoked')
    return (
      <p className="guardian-done">
        <b>동의를 철회했어요.</b> 아이의 프로필은 비공개로 바뀌었어요. 다시 동의하려면 아이 계정의
        프로필 화면에서 새로 요청해 주세요.
      </p>
    );
  if (state === 'expired' || state === 'none')
    return (
      <p className="form-error" role="alert">
        링크 기간(7일)이 지났어요. 아이 계정의 프로필 화면에서 다시 요청해 주세요.
      </p>
    );

  return (
    <form
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!guardianName.trim()) return setError('보호자 이름을 입력해 주세요.');
        if (!isGuardian || !agree) return setError('확인 항목에 모두 체크해 주세요.');
        void send({ guardianName, isGuardian, agree });
      }}
    >
      <label>
        보호자 이름 확인
        <input
          autoComplete="name"
          value={guardianName}
          onChange={(event) => setGuardianName(event.target.value)}
          placeholder="요청에 적힌 보호자 이름"
        />
      </label>
      <div className="agree-box">
        <label className="check-row">
          <input
            type="checkbox"
            checked={isGuardian}
            onChange={(event) => setIsGuardian(event.target.checked)}
          />
          <span>
            <b>[필수]</b> 본인은 이 아이의 법정대리인(부모 또는 후견인)입니다.
          </span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={agree}
            onChange={(event) => setAgree(event.target.checked)}
          />
          <span>
            <b>[필수]</b> 위 내용대로 아이의 개인정보 수집·이용과 제작진 제공에 동의합니다.
          </span>
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button button-primary full" disabled={busy}>
        {busy ? '처리 중…' : '동의합니다'}
      </button>
      <p className="muted small-note">
        동의하지 않으려면 이 화면을 닫으면 돼요. 아무것도 바뀌지 않아요.
      </p>
    </form>
  );
}
