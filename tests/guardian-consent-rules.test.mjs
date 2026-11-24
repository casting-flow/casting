import assert from 'node:assert/strict';
import test from 'node:test';
import {
  consentState,
  guardianConsentLink,
  guardianConsentMail,
  parseGuardianRequest,
  sameGuardianName,
} from '../src/lib/guardian-consent-rules.ts';

const now = new Date('2026-11-24T00:00:00Z');
const base = {
  guardian_name: '황보호',
  guardian_email: 'parent@example.com',
  relation: 'mother',
  expires_at: '2026-11-30T00:00:00.000Z',
  consented_at: null,
  revoked_at: null,
};

test('보호자 동의 상태: 없음·대기·만료·동의·철회', () => {
  assert.equal(consentState(null, now), 'none');
  assert.equal(consentState(base, now), 'pending');
  assert.equal(consentState({ ...base, expires_at: '2026-11-23T00:00:00.000Z' }, now), 'expired');
  // 동의한 뒤에는 링크 기간이 지나도 동의 상태가 유지된다.
  assert.equal(
    consentState({ ...base, expires_at: '2026-11-01T00:00:00Z', consented_at: '2026-10-30' }, now),
    'consented',
  );
  assert.equal(consentState({ ...base, consented_at: 'x', revoked_at: 'y' }, now), 'revoked');
});

test('동의 요청 입력 검사', () => {
  assert.deepEqual(
    parseGuardianRequest({
      guardianName: ' 황보호 ',
      guardianEmail: 'A@B.com',
      relation: 'father',
    }),
    { guardianName: '황보호', guardianEmail: 'a@b.com', relation: 'father' },
  );
  assert.ok('error' in parseGuardianRequest({ guardianEmail: 'a@b.com', relation: 'father' }));
  assert.ok(
    'error' in parseGuardianRequest({ guardianName: '김', guardianEmail: 'x', relation: 'father' }),
  );
  assert.ok(
    'error' in
      parseGuardianRequest({ guardianName: '김', guardianEmail: 'a@b.com', relation: 'aunt' }),
  );
  assert.ok(
    'error' in
      parseGuardianRequest({ guardianName: '김', guardianEmail: 'a@b.com', relation: 'toString' }),
  );
});

test('보호자 이름 확인은 띄어쓰기만 무시한다', () => {
  assert.equal(sameGuardianName('황 보호', '황보호'), true);
  assert.equal(sameGuardianName('황보오', '황보호'), false);
  assert.equal(sameGuardianName('', ''), false);
  assert.equal(sameGuardianName(undefined, '황보호'), false);
});

test('동의 메일에 링크와 계정 정보가 들어간다', () => {
  const link = guardianConsentLink('https://example.com/', 'a'.repeat(43));
  assert.equal(link, `https://example.com/guardian-consent?token=${'a'.repeat(43)}`);
  const mail = guardianConsentMail({
    link,
    guardianName: '황보호',
    accountName: '황아이',
    accountEmail: 'parent@example.com',
  });
  assert.match(mail.text, /guardian-consent\?token=/);
  assert.match(mail.text, /황아이, parent@example.com/);
});
