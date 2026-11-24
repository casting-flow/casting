// 관리자 화면에서 문의·신고에 바로 답장 메일을 보낼 때의 규칙과 메일 모양. DB·Next에 기대지 않아 테스트로 지킨다.
// 보내는 주소는 사이트 메일 설정(lib/mail-config.ts, 팀 Gmail 등)을 그대로 쓴다.

import { requiredText } from './validation.ts';

export const REPLY_MAX = 4000;

/** 답장 입력 검사. 문제가 있으면 { error }. */
export function parseReply(raw: Record<string, unknown>): { error: string } | { body: string } {
  if (typeof raw.body === 'string' && raw.body.trim().length > REPLY_MAX)
    return { error: `답장은 ${REPLY_MAX}자까지 쓸 수 있어요.` };
  const body = requiredText(raw.body, REPLY_MAX);
  if (body.length < 5) return { error: '답장 내용을 적어 주세요.' };
  return { body };
}

/** 받는 사람에게 가는 메일. 아래에 원래 보낸 내용을 인용해 무엇에 대한 답인지 알 수 있게 한다. */
export function adminReplyMail(input: {
  subject: string;
  body: string;
  originalLabel: string;
  originalAt: string;
  originalBody: string;
}) {
  return {
    subject: input.subject,
    text: [
      input.body,
      '',
      '---',
      `보내신 ${input.originalLabel} (${input.originalAt})`,
      ...input.originalBody.split('\n').map((line) => `> ${line}`),
    ].join('\n'),
  };
}

/** 관리자 메모 맨 위에 보낸 답장을 남긴다(최신이 위). 길면 메모 한도에 맞춰 자른다. */
export function noteWithReply(existing: string, body: string, sentAt: string, max: number) {
  const entry = `[답장 보냄 ${sentAt}]\n${body}`;
  return (existing.trim() ? `${entry}\n\n${existing.trim()}` : entry).slice(0, max);
}
