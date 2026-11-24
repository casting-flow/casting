import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/accounts';
import { getActorId } from '@/lib/auth';
import { getGuardianConsent, requestGuardianConsent } from '@/lib/guardian-consent';
import {
  guardianConsentLink,
  guardianConsentMail,
  parseGuardianRequest,
} from '@/lib/guardian-consent-rules';
import { mailAvailable, mailConfigured, sendMail } from '@/lib/mail';
import { overLimit, TOO_MANY } from '@/lib/rate-limit';

/** 내 계정의 보호자 동의 상태 */
export async function GET() {
  const actorId = await getActorId();
  if (!actorId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  return NextResponse.json({ consent: await getGuardianConsent(actorId) });
}

/**
 * 만 14세 미만 배우의 보호자에게 동의 요청 메일을 보낸다(lib/guardian-consent-rules.ts).
 * 같은 계정은 60초에 한 번·하루 5번까지. 이미 동의한 계정은 다시 보내지 않는다.
 */
export async function POST(request: NextRequest) {
  const actorId = await getActorId();
  if (!actorId) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  if (!mailAvailable())
    return NextResponse.json(
      { error: '지금은 메일을 보낼 수 없어요. 잠시 후 다시 시도해 주세요.' },
      { status: 503 },
    );
  const parsed = parseGuardianRequest(await request.json().catch(() => ({})));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (
    (await overLimit(`guardian-consent:${actorId}`, 1, 60)) ||
    (await overLimit(`guardian-consent-day:${actorId}`, 5, 24 * 3600))
  )
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  const user = await getUserById(actorId);
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const token = await requestGuardianConsent(actorId, parsed);
  if (!token) return NextResponse.json({ error: '이미 보호자 동의를 받았어요.' }, { status: 409 });
  const origin = process.env.APP_URL || request.nextUrl.origin;
  const mail = guardianConsentMail({
    link: guardianConsentLink(origin, token),
    guardianName: parsed.guardianName,
    accountName: user.name,
    accountEmail: user.email,
  });
  if (mailConfigured()) {
    try {
      await sendMail({ to: parsed.guardianEmail, ...mail });
    } catch (error) {
      console.error('보호자 동의 메일 실패', error);
      return NextResponse.json(
        { error: '메일을 보내지 못했어요. 이메일 주소를 확인하고 다시 시도해 주세요.' },
        { status: 502 },
      );
    }
  } else console.info(`[mail] to=${parsed.guardianEmail} subject=${mail.subject}\n${mail.text}`);
  return NextResponse.json({ consent: await getGuardianConsent(actorId) });
}
