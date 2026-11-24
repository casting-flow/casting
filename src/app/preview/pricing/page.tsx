/* eslint-disable @next/next/no-img-element */
// 요금제 안내 페이지(숨김). 메뉴·사이트맵 어디에도 연결하지 않고, 주소를 아는 사람만 연다.
// 로그인 없이 볼 수 있고, 검색엔진에는 나오지 않게 noindex를 단다.
// 가격은 검증 중인 시험 가격이다. 결제 기능은 아직 없어서 구매 버튼은 문의 화면으로 보낸다.
// 내용(무료 한도, 무료와 프로젝트 패스의 차이)은 2026-11-24에 확정한 요금 모델을 따른다.

import type { Metadata } from 'next';
import Link from 'next/link';
import styles from './pricing.module.css';

export const metadata: Metadata = {
  title: '요금제 · 캐스팅플로우',
  description: '캐스팅은 작품 단위로, 필요한 만큼만 결제하세요.',
  robots: { index: false, follow: false, nocache: true },
};

const won = (value: number) => value.toLocaleString('ko-KR');

type Plan = {
  name: string;
  desc: string;
  price: number;
  unit?: string;
  sub?: React.ReactNode;
  cta: string;
  href: string;
  featured?: boolean;
  features: { text: string; on: boolean }[];
};

const PLANS: Plan[] = [
  {
    name: '무료',
    desc: '처음 배우를 모집하는 제작팀',
    price: 0,
    sub: '작품 1개 · 배역 2개 · 팀원 2명까지',
    cta: '무료로 시작하기',
    href: '/signup/producer',
    features: [
      { text: '공고 등록·지원자 접수', on: true },
      { text: '지원자 검토·결과 안내', on: true },
      { text: '메시지·오디션 일정', on: true },
      { text: '팀 공동 평가', on: false },
      { text: '후보 비교', on: false },
    ],
  },
  {
    name: '프로젝트 패스',
    desc: '한 작품의 지원자 검토와 공동 선발',
    price: 19900,
    unit: '/ 작품',
    sub: (
      <>
        활성화일부터 <b>90일</b> 이용
      </>
    ),
    cta: '프로젝트 패스 구매',
    href: '/contact',
    featured: true,
    features: [
      { text: '무료 플랜의 모든 기능', on: true },
      { text: '배역·팀원 수 제한 없음', on: true },
      { text: '팀 공동 평가 (하트·메모)', on: true },
      { text: '후보 비교 (이상형 월드컵)', on: true },
      { text: '추천 전체·제안 무제한', on: true },
    ],
  },
  {
    name: '학기 패스',
    desc: '한 팀이 여러 작품을 연달아 제작할 때',
    price: 49000,
    unit: '/ 6개월',
    sub: (
      <>
        <b>3작품</b>부터 개별 구매보다 저렴
      </>
    ),
    cta: '학기 패스 구매',
    href: '/contact',
    features: [
      { text: '프로젝트 패스의 모든 기능', on: true },
      { text: '6개월간 여러 작품에 사용', on: true },
      { text: '3작품 시 10,700원 절약', on: true },
      { text: '4작품 시 30,600원 절약', on: true },
      { text: '한 제작팀 전용', on: true },
    ],
  },
  {
    name: '학과 라이선스',
    desc: '여러 제작팀이 학과 단위로 함께 이용',
    price: 600000,
    unit: '/ 년',
    sub: (
      <>
        연 40작품 기준 작품당 <b>15,000원</b>
      </>
    ),
    cta: '도입 문의하기',
    href: '/contact',
    features: [
      { text: '프로젝트 패스의 모든 기능', on: true },
      { text: '여러 제작팀 공동 이용', on: true },
      { text: '학과 일괄 구매 · 관리', on: true },
      { text: '연간 이용 규모에 맞춘 계약', on: true },
      { text: '팀별 계정·자료 분리', on: true },
    ],
  },
];

// 무료와 프로젝트 패스의 차이를 세 줄로 요약한 카드.
const POINTS = [
  {
    title: '무료로 끝까지',
    body: '공고 등록부터 지원자 검토, 오디션 일정, 결과 안내까지. 작품 하나는 무료 플랜만으로 끝까지 진행할 수 있어요.',
  },
  {
    title: '팀이 함께 고를 때 유료',
    body: '여러 제작진이 함께 평가하고 후보를 비교하는 기능, 배역·팀원 한도 확장은 프로젝트 패스에서 열려요.',
  },
  {
    title: '안전 기능은 언제나 무료',
    body: '제작진 인증 배지와 신고 기능은 요금제와 상관없이 쓸 수 있어요.',
  },
];

