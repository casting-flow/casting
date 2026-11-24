import assert from 'node:assert/strict';
import test from 'node:test';
import {
  includesChildAge,
  isAdultForPublicPreview,
  isChildProfile,
  isChildRole,
  isUnderApplyAge,
} from '../src/lib/child-policy.ts';

test('만 14세 미만 지원자는 막고, 나이를 모르면 막지 않는다', () => {
  assert.equal(isUnderApplyAge(13), true);
  assert.equal(isUnderApplyAge(14), false);
  assert.equal(isUnderApplyAge(null), false);
});

test('최대 나이가 13세 이하인 배역은 아역 배역', () => {
  assert.equal(isChildRole(8, 10), true);
  assert.equal(isChildRole(0, 13), true);
  assert.equal(isChildRole(10, 16), false);
  assert.equal(isChildRole(0, 0), false);
  assert.equal(isChildRole(25, 30), false);
});

test('모집 연령에 14세 미만이 걸치면 등록 화면에서 안내한다', () => {
  assert.equal(includesChildAge(10, 16), true);
  assert.equal(includesChildAge(0, 0), false);
  assert.equal(includesChildAge(20, 29), false);
});

test('프로필: 생년월일이나 출생 연도로 만 14세 미만이 확실하면 막는다', () => {
  assert.equal(isChildProfile(13, 2013, 2026), true);
  assert.equal(isChildProfile(14, 2012, 2026), false);
  // 출생 연도만 있으면 가능한 최대 만 나이(올해-출생 연도)가 14 미만일 때만
  assert.equal(isChildProfile(null, 2013, 2026), true);
  assert.equal(isChildProfile(null, 2012, 2026), false);
  assert.equal(isChildProfile(null, null, 2026), false);
});

test('로그인 전 배우 미리보기에는 만 19세 이상이 확실한 배우만 보인다', () => {
  // 한국 날짜로 2026-11-24 낮 12시
  const now = new Date('2026-11-24T03:00:00Z');
  const show = (birthDate, birthYear = null) =>
    isAdultForPublicPreview({ birthDate, birthYear }, now);

  // 생년월일이 있으면 만 나이로 본다. 생일 당일부터 만 19세.
  assert.equal(show('2007-11-24'), true);
  assert.equal(show('2007-11-25'), false);
  assert.equal(show('1990-01-01'), true);
  assert.equal(show('2012-05-05'), false);
  // 서버(UTC)는 아직 11월 23일이지만 한국은 이미 생일이다.
  assert.equal(
    isAdultForPublicPreview(
      { birthDate: '2007-11-24', birthYear: 2007 },
      new Date('2026-11-23T16:00:00Z'),
    ),
    true,
  );

  // 출생 연도만 있으면 생일이 안 지났다고 보고 판단한다.
  assert.equal(show('', 2006), true); // 적어도 만 19세
  assert.equal(show('', 2007), false); // 만 18세일 수도 있다
  assert.equal(show('', 2015), false);

  // 생년월일이 잘못돼 있으면 출생 연도로 본다.
  assert.equal(show('2007-02-30', 2000), true);

  // 나이를 알 수 없으면 보여 주지 않는다.
  assert.equal(show('', null), false);
  assert.equal(show(undefined, 0), false);
});
