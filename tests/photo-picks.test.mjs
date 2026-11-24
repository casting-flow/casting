import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialPhotoPicks,
  isPhotoSized,
  keepLargest,
  MAX_PHOTO_CANDIDATES,
  parsePhotoPicks,
  parseThumbs,
} from '../src/lib/photo-picks.ts';

test('아이콘·로고·가는 띠는 사진 후보가 아니다', () => {
  assert.equal(isPhotoSized(800, 1000), true);
  assert.equal(isPhotoSized(120, 120), false);
  assert.equal(isPhotoSized(1600, 300), false);
  assert.equal(isPhotoSized(260, 260), false);
  assert.equal(isPhotoSized(0, 500), false);
});

test('후보가 많으면 큰 것만 남기고 PDF 순서는 지킨다', () => {
  const list = [
    { id: 'a', width: 300, height: 300 },
    { id: 'b', width: 1000, height: 1200 },
    { id: 'c', width: 400, height: 500 },
    { id: 'd', width: 900, height: 900 },
  ];
  assert.deepEqual(
    keepLargest(list, 2).map((item) => item.id),
    ['b', 'd'],
  );
  assert.equal(keepLargest(list, 10).length, 4);
});

test('AI가 돌려준 번호는 범위 안의 정수만, 중복 없이 오름차순으로', () => {
  assert.deepEqual(parsePhotoPicks([2, 0, 2, '1', 5, -1, 1.5, 'x', null], 3), [0, 1, 2]);
  assert.deepEqual(parsePhotoPicks('0,1', 3), []);
  assert.deepEqual(parsePhotoPicks([0], 0), []);
});

test('처음 체크는 AI가 고른 사진만, 남은 칸만큼', () => {
  assert.deepEqual(initialPhotoPicks([0, 2, 3], 4, 2), [true, false, true, false]);
  assert.deepEqual(initialPhotoPicks([1], 3, 0), [false, false, false]);
  // AI가 고르지 못했으면 아무것도 체크하지 않는다.
  assert.deepEqual(initialPhotoPicks(null, 2, 8), [false, false]);
});

test('미리보기는 JPEG data URL만, 개수 제한 안에서 받는다', () => {
  assert.deepEqual(parseThumbs(undefined), []);
  assert.deepEqual(parseThumbs(['data:image/jpeg;base64,QUJD']), ['QUJD']);
  assert.equal(parseThumbs(['data:image/png;base64,QUJD']), null);
  assert.equal(parseThumbs(['https://example.com/a.jpg']), null);
  assert.equal(parseThumbs('data:image/jpeg;base64,QUJD'), null);
  assert.equal(
    parseThumbs(new Array(MAX_PHOTO_CANDIDATES + 1).fill('data:image/jpeg;base64,QUJD')),
    null,
  );
});
