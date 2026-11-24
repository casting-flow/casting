import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin';
import { getInquiry, updateInquiry } from '@/lib/admin-inquiries';
import { logAdmin } from '@/lib/admin-log';
import { adminReplyMail, noteWithReply, parseReply } from '@/lib/admin-reply';
import { koDateTime } from '@/lib/dates';
import { INQUIRY_KINDS, INQUIRY_NOTE_MAX } from '@/lib/inquiry';
import { mailConfigured, sendMail } from '@/lib/mail';

type Context = { params: Promise<{ id: string }> };

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** 문의에 답장 메일을 보내고, 보낸 내용을 메모에 남기고 완료로 바꾼다. */
export async function POST(request: NextRequest, context: Context) {
  const admin = await getAdmin();
  if (!admin) return fail('관리자만 할 수 있어요.', 403);
  const inquiry = await getInquiry((await context.params).id);
  if (!inquiry) return fail('문의를 찾지 못했어요.', 404);
  if (!mailConfigured())
    return fail('사이트 메일 발송 설정이 없어요. ‘내 메일 앱으로’를 써 주세요.', 503);
  const parsed = parseReply(await request.json().catch(() => ({})));
  if ('error' in parsed) return fail(parsed.error, 400);
  const kind = INQUIRY_KINDS[inquiry.kind];
  try {
    await sendMail({
      to: inquiry.email,
      ...adminReplyMail({
        subject: `[캐스팅플로우] 문의 답변: ${kind}`,
        body: parsed.body,
        originalLabel: '문의',
        originalAt: koDateTime(inquiry.createdAt),
        originalBody: inquiry.body,
      }),
    });
  } catch (error) {
    console.error('문의 답장 메일 실패', error);
    return fail('메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.', 502);
  }
  await updateInquiry(inquiry.id, {
    status: 'done',
    note: noteWithReply(inquiry.note, parsed.body, koDateTime(new Date()), INQUIRY_NOTE_MAX),
  });
  await logAdmin(admin, 'inquiry_reply', {
    type: 'inquiry',
    id: inquiry.id,
    label: `${kind} · ${inquiry.email}`,
  });
  return NextResponse.json({ ok: true });
}
