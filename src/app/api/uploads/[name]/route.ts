import { isAdminAccount } from '@/lib/admin-rules';
import { getCurrentUser } from '@/lib/auth';
import { readUpload, signedDownloadUrl } from '@/lib/storage';
import { isChatFileName, viewerCanOpenPdf } from '@/lib/upload-access';
import { UPLOAD_NAME } from '@/lib/upload-access-rules';
import { NextRequest, NextResponse } from 'next/server';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

const notFound = () => new NextResponse('Not found', { status: 404 });

export async function GET(_request: NextRequest, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const match = UPLOAD_NAME.exec(name);
  if (!match) return notFound();
  const isPdf = match[2] === 'pdf';
  try {
    // 대화 첨부 파일은 그 대화방에 들어갈 수 있는 사람만 연다(/api/chat/[id]/files/[key]).
    // 새 파일은 저장소의 chat/ 폴더에 있어 여기로는 닿지 않고, 예전 파일은 이름으로 걸러 낸다.
    if (await isChatFileName(name)) return notFound();
    // 사진은 공개 지원 화면·배우 찾기에도 쓰여 그대로 연다.
    // PDF(이력서·증명서)는 올린 본인, 볼 수 있는 제작진, 관리자만 연다(lib/upload-access-rules.ts).
    if (isPdf) {
      const user = await getCurrentUser();
      if (!user) return new NextResponse('Unauthorized', { status: 401 });
      const viewer = { userId: user.id, role: user.role, isAdmin: isAdminAccount(user) };
      // 남의 파일은 있는지조차 알리지 않는다.
      if (!(await viewerCanOpenPdf(viewer, name))) return notFound();
      // PDF는 20MB까지라 서버(응답 4.5MB 제한)를 거치지 않고 5분짜리 저장소 주소로 보낸다.
      // 저장소가 없으면(로컬 개발) 아래처럼 서버가 직접 보낸다.
      const signed = await signedDownloadUrl(name, 300);
      if (signed)
        return NextResponse.redirect(signed, {
          status: 307,
          headers: { 'Cache-Control': 'private, no-store' },
        });
    }
    const body = await readUpload(name);
    if (!body) return notFound();
    return new NextResponse(body, {
      headers: {
        'Content-Type': TYPES[match[2]],
        // PDF는 권한이 바뀌면 바로 막혀야 해서 저장해 두지 않는다. 사진은 한 시간만 둔다.
        'Cache-Control': isPdf ? 'private, no-store' : 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return notFound();
  }
}
