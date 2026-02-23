/**
 * 피복 구매관리 시스템 상세 E2E 테스트
 * - 로그인 후 세션 쿠키 유지
 * - 각 역할별 핵심 기능 검증
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'tests/screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = [];

function log(testId, testName, status, detail = '') {
  const result = { testId, testName, status, detail };
  testResults.push(result);
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`${icon} ${testId} | ${testName} | ${detail}`);
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true });
  } catch (e) {
    // 스크린샷 실패 무시
  }
}

/**
 * 로그인 수행 및 로그인 성공 여부 반환
 */
async function performLogin(page, email, password) {
  // 루트 페이지(=로그인 페이지)로 이동
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // 로그인 폼이 있는지 확인
  const emailInput = page.locator('input[name="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });

  await emailInput.fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  // 리다이렉트 대기
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15000 });

  const currentUrl = page.url();
  console.log(`  로그인 후 URL: ${currentUrl}`);
  return currentUrl;
}

async function runTests() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  console.log('\n========== E2E 테스트 시작 ==========\n');

  // ===== 섹션 1: admin 계정 테스트 =====
  console.log('\n[섹션 1] admin 계정 테스트');
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();

  try {
    // 1-1: 로그인
    const afterLoginUrl = await performLogin(adminPage, 'admin@test.com', '1111');
    await shot(adminPage, 'A01_admin_after_login');

    if (afterLoginUrl.includes('/admin') || afterLoginUrl.includes('/dashboard')) {
      log('A01', 'admin 로그인 성공', 'PASS', `URL: ${afterLoginUrl}`);
    } else {
      log('A01', 'admin 로그인 성공', 'FAIL', `예상과 다른 URL: ${afterLoginUrl} - 직접 페이지 접근 시도`);
    }

    // 1-2: admin 대시보드 직접 접근
    await adminPage.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);
    await shot(adminPage, 'A02_admin_dashboard');
    const dashContent = await adminPage.content();
    const dashUrl = adminPage.url();

    if (dashUrl.includes('/admin/dashboard') && dashContent.includes('대시보드')) {
      log('A02', 'admin 대시보드 접근', 'PASS', `URL: ${dashUrl}`);
    } else if (dashUrl.includes('/admin')) {
      log('A02', 'admin 대시보드 접근', 'PASS', `URL: ${dashUrl}`);
    } else {
      log('A02', 'admin 대시보드 접근', 'FAIL', `리다이렉트됨: ${dashUrl}`);
    }

    // 1-3: 사용자 목록 페이지
    await adminPage.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);
    await shot(adminPage, 'A03_admin_users');
    const usersContent = await adminPage.content();
    const usersUrl = adminPage.url();

    if (usersUrl.includes('/admin/users')) {
      log('A03', 'admin 사용자 목록 접근', 'PASS', `URL: ${usersUrl}`);

      // 사용자 등록 링크 확인
      const registerLink = adminPage.locator('a[href="/admin/users/new"], button:has-text("사용자 등록")');
      const registerVisible = await registerLink.first().isVisible().catch(() => false);
      log('A03b', '사용자 등록 버튼 표시', registerVisible ? 'PASS' : 'FAIL', registerVisible ? '등록 버튼 있음' : '등록 버튼 없음');

      // 테이블 행 수 확인
      const rows = await adminPage.locator('table tbody tr').count();
      log('A03c', '사용자 목록 데이터', rows > 0 ? 'PASS' : 'WARN', `테이블 행: ${rows}개`);
    } else {
      log('A03', 'admin 사용자 목록 접근', 'FAIL', `리다이렉트됨: ${usersUrl}`);
    }

    // 1-4: 사용자 등록 페이지
    await adminPage.goto(`${BASE_URL}/admin/users/new`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);
    await shot(adminPage, 'A04_user_register_form');
    const newUserUrl = adminPage.url();
    const newUserContent = await adminPage.content();

    if (newUserUrl.includes('/admin/users/new')) {
      log('A04', '사용자 등록 폼 접근', 'PASS', `URL: ${newUserUrl}`);

      // 폼 필드 확인
      const nameField = await adminPage.locator('input[name="name"]').isVisible().catch(() => false);
      const emailField = await adminPage.locator('input[name="email"]').isVisible().catch(() => false);
      const roleSelect = await adminPage.locator('button[role="combobox"]').first().isVisible().catch(() => false);

      log('A04b', '사용자 등록 폼 필드', (nameField && emailField) ? 'PASS' : 'FAIL',
        `이름: ${nameField}, 이메일: ${emailField}, 역할선택: ${roleSelect}`);

      // 실제 등록 시도 (테스트 사용자)
      if (nameField && emailField) {
        const timestamp = Date.now();
        await adminPage.locator('input[name="name"]').fill(`테스트사용자_${timestamp}`);
        await adminPage.locator('input[name="email"]').fill(`test_${timestamp}@test.com`);
        await shot(adminPage, 'A04c_user_register_filled');
        log('A04c', '사용자 등록 폼 입력', 'PASS', '폼 입력 성공');
      }
    } else {
      log('A04', '사용자 등록 폼 접근', 'FAIL', `리다이렉트됨: ${newUserUrl}`);
    }

    // 1-5: 품목 관리 페이지
    await adminPage.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);
    await shot(adminPage, 'A05_admin_products');
    const productsUrl = adminPage.url();

    if (productsUrl.includes('/admin/products')) {
      log('A05', '품목 관리 페이지 접근', 'PASS', `URL: ${productsUrl}`);

      // 품목 등록 버튼 클릭
      const prodAddBtn = adminPage.locator('button:has-text("품목 등록")');
      const prodAddVisible = await prodAddBtn.isVisible().catch(() => false);

      if (prodAddVisible) {
        await prodAddBtn.click();
        await adminPage.waitForTimeout(1000);
        await shot(adminPage, 'A05b_product_dialog');

        // 대분류 select 확인
        const dialogContent = await adminPage.locator('[role="dialog"]').isVisible().catch(() => false);
        if (dialogContent) {
          const comboboxes = await adminPage.locator('[role="dialog"] button[role="combobox"]').count();
          log('A05b', '품목 등록 다이얼로그 - 분류 선택', comboboxes >= 3 ? 'PASS' : 'WARN',
            `대/중/소 분류 콤보박스 ${comboboxes}개 확인`);

          // 다이얼로그 닫기
          await adminPage.keyboard.press('Escape');
        } else {
          log('A05b', '품목 등록 다이얼로그', 'FAIL', '다이얼로그 미표시');
        }
      } else {
        log('A05b', '품목 등록 버튼', 'WARN', '품목 등록 버튼 미확인');
      }
    } else {
      log('A05', '품목 관리 페이지 접근', 'FAIL', `리다이렉트됨: ${productsUrl}`);
    }

    // 1-6: 체척권 관리 페이지
    await adminPage.goto(`${BASE_URL}/admin/tickets`, { waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(2000);
    await shot(adminPage, 'A06_admin_tickets');
    const ticketsUrl = adminPage.url();
    const ticketsContent = await adminPage.content();

    if (ticketsUrl.includes('/admin/tickets')) {
      log('A06', '체척권 관리 페이지 접근', 'PASS', `URL: ${ticketsUrl}`);

      // TKT- 번호 확인
      if (ticketsContent.includes('TKT-')) {
        log('A06b', '체척권 TKT- 번호 체계', 'PASS', 'TKT- 번호 형식 확인');
      } else {
        // 테이블 존재 여부 확인
        const tableRows = await adminPage.locator('table tbody tr').count();
        if (tableRows > 0) {
          // 첫 번째 행에서 번호 확인
          const firstRowText = await adminPage.locator('table tbody tr').first().innerText().catch(() => '');
          log('A06b', '체척권 번호 체계', 'WARN', `데이터 있으나 TKT- 형식 미확인. 첫 행: ${firstRowText.substring(0, 50)}`);
        } else {
          log('A06b', '체척권 번호 체계', 'WARN', '체척권 데이터 없음 (TKT- 번호 확인 불가)');
        }
      }
    } else {
      log('A06', '체척권 관리 페이지 접근', 'FAIL', `리다이렉트됨: ${ticketsUrl}`);
    }

  } catch (e) {
    console.error('admin 테스트 오류:', e.message);
    log('A00', 'admin 섹션 오류', 'FAIL', e.message);
  } finally {
    await adminContext.close();
  }

  // ===== 섹션 2: store 계정 테스트 =====
  console.log('\n[섹션 2] store 계정 테스트');
  const storeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const storePage = await storeContext.newPage();

  try {
    const storeLoginUrl = await performLogin(storePage, 'store@test.com', '1111');
    await shot(storePage, 'S01_store_after_login');

    if (!storeLoginUrl.includes('/login') && !storeLoginUrl.includes('localhost:3000/')) {
      log('S01', 'store 로그인 성공', 'PASS', `URL: ${storeLoginUrl}`);
    } else if (storeLoginUrl === 'http://localhost:3000/') {
      log('S01', 'store 로그인 성공', 'WARN', `루트로 이동됨 (로그인됐을 수 있음): ${storeLoginUrl}`);
    } else {
      log('S01', 'store 로그인 성공', 'FAIL', `URL: ${storeLoginUrl}`);
    }

    // store 대시보드
    await storePage.goto(`${BASE_URL}/store/dashboard`, { waitUntil: 'networkidle' });
    await storePage.waitForTimeout(2000);
    await shot(storePage, 'S02_store_dashboard');
    const storeDashUrl = storePage.url();

    if (storeDashUrl.includes('/store')) {
      log('S02', 'store 대시보드 접근', 'PASS', `URL: ${storeDashUrl}`);
    } else {
      log('S02', 'store 대시보드 접근', 'FAIL', `리다이렉트됨: ${storeDashUrl}`);
    }

    // 재고 현황 페이지
    await storePage.goto(`${BASE_URL}/store/inventory`, { waitUntil: 'networkidle' });
    await storePage.waitForTimeout(2000);
    await shot(storePage, 'S03_store_inventory');
    const inventoryUrl = storePage.url();
    const inventoryContent = await storePage.content();

    if (inventoryUrl.includes('/store/inventory')) {
      log('S03', '재고현황 페이지 접근', 'PASS', `URL: ${inventoryUrl}`);

      // 재고 이력 버튼/탭 확인
      const historyBtn = storePage.locator('button:has-text("이력"), button:has-text("내역"), a:has-text("이력")');
      const historyCount = await historyBtn.count();

      if (historyCount > 0) {
        await historyBtn.first().click();
        await storePage.waitForTimeout(1000);
        await shot(storePage, 'S03b_inventory_history');
        log('S03b', '재고 이력 버튼', 'PASS', '이력 버튼 클릭 성공');
      } else {
        // 페이지 내 이력 관련 텍스트 확인
        if (inventoryContent.includes('이력') || inventoryContent.includes('내역')) {
          log('S03b', '재고 이력 표시', 'PASS', '이력 관련 내용 확인됨');
        } else {
          log('S03b', '재고 이력 표시', 'WARN', '이력 버튼/탭 미확인');
        }
      }
    } else {
      log('S03', '재고현황 페이지 접근', 'FAIL', `리다이렉트됨: ${inventoryUrl}`);
    }

    // 재고조정 페이지
    await storePage.goto(`${BASE_URL}/store/inventory/adjust`, { waitUntil: 'networkidle' });
    await storePage.waitForTimeout(2000);
    await shot(storePage, 'S04_inventory_adjust');
    const adjustUrl = storePage.url();
    const adjustContent = await storePage.content();

    if (adjustUrl.includes('/store/inventory/adjust')) {
      log('S04', '재고조정 페이지 접근', 'PASS', `URL: ${adjustUrl}`);
      if (adjustContent.includes('조정') || adjustContent.includes('재고')) {
        log('S04b', '재고조정 페이지 내용', 'PASS', '재고조정 관련 내용 확인');
      }
    } else {
      log('S04', '재고조정 페이지 접근', 'FAIL', `리다이렉트됨: ${adjustUrl}`);
    }

  } catch (e) {
    console.error('store 테스트 오류:', e.message);
    log('S00', 'store 섹션 오류', 'FAIL', e.message);
  } finally {
    await storeContext.close();
  }

  // ===== 섹션 3: tailor 계정 테스트 =====
  console.log('\n[섹션 3] tailor 계정 테스트');
  const tailorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const tailorPage = await tailorContext.newPage();

  try {
    const tailorLoginUrl = await performLogin(tailorPage, 'tailor@test.com', '1111');
    await shot(tailorPage, 'T01_tailor_after_login');

    log('T01', 'tailor 로그인 시도', tailorLoginUrl.includes('tailor') ? 'PASS' : 'WARN', `URL: ${tailorLoginUrl}`);

    // tailor 대시보드
    await tailorPage.goto(`${BASE_URL}/tailor/dashboard`, { waitUntil: 'networkidle' });
    await tailorPage.waitForTimeout(2000);
    await shot(tailorPage, 'T02_tailor_dashboard');
    const tailorDashUrl = tailorPage.url();

    if (tailorDashUrl.includes('/tailor')) {
      log('T02', 'tailor 대시보드 접근', 'PASS', `URL: ${tailorDashUrl}`);
    } else {
      log('T02', 'tailor 대시보드 접근', 'FAIL', `리다이렉트됨: ${tailorDashUrl}`);
    }

    // 체척권 현황 페이지
    await tailorPage.goto(`${BASE_URL}/tailor/tickets`, { waitUntil: 'networkidle' });
    await tailorPage.waitForTimeout(3000);
    await shot(tailorPage, 'T03_tailor_tickets');
    const tailorTicketsUrl = tailorPage.url();
    const tailorTicketsContent = await tailorPage.content();

    if (tailorTicketsUrl.includes('/tailor/tickets')) {
      log('T03', 'tailor 체척권 현황 페이지', 'PASS', `URL: ${tailorTicketsUrl}`);

      // 데이터 확인
      const tableRows = await tailorPage.locator('table tbody tr').count();
      log('T03b', 'tailor 체척권 데이터 조회', tableRows > 0 ? 'PASS' : 'WARN', `테이블 행: ${tableRows}개`);

      // TKT- 번호 확인
      if (tailorTicketsContent.includes('TKT-')) {
        log('T03c', 'tailor 체척권 TKT- 번호', 'PASS', 'TKT- 번호 형식 확인됨');
      } else if (tableRows > 0) {
        const firstRow = await tailorPage.locator('table tbody tr').first().innerText().catch(() => '');
        log('T03c', 'tailor 체척권 번호 형식', 'WARN', `첫 행 내용: ${firstRow.substring(0, 60)}`);
      } else {
        log('T03c', 'tailor 체척권 번호 형식', 'WARN', '체척권 데이터 없음');
      }
    } else {
      log('T03', 'tailor 체척권 현황 페이지', 'FAIL', `리다이렉트됨: ${tailorTicketsUrl}`);
    }

    // 체척권 등록 페이지
    await tailorPage.goto(`${BASE_URL}/tailor/tickets/register`, { waitUntil: 'networkidle' });
    await tailorPage.waitForTimeout(2000);
    await shot(tailorPage, 'T04_tailor_ticket_register');
    const registerUrl = tailorPage.url();

    if (registerUrl.includes('/tailor/tickets')) {
      log('T04', 'tailor 체척권 등록 페이지', 'PASS', `URL: ${registerUrl}`);

      // 번호 입력 필드 확인
      const ticketNumberInput = tailorPage.locator('input[name="ticket_number"], input[placeholder*="번호"], input[placeholder*="TKT"]');
      const ticketInputVisible = await ticketNumberInput.first().isVisible().catch(() => false);
      log('T04b', '체척권 번호 입력 필드', ticketInputVisible ? 'PASS' : 'WARN',
        ticketInputVisible ? '입력 필드 있음' : '입력 필드 미확인');
    } else {
      log('T04', 'tailor 체척권 등록 페이지', 'FAIL', `리다이렉트됨: ${registerUrl}`);
    }

  } catch (e) {
    console.error('tailor 테스트 오류:', e.message);
    log('T00', 'tailor 섹션 오류', 'FAIL', e.message);
  } finally {
    await tailorContext.close();
  }

  // ===== 섹션 4: 일반사용자 테스트 =====
  console.log('\n[섹션 4] 일반사용자 테스트');
  const userContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const userPage = await userContext.newPage();

  try {
    const userLoginUrl = await performLogin(userPage, 'user@test.com', '1111');
    await shot(userPage, 'U01_user_after_login');

    log('U01', '일반사용자 로그인 시도', userLoginUrl.includes('/my') ? 'PASS' : 'WARN', `URL: ${userLoginUrl}`);

    // 내 쇼핑 페이지
    await userPage.goto(`${BASE_URL}/my/shop`, { waitUntil: 'networkidle' });
    await userPage.waitForTimeout(2000);
    await shot(userPage, 'U02_user_shop');
    const shopUrl = userPage.url();

    if (shopUrl.includes('/my/shop')) {
      log('U02', '일반사용자 쇼핑 페이지', 'PASS', `URL: ${shopUrl}`);
    } else {
      log('U02', '일반사용자 쇼핑 페이지', 'FAIL', `리다이렉트됨: ${shopUrl}`);
    }

    // 포인트 조회
    await userPage.goto(`${BASE_URL}/my/points`, { waitUntil: 'networkidle' });
    await userPage.waitForTimeout(2000);
    await shot(userPage, 'U03_user_points');
    const pointsUrl = userPage.url();
    const pointsContent = await userPage.content();

    if (pointsUrl.includes('/my/points')) {
      log('U03', '포인트 조회 페이지', 'PASS', `URL: ${pointsUrl}`);
      if (pointsContent.includes('포인트')) {
        log('U03b', '포인트 내용 표시', 'PASS', '포인트 관련 내용 확인');
      }
    } else {
      log('U03', '포인트 조회 페이지', 'FAIL', `리다이렉트됨: ${pointsUrl}`);
    }

    // 체척권 목록
    await userPage.goto(`${BASE_URL}/my/tickets`, { waitUntil: 'networkidle' });
    await userPage.waitForTimeout(2000);
    await shot(userPage, 'U04_user_tickets');
    const userTicketsUrl = userPage.url();
    const userTicketsContent = await userPage.content();

    if (userTicketsUrl.includes('/my/tickets')) {
      log('U04', '사용자 체척권 페이지', 'PASS', `URL: ${userTicketsUrl}`);

      // 구매정보 표시 확인
      if (userTicketsContent.includes('구매') || userTicketsContent.includes('주문') || userTicketsContent.includes('품목')) {
        log('U04b', '체척권 구매정보 표시', 'PASS', '구매/주문 관련 내용 확인');
      } else {
        const tableRows = await userPage.locator('table tbody tr').count();
        log('U04b', '체척권 구매정보 표시', tableRows > 0 ? 'PASS' : 'WARN',
          tableRows > 0 ? `테이블 행 ${tableRows}개` : '데이터 없음');
      }
    } else {
      log('U04', '사용자 체척권 페이지', 'FAIL', `리다이렉트됨: ${userTicketsUrl}`);
    }

    // 주문 목록
    await userPage.goto(`${BASE_URL}/my/orders`, { waitUntil: 'networkidle' });
    await userPage.waitForTimeout(2000);
    await shot(userPage, 'U05_user_orders');
    const ordersUrl = userPage.url();

    if (ordersUrl.includes('/my/orders')) {
      log('U05', '사용자 주문 목록', 'PASS', `URL: ${ordersUrl}`);
    } else {
      log('U05', '사용자 주문 목록', 'FAIL', `리다이렉트됨: ${ordersUrl}`);
    }

  } catch (e) {
    console.error('사용자 테스트 오류:', e.message);
    log('U00', '사용자 섹션 오류', 'FAIL', e.message);
  } finally {
    await userContext.close();
  }

  await browser.close();

  // ===== 결과 요약 =====
  console.log('\n\n========== 테스트 결과 요약 ==========\n');
  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASS').length;
  const failed = testResults.filter(r => r.status === 'FAIL').length;
  const warned = testResults.filter(r => r.status === 'WARN').length;

  console.log(`총 테스트: ${total}건 | 통과: ${passed}건 | 실패: ${failed}건 | 경고: ${warned}건\n`);

  // 구분별 출력
  const sections = [
    { prefix: 'A', name: 'admin 계정' },
    { prefix: 'S', name: 'store 계정' },
    { prefix: 'T', name: 'tailor 계정' },
    { prefix: 'U', name: '일반사용자' },
  ];

  sections.forEach(sec => {
    const sectionResults = testResults.filter(r => r.testId.startsWith(sec.prefix));
    if (sectionResults.length === 0) return;
    console.log(`[${sec.name}]`);
    console.log('| ID | 테스트명 | 결과 | 비고 |');
    console.log('|----|---------|------|------|');
    sectionResults.forEach(r => {
      console.log(`| ${r.testId} | ${r.testName} | ${r.status} | ${r.detail} |`);
    });
    console.log('');
  });

  // 실패 항목만 별도 출력
  const failedTests = testResults.filter(r => r.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log('\n[실패 항목 목록]');
    failedTests.forEach(r => {
      console.log(`  - ${r.testId} | ${r.testName}: ${r.detail}`);
    });
  }

  fs.writeFileSync('tests/detailed-results.json', JSON.stringify(testResults, null, 2));
  console.log('\n결과 저장: tests/detailed-results.json');
}

runTests().catch(e => {
  console.error('테스트 실행 중 치명적 오류:', e);
  process.exit(1);
});