/** 비교표 한 칸. true는 ✓(포함), false는 —(미포함), 글자는 한도·범위를 그대로 적는다. */
type Cell = boolean | string;

/** 아직 만들지 않은 기능 칸에 다는 딱지 */
const SOON = '출시 예정';

type DiffGroup = {
  group: string;
  rows: { name: string; note?: string; free: Cell; pass: Cell }[];
};

const DIFF: DiffGroup[] = [
  {
    group: '한도',
    rows: [
      { name: '동시에 진행하는 작품', free: '1개', pass: '패스를 산 작품마다' },
      { name: '작품당 배역', free: '2개', pass: '제한 없음' },
      { name: '팀원', note: '본인 포함', free: '2명', pass: '제한 없음' },
    ],
  },
  {
    group: '모든 요금제 공통',
    rows: [
      { name: '공고 등록·지원 링크·지원자 접수', free: true, pass: true },
      { name: '지원자 검토·필터·메모·결과 안내', free: true, pass: true },
      { name: '메시지·오디션 일정·캘린더', free: true, pass: true },
      { name: '배우 찾기·제작진 인증 배지·신고', free: true, pass: true },
    ],
  },
  {
    group: '프로젝트 패스에서 열리는 기능',
    rows: [
      { name: '팀 공동 평가', note: '하트·메모·의견 차이', free: '보기만', pass: true },
      { name: '후보 비교', note: '이상형 월드컵', free: false, pass: true },
      { name: '조건 기반 추천', free: '상위 3명', pass: '전체' },
      { name: '캐스팅 제안 보내기', free: '월 5건', pass: '무제한' },
      { name: '관심 배우 저장', free: '20명', pass: '무제한' },
      { name: '지원자 목록 PDF·엑셀 내보내기', free: false, pass: SOON },
    ],
  },
];

const GROUP = [
  { label: '개별 구매', badge: '할인 없음', price: 19900, note: '이용권 1개' },
  { label: '5개 작품 공동구매', badge: '약 10% 할인', price: 17900, was: 99500, total: 89500 },
  { label: '10개 작품 공동구매', badge: '약 20% 할인', price: 15900, was: 199000, total: 159000 },
];

const STEPS = [
  '동아리·학과 대표가 여러 작품 이용권을 한 번에 구매',
  '이용권을 각 제작팀에 배정',
  '작품마다 별도 계정 · 권한 · 자료 관리',
  '각 이용권은 활성화일부터 90일간 사용',
];

const PASS = 19900;
const SEMESTER = 49000;
const COUNTS = [1, 2, 3, 4];
const CHART_MAX = PASS * 4;

const LICENSE = 600000;
const LICENSE_ROWS = [10, 20, 30, 40, 50].map((works) => {
  const each = LICENSE / works;
  const ratio = 1 - each / PASS;
  const verdict =
    ratio < -0.1
      ? { text: '불리', tone: 'muted' }
      : ratio < 0.1
        ? { text: '거의 동일', tone: 'even' }
        : { text: `약 ${Math.round(ratio * 20) * 5}% 저렴`, tone: 'good' };
  return { works, each, verdict };
});

const FAQ = [
  {
    q: '무료 플랜과 유료의 차이는?',
    a: '무료로도 공고 등록부터 지원자 검토, 오디션 일정, 결과 안내까지 작품 하나를 끝까지 진행할 수 있어요. 여러 제작진이 함께 평가하고 후보를 비교하는 기능, 배역·팀원 한도 확장은 프로젝트 패스에서 열려요.',
  },
  {
    q: '팀원은 몇 명까지 초대할 수 있나요?',
    a: '프로젝트 패스는 팀원 수에 제한이 없어요. 패스는 작품마다 적용되기 때문에 다른 작품을 진행하려면 그 작품의 패스가 따로 필요해요. 여러 제작팀이 함께 이용한다면 단체구매가 더 저렴해요.',
  },
  {
    q: '학기 패스와 단체구매는 뭐가 다른가요?',
    a: '학기 패스는 한 제작팀이 여러 작품을 만드는 경우, 단체구매는 서로 다른 제작팀이 비용을 함께 부담하는 경우예요.',
  },
  {
    q: '이용권은 언제부터 기간이 시작되나요?',
    a: '작품 이용권은 활성화한 날부터 90일간 사용할 수 있어요. 미사용 이용권의 활성화 기한과 환불·양도 조건은 별도 안내돼요.',
  },
];

