// 만 14세 미만 배우의 보호자 동의 저장·확인. 서버에서만 쓴다. 규칙과 메일 문구는 guardian-consent-rules.ts.

import { getUserById } from './accounts';
import { db } from './db';
import {
  consentState,
  GUARDIAN_LINK_TTL_MS,
  type GuardianConsentRow,
  type GuardianRelation,
} from './guardian-consent-rules';
import { hashToken, isTokenShape, newResetToken } from './password-reset-rules';

type Row = GuardianConsentRow & { user_id: string; token_hash: string; requested_at: string };

async function rowFor(userId: string) {
  return ((await db().prepare('SELECT * FROM guardian_consents WHERE user_id=?').get(userId)) ??
    null) as Row | null;
}

async function rowForToken(token: unknown) {
  if (!isTokenShape(token)) return null;
  return ((await db()
    .prepare('SELECT * FROM guardian_consents WHERE token_hash=?')
    .get(hashToken(token))) ?? null) as Row | null;
}

/** 배우 본인 화면에 보여 줄 동의 상태(보호자 이름·이메일 포함) */
export async function getGuardianConsent(userId: string) {
  const row = await rowFor(userId);
  return {
    state: consentState(row),
    guardianName: row?.guardian_name ?? '',
    guardianEmail: row?.guardian_email ?? '',
    relation: row?.relation ?? '',
    requestedAt: row?.requested_at ?? '',
    consentedAt: row?.consented_at ?? '',
  };
}

export type GuardianConsentInfo = Awaited<ReturnType<typeof getGuardianConsent>>;

/** 보호자가 동의했고 철회하지 않았는지. 만 14세 미만의 프로필 저장·지원은 이게 true일 때만 받는다. */
export async function hasGuardianConsent(userId: string) {
  return consentState(await rowFor(userId)) === 'consented';
}

/**
 * 동의 요청을 새로 만든다(이전 요청 링크는 못 쓰게 된다). 이미 동의한 상태면 null.
 * 토큰 원문은 돌려줘서 메일로만 보내고, DB에는 해시만 둔다.
 */
export async function requestGuardianConsent(
  userId: string,
  input: { guardianName: string; guardianEmail: string; relation: GuardianRelation },
) {
  if (await hasGuardianConsent(userId)) return null;
  const token = newResetToken();
  const now = new Date();
  await db()
    .prepare(
      `INSERT INTO guardian_consents
        (user_id, guardian_name, guardian_email, relation, token_hash, requested_at, expires_at, consented_at, consent_ip, revoked_at)
       VALUES (?,?,?,?,?,?,?,NULL,'',NULL)
       ON CONFLICT (user_id) DO UPDATE SET guardian_name=EXCLUDED.guardian_name,
         guardian_email=EXCLUDED.guardian_email, relation=EXCLUDED.relation,
         token_hash=EXCLUDED.token_hash, requested_at=EXCLUDED.requested_at,
         expires_at=EXCLUDED.expires_at, consented_at=NULL, consent_ip='', revoked_at=NULL`,
    )
    .run(
      userId,
      input.guardianName,
      input.guardianEmail,
      input.relation,
      hashToken(token),
      now.toISOString(),
      new Date(now.getTime() + GUARDIAN_LINK_TTL_MS).toISOString(),
    );
  return token;
}

/** 링크로 연 동의 화면에 보여 줄 내용. 링크가 틀리면 null. */
export async function findGuardianConsent(token: unknown) {
  const row = await rowForToken(token);
  if (!row) return null;
  const user = await getUserById(row.user_id);
  if (!user) return null;
  return {
    state: consentState(row),
    guardianName: row.guardian_name,
    guardianEmail: row.guardian_email,
    relation: row.relation,
    accountName: user.name,
    accountEmail: user.email,
    consentedAt: row.consented_at ?? '',
  };
}

/** 보호자가 동의를 눌렀을 때. 아직 쓸 수 있는 요청이면 동의 시각·IP를 남기고 true. */
export async function confirmGuardianConsent(token: unknown, ip: string) {
  if (!isTokenShape(token)) return false;
  const now = new Date().toISOString();
  const result = await db()
    .prepare(
      `UPDATE guardian_consents SET consented_at=?, consent_ip=?
       WHERE token_hash=? AND consented_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
    )
    .run(now, ip.slice(0, 64), hashToken(token), now);
  return result.changes === 1;
}

/**
 * 보호자가 동의를 철회했을 때. 프로필을 바로 비공개로 돌리고 새 지원을 막는다(hasGuardianConsent가 false가 된다).
 * 이미 낸 지원서와 계정은 남는다. 완전히 지우려면 회원 탈퇴를 안내한다.
 */
export async function revokeGuardianConsent(token: unknown) {
  const row = await rowForToken(token);
  if (!row || consentState(row) !== 'consented') return false;
  const now = new Date().toISOString();
  await db()
    .prepare('UPDATE guardian_consents SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL')
    .run(now, row.user_id);
  await db().prepare('UPDATE actor_profiles SET is_public=0 WHERE user_id=?').run(row.user_id);
  return true;
}
