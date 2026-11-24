// 프로필 PDF에서 꺼낸 사진 후보를 다루는 규칙. DB·브라우저에 기대지 않아 테스트로 지킨다.
// 브라우저가 PDF 속 사진을 꺼내고(pdf-photos.ts), AI는 그중 배우 한 사람이 찍힌 사진의 번호만 고른다.
// 배우가 화면에서 체크한 사진만 프로필 사진으로 올라간다.

/** AI에게 보내는 후보는 이만큼까지(토큰·요청 크기 보호). */
export const MAX_PHOTO_CANDIDATES = 12;
/** AI에게 보내는 미리보기 한 장의 최대 크기(base64 글자 수). 긴 변 512px JPEG면 보통 60KB 안쪽이다. */
export const MAX_THUMB_CHARS = 200_000;
/** 미리보기의 긴 변(px). */
export const THUMB_SIDE = 512;

const MIN_SIDE = 200;
const MIN_AREA = 250 * 300;
const MAX_RATIO = 3;

/** 아이콘·로고·가는 띠 같은 그림은 사진 후보에서 뺀다. */
export function isPhotoSized(width: number, height: number) {
  if (!width || !height) return false;
  if (Math.min(width, height) < MIN_SIDE || width * height < MIN_AREA) return false;
  return Math.max(width, height) / Math.min(width, height) <= MAX_RATIO;
}

/** 후보가 많으면 큰 사진부터 max개를 남기되, PDF에 나온 순서는 그대로 둔다. */
export function keepLargest<T extends { width: number; height: number }>(list: T[], max: number) {
  if (list.length <= max) return list;
  const keep = new Set(
    list
      .map((item, index) => ({ index, area: item.width * item.height }))
      .sort((a, b) => b.area - a.area || a.index - b.index)
      .slice(0, max)
      .map((item) => item.index),
  );
  return list.filter((_, index) => keep.has(index));
}

/** AI가 돌려준 번호 목록을 믿을 수 있는 모양(0 이상 count 미만, 중복 없음, 오름차순)으로 거른다. */
export function parsePhotoPicks(raw: unknown, count: number): number[] {
  if (!Array.isArray(raw) || count <= 0) return [];
  const picks = new Set<number>();
  for (const value of raw) {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < count) picks.add(n);
  }
  return [...picks].sort((a, b) => a - b);
}

/**
 * 화면에서 처음 체크해 둘 후보. AI가 고른 사진만, 남은 사진 칸(slots)만큼 앞에서부터 고른다.
 * AI가 고르지 못했으면(null) 아무것도 체크하지 않고 배우가 직접 고르게 한다.
 */
export function initialPhotoPicks(picks: number[] | null, count: number, slots: number) {
  const checked = new Array<boolean>(count).fill(false);
  if (!picks) return checked;
  let left = Math.max(0, slots);
  for (const index of picks) {
    if (left <= 0) break;
    if (index >= 0 && index < count && !checked[index]) {
      checked[index] = true;
      left -= 1;
    }
  }
  return checked;
}

/** 서버가 받은 미리보기 목록을 검사한다. JPEG data URL만, 개수·크기 제한 안에서. 맞지 않으면 null. */
export function parseThumbs(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_PHOTO_CANDIDATES) return null;
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') return null;
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[1].length > MAX_THUMB_CHARS) return null;
    out.push(match[1]);
  }
  return out;
}
