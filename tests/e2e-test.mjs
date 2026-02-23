/**
 * 피복 구매관리 시스템 E2E 테스트
 * Playwright를 사용하여 주요 기능 테스트 수행
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'tests/screenshots';

// 스크린샷 디렉토리 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 테스트 결과 저장
const testResults = [];

function logResult(testId, testName, status, detail = '', screenshotPath = '') {
  const result = { testId, testName, status, detail, screenshotPath };
  testResults.push(result);
  const statusIcon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '?';
  console.log(`[${statusIcon}] ${testId} - ${testName}: ${status} ${detail ? '| ' + detail : ''}`);
}

async function takeScreenshot(page, name) {
  const filePath = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // 이메일 입력
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="이메일"], input[placeholder*="email"]').first();
  await emailInput.fill(email);

  // 비밀번호 입력
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  // 로그인 버튼 클릭
  const loginBtn = page.locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")').first();
  await loginBtn.click();

  await page.waitForLoadState('networkidle');
  return page.url();
}

async function runTests() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  console.log('\n========== 피복 구매관리 시스템 E2E 테스트 시작 ==========\n');

  try {
    // ===== 테스트 1: 서버 접근 확인 =====
    console.log('\n--- 기본 접근 테스트 ---');
    try {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      const title = await page.title();
      const url = page.url();
      await takeScreenshot(page, '01_homepage');
      logResult('T01', '서버 접근 확인', 'PASS', `URL: ${url}, 제목: ${title}`);
    } catch (e) {
      logResult('T01', '서버 접근 확인', 'FAIL', e.message);
    }

    // ===== 테스트 2: 로그인 페이지 확인 =====
    console.log('\n--- 로그인 테스트 ---');
    try {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      await takeScreenshot(page, '02_login_page');
      logResult('T02', '로그인 페이지 접근', 'PASS', `URL: ${page.url()}`);
    } catch (e) {
      logResult('T02', '로그인 페이지 접근', 'FAIL', e.message);
    }

    // ===== 테스트 3: admin 로그인 =====
    console.log('\n--- admin 로그인 테스트 ---');
    let adminLoggedIn = false;
    try {
      const url = await login(page, 'admin@test.com', '1111');
      await takeScreenshot(page, '03_admin_login');
      if (url.includes('/admin') || url.includes('/dashboard') || !url.includes('/login')) {
        logResult('T03', 'admin 로그인', 'PASS', `리다이렉트: ${url}`);
        adminLoggedIn = true;
      } else {
        logResult('T03', 'admin 로그인', 'FAIL', `로그인 실패, 현재 URL: ${url}`);
      }
    } catch (e) {
      logResult('T03', 'admin 로그인', 'FAIL', e.message);
    }

    // ===== 테스트 4: 사용자 관리 페이지 접근 =====
    if (adminLoggedIn) {
      console.log('\n--- 사용자 관리 테스트 ---');
      try {
        await page.goto(`${BASE_URL}/admin/users`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '04_admin_users');
        const pageContent = await page.content();
        if (pageContent.includes('사용자') || pageContent.includes('user')) {
          logResult('T04', '사용자 관리 페이지 접근', 'PASS', `URL: ${page.url()}`);
        } else {
          logResult('T04', '사용자 관리 페이지 접근', 'WARN', '페이지는 열렸으나 사용자 목록 미확인');
        }
      } catch (e) {
        logResult('T04', '사용자 관리 페이지 접근', 'FAIL', e.message);
      }

      // ===== 테스트 5: 사용자 등록 버튼 확인 =====
      try {
        await page.goto(`${BASE_URL}/admin/users`);
        await page.waitForLoadState('networkidle');

        // 사용자 등록 버튼 찾기
        const registerBtn = page.locator('button:has-text("등록"), button:has-text("추가"), button:has-text("신규"), a:has-text("등록"), a:has-text("추가")').first();
        const btnVisible = await registerBtn.isVisible().catch(() => false);

        await takeScreenshot(page, '05_user_register_btn');

        if (btnVisible) {
          await registerBtn.click();
          await page.waitForLoadState('networkidle');
          await takeScreenshot(page, '05b_user_register_form');

          // 폼 필드 확인
          const formFields = await page.locator('input, select, textarea').count();
          logResult('T05', '사용자 등록 버튼/폼 확인', 'PASS', `등록 버튼 있음, 폼 필드 ${formFields}개`);

          // 등록 폼 테스트
          try {
            // 이름 입력
            const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]').first();
            if (await nameInput.isVisible().catch(() => false)) {
              await nameInput.fill('테스트사용자');
            }

            // 군번 입력
            const militaryIdInput = page.locator('input[name="military_id"], input[placeholder*="군번"]').first();
            if (await militaryIdInput.isVisible().catch(() => false)) {
              await militaryIdInput.fill('24-123456');
            }

            // 이메일 입력
            const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="이메일"]').first();
            if (await emailInput.isVisible().catch(() => false)) {
              await emailInput.fill('testuser_new@test.com');
            }

            await takeScreenshot(page, '05c_user_register_filled');
            logResult('T05b', '사용자 등록 폼 입력', 'PASS', '폼 필드 입력 성공');
          } catch (e) {
            logResult('T05b', '사용자 등록 폼 입력', 'FAIL', e.message);
          }
        } else {
          logResult('T05', '사용자 등록 버튼/폼 확인', 'FAIL', '등록 버튼 찾을 수 없음');
        }
      } catch (e) {
        logResult('T05', '사용자 등록 버튼/폼 확인', 'FAIL', e.message);
      }

      // ===== 테스트 6: 품목 관리 페이지 =====
      console.log('\n--- 품목 관리 테스트 ---');
      try {
        await page.goto(`${BASE_URL}/admin/products`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '06_admin_products');
        logResult('T06', '품목 관리 페이지 접근', 'PASS', `URL: ${page.url()}`);

        // 품목 등록 버튼 찾기
        const addBtn = page.locator('button:has-text("등록"), button:has-text("추가"), button:has-text("신규")').first();
        const addBtnVisible = await addBtn.isVisible().catch(() => false);

        if (addBtnVisible) {
          await addBtn.click();
          await page.waitForLoadState('networkidle');
          await takeScreenshot(page, '06b_product_register_form');

          // 대분류/중분류/소분류 선택 확인
          const categorySelects = await page.locator('select, [role="combobox"]').count();
          logResult('T06b', '품목 등록 폼 - 분류 선택 확인', 'PASS', `분류 선택 요소 ${categorySelects}개 확인`);
        }
      } catch (e) {
        logResult('T06', '품목 관리 페이지 접근', 'FAIL', e.message);
      }

      // ===== 테스트 7: 재고조정 페이지 접근 =====
      console.log('\n--- 재고조정 테스트 ---');
      try {
        await page.goto(`${BASE_URL}/store/inventory`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '07_store_inventory');
        logResult('T07', '재고현황 페이지 접근', 'PASS', `URL: ${page.url()}`);
      } catch (e) {
        logResult('T07', '재고현황 페이지 접근', 'FAIL', e.message);
      }

      try {
        await page.goto(`${BASE_URL}/store/inventory/adjust`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '07b_inventory_adjust');
        const pageContent = await page.content();
        if (pageContent.includes('재고') || pageContent.includes('조정')) {
          logResult('T07b', '재고조정 페이지 접근', 'PASS', `URL: ${page.url()}`);
        } else {
          logResult('T07b', '재고조정 페이지 접근', 'WARN', `페이지 내용 확인 필요: ${page.url()}`);
        }
      } catch (e) {
        logResult('T07b', '재고조정 페이지 접근', 'FAIL', e.message);
      }

      // ===== 테스트 8: 체척권 관리 =====
      console.log('\n--- 체척권 관리 테스트 ---');
      try {
        await page.goto(`${BASE_URL}/admin/tickets`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '08_admin_tickets');
        logResult('T08', '체척권 관리 페이지 접근', 'PASS', `URL: ${page.url()}`);

        // TKT- 번호 형식 확인
        const pageContent = await page.content();
        if (pageContent.includes('TKT-') || pageContent.includes('tkt-')) {
          logResult('T08b', '체척권 TKT- 번호 체계 확인', 'PASS', 'TKT- 번호 형식 확인됨');
        } else {
          logResult('T08b', '체척권 TKT- 번호 체계 확인', 'WARN', 'TKT- 번호 미확인 (데이터 없을 수 있음)');
        }
      } catch (e) {
        logResult('T08', '체척권 관리 페이지 접근', 'FAIL', e.message);
      }
    }

    // ===== 테스트 9: 로그아웃 후 store 로그인 =====
    console.log('\n--- store 계정 테스트 ---');
    try {
      // 로그아웃
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      const url = await login(page, 'store@test.com', '1111');
      await takeScreenshot(page, '09_store_login');

      if (!url.includes('/login')) {
        logResult('T09', 'store 계정 로그인', 'PASS', `리다이렉트: ${url}`);

        // 재고 현황 확인
        await page.goto(`${BASE_URL}/store/inventory`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '09b_store_inventory');
        logResult('T09b', 'store - 재고현황 페이지', 'PASS', `URL: ${page.url()}`);

        // 재고 이력 확인
        const historyBtn = page.locator('button:has-text("이력"), a:has-text("이력"), button:has-text("내역")').first();
        const historyVisible = await historyBtn.isVisible().catch(() => false);
        if (historyVisible) {
          await historyBtn.click();
          await page.waitForLoadState('networkidle');
          await takeScreenshot(page, '09c_inventory_history');
          logResult('T09c', '재고 이력 표시', 'PASS', '이력 버튼 클릭 성공');
        } else {
          logResult('T09c', '재고 이력 표시', 'WARN', '이력 버튼 찾을 수 없음');
        }
      } else {
        logResult('T09', 'store 계정 로그인', 'FAIL', '로그인 실패');
      }
    } catch (e) {
      logResult('T09', 'store 계정 테스트', 'FAIL', e.message);
    }

    // ===== 테스트 10: tailor 계정 - 체척권 현황 =====
    console.log('\n--- tailor 계정 테스트 ---');
    try {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      const url = await login(page, 'tailor@test.com', '1111');
      await takeScreenshot(page, '10_tailor_login');

      if (!url.includes('/login')) {
        logResult('T10', 'tailor 계정 로그인', 'PASS', `리다이렉트: ${url}`);

        // 체척권 현황 페이지 접근
        await page.goto(`${BASE_URL}/tailor/tickets`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '10b_tailor_tickets');

        const pageContent = await page.content();
        if (pageContent.includes('체척권') || pageContent.includes('ticket')) {
          logResult('T10b', 'tailor - 체척권 현황 페이지', 'PASS', `URL: ${page.url()}`);

          // 데이터 행 확인
          const rows = await page.locator('table tr, [role="row"]').count();
          logResult('T10c', 'tailor - 체척권 데이터 조회', rows > 1 ? 'PASS' : 'WARN', `테이블 행 수: ${rows}`);

          // TKT- 번호 확인
          if (pageContent.includes('TKT-')) {
            logResult('T10d', 'tailor - TKT- 번호 표시', 'PASS', 'TKT- 번호 형식 확인됨');
          } else {
            logResult('T10d', 'tailor - TKT- 번호 표시', 'WARN', 'TKT- 번호 미확인');
          }
        } else {
          logResult('T10b', 'tailor - 체척권 현황 페이지', 'FAIL', '페이지 내용 이상');
        }
      } else {
        logResult('T10', 'tailor 계정 로그인', 'FAIL', '로그인 실패');
      }
    } catch (e) {
      logResult('T10', 'tailor 계정 테스트', 'FAIL', e.message);
    }

    // ===== 테스트 11: 일반사용자 계정 - 체척권 구매정보 =====
    console.log('\n--- 일반사용자 계정 테스트 ---');
    try {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');

      const url = await login(page, 'user@test.com', '1111');
      await takeScreenshot(page, '11_user_login');

      if (!url.includes('/login')) {
        logResult('T11', '일반사용자 로그인', 'PASS', `리다이렉트: ${url}`);

        // 체척권 목록 페이지
        await page.goto(`${BASE_URL}/user/tickets`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '11b_user_tickets');

        const pageContent = await page.content();
        if (pageContent.includes('체척권') || pageContent.includes('ticket')) {
          logResult('T11b', '사용자 - 체척권 페이지 접근', 'PASS', `URL: ${page.url()}`);

          // 구매정보 표시 확인
          if (pageContent.includes('구매') || pageContent.includes('주문')) {
            logResult('T11c', '사용자 - 체척권 구매정보 표시', 'PASS', '구매 정보 확인됨');
          } else {
            logResult('T11c', '사용자 - 체척권 구매정보 표시', 'WARN', '구매정보 미확인');
          }
        } else {
          logResult('T11b', '사용자 - 체척권 페이지 접근', 'FAIL', '페이지 내용 이상');
        }

        // 포인트 조회
        await page.goto(`${BASE_URL}/user/points`);
        await page.waitForLoadState('networkidle');
        await takeScreenshot(page, '11c_user_points');
        logResult('T11d', '사용자 - 포인트 조회 페이지', 'PASS', `URL: ${page.url()}`);

      } else {
        logResult('T11', '일반사용자 로그인', 'FAIL', '로그인 실패');
      }
    } catch (e) {
      logResult('T11', '일반사용자 테스트', 'FAIL', e.message);
    }

  } catch (e) {
    console.error('테스트 실행 중 오류:', e);
  } finally {
    await browser.close();
  }

  // 결과 출력
  console.log('\n\n========== 테스트 결과 요약 ==========\n');
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;

  console.log(`총 테스트: ${total}건`);
  console.log(`통과: ${passed}건`);
  console.log(`실패: ${failed}건`);
  console.log(`경고: ${warned}건`);
  console.log('');

  console.log('| 테스트ID | 테스트명 | 결과 | 비고 |');
  console.log('|---------|---------|------|------|');
  testResults.forEach(r => {
    console.log(`| ${r.testId} | ${r.testName} | ${r.status} | ${r.detail} |`);
  });

  // JSON 결과 저장
  fs.writeFileSync('tests/test-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n결과 파일 저장: tests/test-results.json');
}

runTests().catch(console.error);
