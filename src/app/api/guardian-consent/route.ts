import { NextRequest, NextResponse } from 'next/server';
import {
  confirmGuardianConsent,
  findGuardianConsent,
  revokeGuardianConsent,
} from '@/lib/guardian-consent';
import {
  guardianConsentDoneMail,
  guardianConsentLink,
  sameGuardianName,
} from '@/lib/guardian-consent-rules';
import { mailConfigured, sendMail } from '@/lib/mail';
import { clientIp, overLimit, TOO_MANY } from '@/lib/rate-limit';
import { koDateTime } from '@/lib/dates';

/**
 * 보호자가 메일 링크에서 동의하거나 철회한다. 로그인은 필요 없고, 링크의 토큰으로 확인한다.
 * 동의할 때는 요청에 적힌 보호자 이름을 다시 적고 법정대리인임을 확인해야 한다.
 */
export async function POST(request: NextRequest) {
  if (await overLimit(`guardian-confirm-ip:${clientIp(request.headers)}`, 20, 3600))
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  const body = await request.json().catch(() => ({}));
  const consent = await findGuardianConsent(body.token);
  if (!consent) return NextResponse.json({ error: '링크를 확인해 주세요.' }, { status: 404 });

  if (body.action === 'revoke') {
    if (!(await revokeGuardianConsent(body.token)))
      return NextResponse.json({ error: '철회할 동의가 없어요.' }, { status: 409 });
    return NextResponse.json({ ok: true, state: 'revoked' });
  }

  if (consent.state !== 'pending')
    return NextResponse.json(
      {
        error:
          consent.state === 'expired'
            ? '링크 기간(7일)이 지났어요. 아이 계정의 프로필 화면에서 다시 요청해 주세요.'
            : '이미 처리된 요청이에요.',
      },
      { status: 409 },
    );
  if (!sameGuardianName(body.guardianName, consent.guardianName))
    return NextResponse.json(
      { error: '보호자 이름이 요청에 적힌 이름과 달라요. 다시 확인해 주세요.' },
      { status: 400 },
    );
  if (body.isGuardian !== true || body.agree !== true)
    return NextResponse.json({ error: '확인 항목에 모두 체크해 주세요.' }, { status: 400 });
  if (!(await confirmGuardianConsent(body.token, clientIp(request.headers))))
    return NextResponse.json({ error: '이미 처리된 요청이에요.' }, { status: 409 });

  const origin = process.env.APP_URL || request.nextUrl.origin;
  const mail = guardianConsentDoneMail({
    link: guardianConsentLink(origin, body.token),
    guardianName: consent.guardianName,
    at: koDateTime(new Date()),
  });
  if (mailConfigured())
    await sendMail({ to: consent.guardianEmail, ...mail }).catch((error) =>
      console.error('보호자 동의 확인 메일 실패', error),
    );
  else console.info(`[mail] to=${consent.guardianEmail} subject=${mail.subject}\n${mail.text}`);
  return NextResponse.json({ ok: true, state: 'consented' });
}
