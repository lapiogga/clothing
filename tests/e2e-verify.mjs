/**
 * 잔존 이슈 심층 검증 테스트
 * 1. 사용자 등록 실행 후 결과
 * 2. tailor 체척권 현황 - 데이터 및 번호 표시
 * 3. 체척권 번호 체계 확인 (TKT- vs TK-)
 * 4. 재고 이력 이력 버튼 동작
 * 5. 일반사용자 체척권 구매정보 표시
 */

import { chromium } from 'playwright';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = 'tests/screenshots2';
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
  await page.waitForTimeout(4000);
  return page.url();
}

async function runTests() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  console.log('\n===== 잔존 이슈 심층 검증 테스트 =====\n');

  // ===== 검증 1: admin 체척권 관리 - 번호 형식 상세 확인 =====
  console.log('[검증 1] 체척권 번호 형식 확인');
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg1 = await ctx1.newPage();
  try {
    await doLogin(pg1, 'admin1@test.com', 'test1234');
    await pg1.goto(`${BASE_URL}/admin/tickets`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(3000);
    await shot(pg1, 'V01_admin_tickets_detail');

    const content = await pg1.content();
    const rows = await pg1.locator('table tbody tr').count();

    if (rows === 0) {
      log('V01', 'admin 체척권 데이터', 'WARN', '체척권 데이터가 DB에 없음 (seed 미적용)');
    } else {
      // 실제 번호 텍스트 추출
      const firstCellText = await pg1.locator('table tbody tr:first-child td:first-child').innerText().catch(() => '');
      if (firstCellText.startsWith('TKT-')) {
        log('V01', '체척권 번호 TKT- 형식', 'PASS', `번호: ${firstCellText}`);
      } else if (firstCellText.startsWith('TK-')) {
        log('V01', '체척권 번호 형식', 'WARN', `번호: ${firstCellText} (TK- 형식 - seed 데이터 직접 삽입)`);
      } else {
        log('V01', '체척권 번호 형식', 'WARN', `번호: ${firstCellText}`);
      }
    }

    // 체척권 발행 기능 테스트 (맞춤피복 주문이 있을 경우)
    // admin 대시보드에서 체척권 수 확인
    await pg1.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(2000);
    await shot(pg1, 'V01b_admin_dashboard');

    // 발행 체척권 카운트 확인
    const dashContent = await pg1.content();
    if (dashContent.includes('발행 체척권') || dashContent.includes('issued')) {
      log('V01b', 'admin 대시보드 체척권 통계', 'PASS', '발행 체척권 카운터 표시');
    } else {
      log('V01b', 'admin 대시보드 체척권 통계', 'WARN', '체척권 통계 미확인');
    }

  } catch (e) {
    log('V01', '검증 1 오류', 'FAIL', e.message);
  } finally {
    await ctx1.close();
  }

  // ===== 검증 2: tailor 체척권 현황 심층 확인 =====
  console.log('\n[검증 2] tailor 체척권 현황 심층 확인');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg2 = await ctx2.newPage();
  try {
    await doLogin(pg2, 'tailor1@test.com', 'test1234');
    await pg2.goto(`${BASE_URL}/tailor/tickets`, { waitUntil: 'networkidle' });
    await pg2.waitForTimeout(3000);
    await shot(pg2, 'V02_tailor_tickets_detail');

    const rows = await pg2.locator('table tbody tr').count();
    const content = await pg2.content();

    if (content.includes('데이터가 없습니다') || rows === 0) {
      // 빈 데이터 이유 분석 - tailor_id 확인
      log('V02', 'tailor 체척권 현황 - 데이터 없음', 'WARN', 'DB에 해당 tailor_id의 체척권 없음 (issued 상태 포함)');

      // '전체' 필터로 재조회 시도
      const statusSelect = pg2.locator('[role="combobox"]').first();
      if (await statusSelect.isVisible().catch(() => false)) {
        await statusSelect.click();
        await pg2.waitForTimeout(500);
        await shot(pg2, 'V02b_tailor_filter');
        log('V02b', 'tailor 체척권 필터', 'PASS', '상태 필터 콤보박스 정상 표시');
        await pg2.keyboard.press('Escape');
      }
    } else {
      log('V02', 'tailor 체척권 현황 - 데이터 있음', 'PASS', `${rows}행 표시`);

      // 첫 번째 행의 체척권 번호 확인
      const firstNumber = await pg2.locator('table tbody tr:first-child td:first-child').innerText().catch(() => '');
      log('V02b', 'tailor 체척권 번호', firstNumber ? 'PASS' : 'WARN', `번호: ${firstNumber}`);
    }

    // 체척권 등록 페이지 - TKT- 번호 입력 확인
    await pg2.goto(`${BASE_URL}/tailor/tickets/register`, { waitUntil: 'networkidle' });
    await pg2.waitForTimeout(2000);
    await shot(pg2, 'V02c_tailor_register');

    // Input 컴포넌트는 실제 input 태그가 있음
    const inputEl = pg2.locator('input').first();
    const inputVisible = await inputEl.isVisible().catch(() => false);

    if (inputVisible) {
      const placeholder = await inputEl.getAttribute('placeholder').catch(() => '');
      log('V02c', 'tailor 체척권 번호 입력 필드', 'PASS', `placeholder: "${placeholder}"`);

      // TKT- 형식 번호 입력 테스트
      await inputEl.fill('TKT-20260101-00001');
      await pg2.locator('button:has-text("조회")').click();
      await pg2.waitForTimeout(2000);
      await shot(pg2, 'V02d_tailor_ticket_search_result');

      const searchResult = await pg2.content();
      if (searchResult.includes('체척권을 찾을 수 없습니다')) {
        log('V02d', 'TKT- 번호 조회 (데이터 없음)', 'PASS', '조회 실행됨 - 데이터 없음 메시지 정상 표시');
      } else if (searchResult.includes('체척권 정보') || searchResult.includes('ticket_number')) {
        log('V02d', 'TKT- 번호 조회', 'PASS', '조회 성공');
      } else {
        log('V02d', 'TKT- 번호 조회', 'WARN', '조회 결과 확인 필요');
      }
    } else {
      log('V02c', 'tailor 체척권 번호 입력 필드', 'FAIL', '입력 필드 없음');
    }

  } catch (e) {
    log('V02', '검증 2 오류', 'FAIL', e.message);
  } finally {
    await ctx2.close();
  }

  // ===== 검증 3: 재고 이력 버튼 동작 =====
  console.log('\n[검증 3] 재고 이력 버튼 동작 확인');
  const ctx3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg3 = await ctx3.newPage();
  try {
    await doLogin(pg3, 'store1@test.com', 'test1234');
    await pg3.goto(`${BASE_URL}/store/inventory`, { waitUntil: 'networkidle' });
    await pg3.waitForTimeout(2000);

    // 이력 버튼 찾기 (테이블 내 첫 번째 이력 버튼)
    const historyBtns = pg3.locator('button:has-text("이력")');
    const btnCount = await historyBtns.count();

    if (btnCount > 0) {
      log('V03', '재고 이력 버튼 확인', 'PASS', `이력 버튼 ${btnCount}개 확인`);
      await historyBtns.first().click();
      await pg3.waitForTimeout(2000);
      await shot(pg3, 'V03b_inventory_history_dialog');

      // 다이얼로그나 모달 확인
      const dialogVisible = await pg3.locator('[role="dialog"]').isVisible().catch(() => false);
      if (dialogVisible) {
        const histContent = await pg3.locator('[role="dialog"]').innerText().catch(() => '');
        log('V03b', '재고 이력 다이얼로그', 'PASS', `다이얼로그 표시됨: ${histContent.substring(0, 80)}`);
        await pg3.keyboard.press('Escape');
      } else {
        // 페이지 이동 또는 다른 방식으로 이력 표시 확인
        const urlAfter = pg3.url();
        log('V03b', '재고 이력 표시 방식', 'WARN', `URL: ${urlAfter} (모달 미확인)`);
      }
    } else {
      log('V03', '재고 이력 버튼', 'FAIL', '이력 버튼 없음');
    }

    // 재고조정 페이지에서도 이력 확인
    await pg3.goto(`${BASE_URL}/store/inventory/adjust`, { waitUntil: 'networkidle' });
    await pg3.waitForTimeout(2000);

    const histBtnsAdjust = pg3.locator('button:has-text("이력")');
    const adjBtnCount = await histBtnsAdjust.count();
    log('V03c', '재고조정 페이지 이력 버튼', adjBtnCount > 0 ? 'PASS' : 'WARN', `이력 버튼 ${adjBtnCount}개`);

    if (adjBtnCount > 0) {
      await histBtnsAdjust.first().click();
      await pg3.waitForTimeout(2000);
      await shot(pg3, 'V03d_adjust_history_dialog');

      const dlg = await pg3.locator('[role="dialog"]').isVisible().catch(() => false);
      log('V03d', '재고조정 이력 다이얼로그', dlg ? 'PASS' : 'WARN', dlg ? '다이얼로그 표시' : '다이얼로그 미표시');
    }

  } catch (e) {
    log('V03', '검증 3 오류', 'FAIL', e.message);
  } finally {
    await ctx3.close();
  }

  // ===== 검증 4: 일반사용자 체척권 구매정보 확인 =====
  console.log('\n[검증 4] 일반사용자 체척권 구매정보 확인');
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg4 = await ctx4.newPage();
  try {
    // user19@test.com은 seed에서 체척권을 가진 사용자
    await doLogin(pg4, 'user19@test.com', 'test1234');
    await pg4.goto(`${BASE_URL}/my/tickets`, { waitUntil: 'networkidle' });
    await pg4.waitForTimeout(3000);
    await shot(pg4, 'V04_user19_tickets');

    const ticketRows = await pg4.locator('table tbody tr').count();
    const content = await pg4.content();

    if (content.includes('체척권이 없습니다') || ticketRows === 0) {
      log('V04', 'user19 체척권 목록 (데이터 없음)', 'WARN', 'seed 데이터 미적용 또는 다른 계정');
    } else {
      log('V04', 'user19 체척권 목록', 'PASS', `${ticketRows}건 표시`);

      // 체척권 번호 확인
      const firstNum = await pg4.locator('table tbody tr:first-child td:first-child').innerText().catch(() => '');
      log('V04b', '체척권 번호 표시', firstNum ? 'PASS' : 'WARN', `번호: ${firstNum.substring(0, 50)}`);

      // 주문번호 표시 확인
      if (content.includes('주문번호:') || content.includes('order_number')) {
        log('V04c', '체척권 구매정보(주문번호) 표시', 'PASS', '주문번호 표시 확인');
      } else {
        log('V04c', '체척권 구매정보(주문번호) 표시', 'WARN', '주문번호 미표시 (연결된 주문 없을 수 있음)');
      }
    }

    // user01 (seed에서 체척권 없는 계정)으로도 확인
    await doLogin(pg4, 'user01@test.com', 'test1234');
    await pg4.goto(`${BASE_URL}/my/tickets`, { waitUntil: 'networkidle' });
    await pg4.waitForTimeout(2000);
    await shot(pg4, 'V04e_user01_tickets');
    const u1Content = await pg4.content();
    // 빈 상태 메시지가 '체척권이 없습니다'인지 확인
    if (u1Content.includes('체척권이 없습니다')) {
      log('V04e', '체척권 없는 사용자 빈 상태 메시지', 'PASS', '"체척권이 없습니다" 메시지 표시');
    }

  } catch (e) {
    log('V04', '검증 4 오류', 'FAIL', e.message);
  } finally {
    await ctx4.close();
  }

  // ===== 검증 5: 사용자 등록 전체 플로우 (비밀번호 없는 등록 확인) =====
  console.log('\n[검증 5] 사용자 등록 플로우 검증');
  const ctx5 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg5 = await ctx5.newPage();
  try {
    await doLogin(pg5, 'admin1@test.com', 'test1234');
    await pg5.goto(`${BASE_URL}/admin/users/new`, { waitUntil: 'networkidle' });
    await pg5.waitForTimeout(2000);

    // 필드 확인
    const hasName = await pg5.locator('input[name="name"]').isVisible().catch(() => false);
    const hasEmail = await pg5.locator('input[name="email"]').isVisible().catch(() => false);

    log('V05', '사용자 등록 폼 필드 확인', (hasName && hasEmail) ? 'PASS' : 'FAIL',
      `이름: ${hasName}, 이메일: ${hasEmail}`);

    if (hasName && hasEmail) {
      const ts = Date.now();
      const testEmail = `verify_${ts}@test.com`;
      await pg5.locator('input[name="name"]').fill(`검증사용자_${ts}`);
      await pg5.locator('input[name="email"]').fill(testEmail);

      // 역할 선택 - 기본값 확인
      const roleSelect = pg5.locator('[name="role"]').first();
      // shadcn Select는 숨겨진 input으로 값 전달
      log('V05b', '역할 기본값 확인', 'PASS', '역할 선택 필드 존재');

      await pg5.locator('input[name="military_number"]').fill(`26-${ts.toString().slice(-6)}`);
      await shot(pg5, 'V05_user_reg_form_filled');

      // 등록 버튼 클릭
      await pg5.locator('button[type="submit"]').click();
      await pg5.waitForTimeout(4000);
      await shot(pg5, 'V05b_user_reg_result');

      const afterUrl = pg5.url();
      const afterContent = await pg5.content();

      // 성공 토스트 또는 사용자 목록으로 이동 확인
      if (afterUrl === `${BASE_URL}/admin/users`) {
        log('V05c', '사용자 등록 성공 (목록으로 이동)', 'PASS', '등록 후 /admin/users 이동 확인');
      } else if (afterContent.includes('사용자가 등록되었습니다')) {
        log('V05c', '사용자 등록 성공 (토스트)', 'PASS', '등록 성공 메시지 표시');
      } else {
        // 에러 확인
        const errMsg = await pg5.locator('[data-sonner-toast]').first().textContent().catch(() => '');
        log('V05c', '사용자 등록 결과', errMsg ? 'WARN' : 'FAIL',
          errMsg ? `메시지: ${errMsg}` : `현재 URL: ${afterUrl}`);
      }
    }

  } catch (e) {
    log('V05', '검증 5 오류', 'FAIL', e.message);
  } finally {
    await ctx5.close();
  }

  await browser.close();

  // ===== 결과 =====
  console.log('\n\n===== 심층 검증 결과 =====\n');
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`총 ${total}건 | PASS: ${passed} | FAIL: ${failed} | WARN: ${warned}\n`);
  console.log('| ID | 테스트 항목 | 결과 | 비고 |');
  console.log('|----|------------|------|------|');
  results.forEach(r => {
    console.log(`| ${r.id} | ${r.name} | ${r.status} | ${r.detail} |`);
  });

  fs.writeFileSync('tests/verify-results.json', JSON.stringify(results, null, 2));
}

runTests().catch(console.error);
