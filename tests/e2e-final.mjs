/**
 * 피복 구매관리 시스템 최종 E2E 테스트
 * 실제 계정: admin1@test.com / test1234
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = 'tests/screenshots';

if (!fs.existsSync(SHOT_DIR)) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
}

const results = [];

function log(id, name, status, detail = '') {
  results.push({ id, name, status, detail });
  const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`${icon} ${id} | ${name} | ${detail}`);
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: `${SHOT_DIR}/${name}.png`, fullPage: true });
  } catch (_) {}
}

async function doLogin(page, email, password) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // 로그인 처리 대기
  await page.waitForTimeout(4000);
  const url = page.url();
  console.log(`  [로그인 결과] URL: ${url}`);
  return url;
}

async function runTests() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });

  console.log('\n========== 피복 구매관리 시스템 E2E 테스트 ==========');
  console.log('테스트 계정: admin1@test.com / test1234\n');

  // ===== SECTION A: admin1 계정 =====
  console.log('\n[ Section A: admin 계정 테스트 ]');
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg1 = await ctx1.newPage();

  try {
    // A01: 로그인
    const url1 = await doLogin(pg1, 'admin1@test.com', 'test1234');
    await shot(pg1, 'A01_admin_login_result');

    if (url1.includes('/admin/dashboard')) {
      log('A01', 'admin 로그인 → /admin/dashboard', 'PASS', url1);
    } else if (url1.includes('/admin')) {
      log('A01', 'admin 로그인 → admin 경로', 'PASS', url1);
    } else {
      log('A01', 'admin 로그인', 'FAIL', `예상과 다른 URL: ${url1}`);

      // 에러 메시지 확인
      const errMsg = await pg1.locator('.text-destructive, [data-sonner-toast], [role="alert"]').first().textContent().catch(() => '');
      if (errMsg) console.log(`  에러 메시지: ${errMsg}`);
    }

    // A02: admin 대시보드 직접 접근
    await pg1.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(2000);
    const dashUrl = pg1.url();
    await shot(pg1, 'A02_admin_dashboard');

    if (dashUrl.includes('/admin/dashboard')) {
      log('A02', 'admin 대시보드 접근', 'PASS', dashUrl);
    } else {
      log('A02', 'admin 대시보드 접근', 'FAIL', `리다이렉트: ${dashUrl}`);
    }

    // A03: 사용자 목록
    await pg1.goto(`${BASE_URL}/admin/users`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(2000);
    const usersUrl = pg1.url();
    await shot(pg1, 'A03_admin_users');

    if (usersUrl.includes('/admin/users')) {
      log('A03', '사용자 목록 페이지', 'PASS', usersUrl);
      const rows = await pg1.locator('table tbody tr').count();
      log('A03b', '사용자 목록 데이터', rows > 1 ? 'PASS' : 'WARN', `${rows}행`);

      // 사용자 등록 버튼 확인
      const regLink = pg1.locator('a[href="/admin/users/new"]');
      const regVisible = await regLink.isVisible().catch(() => false);
      log('A03c', '사용자 등록 링크', regVisible ? 'PASS' : 'FAIL', regVisible ? '링크 표시됨' : '링크 없음');
    } else {
      log('A03', '사용자 목록 페이지', 'FAIL', `리다이렉트: ${usersUrl}`);
    }

    // A04: 사용자 등록 폼
    await pg1.goto(`${BASE_URL}/admin/users/new`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(2000);
    const newUserUrl = pg1.url();
    await shot(pg1, 'A04_user_new_form');

    if (newUserUrl.includes('/admin/users/new')) {
      log('A04', '사용자 등록 폼 접근', 'PASS', newUserUrl);

      const nameVisible = await pg1.locator('input[name="name"]').isVisible().catch(() => false);
      const emailVisible = await pg1.locator('input[name="email"]').isVisible().catch(() => false);
      log('A04b', '사용자 등록 폼 필드', nameVisible && emailVisible ? 'PASS' : 'FAIL',
        `이름: ${nameVisible}, 이메일: ${emailVisible}`);

      // 실제 등록 테스트
      if (nameVisible && emailVisible) {
        const ts = Date.now();
        await pg1.locator('input[name="name"]').fill(`테스트유저_${ts}`);
        await pg1.locator('input[name="email"]').fill(`testuser_${ts}@test.com`);
        await pg1.locator('input[name="military_number"]').fill(`25-${ts.toString().slice(-6)}`);
        await shot(pg1, 'A04c_user_form_filled');

        // 등록 버튼 클릭
        await pg1.locator('button[type="submit"]:has-text("등록")').click();
        await pg1.waitForTimeout(3000);
        await shot(pg1, 'A04d_user_after_submit');
        const afterUrl = pg1.url();
        const toastMsg = await pg1.locator('[data-sonner-toast]').first().textContent().catch(() => '');

        if (afterUrl.includes('/admin/users') && !afterUrl.includes('/new')) {
          log('A04c', '사용자 등록 실행', 'PASS', `등록 후 목록으로 이동: ${afterUrl}`);
        } else if (toastMsg.includes('등록')) {
          log('A04c', '사용자 등록 실행', 'PASS', `토스트: ${toastMsg}`);
        } else {
          log('A04c', '사용자 등록 실행', 'WARN', `현재 URL: ${afterUrl}, 토스트: ${toastMsg}`);
        }
      }
    } else {
      log('A04', '사용자 등록 폼 접근', 'FAIL', `리다이렉트: ${newUserUrl}`);
    }

    // A05: 품목 관리 - 대/중/소 분류
    await pg1.goto(`${BASE_URL}/admin/products`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(2000);
    const prodUrl = pg1.url();
    await shot(pg1, 'A05_admin_products');

    if (prodUrl.includes('/admin/products')) {
      log('A05', '품목 관리 페이지', 'PASS', prodUrl);

      // 품목 등록 버튼
      const addBtn = pg1.locator('button:has-text("품목 등록")');
      if (await addBtn.isVisible().catch(() => false)) {
        await addBtn.click();
        await pg1.waitForTimeout(1000);
        await shot(pg1, 'A05b_product_dialog');

        // 다이얼로그 확인
        const dialog = pg1.locator('[role="dialog"]');
        const dialogVisible = await dialog.isVisible().catch(() => false);

        if (dialogVisible) {
          // 대/중/소 분류 콤보박스 확인
          const comboboxes = await dialog.locator('button[role="combobox"]').count();
          log('A05b', '품목 등록 - 대/중/소 분류 선택', comboboxes >= 3 ? 'PASS' : 'WARN',
            `분류 선택 콤보박스 ${comboboxes}개 (3개 이상이면 정상)`);

          // 첫 번째 콤보박스(대분류) 클릭 시도
          const firstCombo = dialog.locator('button[role="combobox"]').first();
          await firstCombo.click().catch(() => {});
          await pg1.waitForTimeout(500);
          const options = await pg1.locator('[role="option"]').count();
          log('A05c', '대분류 옵션 표시', options > 0 ? 'PASS' : 'WARN', `옵션 ${options}개`);

          await shot(pg1, 'A05c_category_options');
          await pg1.keyboard.press('Escape');
        } else {
          log('A05b', '품목 등록 다이얼로그', 'FAIL', '다이얼로그 미표시');
        }
      }
    } else {
      log('A05', '품목 관리 페이지', 'FAIL', `리다이렉트: ${prodUrl}`);
    }

    // A06: 체척권 관리 - TKT- 번호
    await pg1.goto(`${BASE_URL}/admin/tickets`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(2000);
    const ticketUrl = pg1.url();
    const ticketContent = await pg1.content();
    await shot(pg1, 'A06_admin_tickets');

    if (ticketUrl.includes('/admin/tickets')) {
      log('A06', '체척권 관리 페이지', 'PASS', ticketUrl);

      const rows = await pg1.locator('table tbody tr').count();
      log('A06b', '체척권 데이터', rows > 0 ? 'PASS' : 'WARN', `${rows}행`);

      if (ticketContent.includes('TKT-')) {
        log('A06c', '체척권 TKT- 번호 체계', 'PASS', 'TKT- 형식 확인');
      } else if (rows > 0) {
        const firstRow = await pg1.locator('table tbody tr').first().innerText().catch(() => '');
        log('A06c', '체척권 번호 형식', 'WARN', `첫 행: ${firstRow.substring(0, 80)}`);
      } else {
        log('A06c', '체척권 TKT- 번호', 'WARN', '체척권 데이터 없음');
      }
    } else {
      log('A06', '체척권 관리 페이지', 'FAIL', `리다이렉트: ${ticketUrl}`);
    }

  } catch (e) {
    log('A_ERR', 'admin 섹션 오류', 'FAIL', e.message);
    console.error(e);
  } finally {
    await ctx1.close();
  }

  // ===== SECTION S: store1 계정 =====
  console.log('\n[ Section S: store 계정 테스트 ]');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg2 = await ctx2.newPage();

  try {
    const url2 = await doLogin(pg2, 'store1@test.com', 'test1234');
    await shot(pg2, 'S01_store_login');

    if (url2.includes('/store')) {
      log('S01', 'store 로그인', 'PASS', url2);
    } else {
      log('S01', 'store 로그인', 'FAIL', url2);
    }

    // S02: 재고 현황
    await pg2.goto(`${BASE_URL}/store/inventory`, { waitUntil: 'networkidle' });
    await pg2.waitForTimeout(2000);
    const invUrl = pg2.url();
    await shot(pg2, 'S02_store_inventory');

    if (invUrl.includes('/store/inventory')) {
      log('S02', '재고현황 페이지', 'PASS', invUrl);

      const invContent = await pg2.content();
      if (invContent.includes('이력') || invContent.includes('내역')) {
        log('S02b', '재고 이력 표시', 'PASS', '이력 관련 내용 확인');
      } else {
        const rows = await pg2.locator('table tbody tr').count();
        log('S02b', '재고 이력 표시', rows > 0 ? 'PASS' : 'WARN', `재고 행: ${rows}개`);
      }
    } else {
      log('S02', '재고현황 페이지', 'FAIL', `리다이렉트: ${invUrl}`);
    }

    // S03: 재고조정 페이지
    await pg2.goto(`${BASE_URL}/store/inventory/adjust`, { waitUntil: 'networkidle' });
    await pg2.waitForTimeout(2000);
    const adjUrl = pg2.url();
    await shot(pg2, 'S03_inventory_adjust');

    if (adjUrl.includes('/store/inventory/adjust')) {
      log('S03', '재고조정 페이지', 'PASS', adjUrl);
      const adjContent = await pg2.content();
      const hasForm = await pg2.locator('form, input[type="number"]').count() > 0;
      log('S03b', '재고조정 폼', hasForm ? 'PASS' : 'WARN', hasForm ? '폼 요소 있음' : '폼 요소 없음');
    } else {
      log('S03', '재고조정 페이지', 'FAIL', `리다이렉트: ${adjUrl}`);
    }

  } catch (e) {
    log('S_ERR', 'store 섹션 오류', 'FAIL', e.message);
  } finally {
    await ctx2.close();
  }

  // ===== SECTION T: tailor1 계정 =====
  console.log('\n[ Section T: tailor 계정 테스트 ]');
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg3 = await ctx3.newPage();

  try {
    const url3 = await doLogin(pg3, 'tailor1@test.com', 'test1234');
    await shot(pg3, 'T01_tailor_login');

    if (url3.includes('/tailor')) {
      log('T01', 'tailor 로그인', 'PASS', url3);
    } else {
      log('T01', 'tailor 로그인', 'FAIL', url3);
    }

    // T02: 체척권 현황
    await pg3.goto(`${BASE_URL}/tailor/tickets`, { waitUntil: 'networkidle' });
    await pg3.waitForTimeout(2000);
    const tTicketUrl = pg3.url();
    const tTicketContent = await pg3.content();
    await shot(pg3, 'T02_tailor_tickets');

    if (tTicketUrl.includes('/tailor/tickets')) {
      log('T02', 'tailor 체척권 현황', 'PASS', tTicketUrl);

      const rows = await pg3.locator('table tbody tr').count();
      log('T02b', '체척권 데이터 조회', rows > 0 ? 'PASS' : 'WARN', `${rows}행`);

      if (tTicketContent.includes('TKT-')) {
        log('T02c', '체척권 TKT- 번호', 'PASS', 'TKT- 형식 확인');
      } else {
        log('T02c', '체척권 TKT- 번호', 'WARN', 'TKT- 형식 미확인');
      }
    } else {
      log('T02', 'tailor 체척권 현황', 'FAIL', `리다이렉트: ${tTicketUrl}`);
    }

    // T03: 체척권 등록 페이지 (번호 입력)
    await pg3.goto(`${BASE_URL}/tailor/tickets/register`, { waitUntil: 'networkidle' });
    await pg3.waitForTimeout(2000);
    const regUrl = pg3.url();
    await shot(pg3, 'T03_tailor_ticket_register');

    if (regUrl.includes('/tailor/tickets')) {
      log('T03', 'tailor 체척권 등록 페이지', 'PASS', regUrl);

      // 번호 입력 필드
      const numInput = pg3.locator('input').first();
      const numVisible = await numInput.isVisible().catch(() => false);
      if (numVisible) {
        const placeholder = await numInput.getAttribute('placeholder').catch(() => '');
        log('T03b', '체척권 번호 입력', 'PASS', `입력 필드 placeholder: "${placeholder}"`);
      } else {
        log('T03b', '체척권 번호 입력', 'WARN', '입력 필드 없음');
      }
    } else {
      log('T03', 'tailor 체척권 등록 페이지', 'FAIL', `리다이렉트: ${regUrl}`);
    }

  } catch (e) {
    log('T_ERR', 'tailor 섹션 오류', 'FAIL', e.message);
  } finally {
    await ctx3.close();
  }

  // ===== SECTION U: 일반사용자 =====
  console.log('\n[ Section U: 일반사용자 테스트 ]');
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg4 = await ctx4.newPage();

  try {
    const url4 = await doLogin(pg4, 'user01@test.com', 'test1234');
    await shot(pg4, 'U01_user_login');

    if (url4.includes('/my')) {
      log('U01', '일반사용자 로그인', 'PASS', url4);
    } else {
      log('U01', '일반사용자 로그인', 'FAIL', url4);
    }

    // U02: 체척권 목록
    await pg4.goto(`${BASE_URL}/my/tickets`, { waitUntil: 'networkidle' });
    await pg4.waitForTimeout(2000);
    const uTicketUrl = pg4.url();
    const uTicketContent = await pg4.content();
    await shot(pg4, 'U02_user_tickets');

    if (uTicketUrl.includes('/my/tickets')) {
      log('U02', '사용자 체척권 목록', 'PASS', uTicketUrl);

      // 구매정보 표시 확인
      const hasPurchaseInfo = uTicketContent.includes('구매') || uTicketContent.includes('주문') ||
                              uTicketContent.includes('품목') || uTicketContent.includes('금액');
      log('U02b', '체척권 구매정보 표시', hasPurchaseInfo ? 'PASS' : 'WARN',
        hasPurchaseInfo ? '구매 관련 정보 확인' : '구매 정보 미확인');
    } else {
      log('U02', '사용자 체척권 목록', 'FAIL', `리다이렉트: ${uTicketUrl}`);
    }

    // U03: 포인트 조회
    await pg4.goto(`${BASE_URL}/my/points`, { waitUntil: 'networkidle' });
    await pg4.waitForTimeout(2000);
    await shot(pg4, 'U03_user_points');
    const ptUrl = pg4.url();
    if (ptUrl.includes('/my/points')) {
      log('U03', '포인트 조회 페이지', 'PASS', ptUrl);
    } else {
      log('U03', '포인트 조회 페이지', 'FAIL', `리다이렉트: ${ptUrl}`);
    }

  } catch (e) {
    log('U_ERR', '사용자 섹션 오류', 'FAIL', e.message);
  } finally {
    await ctx4.close();
  }

  await browser.close();

  // ===== 결과 출력 =====
  console.log('\n\n========== 테스트 결과 요약 ==========');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`\n총 ${total}건 | PASS: ${passed}건 | FAIL: ${failed}건 | WARN: ${warned}건\n`);

  console.log('| ID | 테스트 항목 | 결과 | 비고 |');
  console.log('|----|------------|------|------|');
  results.forEach(r => {
    console.log(`| ${r.id} | ${r.name} | ${r.status} | ${r.detail} |`);
  });

  if (failed > 0) {
    console.log('\n[실패 목록]');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  FAIL: ${r.id} - ${r.name}: ${r.detail}`);
    });
  }

  fs.writeFileSync('tests/final-results.json', JSON.stringify(results, null, 2));
}

runTests().catch(e => { console.error(e); process.exit(1); });
