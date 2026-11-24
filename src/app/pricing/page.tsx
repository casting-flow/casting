import type { Metadata } from 'next';
import Link from 'next/link';
import { Brand } from '@/components/brand';
import { getSession } from '@/lib/auth';
import s from './pricing.module.css';

// 발표용 요금제 예시 페이지. 가격은 검증 중인 가설이고 결제는 아직 없다.
// 어디에도 링크하지 않고 검색에도 노출하지 않는다. 주소(/pricing)를 아는 사람만 본다.
export const metadata: Metadata = {
  title: '요금제 · 캐스팅플로우',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const PASS = 19_900;
const SEMESTER = 49_000;
const LICENSE = 600_000;
const GROUP = [
  { label: '개별 구매', count: 1, unit: 19_900, discount: '' },
  { label: '5개 작품 공동구매', count: 5, unit: 17_900, discount: '약 10% 할인' },
  { label: '10개 작품 공동구매', count: 10, unit: 15_900, discount: '약 20% 할인' },
];

const won = (n: number) => n.toLocaleString('ko-KR');

/** 단체 이용권(10개·5개 묶음과 개별 구매)을 섞어 n편을 살 때 가장 싼 금액 */
function cheapestGroupTotal(n: number) {
  let best = Infinity;
  for (let tens = 0; tens * 10 <= n + 9; tens++) {
    for (let fives = 0; tens * 10 + fives * 5 <= n + 4; fives++) {
      const rest = Math.max(0, n - tens * 10 - fives * 5);
      best = Math.min(best, tens * 159_000 + fives * 89_500 + rest * PASS);
    }
  }
  return best;
}
/** 학과 라이선스보다 단체 이용권이 싼 가장 큰 연간 작품 수 */
const GROUP_CHEAPER_UNTIL = (() => {
  let n = 1;
  while (cheapestGroupTotal(n + 1) < LICENSE) n++;
  return n;
})();

type Feature = { text: string; off?: boolean; note?: string };
type Plan = {
  name: string;
  who: string;
  price: number;
  unit: string;
  sub: React.ReactNode;
  cta: { label: string; href: string };
  features: Feature[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: '무료',
    who: '처음 배우를 모집하는 제작팀',
    price: 0,
    unit: '',
    sub: <>작품 1개 · 배역 2개 · 팀원 2명까지</>,
    cta: { label: '무료로 시작하기', href: '/signup/producer' },
    features: [
      { text: '공고 등록 · 지원 링크 · 지원자 접수' },
      { text: '지원자 검토 · 필터 · 메모 · 결과 안내' },
      { text: '메시지 · 오디션 일정 · 캘린더' },
      { text: '배우 찾기 · 추천 상위 3명' },
      { text: '제작진 인증 배지' },
      { text: '팀 공동 평가', off: true, note: '보기만' },
      { text: '후보 비교', off: true },
    ],
  },
  {
    name: '프로젝트 패스',
    who: '한 작품의 지원자 검토와 공동 선발',
    price: PASS,
    unit: '/ 작품',
    sub: (
      <>
        활성화일부터 <em>90일</em> 이용
      </>
    ),
    cta: { label: '프로젝트 패스 구매', href: '/signup/producer' },
    featured: true,
    features: [
      { text: '무료 플랜의 모든 기능' },
      { text: '배역 수 제한 없음' },
      { text: '팀원 10명', note: '추가 5명당 4,900원' },
      { text: '팀 공동 평가 · 하트 · 메모 · 의견 차이 보기' },
      { text: '후보 비교 (이상형 월드컵)' },
      { text: '조건 기반 추천 전체 보기' },
      { text: '캐스팅 제안 · 관심 배우 저장 무제한' },
      { text: '지원자 목록 PDF · 엑셀 내보내기', note: '출시 예정' },
    ],
  },
  {
    name: '학기 패스',
    who: '한 팀이 여러 작품을 연달아 제작할 때',
    price: SEMESTER,
    unit: '/ 6개월',
    sub: (
      <>
        <em>3작품</em>부터 개별 구매보다 저렴
      </>
    ),
    cta: { label: '학기 패스 구매', href: '/signup/producer' },
    features: [
      { text: '프로젝트 패스의 모든 기능' },
      { text: '6개월간 여러 작품에 사용' },
      { text: `3작품 시 ${won(PASS * 3 - SEMESTER)}원 절약` },
      { text: `4작품 시 ${won(PASS * 4 - SEMESTER)}원 절약` },
    ],
  },
  {
    name: '학과 라이선스',
    who: '여러 제작팀이 학과 단위로 함께 이용',
    price: LICENSE,
    unit: '/ 년',
    sub: (
      <>
        연 40작품 기준 작품당 <em>{won(LICENSE / 40)}원</em>
      </>
    ),
    cta: { label: '도입 문의하기', href: '/contact' },
    features: [
      { text: '프로젝트 패스의 모든 기능' },
      { text: '여러 제작팀 공동 이용' },
      { text: '학과 일괄 구매 · 관리' },
      { text: '연간 이용 규모에 맞춘 계약' },
    ],
  },
];

// 무료와 프로젝트 패스의 차이. 앞의 셋은 한도, 나머지는 기능.
const COMPARE: { item: string; free: string; pass: string; paid?: boolean }[] = [
  { item: '동시에 진행하는 작품', free: '1개', pass: '패스를 산 작품마다' },
  { item: '작품당 배역', free: '2개', pass: '제한 없음' },
  { item: '팀원 (본인 포함)', free: '2명', pass: '10명 · 추가 5명당 4,900원' },
  { item: '공고 등록 · 지원 링크 · 지원자 접수', free: '✓', pass: '✓' },
  { item: '지원자 검토 · 필터 · 메모 · 결과 안내', free: '✓', pass: '✓' },
  { item: '메시지 · 오디션 일정 · 캘린더', free: '✓', pass: '✓' },
  { item: '배우 찾기 (조건 검색)', free: '✓', pass: '✓' },
  { item: '제작진 인증 배지 · 신고', free: '✓', pass: '✓' },
  { item: '팀 공동 평가 (하트 · 메모 · 의견 차이)', free: '보기만', pass: '✓', paid: true },
  { item: '후보 비교 (이상형 월드컵)', free: '—', pass: '✓', paid: true },
  { item: '조건 기반 추천', free: '상위 3명', pass: '전체', paid: true },
  { item: '캐스팅 제안 보내기', free: '월 5건', pass: '무제한', paid: true },
  { item: '관심 배우 저장', free: '20명', pass: '무제한', paid: true },
  { item: '지원자 목록 PDF · 엑셀 내보내기', free: '—', pass: '✓ (출시 예정)', paid: true },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  // 발표 때 배우 화면을 보여 줄 수 있게 ?as=actor로도 배우 화면을 연다.
  const asActor = (await searchParams).as === 'actor';
  const isActor = session?.role === 'actor' || asActor;

  return (
    <main className={s.page}>
      <header className={s.nav}>
        <Brand />
        {!isActor && (
          <nav className={s.links} aria-label="요금제 안내">
            <a href="#plans">요금제</a>
            <a href="#free-vs-pass">무료와 차이</a>
            <a href="#group">단체구매</a>
            <a href="#faq">자주 묻는 질문</a>
          </nav>
        )}
      </header>

      {isActor ? <ActorFree loggedIn={Boolean(session)} /> : <ProducerPricing />}

      <footer className={s.footer}>
        <span>© 캐스팅플로우 · CastingFlow</span>
        {!isActor && (
          <span>※ 표시 가격은 검증 중인 테스트 가격이며, 결과에 따라 변경될 수 있습니다.</span>
        )}
      </footer>
    </main>
  );
}

/** 배우에게는 제작팀 요금을 보여 주지 않고, 무료라는 사실만 알린다. */
function ActorFree({ loggedIn }: { loggedIn: boolean }) {
  return (
    <section className={s.hero}>
      <span className={s.pill}>배우 · 언제나 무료</span>
      <h1>
        배우는 <span className={s.accent}>모든 기능을 무료</span>로
        <br />
        이용할 수 있어요
      </h1>
      <p className={s.lead}>
        프로필 만들기와 PDF 자동 입력, 배역 보기와 지원, 지원 현황 확인, 캐스팅 제안 받기에 비용이
        들지 않아요. 앞으로 제작팀 요금제가 생겨도 배우에게는 요금을 받지 않아요.
      </p>
      <Link
        className={`${s.btn} ${s.btnPrimary} ${s.heroBtn}`}
        href={loggedIn ? '/me' : '/signup/actor'}
      >
        {loggedIn ? '내 화면으로 →' : '배우로 무료 가입하기 →'}
      </Link>
    </section>
  );
}

function ProducerPricing() {
  const passMax = PASS * 4;
  return (
    <>
      <section className={s.hero}>
        <span className={s.pill}>PRICING</span>
        <h1>
          캐스팅은 <span className={s.accent}>작품 단위</span>로,
          <br />
          필요한 만큼만 결제하세요
        </h1>
        <p className={s.lead}>
          지원자 검토부터 공동 선발까지. 한 작품만 찍는 팀도, 여러 팀이 모인 동아리·학과도 각자에게
          맞는 방식으로 이용할 수 있어요.
        </p>
      </section>

      <section className={s.plans} id="plans">
        {PLANS.map((plan) => (
          <article key={plan.name} className={`${s.plan} ${plan.featured ? s.featured : ''}`}>
            {plan.featured && <span className={s.badge}>기준 상품</span>}
            <h3>{plan.name}</h3>
            <p className={s.who}>{plan.who}</p>
            <p className={s.price}>
              <strong>{won(plan.price)}</strong> 원 <span>{plan.unit}</span>
            </p>
            <p className={s.sub}>{plan.sub}</p>
            <Link className={`${s.btn} ${plan.featured ? s.btnPrimary : ''}`} href={plan.cta.href}>
              {plan.cta.label}
            </Link>
            <ul className={s.features}>
              {plan.features.map((f) => (
                <li key={f.text} className={f.off ? s.off : ''}>
                  <span className={s.check} aria-hidden="true">
                    {f.off ? '–' : '✓'}
                  </span>
                  <span>
                    {f.text}
                    {f.note && <small> {f.note}</small>}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className={s.section} id="free-vs-pass">
        <div className={s.head}>
          <div>
            <span className={s.eyebrow}>FREE VS PASS</span>
            <h2>무료와 프로젝트 패스, 무엇이 다른가요?</h2>
          </div>
          <p>
            혼자서 작품 하나를 끝까지 진행하는 데 필요한 기능은 무료예요. 여러 명이 의견을 모아 한
            명을 고르는 일, 그리고 규모가 커질 때 필요한 기능에만 요금을 받아요.
          </p>
        </div>

        <div className={s.explain}>
          <div>
            <b>무료로 끝까지</b>
            <p>
              공고를 올리고 지원을 받아 검토하고, 오디션을 잡아 결과를 안내하는 데까지 모두
              무료예요. 배우에게 보이는 지원 현황과 결과 안내도 요금제와 상관없이 똑같아요.
            </p>
          </div>
          <div>
            <b>팀이 함께 고를 때 유료</b>
            <p>
              캐스팅에서 가장 시간이 많이 드는 단계는 여러 명이 의견을 모으는 일이에요. 팀원
              하트·메모로 의견 차이를 한눈에 보고, 후보를 1:1로 비교해 최종 1인을 정해요.
            </p>
          </div>
          <div>
            <b>안전 기능은 언제나 무료</b>
            <p>
              제작진 인증 배지와 신고는 어떤 요금제에서도 똑같이 제공해요. 인증을 돈으로 살 수
              없어야 배우가 배지를 믿을 수 있어요.
            </p>
          </div>
        </div>

        <div className={s.card}>
          <table className={s.compare}>
            <thead>
              <tr>
                <th>기능</th>
                <th>무료</th>
                <th>프로젝트 패스</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row.item} className={row.paid ? s.paidRow : ''}>
                  <td>{row.item}</td>
                  <td className={s.muted}>{row.free}</td>
                  <td>{row.pass}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={s.section} id="group">
        <div className={s.head}>
          <div>
            <span className={s.eyebrow}>GROUP PURCHASE</span>
            <h2>함께 사면 작품당 더 저렴하게</h2>
          </div>
          <p>
            영화동아리나 여러 제작팀이 이용권을 한 번에 구매하고 나눠 쓰는 단체구매 패키지예요. 학과
            예산이 없어도 실제 수요만큼만 살 수 있어요.
          </p>
        </div>
        <div className={s.group}>
          {GROUP.map((g) => (
            <div key={g.label} className={s.groupCell}>
              <p className={s.groupLabel}>
                {g.label}{' '}
                <span className={g.discount ? s.tagLime : s.tag}>{g.discount || '할인 없음'}</span>
              </p>
              <p className={s.price}>
                <strong>{won(g.unit)}</strong> <span>원 / 작품</span>
              </p>
              <p className={s.sub}>
                {g.count > 1 ? (
                  <>
                    <s>{won(PASS * g.count)}원</s> 총 {won(g.unit * g.count)}원
                  </>
                ) : (
                  '이용권 1개'
                )}
              </p>
            </div>
          ))}
        </div>
        <ol className={s.steps}>
          <li>
            <b>STEP 01</b>동아리·학과 대표가 여러 작품 이용권을 한 번에 구매
          </li>
          <li>
            <b>STEP 02</b>이용권을 각 제작팀에 배정
          </li>
          <li>
            <b>STEP 03</b>작품마다 별도 계정·권한·자료 관리
          </li>
          <li>
            <b>STEP 04</b>각 이용권은 활성화일부터 90일간 사용
          </li>
        </ol>
      </section>

      <section className={s.section} id="which">
        <div className={s.head}>
          <div>
            <span className={s.eyebrow}>WHICH PLAN</span>
            <h2>우리 팀에 맞는 요금제는?</h2>
          </div>
          <p>이용할 작품 수에 따라 가장 경제적인 선택이 달라져요.</p>
        </div>
        <div className={s.twoCol}>
          <div className={s.card}>
            <h3>프로젝트 패스 vs 학기 패스</h3>
            <p className={s.cardSub}>6개월 동안 제작하는 작품 수 기준</p>
            <div className={s.legend}>
              <span className={s.legendGray}>프로젝트 패스 반복 구매</span>
              <span className={s.legendLime}>학기 패스</span>
            </div>
            {[1, 2, 3, 4].map((n) => {
              const diff = PASS * n - SEMESTER;
              return (
                <div key={n} className={s.barRow}>
                  <span>{n}작품</span>
                  <div className={s.bars}>
                    <i
                      className={s.barGray}
                      style={{ width: `${((PASS * n) / passMax) * 100}%` }}
                    />
                    <i className={s.barLime} style={{ width: `${(SEMESTER / passMax) * 100}%` }} />
                  </div>
                  <em className={diff > 0 ? s.save : ''}>
                    {diff > 0 ? `−${won(diff)}원` : '개별이 저렴'}
                  </em>
                </div>
              );
            })}
            <table className={s.mini}>
              <tbody>
                <tr>
                  <td>프로젝트 패스</td>
                  {[1, 2, 3, 4].map((n) => (
                    <td key={n}>{won(PASS * n)}</td>
                  ))}
                </tr>
                <tr>
                  <td>학기 패스</td>
                  {[1, 2, 3, 4].map((n) => (
                    <td key={n} className={n >= 3 ? s.limeText : ''}>
                      {won(SEMESTER)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className={s.card}>
            <h3>학과 라이선스 작품당 비용</h3>
            <p className={s.cardSub}>
              연 {won(LICENSE)}원 ÷ 연간 이용 작품 수 · 개별 구매(19,900원) 대비
            </p>
            <table className={s.mini}>
              <thead>
                <tr>
                  <th>연간 이용 작품 수</th>
                  <th>작품당 비용</th>
                  <th>개별 구매 대비</th>
                </tr>
              </thead>
              <tbody>
                {[10, 20, 30, 40, 50].map((n) => {
                  const per = LICENSE / n;
                  const pct = Math.round((1 - per / PASS) * 100);
                  const label =
                    pct < -5
                      ? '불리'
                      : pct <= 5
                        ? '거의 동일'
                        : `약 ${Math.round(pct / 5) * 5}% 저렴`;
                  return (
                    <tr key={n}>
                      <td>{n}편</td>
                      <td>{won(per)}원</td>
                      <td>
                        <span className={pct > 5 ? s.tagLime : s.tag}>{label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className={s.note}>
              연 {GROUP_CHEAPER_UNTIL}편까지는 단체 이용권(5개·10개 묶음)을 사는 편이 더 저렴해요.
              예를 들어 30편이면 {won(cheapestGroupTotal(30))}원, {GROUP_CHEAPER_UNTIL}편이면{' '}
              {won(cheapestGroupTotal(GROUP_CHEAPER_UNTIL))}원이에요. 학과 라이선스는 연{' '}
              {GROUP_CHEAPER_UNTIL + 1}편 이상 이용할 때 유리해요.
            </p>
          </div>
        </div>
      </section>

      <section className={s.section} id="faq">
        <div className={s.head}>
          <div>
            <span className={s.eyebrow}>FAQ</span>
            <h2>자주 묻는 질문</h2>
          </div>
        </div>
        <div className={s.faq}>
          <div>
            <b>무료 플랜과 유료의 차이는?</b>
            <p>
              무료로도 공고 등록부터 지원자 검토, 오디션 일정, 결과 안내까지 작품 하나를 끝까지
              진행할 수 있어요. 여러 제작진이 함께 평가하고 후보를 비교하는 기능, 배역·팀원 한도
              확장은 프로젝트 패스에서 열려요.
            </p>
          </div>
          <div>
            <b>팀원이 10명을 넘으면요?</b>
            <p>
              프로젝트 패스에는 팀원 10명이 포함돼요. 더 필요하면 5명 단위로 4,900원에 추가할 수
              있어요. 여러 팀이 함께 쓴다면 단체구매나 학과 라이선스가 더 경제적이에요.
            </p>
          </div>
          <div>
            <b>학기 패스와 단체구매는 뭐가 다른가요?</b>
            <p>
              학기 패스는 한 제작팀이 여러 작품을 만드는 경우, 단체구매는 서로 다른 제작팀이 비용을
              함께 부담하는 경우예요.
            </p>
          </div>
          <div>
            <b>이용권은 언제부터 기간이 시작되나요?</b>
            <p>
              작품 이용권은 활성화한 날부터 90일간 사용할 수 있어요. 미사용 이용권의 활성화 기한과
              환불·양도 조건은 별도 안내돼요.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
