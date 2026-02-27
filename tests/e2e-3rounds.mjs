/**
 * 피복 구매관리 시스템 E2E 테스트 - 3회 반복
 * 대상: https://clothing-mqyb.vercel.app
 * 테스트 계정: admin1/store1/tailor1/user01 (비밀번호: test1234)
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://clothing-mqyb.vercel.app';
const SHOT_DIR = 'tests/screenshots_3rounds';

if (!fs.existsSync(SHOT_DIR)) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

const allResults = { round1: [], round2: [], round3: [] };

function log(round, id, name, status, detail = '') {
  allResults[round].push({ id, name, status, detail, timestamp: new Date().toISOString() });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`  ${icon} ${id} | ${name} | ${detail}`);
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: false });
  } catch (_) {}
}

async function doLogin(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const pwInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await emailInput.fill(email);
  await pwInput.fill(password);
  await submitBtn.click();
  await page.waitForTimeout(4000);
  return page.url();
}

async function doLogout(page) {
  try {
    // 로그아웃 버튼 찾기 (다양한 selector 시도)
    const logoutBtn = page.locator('button:has-text("로그아웃"), a:has-text("로그아웃"), [data-logout]').first();
    if (await logoutBtn.isVisible({ timeout: 3000 })) {
      await logoutBtn.click();
      await page.waitForTimeout(3000);
      return true;
    }
    // 직접 로그아웃 URL 접근
    await page.goto(`${BASE_URL}/api/auth/signout`, { timeout: 10000 }).catch(() => {});
    await page.goto(`${BASE_URL}/login`, { timeout: 10000 });
    await page.waitForTimeout(2000);
    return true;
  } catch (e) {
    return false;
  }
}

// =============================================
// 1차 테스트: 기본 로그인 및 대시보드 접근
// =============================================
async function runRound1(browser) {
  console.log('\n========== 1차 테스트: 기본 로그인 및 대시보드 접근 ==========');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // T1-01: admin 로그인
  try {
    const url = await doLogin(page, 'admin1@test.com', 'test1234');
    await shot(page, 'R1_01_admin_login');
    const isAdminPage = url.includes('/admin');
    log('round1', 'T1-01', 'admin 로그인', isAdminPage ? 'PASS' : 'FAIL',
      `이동 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-01', 'admin 로그인', 'FAIL', e.message.substring(0, 100));
  }

  // T1-02: admin 대시보드 정상 표시
  try {
    const title = await page.title();
    const h1 = await page.locator('h1, h2').first().textContent({ timeout: 5000 }).catch(() => '');
    await shot(page, 'R1_02_admin_dashboard');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasDashboard = bodyText.includes('대시') || bodyText.includes('관리') || bodyText.includes('admin');
    log('round1', 'T1-02', 'admin 대시보드 표시', hasDashboard ? 'PASS' : 'WARN',
      `제목: ${title}, h1: ${h1}`);
  } catch (e) {
    log('round1', 'T1-02', 'admin 대시보드 표시', 'FAIL', e.message.substring(0, 100));
  }

  // T1-03: admin 로그아웃
  try {
    await doLogout(page);
    await shot(page, 'R1_03_admin_logout');
    const url = page.url();
    const isLoggedOut = url.includes('/login') || url === BASE_URL + '/';
    log('round1', 'T1-03', 'admin 로그아웃', isLoggedOut ? 'PASS' : 'WARN',
      `현재 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-03', 'admin 로그아웃', 'FAIL', e.message.substring(0, 100));
  }

  // T1-04: store 로그인
  try {
    const url = await doLogin(page, 'store1@test.com', 'test1234');
    await shot(page, 'R1_04_store_login');
    const isStorePage = url.includes('/store');
    log('round1', 'T1-04', 'store 로그인', isStorePage ? 'PASS' : 'FAIL',
      `이동 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-04', 'store 로그인', 'FAIL', e.message.substring(0, 100));
  }

  // T1-05: store 대시보드 정상 표시
  try {
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    await shot(page, 'R1_05_store_dashboard');
    const hasDashboard = bodyText.includes('판매소') || bodyText.includes('재고') || bodyText.includes('대시');
    log('round1', 'T1-05', 'store 대시보드 표시', hasDashboard ? 'PASS' : 'WARN',
      `페이지 URL: ${page.url()}`);
  } catch (e) {
    log('round1', 'T1-05', 'store 대시보드 표시', 'FAIL', e.message.substring(0, 100));
  }

  // T1-06: store 로그아웃
  try {
    await doLogout(page);
    const url = page.url();
    log('round1', 'T1-06', 'store 로그아웃', url.includes('/login') || url.endsWith('/') ? 'PASS' : 'WARN',
      `현재 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-06', 'store 로그아웃', 'FAIL', e.message.substring(0, 100));
  }

  // T1-07: tailor 로그인
  try {
    const url = await doLogin(page, 'tailor1@test.com', 'test1234');
    await shot(page, 'R1_07_tailor_login');
    const isTailorPage = url.includes('/tailor');
    log('round1', 'T1-07', 'tailor 로그인', isTailorPage ? 'PASS' : 'FAIL',
      `이동 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-07', 'tailor 로그인', 'FAIL', e.message.substring(0, 100));
  }

  // T1-08: tailor 대시보드 정상 표시
  try {
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    await shot(page, 'R1_08_tailor_dashboard');
    const hasDashboard = bodyText.includes('체척') || bodyText.includes('업체') || bodyText.includes('tailor');
    log('round1', 'T1-08', 'tailor 대시보드 표시', hasDashboard ? 'PASS' : 'WARN',
      `페이지 URL: ${page.url()}`);
  } catch (e) {
    log('round1', 'T1-08', 'tailor 대시보드 표시', 'FAIL', e.message.substring(0, 100));
  }

  // T1-09: tailor 로그아웃
  try {
    await doLogout(page);
    const url = page.url();
    log('round1', 'T1-09', 'tailor 로그아웃', url.includes('/login') || url.endsWith('/') ? 'PASS' : 'WARN',
      `현재 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-09', 'tailor 로그아웃', 'FAIL', e.message.substring(0, 100));
  }

  // T1-10: user 로그인
  try {
    const url = await doLogin(page, 'user01@test.com', 'test1234');
    await shot(page, 'R1_10_user_login');
    const isUserPage = url.includes('/my');
    log('round1', 'T1-10', 'user 로그인', isUserPage ? 'PASS' : 'FAIL',
      `이동 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-10', 'user 로그인', 'FAIL', e.message.substring(0, 100));
  }

  // T1-11: user 대시보드 정상 표시
  try {
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    await shot(page, 'R1_11_user_dashboard');
    const hasDashboard = bodyText.includes('포인트') || bodyText.includes('주문') || bodyText.includes('대시');
    log('round1', 'T1-11', 'user 대시보드 표시', hasDashboard ? 'PASS' : 'WARN',
      `페이지 URL: ${page.url()}`);
  } catch (e) {
    log('round1', 'T1-11', 'user 대시보드 표시', 'FAIL', e.message.substring(0, 100));
  }

  // T1-12: user 로그아웃
  try {
    await doLogout(page);
    const url = page.url();
    log('round1', 'T1-12', 'user 로그아웃', url.includes('/login') || url.endsWith('/') ? 'PASS' : 'WARN',
      `현재 URL: ${url}`);
  } catch (e) {
    log('round1', 'T1-12', 'user 로그아웃', 'FAIL', e.message.substring(0, 100));
  }

  // T1-13: 잘못된 계정 로그인 시도
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();
    await emailInput.fill('wrong@test.com');
    await pwInput.fill('wrongpass');
    await submitBtn.click();
    await page.waitForTimeout(4000);
    await shot(page, 'R1_13_invalid_login');
    const url = page.url();
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasError = bodyText.includes('오류') || bodyText.includes('실패') || bodyText.includes('error') ||
                     bodyText.includes('잘못') || bodyText.includes('incorrect') || bodyText.includes('invalid');
    const stayedOnLogin = url.includes('/login') || url.endsWith('/');
    log('round1', 'T1-13', '잘못된 계정 로그인 에러 표시',
      (hasError || stayedOnLogin) ? 'PASS' : 'FAIL',
      `URL: ${url}, 에러메시지: ${hasError}`);
  } catch (e) {
    log('round1', 'T1-13', '잘못된 계정 로그인 에러 표시', 'FAIL', e.message.substring(0, 100));
  }

  await context.close();
  console.log(`  1차 테스트 완료: ${allResults.round1.filter(r=>r.status==='PASS').length}/${allResults.round1.length} 통과`);
}

// =============================================
// 2차 테스트: 핵심 기능 동작
// =============================================
async function runRound2(browser) {
  console.log('\n========== 2차 테스트: 핵심 기능 동작 ==========');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // admin 로그인
  await doLogin(page, 'admin1@test.com', 'test1234');

  // T2-01: admin 사용자 목록 조회
  try {
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_01_admin_users');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasUsers = bodyText.includes('사용자') || bodyText.includes('user') || bodyText.includes('이대령') || bodyText.includes('홍관리');
    log('round2', 'T2-01', 'admin 사용자 목록 조회', hasUsers ? 'PASS' : 'FAIL',
      `URL: ${page.url()}, 사용자 데이터 표시: ${hasUsers}`);
  } catch (e) {
    log('round2', 'T2-01', 'admin 사용자 목록 조회', 'FAIL', e.message.substring(0, 100));
  }

  // T2-02: admin 포인트 지급 화면 접근
  try {
    await page.goto(`${BASE_URL}/admin/points`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_02_admin_points');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasPoints = bodyText.includes('포인트') || bodyText.includes('지급') || bodyText.includes('point');
    log('round2', 'T2-02', 'admin 포인트 지급 화면', hasPoints ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-02', 'admin 포인트 지급 화면', 'FAIL', e.message.substring(0, 100));
  }

  // T2-03: admin 품목 관리 조회
  try {
    await page.goto(`${BASE_URL}/admin/products`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_03_admin_products');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasProducts = bodyText.includes('품목') || bodyText.includes('product') || bodyText.includes('동근무복') || bodyText.includes('전투복');
    log('round2', 'T2-03', 'admin 품목 관리 조회', hasProducts ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-03', 'admin 품목 관리 조회', 'FAIL', e.message.substring(0, 100));
  }

  // T2-04: admin 주문 관리 조회
  try {
    await page.goto(`${BASE_URL}/admin/orders`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_04_admin_orders');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasOrders = bodyText.includes('주문') || bodyText.includes('order') || bodyText.includes('pending') || bodyText.includes('ORD-');
    log('round2', 'T2-04', 'admin 주문 관리 조회', hasOrders ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-04', 'admin 주문 관리 조회', 'FAIL', e.message.substring(0, 100));
  }

  // store 로그인
  await doLogout(page);
  await doLogin(page, 'store1@test.com', 'test1234');

  // T2-05: store 상품 목록 조회
  try {
    await page.goto(`${BASE_URL}/store/products`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_05_store_products');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasProducts = bodyText.includes('품목') || bodyText.includes('product') || bodyText.includes('동근무복') || bodyText.includes('전투');
    log('round2', 'T2-05', 'store 상품 목록 조회', hasProducts ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-05', 'store 상품 목록 조회', 'FAIL', e.message.substring(0, 100));
  }

  // T2-06: store 재고 현황 조회
  try {
    await page.goto(`${BASE_URL}/store/inventory`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_06_store_inventory');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasInventory = bodyText.includes('재고') || bodyText.includes('inventory') || bodyText.includes('수량');
    log('round2', 'T2-06', 'store 재고 현황 조회', hasInventory ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-06', 'store 재고 현황 조회', 'FAIL', e.message.substring(0, 100));
  }

  // T2-07: store 주문 관리 조회
  try {
    await page.goto(`${BASE_URL}/store/orders`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_07_store_orders');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasOrders = bodyText.includes('주문') || bodyText.includes('order');
    log('round2', 'T2-07', 'store 주문 관리 조회', hasOrders ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-07', 'store 주문 관리 조회', 'FAIL', e.message.substring(0, 100));
  }

  // tailor 로그인
  await doLogout(page);
  await doLogin(page, 'tailor1@test.com', 'test1234');

  // T2-08: tailor 체척권 목록 조회
  try {
    await page.goto(`${BASE_URL}/tailor/tickets`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_08_tailor_tickets');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasTickets = bodyText.includes('체척') || bodyText.includes('ticket') || bodyText.includes('TK-') || bodyText.includes('TKT-');
    log('round2', 'T2-08', 'tailor 체척권 목록 조회', hasTickets ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-08', 'tailor 체척권 목록 조회', 'FAIL', e.message.substring(0, 100));
  }

  // user 로그인
  await doLogout(page);
  await doLogin(page, 'user01@test.com', 'test1234');

  // T2-09: user 포인트 잔액 조회
  try {
    await page.goto(`${BASE_URL}/my/points`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_09_user_points');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasPoints = bodyText.includes('포인트') || bodyText.includes('point') || bodyText.match(/\d{3,}/);
    log('round2', 'T2-09', 'user 포인트 잔액 조회', hasPoints ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-09', 'user 포인트 잔액 조회', 'FAIL', e.message.substring(0, 100));
  }

  // T2-10: user 주문 내역 조회
  try {
    await page.goto(`${BASE_URL}/my/orders`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_10_user_orders');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    const hasOrders = bodyText.includes('주문') || bodyText.includes('order') || bodyText.includes('ORD-');
    log('round2', 'T2-10', 'user 주문 내역 조회', hasOrders ? 'PASS' : 'FAIL',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-10', 'user 주문 내역 조회', 'FAIL', e.message.substring(0, 100));
  }

  // T2-11: user 대시보드 포인트 수치 확인
  try {
    await page.goto(`${BASE_URL}/my`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R2_11_user_dashboard');
    const bodyText = await page.locator('body').textContent({ timeout: 5000 });
    // 이대령 계급은 colonel = 800000 + 호봉
    const hasPointAmount = bodyText.match(/[0-9,]{5,}/) !== null;
    log('round2', 'T2-11', 'user 대시보드 포인트 수치 표시', hasPointAmount ? 'PASS' : 'WARN',
      `URL: ${page.url()}`);
  } catch (e) {
    log('round2', 'T2-11', 'user 대시보드 포인트 수치 표시', 'FAIL', e.message.substring(0, 100));
  }

  await doLogout(page);
  await context.close();
  console.log(`  2차 테스트 완료: ${allResults.round2.filter(r=>r.status==='PASS').length}/${allResults.round2.length} 통과`);
}

// =============================================
// 3차 테스트: 역할별 접근 제어
// =============================================
async function runRound3(browser) {
  console.log('\n========== 3차 테스트: 역할별 접근 제어 ==========');
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // T3-01: 비로그인 상태로 /admin 접근 시 리다이렉트
  try {
    // 먼저 로그아웃 상태 확인 (로그인 페이지에서 시작)
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);
    // 비로그인 상태로 /admin 접근
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_01_nologin_admin');
    const url = page.url();
    const isRedirected = url.includes('/login') || url === BASE_URL + '/';
    log('round3', 'T3-01', '비로그인 /admin 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-01', '비로그인 /admin 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // T3-02: 비로그인 상태로 /store 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/store`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_02_nologin_store');
    const url = page.url();
    const isRedirected = url.includes('/login') || url === BASE_URL + '/';
    log('round3', 'T3-02', '비로그인 /store 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-02', '비로그인 /store 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // T3-03: 비로그인 상태로 /my 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/my`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_03_nologin_my');
    const url = page.url();
    const isRedirected = url.includes('/login') || url === BASE_URL + '/';
    log('round3', 'T3-03', '비로그인 /my 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-03', '비로그인 /my 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // user 계정으로 로그인 후 admin 접근 시도
  await doLogin(page, 'user01@test.com', 'test1234');
  const userLoginUrl = page.url();

  // T3-04: user 계정으로 /admin 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_04_user_to_admin');
    const url = page.url();
    const isRedirected = !url.includes('/admin') || url.includes('/login');
    log('round3', 'T3-04', 'user 계정 /admin 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-04', 'user 계정 /admin 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // T3-05: user 계정으로 /store 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/store`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_05_user_to_store');
    const url = page.url();
    const isRedirected = !url.includes('/store') || url.includes('/login') || url.includes('/my');
    log('round3', 'T3-05', 'user 계정 /store 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-05', 'user 계정 /store 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // store 계정으로 로그인 후 admin 접근 시도
  await doLogout(page);
  await doLogin(page, 'store1@test.com', 'test1234');

  // T3-06: store 계정으로 /admin 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_06_store_to_admin');
    const url = page.url();
    const isRedirected = !url.includes('/admin') || url.includes('/login');
    log('round3', 'T3-06', 'store 계정 /admin 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-06', 'store 계정 /admin 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // T3-07: store 계정으로 /tailor 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/tailor`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_07_store_to_tailor');
    const url = page.url();
    const isRedirected = !url.includes('/tailor') || url.includes('/store');
    log('round3', 'T3-07', 'store 계정 /tailor 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-07', 'store 계정 /tailor 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // tailor 계정으로 로그인
  await doLogout(page);
  await doLogin(page, 'tailor1@test.com', 'test1234');

  // T3-08: tailor 계정으로 /admin 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_08_tailor_to_admin');
    const url = page.url();
    const isRedirected = !url.includes('/admin') || url.includes('/login');
    log('round3', 'T3-08', 'tailor 계정 /admin 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-08', 'tailor 계정 /admin 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // T3-09: tailor 계정으로 /store 접근 시 리다이렉트
  try {
    await page.goto(`${BASE_URL}/store`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_09_tailor_to_store');
    const url = page.url();
    const isRedirected = !url.includes('/store') || url.includes('/tailor');
    log('round3', 'T3-09', 'tailor 계정 /store 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-09', 'tailor 계정 /store 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  // T3-10: admin 계정 /my 접근 시 리다이렉트
  await doLogout(page);
  await doLogin(page, 'admin1@test.com', 'test1234');
  try {
    await page.goto(`${BASE_URL}/my`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    await shot(page, 'R3_10_admin_to_my');
    const url = page.url();
    const isRedirected = !url.includes('/my') || url.includes('/admin');
    log('round3', 'T3-10', 'admin 계정 /my 접근 리다이렉트', isRedirected ? 'PASS' : 'FAIL',
      `리다이렉트 URL: ${url}`);
  } catch (e) {
    log('round3', 'T3-10', 'admin 계정 /my 접근 리다이렉트', 'FAIL', e.message.substring(0, 100));
  }

  await doLogout(page);
  await context.close();
  console.log(`  3차 테스트 완료: ${allResults.round3.filter(r=>r.status==='PASS').length}/${allResults.round3.length} 통과`);
}

// =============================================
// 메인 실행
// =============================================
async function main() {
  console.log('========================================================');
  console.log('  피복 구매관리 시스템 E2E 테스트 - 3회 반복');
  console.log(`  대상: ${BASE_URL}`);
  console.log(`  시작: ${new Date().toLocaleString('ko-KR')}`);
  console.log('========================================================');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await runRound1(browser);
    await runRound2(browser);
    await runRound3(browser);
  } finally {
    await browser.close();
  }

  // 결과 저장
  const summary = {
    테스트_일시: new Date().toISOString(),
    대상_URL: BASE_URL,
    round1: {
      설명: '1차 테스트: 기본 로그인 및 대시보드 접근',
      전체: allResults.round1.length,
      통과: allResults.round1.filter(r => r.status === 'PASS').length,
      실패: allResults.round1.filter(r => r.status === 'FAIL').length,
      경고: allResults.round1.filter(r => r.status === 'WARN').length,
      결과: allResults.round1
    },
    round2: {
      설명: '2차 테스트: 핵심 기능 동작',
      전체: allResults.round2.length,
      통과: allResults.round2.filter(r => r.status === 'PASS').length,
      실패: allResults.round2.filter(r => r.status === 'FAIL').length,
      경고: allResults.round2.filter(r => r.status === 'WARN').length,
      결과: allResults.round2
    },
    round3: {
      설명: '3차 테스트: 역할별 접근 제어',
      전체: allResults.round3.length,
      통과: allResults.round3.filter(r => r.status === 'PASS').length,
      실패: allResults.round3.filter(r => r.status === 'FAIL').length,
      경고: allResults.round3.filter(r => r.status === 'WARN').length,
      결과: allResults.round3
    }
  };

  const totalTests = summary.round1.전체 + summary.round2.전체 + summary.round3.전체;
  const totalPass = summary.round1.통과 + summary.round2.통과 + summary.round3.통과;
  const totalFail = summary.round1.실패 + summary.round2.실패 + summary.round3.실패;

  fs.writeFileSync('tests/e2e_3rounds_results.json', JSON.stringify(summary, null, 2), 'utf-8');

  console.log('\n========================================================');
  console.log('  최종 결과 요약');
  console.log('========================================================');
  console.log(`  1차: ${summary.round1.통과}/${summary.round1.전체} 통과 (실패: ${summary.round1.실패})`);
  console.log(`  2차: ${summary.round2.통과}/${summary.round2.전체} 통과 (실패: ${summary.round2.실패})`);
  console.log(`  3차: ${summary.round3.통과}/${summary.round3.전체} 통과 (실패: ${summary.round3.실패})`);
  console.log(`  합계: ${totalPass}/${totalTests} 통과 (실패: ${totalFail})`);
  console.log(`  결과 파일: tests/e2e_3rounds_results.json`);
  console.log(`  스크린샷: tests/screenshots_3rounds/`);
  console.log('========================================================');
}

main().catch(err => {
  console.error('테스트 실행 오류:', err);
  process.exit(1);
});
