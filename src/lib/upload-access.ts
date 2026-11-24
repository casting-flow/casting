// 올린 파일의 주인 기록(uploads 표)과, /api/uploads/[name]을 열 수 있는지 DB에서 확인하는 일.
// 규칙 자체는 lib/upload-access-rules.ts.

import { db } from './db';
import { canOpenPdf, type PdfViewer } from './upload-access-rules';

/** 파일을 올린 사람을 적는다. 같은 이름이 이미 있으면 먼저 적힌 주인을 그대로 둔다. */
export async function recordUpload(name: string, ownerId: string) {
  await db()
    .prepare('INSERT OR IGNORE INTO uploads (name, owner_id, created_at) VALUES (?,?,?)')
    .run(name, ownerId, new Date().toISOString());
}

/** 그 이름의 주인. 기록이 없으면 '' */
export async function uploadOwner(name: string) {
  const row = (await db().prepare('SELECT owner_id FROM uploads WHERE name=?').get(name)) as
    { owner_id: string } | undefined;
  return row?.owner_id ?? '';
}

/** names 가운데 이 사람이 올린 것 */
export async function ownedUploadNames(ownerId: string, names: string[]) {
  if (!names.length) return new Set<string>();
  const rows = (await db()
    .prepare(
      `SELECT name FROM uploads WHERE owner_id=? AND name IN (${names.map(() => '?').join(',')})`,
    )
    .all(ownerId, ...names)) as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

/** 대화 첨부 파일 이름인지(예전에는 대화 파일도 일반 업로드와 같은 자리에 저장했다) */
export async function isChatFileName(name: string) {
  return Boolean(
    await db()
      .prepare("SELECT 1 FROM chat_messages WHERE file_key=? AND file_key<>'' LIMIT 1")
      .get(name),
  );
}

/** 이 사람이 프로필 PDF(name)를 열 수 있는지. 규칙은 canOpenPdf */
export async function viewerCanOpenPdf(viewer: PdfViewer | null, name: string) {
  if (!viewer) return false;
  if (viewer.isAdmin) return true;
  const uploaderId = await uploadOwner(name);
  if (!uploaderId || uploaderId === viewer.userId || viewer.role !== 'producer')
    return canOpenPdf(viewer, {
      uploaderId,
      inProfile: false,
      profilePublic: false,
      appliedToViewer: false,
    });
  // 이름은 UUID.pdf 형식으로 걸러져 와서 LIKE의 특수 문자(%, _)가 들어 있지 않다.
  const profile = (await db()
    .prepare('SELECT is_public FROM actor_profiles WHERE user_id=? AND documents LIKE ?')
    .get(uploaderId, `%"/api/uploads/${name}"%`)) as { is_public: number } | undefined;
  // 제작진은 주인 또는 팀원인 공고에 그 배우가 지원했으면 연다. 예전 배역(프로젝트 없음)은 배역 주인만.
  const applied =
    profile && !profile.is_public
      ? Boolean(
          await db()
            .prepare(
              `SELECT 1 FROM applications a JOIN roles r ON r.id=a.role_id
               LEFT JOIN projects p ON p.id=r.project_id
               WHERE a.actor_id=? AND (
                 (r.project_id IS NULL AND r.owner_id=?) OR p.owner_id=?
                 OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.project_id=r.project_id AND tm.user_id=?)
               ) LIMIT 1`,
            )
            .get(uploaderId, viewer.userId, viewer.userId, viewer.userId),
        )
      : false;
  return canOpenPdf(viewer, {
    uploaderId,
    inProfile: Boolean(profile),
    profilePublic: Boolean(profile?.is_public),
    appliedToViewer: applied,
  });
}
