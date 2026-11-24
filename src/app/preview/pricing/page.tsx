/* eslint-disable @next/next/no-img-element */
// 요금제 안내 페이지(숨김). 메뉴·사이트맵 어디에도 연결하지 않고, 주소를 아는 사람만 연다.
// 로그인 없이 볼 수 있고, 검색엔진에는 나오지 않게 noindex를 단다.
// 가격은 검증 중인 시험 가격이다. 결제 기능은 아직 없어서 구매 버튼은 문의 화면으로 보낸다.

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
    cta: '무료로 시작하기',
    href: '/signup/producer',
    features: [
      { text: '배우 모집 공고 등록', on: true },
      { text: '지원자 접수 · 기본 관리', on: true },
      { text: '공동 평가 · 투표', on: false },
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
      { text: '제작진 공동 평가 · 투표', on: true },
      { text: '후보 비교 화면', on: true },
      { text: '팀원 공동 선발 워크플로우', on: true },
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
    q: '학기 패스와 단체구매는 뭐가 다른가요?',
    a: '학기 패스는 한 제작팀이 여러 작품을 만드는 경우, 단체구매는 서로 다른 제작팀이 비용을 함께 부담하는 경우예요.',
  },
  {
    q: '무료 플랜과 유료의 차이는?',
    a: '무료 플랜은 지원자 접수와 기본 관리까지. 여러 제작진이 함께 평가·투표하고 후보를 비교하는 기능은 유료 패스에서 열려요.',
  },
  {
    q: '이용권은 언제부터 기간이 시작되나요?',
    a: '작품 이용권은 활성화한 날부터 90일간 사용할 수 있어요. 미사용 이용권의 활성화 기한과 환불·양도 조건은 별도 안내돼요.',
  },
];

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
            <Link href="/">기능</Link>
            <a href="#plans" className={styles.navOn}>
              요금제
            </a>
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
              <p className={styles.panelFoot}>연 30편 미만이라면 단체구매 패키지가 더 유리해요.</p>
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
