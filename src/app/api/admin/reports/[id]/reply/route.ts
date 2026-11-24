import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/admin';
import { logAdmin } from '@/lib/admin-log';
import { adminReplyMail, noteWithReply, parseReply } from '@/lib/admin-reply';
import { koDateTime } from '@/lib/dates';
import { mailConfigured, sendMail } from '@/lib/mail';
import { REPORT_NOTE_MAX, REPORT_REASONS, REPORT_TARGETS } from '@/lib/report-rules';
import { getReport, updateReport } from '@/lib/reports';

type Context = { params: Promise<{ id: string }> };

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * 신고한 사람에게 처리 안내 메일을 보내고 보낸 내용을 메모에 남긴다.
 * 신고 처리 결과(조치·기각)는 관리자가 따로 정하므로 상태는 바꾸지 않는다.
 */
export async function POST(request: NextRequest, context: Context) {
  const admin = await getAdmin();
  if (!admin) return fail('관리자만 할 수 있어요.', 403);
  const report = await getReport((await context.params).id);
  if (!report) return fail('신고를 찾지 못했어요.', 404);
  if (!report.reporterEmail) return fail('신고한 사람의 이메일이 없어요.', 400);
  if (!mailConfigured())
    return fail('사이트 메일 발송 설정이 없어요. ‘내 메일 앱으로’를 써 주세요.', 503);
  const parsed = parseReply(await request.json().catch(() => ({})));
  if ('error' in parsed) return fail(parsed.error, 400);
  const reason = REPORT_REASONS[report.reason as keyof typeof REPORT_REASONS] ?? report.reason;
  try {
    await sendMail({
      to: report.reporterEmail,
      ...adminReplyMail({
        subject: `[캐스팅플로우] 신고 처리 안내: ${reason}`,
        body: parsed.body,
        originalLabel: '신고',
        originalAt: koDateTime(report.createdAt),
        originalBody: report.body,
      }),
    });
  } catch (error) {
    console.error('신고 답장 메일 실패', error);
    return fail('메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.', 502);
  }
  await updateReport(report.id, {
    note: noteWithReply(report.note, parsed.body, koDateTime(new Date()), REPORT_NOTE_MAX),
  });
  await logAdmin(admin, 'report_reply', {
    type: 'report',
    id: report.id,
    label: `${REPORT_TARGETS[report.targetType]} · ${report.targetLabel}`,
  });
  return NextResponse.json({ ok: true });
}
