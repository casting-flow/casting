'use client';

import { useState } from 'react';
import { REPLY_MAX } from '@/lib/admin-reply';

/**
 * 문의·신고 카드 안에서 답장을 쓰고 사이트 메일로 바로 보낸다(휴대폰 메일 앱 설정과 상관없이).
 * 보낸 내용은 서버가 관리자 메모에 남긴다.
 */
export default function ReplyBox({
  endpoint,
  to,
  doneNote,
  onSent,
  onEditing,
}: {
  endpoint: string;
  to: string;
  /** 보낸 뒤 무엇이 바뀌는지 한 줄 안내 */
  doneNote: string;
  onSent: () => void;
  /** 쓰는 동안 자동 새로고침을 멈추게 알린다 */
  onEditing: (editing: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function toggle(next: boolean) {
    setOpen(next);
    onEditing(next);
    if (next && !text) setText('안녕하세요, 캐스팅플로우입니다.\n\n');
    if (!next) setError('');
  }

  async function send() {
    if (!confirm(`${to}에게 답장을 보낼까요?`)) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || '보내지 못했어요. 다시 시도해 주세요.');
      setText('');
      toggle(false);
      onSent();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '보내지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" className="button button-outline" onClick={() => toggle(true)}>
        답장 쓰기
      </button>
    );

  return (
    <div className="admin-reply">
      <span className="small-note">
        받는 사람: <b>{to}</b> · 보낸 메일 아래에 원래 내용이 함께 붙어요. {doneNote}
      </span>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={7}
        maxLength={REPLY_MAX}
        autoFocus
      />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-note-actions">
        <button
          type="button"
          className="button button-primary"
          disabled={busy || text.trim().length < 5}
          onClick={() => void send()}
        >
          {busy ? '보내는 중…' : '답장 보내기'}
        </button>
        <button
          type="button"
          className="button button-soft"
          disabled={busy}
          onClick={() => toggle(false)}
        >
          취소
        </button>
      </div>
    </div>
  );
}
