import assert from 'node:assert/strict';
import test from 'node:test';
import { mayClaimApplications } from '../src/lib/claim-rules.ts';

const actor = { role: 'actor', email: 'actor@example.com', emailVerified: true };

test('비회원 지원서: 메일 주인을 확인한 배우 계정에만 붙인다', () => {
  assert.equal(mayClaimApplications(actor), true);
});

test('비회원 지원서: 메일 주인 확인 전(카카오에서 직접 입력·예전 비밀번호 계정)이면 붙이지 않는다', () => {
  assert.equal(mayClaimApplications({ ...actor, emailVerified: false }), false);
});

test('비회원 지원서: 제작자 계정이나 이메일이 빈 계정에는 붙이지 않는다', () => {
  assert.equal(mayClaimApplications({ ...actor, role: 'producer' }), false);
  assert.equal(mayClaimApplications({ ...actor, email: '' }), false);
  assert.equal(mayClaimApplications({ ...actor, email: '   ' }), false);
});
