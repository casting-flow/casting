// 만 14세 미만 지원 정책. 개인정보보호법상 만 14세 미만의 개인정보를 받으려면 법정대리인 동의가 필요하다.
// 보호자가 메일로 동의한 계정(lib/guardian-consent.ts)만 프로필 저장·지원을 받는다.
// 로그인하지 않은 지원과 동의 전 계정은 지금처럼 막고, 보호자 동의 방법을 안내한다.

// 확장자를 적는 건 node --test가 이 파일을 그대로 읽을 수 있게 하려는 것이다.
import { koreaToday, manAge } from './age.ts';

export const MIN_APPLY_AGE = 14;

export const CHILD_APPLY_MESSAGE =
  '만 14세 미만은 보호자 동의가 필요해요. 로그인한 뒤 ‘프로필 관리’에서 보호자 동의를 받고 지원해 주세요.';

export const CHILD_PROFILE_MESSAGE =
  '만 14세 미만은 보호자 동의가 필요해요. 생년월일 아래에서 보호자에게 동의 요청 메일을 보내 주세요.';

/**
 * 프로필의 생년월일(또는 예전 프로필의 출생 연도)로 보아 만 14세 미만이 확실한지.
 * 출생 연도만 있으면 올해 - 출생 연도가 가능한 최대 만 나이라, 그것도 14 미만일 때만 막는다.
 */
export function isChildProfile(
  birthAge: number | null,
  birthYear: number | null,
  currentYear = new Date().getFullYear(),
) {
  if (birthAge !== null) return birthAge < MIN_APPLY_AGE;
  return typeof birthYear === 'number' && birthYear > 0 && currentYear - birthYear < MIN_APPLY_AGE;
}

export const AGE_REQUIRED_MESSAGE = '생년월일을 입력해 주세요. 만 14세 이상만 지원할 수 있어요.';

/** 지원자 나이가 만 14세 미만인지(나이를 모르면 false) */
export function isUnderApplyAge(age: number | null | undefined) {
  return typeof age === 'number' && age < MIN_APPLY_AGE;
}

/** 모집 연령이 모두 만 14세 미만인 아역 배역인지(최대 나이가 1~13세) */
export function isChildRole(ageMin: number, ageMax: number) {
  return ageMax > 0 && ageMax < MIN_APPLY_AGE && ageMin <= ageMax;
}

/** 모집 연령에 만 14세 미만이 들어가는지(프로젝트 등록 화면 안내용) */
export function includesChildAge(ageMin: number, ageMax: number) {
  return (ageMin > 0 && ageMin < MIN_APPLY_AGE) || (ageMax > 0 && ageMax < MIN_APPLY_AGE);
}

// 로그인하지 않은 사람에게 보이는 배우 미리보기(/actors)에는 성인(만 19세 이상)만 보여 준다.
// 민법상 성년이 만 19세다. 미성년자의 이름·사진·나이대를 누구나 볼 수 있게 두지 않는다.
export const PUBLIC_PREVIEW_MIN_AGE = 19;

/**
 * 로그인 전 미리보기에 보여도 되는 배우인지(만 19세 이상이 확실할 때만 true).
 * 생년월일이 있으면 한국 날짜 기준 만 나이로 본다.
 * 출생 연도만 있으면 생일이 아직 안 왔다고 보고(올해 - 출생 연도 - 1) 그 나이로 본다.
 * 나이를 알 수 없으면 미성년자일 수도 있으므로 보여 주지 않는다.
 */
export function isAdultForPublicPreview(
  profile: { birthYear: number | null; birthDate?: string },
  now = new Date(),
) {
  const exact = profile.birthDate ? manAge(profile.birthDate, now) : null;
  if (exact !== null) return exact >= PUBLIC_PREVIEW_MIN_AGE;
  const year = profile.birthYear;
  if (typeof year !== 'number' || !Number.isInteger(year) || year <= 0) return false;
  const youngest = Number(koreaToday(now).slice(0, 4)) - year - 1;
  return youngest >= PUBLIC_PREVIEW_MIN_AGE;
}
