/**
 * 피복 구매관리 시스템 E2E 테스트 3회 반복 (v2)
 * 대상: https://clothing-mqyb.vercel.app
 * 사전 확인 결과: admin1 계정만 Supabase에 등록됨
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'https://clothing-mqyb.vercel.app';
const SHOT_DIR = 'tests/screenshots_3rounds';

if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = { round1: [], round2: [], round3: [] };

function log(round, id, name, status, detail) {
  if (!detail) detail = '';
  results[round].push({ id, name, status, detail });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(icon + ' ' + id + ' | ' + name + ' | ' + detail);
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: SHOT_DIR + '/' + name + '.png', fullPage: false });
  } catch (_) {}
}

async function adminLogin(page) {
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.locator('input[name="email"]').fill('admin1@test.com');
  await page.locator('input[type="password"]').fill('test1234');
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(6000);
  return page.url();
}

async function adminLogout(page) {
  try {
    const btn = page.locator('button:has-text("로그아웃")').first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(3000);
    }
  } catch (_) {}
}

async function tryLogin(page, email, password) {
  await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(6000);
  return page.url();
}

// ==================================================
// 1차 테스트: 기본 로그인 및 대시보드 접근
// ==================================================
async function round1(browser) {
  console.log('\n===== 1차 테스트: 기본 로그인 및 대시보드 접근 =====');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // T1-01: admin1 로그인
  try {
    const url = await adminLogin(page);
    await shot(page, 'R1_01_admin_login');
    const ok = url.includes('/admin');
    log('round1', 'T1-01', 'admin1 로그인 성공', ok ? 'PASS' : 'FAIL', '이동URL: ' + url.replace(BASE_URL, ''));
  } catch (e) {
    log('round1', 'T1-01', 'admin1 로그인 성공', 'FAIL', e.message.substring(0, 80));
  }

  // T1-02: admin 대시보드 정상 표시
  try {
    const body = await page.locator('body').textContent({ timeout: 5000 });
    await shot(page, 'R1_02_admin_dashboard');
    const ok = body.includes('군수담당자 대시보드') || body.includes('대시보드');
    log('round1', 'T1-02', 'admin 대시보드 정상 표시', ok ? 'PASS' : 'FAIL', 'URL: ' + page.url().replace(BASE_URL, ''));
  } catch (e) {
    log('round1', 'T1-02', 'admin 대시보드 정상 표시', 'FAIL', e.message.substring(0, 80));
  }

  // T1-03: admin 로그아웃
  try {
    await adminLogout(page);
    await shot(page, 'R1_03_admin_logout');
    const url = page.url();
    const ok = url === BASE_URL + '/' || url.endsWith('/');
    log('round1', 'T1-03', 'admin 로그아웃', ok ? 'PASS' : 'FAIL', '로그아웃 후 URL: ' + url.replace(BASE_URL, ''));
  } catch (e) {
    log('round1', 'T1-03', 'admin 로그아웃', 'FAIL', e.message.substring(0, 80));
  }

  // T1-04: store1 로그인 시도 (계정 Supabase 미등록)
  try {
    const url = await tryLogin(page, 'store1@test.com', 'test1234');
    await shot(page, 'R1_04_store_login');
    const ok = url.includes('/store');
    log('round1', 'T1-04', 'store1 로그인', ok ? 'PASS' : 'FAIL',
      ok ? '이동URL: ' + url.replace(BASE_URL, '') : '[버그] store1 계정 Supabase 미등록 - 로그인 불가, 현재URL: ' + url.replace(BASE_URL, ''));
  } catch (e) {
    log('round1', 'T1-04', 'store1 로그인', 'FAIL', e.message.substring(0, 80));
  }

  // T1-05: tailor1 로그인 시도
  try {
    const url = await tryLogin(page, 'tailor1@test.com', 'test1234');
    await shot(page, 'R1_05_tailor_login');
    const ok = url.includes('/tailor');
    log('round1', 'T1-05', 'tailor1 로그인', ok ? 'PASS' : 'FAIL',
      ok ? '이동URL: ' + url.replace(BASE_URL, '') : '[버그] tailor1 계정 Supabase 미등록 - 로그인 불가, 현재URL: ' + url.replace(BASE_URL, ''));
  } catch (e) {
    log('round1', 'T1-05', 'tailor1 로그인', 'FAIL', e.message.substring(0, 80));
  }

  // T1-06: user01 로그인 시도
  try {
    const url = await tryLogin(page, 'user01@test.com', 'test1234');
    await shot(page, 'R1_06_user_login');
    const ok = url.includes('/my');
    log('round1', 'T1-06', 'user01 로그인', ok ? 'PASS' : 'FAIL',
      ok ? '이동URL: ' + url.replace(BASE_URL, '') : '[버그] user01 계정 Supabase 미등록 - 로그인 불가, 현재URL: ' + url.replace(BASE_URL, ''));
  } catch (e) {
    log('round1', 'T1-06', 'user01 로그인', 'FAIL', e.message.substring(0, 80));
  }

  // T1-07: 잘못된 계정 에러 확인
  try {
    await page.goto(BASE_URL + '/', { waitUntil: 'networkidle', timeout: 20000 });
    await page.locator('input[name="email"]').fill('wrong@test.com');
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(5000);
    await shot(page, 'R1_07_invalid_login');
    const url = page.url();
    const body = await page.locator('body').textContent({ timeout: 3000 });
    const hasError = body.includes('오류') || body.includes('잘못') || body.includes('error') || body.includes('invalid') || body.includes('이메일');
    const stayLogin = url === BASE_URL + '/' || url.endsWith('/');
    log('round1', 'T1-07', '잘못된 계정 에러 표시', (stayLogin || hasError) ? 'PASS' : 'FAIL',
      '에러메시지: ' + hasError + ', 로그인페이지 유지: ' + stayLogin);
  } catch (e) {
    log('round1', 'T1-07', '잘못된 계정 에러 표시', 'FAIL', e.message.substring(0, 80));
  }

  await ctx.close();
  const r1 = results.round1;
  console.log('1차 완료: ' + r1.filter(r => r.status === 'PASS').length + '/' + r1.length + ' 통과 (실패: ' + r1.filter(r => r.status === 'FAIL').length + ')');
}

// ==================================================
// 2차 테스트: 핵심 기능 동작 (admin1 계정 위주)
// ==================================================
async function round2(browser) {
  console.log('\n===== 2차 테스트: 핵심 기능 동작 =====');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  await adminLogin(page);

  const adminPageTests = [
    { id: 'T2-01', name: 'admin 사용자 목록 조회', path: '/admin/users', keywords: ['사용자', 'user', '홍관리', '이름'] },
    { id: 'T2-02', name: 'admin 포인트 지급 화면', path: '/admin/points', keywords: ['포인트', '지급', '산정'] },
    { id: 'T2-03', name: 'admin 품목 관리 조회', path: '/admin/products', keywords: ['품목', '동근무복', '전투', '분류'] },
    { id: 'T2-04', name: 'admin 주문 관리 조회', path: '/admin/orders', keywords: ['주문', 'order', '판매'] },
    { id: 'T2-05', name: 'admin 체척권 관리', path: '/admin/tickets', keywords: ['체척', 'ticket', 'TK-', 'TKT-'] },
    { id: 'T2-06', name: 'admin 판매소 관리', path: '/admin/stores', keywords: ['판매소', '제1', '이름'] },
    { id: 'T2-07', name: 'admin 체척업체 관리', path: '/admin/tailors', keywords: ['업체', '대한', '우리'] },
  ];

  for (const t of adminPageTests) {
    try {
      await page.goto(BASE_URL + t.path, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);
      const shotName = 'R2_' + t.id.replace('T2-', '') + '_page';
      await shot(page, shotName);
      const body = await page.locator('body').textContent({ timeout: 5000 });
      const found = t.keywords.some(kw => body.includes(kw));
      const finalUrl = page.url().replace(BASE_URL, '');
      log('round2', t.id, t.name, found ? 'PASS' : 'FAIL', 'URL: ' + finalUrl);
    } catch (e) {
      log('round2', t.id, t.name, 'FAIL', e.message.substring(0, 80));
    }
  }

  // store/tailor/user 기능 - 계정 미존재로 FAIL 처리
  log('round2', 'T2-08', 'store 재고 현황 조회', 'FAIL', '[버그] store1 계정 Supabase 미등록 - 테스트 불가');
  log('round2', 'T2-09', 'tailor 체척권 목록 조회', 'FAIL', '[버그] tailor1 계정 Supabase 미등록 - 테스트 불가');
  log('round2', 'T2-10', 'user 포인트 잔액 조회', 'FAIL', '[버그] user01 계정 Supabase 미등록 - 테스트 불가');
  log('round2', 'T2-11', 'user 주문 내역 조회', 'FAIL', '[버그] user01 계정 Supabase 미등록 - 테스트 불가');

  await adminLogout(page);
  await ctx.close();
  const r2 = results.round2;
  console.log('2차 완료: ' + r2.filter(r => r.status === 'PASS').length + '/' + r2.length + ' 통과 (실패: ' + r2.filter(r => r.status === 'FAIL').length + ')');
}

// ==================================================
// 3차 테스트: 역할별 접근 제어
// ==================================================
async function round3(browser) {
  console.log('\n===== 3차 테스트: 역할별 접근 제어 =====');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // 비로그인 상태 접근 제어
  const nologinTests = [
    { id: 'T3-01', name: '비로그인 /admin 리다이렉트', path: '/admin' },
    { id: 'T3-02', name: '비로그인 /store 리다이렉트', path: '/store' },
    { id: 'T3-03', name: '비로그인 /tailor 리다이렉트', path: '/tailor' },
    { id: 'T3-04', name: '비로그인 /my 리다이렉트', path: '/my' },
    { id: 'T3-05', name: '비로그인 /admin/users 리다이렉트', path: '/admin/users' },
    { id: 'T3-06', name: '비로그인 /admin/points 리다이렉트', path: '/admin/points' },
  ];

  for (const t of nologinTests) {
    try {
      await page.goto(BASE_URL + t.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      const url = page.url();
      const isRedirected = url === BASE_URL + '/' || url.endsWith('/');
      await shot(page, 'R3_' + t.id.replace('T3-', '') + '_nologin');
      log('round3', t.id, t.name, isRedirected ? 'PASS' : 'FAIL', '리다이렉트URL: ' + url.replace(BASE_URL, ''));
    } catch (e) {
      log('round3', t.id, t.name, 'FAIL', e.message.substring(0, 80));
    }
  }

  // admin 계정으로 타 역할 경로 접근 테스트
  await adminLogin(page);

  const crossTests = [
    { id: 'T3-07', name: 'admin→/store 접근 제어', path: '/store' },
    { id: 'T3-08', name: 'admin→/tailor 접근 제어', path: '/tailor' },
    { id: 'T3-09', name: 'admin→/my 접근 제어', path: '/my' },
    { id: 'T3-10', name: 'admin→/store/dashboard 접근 제어', path: '/store/dashboard' },
  ];

  for (const t of crossTests) {
    try {
      await page.goto(BASE_URL + t.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      const url = page.url();
      const redirectedToAdmin = url.includes('/admin');
      await shot(page, 'R3_' + t.id.replace('T3-', '') + '_cross');
      log('round3', t.id, t.name, redirectedToAdmin ? 'PASS' : 'FAIL', '결과URL: ' + url.replace(BASE_URL, ''));
    } catch (e) {
      log('round3', t.id, t.name, 'FAIL', e.message.substring(0, 80));
    }
  }

  await adminLogout(page);
  await ctx.close();
  const r3 = results.round3;
  console.log('3차 완료: ' + r3.filter(r => r.status === 'PASS').length + '/' + r3.length + ' 통과 (실패: ' + r3.filter(r => r.status === 'FAIL').length + ')');
}

// ==================================================
// 메인 실행
// ==================================================
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

try {
  await round1(browser);
  await round2(browser);
  await round3(browser);
} finally {
  await browser.close();
}

// 결과 저장
const all = [...results.round1, ...results.round2, ...results.round3];
const total = all.length;
const pass = all.filter(r => r.status === 'PASS').length;
const fail = all.filter(r => r.status === 'FAIL').length;
const warn = all.filter(r => r.status === 'WARN').length;

const output = {
  테스트일시: new Date().toISOString(),
  대상URL: BASE_URL,
  합계: { 전체: total, 통과: pass, 실패: fail, 경고: warn },
  round1: {
    설명: '1차 테스트: 기본 로그인 및 대시보드 접근',
    통과: results.round1.filter(r => r.status === 'PASS').length,
    실패: results.round1.filter(r => r.status === 'FAIL').length,
    결과: results.round1
  },
  round2: {
    설명: '2차 테스트: 핵심 기능 동작',
    통과: results.round2.filter(r => r.status === 'PASS').length,
    실패: results.round2.filter(r => r.status === 'FAIL').length,
    결과: results.round2
  },
  round3: {
    설명: '3차 테스트: 역할별 접근 제어',
    통과: results.round3.filter(r => r.status === 'PASS').length,
    실패: results.round3.filter(r => r.status === 'FAIL').length,
    결과: results.round3
  }
};

fs.writeFileSync('tests/e2e_3rounds_results.json', JSON.stringify(output, null, 2));

console.log('\n========== 최종 결과 요약 ==========');
console.log('1차: ' + results.round1.filter(r => r.status === 'PASS').length + '/' + results.round1.length + ' 통과 (FAIL: ' + results.round1.filter(r => r.status === 'FAIL').length + ')');
console.log('2차: ' + results.round2.filter(r => r.status === 'PASS').length + '/' + results.round2.length + ' 통과 (FAIL: ' + results.round2.filter(r => r.status === 'FAIL').length + ')');
console.log('3차: ' + results.round3.filter(r => r.status === 'PASS').length + '/' + results.round3.length + ' 통과 (FAIL: ' + results.round3.filter(r => r.status === 'FAIL').length + ')');
console.log('합계: ' + pass + '/' + total + ' 통과 (FAIL: ' + fail + ', WARN: ' + warn + ')');
console.log('결과: tests/e2e_3rounds_results.json');