/** 비교표의 값 칸. 기호만 있는 칸은 화면 낭독기가 뜻을 읽을 수 있게 이름을 붙인다. */
function DiffCell({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className={styles.yes} role="img" aria-label="포함">
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span className={styles.no} role="img" aria-label="미포함">
        —
      </span>
    );
  }
  if (value === SOON) return <span className={`${styles.chip} ${styles.muted}`}>{value}</span>;
  return <>{value}</>;
}

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.top}>
          <Link href="/" className={styles.logo}>
            <img src="/brand/mark.png" alt="" width={30} height={30} />
            <strong>캐스팅플로우</strong>
            <span>CastingFlow</span>
          </Link>
          <nav className={styles.nav}>
            <a href="#plans" className={styles.navOn}>
              요금제
            </a>
            <a href="#diff">무료와 차이</a>
            <a href="#group">단체구매</a>
            <a href="#faq">자주 묻는 질문</a>
          </nav>
        </header>

        <section className={styles.hero}>
          <span className={styles.pill}>PRICING</span>
          <h1>
            캐스팅은 <em>작품 단위</em>로,
            <br />
            필요한 만큼만 결제하세요
          </h1>
          <p>
            지원자 검토부터 공동 선발까지. 한 작품만 찍는 팀도, 여러 팀이 모인 동아리·학과도{' '}
            <br className={styles.desk} />
            각자에게 맞는 방식으로 이용할 수 있어요.
          </p>
        </section>

        <section id="plans" className={styles.plans}>
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`${styles.plan}${plan.featured ? ` ${styles.featured}` : ''}`}
            >
              {plan.featured && <span className={styles.flag}>기준 상품</span>}
              <h2>{plan.name}</h2>
              <p className={styles.planDesc}>{plan.desc}</p>
              <div className={styles.price}>
                <strong>{won(plan.price)}</strong>
                <span className={styles.wonUnit}>원</span>
                {plan.unit && <span className={styles.per}>{plan.unit}</span>}
              </div>
              <p className={styles.priceSub}>{plan.sub ?? ' '}</p>
              <Link
                href={plan.href}
                className={`${styles.cta}${plan.featured ? ` ${styles.ctaOn}` : ''}`}
              >
                {plan.cta}
              </Link>
              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li key={feature.text} className={feature.on ? '' : styles.off}>
                    <i aria-hidden>{feature.on ? '✓' : '−'}</i>
                    {feature.text}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section id="diff" className={styles.section}>
          <div className={styles.head}>
            <div>
              <span className={styles.eyebrow}>FREE VS PASS</span>
              <h2>무료와 프로젝트 패스, 무엇이 다른가요?</h2>
            </div>
          </div>
          <div className={styles.points}>
            {POINTS.map((point) => (
              <div key={point.title}>
                <h3>{point.title}</h3>
                <p>{point.body}</p>
              </div>
            ))}
          </div>
          <div className={styles.panel}>
            <table
              className={`${styles.table} ${styles.diff}`}
              aria-label="무료와 프로젝트 패스 비교"
            >
              <thead>
                <tr>
                  <th scope="col">기능</th>
                  <th scope="col">무료</th>
                  <th scope="col">
                    프로젝트 패스 <span className={styles.lime}>{won(PASS)}원</span>
                  </th>
                </tr>
              </thead>
              {DIFF.map((section) => (
                <tbody key={section.group}>
                  <tr className={styles.diffGroup}>
                    <th colSpan={3} scope="rowgroup">
                      {section.group}
                    </th>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={row.name}>
                      <td>
                        {row.name}
                        {row.note && <span className={styles.diffNote}> {row.note}</span>}
                      </td>
                      <td>
                        <DiffCell value={row.free} />
                      </td>
                      <td>
                        <DiffCell value={row.pass} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </section>

        <section id="group" className={styles.section}>
          <div className={styles.head}>
            <div>
              <span className={styles.eyebrow}>GROUP PURCHASE</span>
              <h2>함께 사면 작품당 더 저렴하게</h2>
            </div>
            <p>
              영화동아리나 여러 제작팀이 이용권을 한 번에 구매하고 나눠 쓰는 단체구매 패키지예요.{' '}
              <br className={styles.desk} />
              학과 예산이 없어도 실제 수요만큼만 살 수 있어요.
            </p>
          </div>
          <div className={styles.group}>
            {GROUP.map((item, index) => (
              <div key={item.label} className={styles.groupCell}>
                <div className={styles.groupLabel}>
                  {item.label}
                  <span className={index === 0 ? styles.tagOutline : styles.tagLime}>
                    {item.badge}
                  </span>
                </div>
                <div className={styles.groupPrice}>
                  <strong>{won(item.price)}</strong>
                  <span>원 / 작품</span>
                </div>
                <p className={styles.groupNote}>
                  {item.was ? (
                    <>
                      <s>{won(item.was)}원</s> 총 {won(item.total!)}원
                    </>
                  ) : (
                    item.note
                  )}
                </p>
              </div>
            ))}
          </div>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step}>
                <span>STEP 0{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <div className={styles.head}>
            <div>
              <span className={styles.eyebrow}>WHICH PLAN</span>
              <h2>우리 팀에 맞는 요금제는?</h2>
            </div>
            <p className={styles.headBottom}>
              이용할 작품 수에 따라 가장 경제적인 선택이 달라져요.
            </p>
          </div>
          <div className={styles.compare}>
            <div className={styles.panel}>
              <h3>프로젝트 패스 vs 학기 패스</h3>
              <p className={styles.panelSub}>6개월 동안 제작하는 작품 수 기준</p>
              <div className={styles.legend}>
                <span>
                  <i className={styles.dotGray} />
                  프로젝트 패스 반복 구매
                </span>
                <span>
                  <i className={styles.dotLime} />
                  학기 패스
                </span>
              </div>
              <div className={styles.bars}>
                {COUNTS.map((count) => {
                  const pass = PASS * count;
                  const saving = pass - SEMESTER;
                  return (
                    <div key={count} className={styles.barRow}>
                      <span className={styles.barLabel}>{count}작품</span>
                      <div className={styles.barTrack}>
                        <i
                          className={styles.barGray}
                          style={{ width: `${(pass / CHART_MAX) * 100}%` }}
                        />
                        <i
                          className={styles.barLime}
                          style={{ width: `${(SEMESTER / CHART_MAX) * 100}%` }}
                        />
                      </div>
                      <span className={saving > 0 ? styles.barSave : styles.barNote}>
                        {saving > 0 ? `−${won(saving)}원` : '개별이 저렴'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>작품 수</th>
                    {COUNTS.map((count) => (
                      <th key={count}>{count}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>프로젝트 패스</td>
                    {COUNTS.map((count) => (
                      <td key={count}>{won(PASS * count)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>학기 패스</td>
                    {COUNTS.map((count) => (
                      <td key={count} className={PASS * count > SEMESTER ? styles.lime : ''}>
                        {won(SEMESTER)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.panel}>
              <h3>학과 라이선스 작품당 비용</h3>
              <p className={styles.panelSub}>
                연 {won(LICENSE)}원 ÷ 연간 이용 작품 수 · 개별 구매({won(PASS)}원) 대비
              </p>
              <table className={`${styles.table} ${styles.license}`}>
                <thead>
                  <tr>
                    <th>연간 이용 작품 수</th>
                    <th>작품당 비용</th>
                    <th>개별 구매 대비</th>
                  </tr>
                </thead>
                <tbody>
                  {LICENSE_ROWS.map((row) => (
                    <tr key={row.works}>
                      <td>{row.works}편</td>
                      <td>{won(row.each)}원</td>
                      <td>
                        <span className={`${styles.chip} ${styles[row.verdict.tone]}`}>
                          {row.verdict.text}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* 단체 이용권 값은 위 GROUP 가격으로 계산한 것이다: 30편 = 10개 묶음 3번(477,000원),
                  36편 = 거기에 5개 묶음 1번과 낱개 1개(586,400원). 37편은 606,300원으로 라이선스(600,000원)를 넘는다.
                  묶음·라이선스 가격을 바꾸면 이 문장도 함께 고친다. */}
              <p className={styles.panelFoot}>
                연 36편까지는 단체 이용권이 더 저렴해요 (30편 477,000원 · 36편 586,400원). 학과
                라이선스는 연 37편부터 유리해요.
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className={styles.section}>
          <div className={styles.head}>
            <div>
              <span className={styles.eyebrow}>FAQ</span>
              <h2>자주 묻는 질문</h2>
            </div>
          </div>
          <div className={styles.faq}>
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.foot}>
          <span>© 캐스팅플로우 · CastingFlow</span>
          <span>※ 표시 가격은 검증 중인 테스트 가격이며, 결과에 따라 변경될 수 있습니다.</span>
        </footer>
      </div>
    </div>
  );
}
