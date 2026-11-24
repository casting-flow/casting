// /api/uploads/[name] 파일을 누가 열 수 있는지 정하는 규칙. DB를 읽지 않는 순수 함수만 둔다(테스트용).
// DB에서 사실을 모으는 쪽은 lib/upload-access.ts.

/** 업로드 주소에 받는 이름: 무작위 UUID + 사진·PDF 확장자. 폴더(/)가 들어간 이름은 받지 않는다. */
export const UPLOAD_NAME = /^([a-f0-9-]{36})\.(jpg|png|webp|pdf)$/;

/** 대화 첨부 파일은 저장소의 chat/ 폴더에 둔다. 그래서 /api/uploads/로는 열리지 않는다. */
export const CHAT_FOLDER = 'chat/';

export function chatStoragePath(key: string) {
  return `${CHAT_FOLDER}${key}`;
}

/** 이름이 맞지 않으면 null, 맞으면 사진인지 PDF인지 */
export function uploadKind(name: string): 'photo' | 'pdf' | null {
  const ext = UPLOAD_NAME.exec(name)?.[2];
  if (!ext) return null;
  return ext === 'pdf' ? 'pdf' : 'photo';
}

export type PdfViewer = {
  userId: string;
  role: 'actor' | 'producer';
  isAdmin: boolean;
};

/** 파일 하나에 대해 DB에서 모은 사실 */
export type PdfFacts = {
  /** uploads 표에 적힌 올린 사람. 기록이 없으면 '' */
  uploaderId: string;
  /** 올린 배우의 자료실에 지금 이 PDF가 들어 있는지 */
  inProfile: boolean;
  /** 그 배우의 프로필이 공개인지 */
  profilePublic: boolean;
  /** 그 배우가 보는 사람의 공고(주인 또는 팀원)에 지원했는지 */
  appliedToViewer: boolean;
};

/**
 * 프로필 PDF(이력서·증명서)를 열 수 있는 사람:
 * - 관리자
 * - 올린 본인(저장 전 미리보기 포함)
 * - 제작진: 배우의 자료실에 지금 들어 있는 PDF이고, 프로필이 공개이거나 내 공고에 지원한 배우일 때
 * 그 밖의 로그인 사용자(다른 배우, 관계없는 제작진)는 열 수 없다.
 */
export function canOpenPdf(viewer: PdfViewer | null, facts: PdfFacts) {
  if (!viewer) return false;
  if (viewer.isAdmin) return true;
  if (!facts.uploaderId) return false;
  if (facts.uploaderId === viewer.userId) return true;
  if (viewer.role !== 'producer' || !facts.inProfile) return false;
  return facts.profilePublic || facts.appliedToViewer;
}

/**
 * 자료실에 저장할 PDF 주소를 거른다. 내가 올린 것(uploads 표의 주인이 나)만 남긴다.
 * 남이 올린 PDF 주소를 내 자료실에 넣어 '주인'처럼 여는 일을 막는다. 외부 https 링크는 그대로 둔다.
 */
export function keepOwnedDocuments<T extends { url: string }>(
  documents: T[],
  ownedNames: Set<string>,
) {
  return documents.filter((doc) => {
    const name = /^\/api\/uploads\/([a-f0-9-]{36}\.pdf)$/.exec(doc.url)?.[1];
    return name ? ownedNames.has(name) : true;
  });
}
