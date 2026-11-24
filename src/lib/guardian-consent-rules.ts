// 만 14세 미만 배우의 보호자(법정대리인) 동의 규칙과 메일 문구. DB·Next에 기대지 않아 테스트로 지킨다.
// 개인정보보호법 제22조의2: 만 14세 미만의 개인정보는 법정대리인의 동의를 받아야 처리할 수 있다.
// 동의 확인은 시행령이 정한 방법 중 '전자우편으로 동의 내용을 보내고 동의 표시를 받는 방법'을 쓴다.
// 보호자 이메일로 링크를 보내고, 보호자가 그 링크에서 내용을 읽고 직접 동의를 누른다.

import { requiredText, validEmail } from './validation.ts';

/** 동의 요청 링크를 쓸 수 있는 기간(보낸 뒤 7일). 동의한 뒤에는 같은 링크로 동의 내용 확인·철회만 한다. */
export const GUARDIAN_LINK_TTL_MS = 7 * 24 * 3600 * 1000;

export const GUARDIAN_RELATIONS = {
  mother: '어머니',
  father: '아버지',
  other: '그 밖의 법정대리인(후견인 등)',
} as const;

export type GuardianRelation = keyof typeof GUARDIAN_RELATIONS;

export type GuardianConsentState = 'none' | 'pending' | 'expired' | 'consented' | 'revoked';

export type GuardianConsentRow = {
  guardian_name: string;
  guardian_email: string;
  relation: string;
  expires_at: string;
  consented_at: string | null;
  revoked_at: string | null;
};

/** 동의 기록의 지금 상태 */
export function consentState(
  row: GuardianConsentRow | null,
  now = new Date(),
): GuardianConsentState {
  if (!row) return 'none';
  if (row.revoked_at) return 'revoked';
  if (row.consented_at) return 'consented';
  return row.expires_at > now.toISOString() ? 'pending' : 'expired';
}

/** 보호자 동의 요청 입력 검사. 문제가 있으면 { error }. */
export function parseGuardianRequest(raw: Record<string, unknown>) {
  const guardianName = requiredText(raw.guardianName, 40);
  const guardianEmail = requiredText(raw.guardianEmail, 254).toLowerCase();
  const relation = String(raw.relation ?? '');
  if (!guardianName) return { error: '보호자 이름을 입력해 주세요.' } as const;
  if (!validEmail(guardianEmail)) return { error: '보호자 이메일 주소를 확인해 주세요.' } as const;
  if (!Object.hasOwn(GUARDIAN_RELATIONS, relation))
    return { error: '보호자와의 관계를 골라 주세요.' } as const;
  return { guardianName, guardianEmail, relation: relation as GuardianRelation } as const;
}

/** 보호자가 동의 화면에서 적은 이름이 요청 때 적은 보호자 이름과 같은지(띄어쓰기는 무시) */
export function sameGuardianName(typed: unknown, expected: string) {
  const clean = (value: string) => value.replace(/\s+/g, '');
  return typeof typed === 'string' && clean(typed) !== '' && clean(typed) === clean(expected);
}

/** 메일에 넣는 동의 링크 */
export function guardianConsentLink(origin: string, token: string) {
  return `${origin.replace(/\/+$/, '')}/guardian-consent?token=${encodeURIComponent(token)}`;
}

/** 보호자 동의 화면과 메일에 똑같이 보여 주는 동의 내용(아이와 보호자가 이해하기 쉬운 말로) */
export const GUARDIAN_CONSENT_ITEMS: { title: string; body: string }[] = [
  {
    title: '무엇을 받나요',
    body: '아이의 이름, 생년월일, 성별, 키·체중, 사는 지역, 프로필 사진, 연기 영상 링크, 소개글, 특기, 출연 경력, 출연 불가 일정. 연락처는 보호자 계정의 이메일·전화번호를 씁니다.',
  },
  {
    title: '왜 받나요',
    body: '아이의 배우 프로필을 만들고, 오디션 공고에 지원하고, 제작진이 출연을 제안·연락할 수 있게 하기 위해서입니다.',
  },
  {
    title: '누가 보나요',
    body: '캐스팅플로우에 가입한 제작진이 프로필을 볼 수 있고, 지원한 공고의 제작진은 지원서를 받습니다. 생년월일 대신 나이만 보여 줍니다.',
  },
  {
    title: '언제까지 보관하나요',
    body: '회원 탈퇴 또는 동의 철회 때까지입니다. 철회하면 프로필은 바로 비공개로 바뀌고 새 지원을 할 수 없으며, 탈퇴하면 지체 없이 삭제합니다.',
  },
  {
    title: '동의하지 않을 수 있나요',
    body: '네. 동의하지 않으면 만 14세 미만 아이의 프로필을 만들거나 지원할 수 없을 뿐, 다른 불이익은 없습니다. 언제든 이 메일의 링크에서 동의를 철회할 수 있습니다.',
  },
];

export function guardianConsentMail(input: {
  link: string;
  guardianName: string;
  accountName: string;
  accountEmail: string;
}) {
  return {
    subject: '[캐스팅플로우] 만 14세 미만 자녀의 개인정보 수집·이용 보호자 동의 요청',
    text: [
      `${input.guardianName} 님, 안녕하세요. 캐스팅플로우입니다.`,
      '',
      `캐스팅플로우 계정(${input.accountName}, ${input.accountEmail})에서 만 14세 미만 자녀의 배우 프로필을 만들기 위해 보호자 동의를 요청했어요.`,
      '법에 따라 만 14세 미만 아이의 개인정보는 보호자(법정대리인)의 동의가 있어야 받을 수 있어요.',
      '',
      ...GUARDIAN_CONSENT_ITEMS.flatMap((item) => [`■ ${item.title}`, item.body, '']),
      '아래 링크에서 내용을 확인하고 동의해 주세요. 링크는 7일 동안 쓸 수 있어요.',
      input.link,
      '',
      '· 동의한 뒤에도 같은 링크에서 언제든 동의를 철회할 수 있어요. 이 메일을 보관해 주세요.',
      '· 요청한 적이 없거나 자녀의 보호자가 아니라면 이 메일은 무시해 주세요. 동의하지 않으면 아무것도 바뀌지 않아요.',
    ].join('\n'),
  };
}

/** 동의가 끝났음을 보호자에게 남기는 확인 메일 */
export function guardianConsentDoneMail(input: { link: string; guardianName: string; at: string }) {
  return {
    subject: '[캐스팅플로우] 보호자 동의가 완료되었어요',
    text: [
      `${input.guardianName} 님, 안녕하세요. 캐스팅플로우입니다.`,
      '',
      `${input.at}에 자녀의 개인정보 수집·이용에 동의하셨어요.`,
      '동의 내용 확인과 철회는 아래 링크에서 언제든 할 수 있어요.',
      input.link,
    ].join('\n'),
  };
}
