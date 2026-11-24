import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canOpenPdf,
  chatStoragePath,
  keepOwnedDocuments,
  uploadKind,
} from '../src/lib/upload-access-rules.ts';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const actor = (userId) => ({ userId, role: 'actor', isAdmin: false });
const producer = (userId) => ({ userId, role: 'producer', isAdmin: false });
const facts = (overrides = {}) => ({
  uploaderId: 'actor-a',
  inProfile: true,
  profilePublic: false,
  appliedToViewer: false,
  ...overrides,
});

test('업로드 이름은 UUID.사진·PDF만 받고, 폴더가 든 이름은 받지 않는다', () => {
  assert.equal(uploadKind(`${ID}.jpg`), 'photo');
  assert.equal(uploadKind(`${ID}.webp`), 'photo');
  assert.equal(uploadKind(`${ID}.pdf`), 'pdf');
  assert.equal(uploadKind(`${ID}.hwp`), null);
  assert.equal(uploadKind(`chat/${ID}.jpg`), null);
  assert.equal(uploadKind(`tmp/${ID}.pdf`), null);
  assert.equal(uploadKind('../etc/passwd'), null);
});

test('대화 첨부 파일은 chat/ 폴더에 둔다', () => {
  const path = chatStoragePath(`${ID}.pdf`);
  assert.equal(path, `chat/${ID}.pdf`);
  assert.equal(uploadKind(path), null);
});

test('로그인하지 않았으면 PDF를 열 수 없다', () => {
  assert.equal(canOpenPdf(null, facts({ profilePublic: true })), false);
});

test('올린 본인은 자료실에 저장하기 전에도 연다', () => {
  assert.equal(canOpenPdf(actor('actor-a'), facts({ inProfile: false })), true);
});

test('다른 배우는 공개 프로필의 PDF도 열 수 없다', () => {
  assert.equal(canOpenPdf(actor('actor-b'), facts({ profilePublic: true })), false);
});

test('제작진은 공개 프로필이거나 내 공고에 지원한 배우의 자료만 연다', () => {
  assert.equal(canOpenPdf(producer('p1'), facts({ profilePublic: true })), true);
  assert.equal(canOpenPdf(producer('p1'), facts({ appliedToViewer: true })), true);
  assert.equal(canOpenPdf(producer('p1'), facts()), false);
});

test('자료실에서 뺀 PDF는 제작진이 열 수 없다', () => {
  assert.equal(canOpenPdf(producer('p1'), facts({ inProfile: false, profilePublic: true })), false);
});

test('주인 기록이 없는 파일은 관리자만 연다', () => {
  const orphan = facts({ uploaderId: '', profilePublic: true, appliedToViewer: true });
  assert.equal(canOpenPdf(producer('p1'), orphan), false);
  assert.equal(canOpenPdf(actor('actor-a'), orphan), false);
  assert.equal(canOpenPdf({ userId: 'admin', role: 'producer', isAdmin: true }, orphan), true);
});

test('자료실에는 내가 올린 PDF와 외부 링크만 남긴다', () => {
  const mine = { name: '내 이력서', url: `/api/uploads/${ID}.pdf` };
  const others = { name: '남의 것', url: '/api/uploads/11111111-2222-3333-4444-555555555555.pdf' };
  const link = { name: '포트폴리오', url: 'https://example.com/portfolio' };
  assert.deepEqual(keepOwnedDocuments([mine, others, link], new Set([`${ID}.pdf`])), [mine, link]);
});
