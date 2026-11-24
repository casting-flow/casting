import assert from 'node:assert/strict';
import test from 'node:test';
import { adminReplyMail, noteWithReply, parseReply, REPLY_MAX } from '../src/lib/admin-reply.ts';

test('답장 입력 검사', () => {
  assert.deepEqual(parseReply({ body: '  감사합니다. 반영했어요.  ' }), {
    body: '감사합니다. 반영했어요.',
  });
  assert.ok('error' in parseReply({ body: '네' }));
  assert.ok('error' in parseReply({}));
  assert.ok('error' in parseReply({ body: 'a'.repeat(REPLY_MAX + 1) }));
});

test('답장 메일 아래에 원래 문의를 인용한다', () => {
  const mail = adminReplyMail({
    subject: '[캐스팅플로우] 문의 답변: 일반 문의',
    body: '반영했어요.',
    originalLabel: '문의',
    originalAt: '2026. 11. 17. 오후 4:38',
    originalBody: '첫 줄\n둘째 줄',
  });
  assert.equal(mail.subject, '[캐스팅플로우] 문의 답변: 일반 문의');
  assert.match(mail.text, /^반영했어요\.\n/);
  assert.match(mail.text, /보내신 문의 \(2026\. 11\. 17\. 오후 4:38\)\n> 첫 줄\n> 둘째 줄$/);
});

test('보낸 답장은 메모 맨 위에 남고 한도에 맞춰 잘린다', () => {
  assert.equal(noteWithReply('', '답장', '11/24', 100), '[답장 보냄 11/24]\n답장');
  assert.equal(
    noteWithReply('예전 메모', '답장', '11/24', 100),
    '[답장 보냄 11/24]\n답장\n\n예전 메모',
  );
  assert.equal(noteWithReply('x'.repeat(50), '답장', '11/24', 20).length, 20);
});
