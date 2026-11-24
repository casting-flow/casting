/**
 * 로그아웃 상태로 낸 지원서(비회원 지원서)를 계정에 붙여도 되는지 정하는 규칙.
 *
 * 지원서에는 연락처·대화·접수 링크가 들어 있어서, 같은 이메일이라는 것만으로 붙이면
 * 남의 이메일을 입력해 가입한 사람이 그 지원서를 가져갈 수 있다.
 * 그래서 메일 주인임을 확인한 배우 계정에만 붙인다.
 * (구글·카카오가 확인해 준 이메일, 메일 인증번호로 가입, 비밀번호 재설정 링크로 확인)
 */
export type ClaimCandidate = { role: string; email: string; emailVerified: boolean };

export function mayClaimApplications(user: ClaimCandidate) {
  return user.role === 'actor' && user.emailVerified === true && user.email.trim() !== '';
}
