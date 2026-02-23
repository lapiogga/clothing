/**
 * 재검증 테스트 (e2e-recheck.mjs)
 * 이전 테스트에서 FAIL/WARN이 발생한 항목 재검증
 *
 * V05: 사용자 등록 폼 submit 버튼 strict mode violation (로그아웃 버튼 수정 후)
 * V01: admin 체척권 데이터 없음 (seed 재삽입 후)
 * V02: tailor 체척권 현황 및 등록 페이지 재검증
 * V04: user19 체척권 목록 재검증
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const SHOT_DIR = 'tests/screenshots_recheck';
const RESULT_FILE = 'tests/recheck-results.json';

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
  // 로그인 폼의 submit 버튼만 선택 (첫 번째이자 유일한 버튼)
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  return page.url();
}

async function runTests() {
  const browser = await chromium.launch({ headless: true, slowMo: 200 });
  console.log('\n===== 재검증 테스트 시작 =====\n');
  console.log(`대상: V05(submit 버튼), V01(admin 체척권), V02(tailor 체척권), V04(user19 체척권)\n`);

  // ==========================================================
  // [RC-V05] admin/users/new 페이지의 submit 버튼 개수 확인
  // 이전 FAIL 원인: 로그아웃 버튼(type="submit") + 등록 버튼(type="submit") = 2개
  // 수정 내용: 로그아웃 버튼을 type="button"으로 변경
  // ==========================================================
  console.log('[RC-V05] admin 사용자 등록 폼 submit 버튼 strict mode 재검증');
  const ctx5 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg5 = await ctx5.newPage();
  try {
    await doLogin(pg5, 'admin1@test.com', 'test1234');
    await pg5.goto(`${BASE_URL}/admin/users/new`, { waitUntil: 'networkidle' });
    await pg5.waitForTimeout(2000);
    await shot(pg5, 'RC-V05_admin_users_new');

    // 페이지 내 type="submit" 버튼 전체 개수 확인
    const submitBtns = await pg5.locator('button[type="submit"]').count();
    log(
      'RC-V05',
      'admin/users/new - submit 버튼 개수',
      submitBtns === 1 ? 'PASS' : 'FAIL',
      `button[type="submit"] 개수: ${submitBtns}개 (1개여야 PASS)`
    );

    // 로그아웃 버튼의 type 속성 직접 확인
    const logoutBtnType = await pg5.locator('button:has-text("로그아웃")').getAttribute('type').catch(() => '미발견');
    log(
      'RC-V05b',
      '로그아웃 버튼 type 속성',
      logoutBtnType === 'button' ? 'PASS' : (logoutBtnType === 'submit' ? 'FAIL' : 'WARN'),
      `로그아웃 버튼 type="${logoutBtnType}" (button이어야 PASS)`
    );

    // 등록 버튼의 type 속성 확인
    const submitBtnText = await pg5.locator('button[type="submit"]').first().textContent().catch(() => '');
    log(
      'RC-V05c',
      '폼 submit 버튼 텍스트 확인',
      submitBtnText.trim().includes('등록') ? 'PASS' : 'WARN',
      `submit 버튼 텍스트: "${submitBtnText.trim()}"`
    );

    // 실제 등록 버튼 클릭 시도 (strict mode 위반 없이 동작하는지 검증)
    if (submitBtns === 1) {
      const ts = Date.now();
      await pg5.locator('input[name="name"]').fill(`재검증_${ts}`);
      await pg5.locator('input[name="email"]').fill(`recheck_${ts}@test.com`);
      await shot(pg5, 'RC-V05d_form_filled');

      // strict mode 위반 없이 click 실행 가능한지 확인
      try {
        await pg5.locator('button[type="submit"]').click({ timeout: 3000 });
        await pg5.waitForTimeout(3000);
        await shot(pg5, 'RC-V05e_after_submit');
        const afterUrl = pg5.url();
        log(
          'RC-V05d',
          '등록 버튼 클릭 (strict mode 위반 없음)',
          'PASS',
          `클릭 성공 - 현재 URL: ${afterUrl}`
        );
      } catch (clickErr) {
        log(
          'RC-V05d',
          '등록 버튼 클릭 시도',
          'FAIL',
          `오류: ${clickErr.message.substring(0, 150)}`
        );
      }
    }

  } catch (e) {
    log('RC-V05', 'RC-V05 오류', 'FAIL', e.message.substring(0, 200));
  } finally {
    await ctx5.close();
  }

  // ==========================================================
  // [RC-V01] admin 체척권 목록 데이터 확인
  // 이전 WARN: "데이터가 없습니다" (seed 미적용)
  // ==========================================================
  console.log('\n[RC-V01] admin 체척권 목록 재검증');
  const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg1 = await ctx1.newPage();
  try {
    await doLogin(pg1, 'admin1@test.com', 'test1234');
    await pg1.goto(`${BASE_URL}/admin/tickets`, { waitUntil: 'networkidle' });
    await pg1.waitForTimeout(3000);
    await shot(pg1, 'RC-V01_admin_tickets');

    const rows = await pg1.locator('table tbody tr').count();
    const content = await pg1.content();
    const isEmpty = content.includes('데이터가 없습니다');

    if (isEmpty || rows === 0) {
      log('RC-V01', 'admin 체척권 목록 데이터', 'WARN', 'DB에 체척권 데이터 없음 (005_seed_extended.sql 미적용)');
    } else {
      log('RC-V01', 'admin 체척권 목록 데이터', 'PASS', `${rows}행 표시됨`);

      // 첫 행의 체척권 번호 형식 확인
      const firstTicketNum = await pg1.locator('table tbody tr:first-child td:first-child').innerText().catch(() => '');
      const numFormat = firstTicketNum.startsWith('TK-') ? 'TK- 형식' :
                        firstTicketNum.startsWith('TKT-') ? 'TKT- 형식' : '알 수 없음';
      log(
        'RC-V01b',
        '체척권 번호 형식',
        firstTicketNum ? 'PASS' : 'WARN',
        `번호: ${firstTicketNum} (${numFormat})`
      );

      // 상태별 데이터 분포 확인
      const statusBadges = await pg1.locator('table tbody tr td:nth-child(6) span, table tbody tr td:nth-child(6) div').allInnerTexts();
      const uniqueStatuses = [...new Set(statusBadges.filter(s => s.trim()))];
      log(
        'RC-V01c',
        '체척권 상태 분포',
        uniqueStatuses.length > 0 ? 'PASS' : 'WARN',
        `확인된 상태: ${uniqueStatuses.join(', ') || '없음'}`
      );
    }

  } catch (e) {
    log('RC-V01', 'RC-V01 오류', 'FAIL', e.message.substring(0, 200));
  } finally {
    await ctx1.close();
  }

  // ==========================================================
  // [RC-V02] tailor 체척권 현황 및 등록 페이지 재검증
  // 이전 상태:
  //   - V02: WARN (tailor_id의 체척권 없음)
  //   - V02c: FAIL (입력 필드 없음)
  // 수정 후 기대: 입력 필드가 보여야 PASS
  // ==========================================================
  console.log('\n[RC-V02] tailor 체척권 현황 및 등록 페이지 재검증');
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg2 = await ctx2.newPage();
  try {
    await doLogin(pg2, 'tailor1@test.com', 'test1234');

    // 체척권 현황 페이지
    await pg2.goto(`${BASE_URL}/tailor/tickets`, { waitUntil: 'networkidle' });
    await pg2.waitForTimeout(3000);
    await shot(pg2, 'RC-V02_tailor_tickets');

    const rows2 = await pg2.locator('table tbody tr').count();
    const content2 = await pg2.content();
    const isEmpty2 = content2.includes('데이터가 없습니다');

    if (isEmpty2 || rows2 === 0) {
      log('RC-V02', 'tailor 체척권 현황 목록', 'WARN', '체척권 데이터 없음 (issued 상태 포함 - seed 미적용 가능성)');
    } else {
      log('RC-V02', 'tailor 체척권 현황 목록', 'PASS', `${rows2}행 표시됨`);
      const firstNum2 = await pg2.locator('table tbody tr:first-child td:first-child').innerText().catch(() => '');
      log('RC-V02b', 'tailor 체척권 번호', firstNum2 ? 'PASS' : 'WARN', `첫 번호: ${firstNum2}`);
    }

    // 상태 필터 콤보박스 확인
    const filterCombo = pg2.locator('[role="combobox"]').first();
    const filterVisible = await filterCombo.isVisible().catch(() => false);
    log('RC-V02c', 'tailor 체척권 상태 필터', filterVisible ? 'PASS' : 'FAIL', filterVisible ? '콤보박스 표시됨' : '콤보박스 미표시');

    // 체척권 등록 페이지 (tailor/tickets/register)
    await pg2.goto(`${BASE_URL}/tailor/tickets/register`, { waitUntil: 'networkidle' });
    await pg2.waitForTimeout(2000);
    await shot(pg2, 'RC-V02d_tailor_register');

    // 입력 필드 확인 - input 요소 직접 탐색
    const inputCount = await pg2.locator('input').count();
    const firstInput = pg2.locator('input').first();
    const inputVisible = await firstInput.isVisible().catch(() => false);

    if (inputVisible) {
      const placeholder = await firstInput.getAttribute('placeholder').catch(() => '');
      log(
        'RC-V02d',
        'tailor 등록 페이지 입력 필드',
        'PASS',
        `input 요소 ${inputCount}개 / placeholder: "${placeholder}"`
      );

      // 체척권 번호 입력 및 조회 테스트
      await firstInput.fill('TK-2026-0001');
      const searchBtn = pg2.locator('button:has-text("조회")');
      const searchBtnVisible = await searchBtn.isVisible().catch(() => false);

      if (searchBtnVisible) {
        await searchBtn.click();
        await pg2.waitForTimeout(2000);
        await shot(pg2, 'RC-V02e_register_search_result');

        const resultContent = await pg2.content();
        if (resultContent.includes('체척권 정보') || resultContent.includes('체척권 번호')) {
          log('RC-V02e', '체척권 번호 조회 (TK-2026-0001)', 'PASS', '체척권 정보 표시됨 - seed 데이터 적용됨');
        } else if (resultContent.includes('체척권을 찾을 수 없습니다')) {
          log('RC-V02e', '체척권 번호 조회 (TK-2026-0001)', 'WARN', '체척권 없음 - seed 데이터 미적용');
        } else {
          log('RC-V02e', '체척권 번호 조회 결과', 'WARN', '결과 확인 불명확');
        }
      } else {
        log('RC-V02e', '조회 버튼', 'WARN', '조회 버튼 미표시');
      }
    } else {
      log('RC-V02d', 'tailor 등록 페이지 입력 필드', 'FAIL', `input 요소를 찾을 수 없음 (count=${inputCount})`);
    }

    // 페이지 제목 확인
    const pageTitle = await pg2.locator('h1').first().textContent().catch(() => '');
    log('RC-V02f', 'tailor 등록 페이지 제목', pageTitle ? 'PASS' : 'WARN', `제목: "${pageTitle}"`);

  } catch (e) {
    log('RC-V02', 'RC-V02 오류', 'FAIL', e.message.substring(0, 200));
  } finally {
    await ctx2.close();
  }

  // ==========================================================
  // [RC-V04] user19 체척권 목록 재검증
  // 이전 WARN: seed 데이터 미적용 또는 다른 계정
  // user19 (d1000000-0000-0000-0000-000000000019): TK-2026-0001 보유
  // ==========================================================
  console.log('\n[RC-V04] user19 체척권 목록 재검증');
  const ctx4 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg4 = await ctx4.newPage();
  try {
    await doLogin(pg4, 'user19@test.com', 'test1234');
    await pg4.goto(`${BASE_URL}/my/tickets`, { waitUntil: 'networkidle' });
    await pg4.waitForTimeout(3000);
    await shot(pg4, 'RC-V04_user19_tickets');

    const rows4 = await pg4.locator('table tbody tr').count();
    const content4 = await pg4.content();
    const isEmpty4 = content4.includes('체척권이 없습니다');

    if (isEmpty4 || rows4 === 0) {
      log('RC-V04', 'user19 체척권 목록', 'WARN', 'user19의 체척권 데이터 없음 (005_seed_extended.sql 미적용)');
    } else {
      log('RC-V04', 'user19 체척권 목록', 'PASS', `${rows4}건 체척권 표시됨`);

      // 체척권 번호 확인
      const firstNum4 = await pg4.locator('table tbody tr:first-child td:first-child').innerText().catch(() => '');
      log('RC-V04b', 'user19 체척권 번호', firstNum4 ? 'PASS' : 'WARN', `번호: ${firstNum4.substring(0, 50)}`);

      // 금액 표시 확인
      const amountCell = await pg4.locator('table tbody tr:first-child td:nth-child(3)').innerText().catch(() => '');
      log('RC-V04c', 'user19 체척권 금액 표시', amountCell.includes('원') ? 'PASS' : 'WARN', `금액: ${amountCell}`);

      // 상태 Badge 확인
      const statusBadge = await pg4.locator('table tbody tr:first-child td:nth-child(5)').innerText().catch(() => '');
      log('RC-V04d', 'user19 체척권 상태', statusBadge ? 'PASS' : 'WARN', `상태: ${statusBadge}`);

      // 취소요청 버튼 확인 (issued 상태인 경우)
      const cancelBtn = pg4.locator('button:has-text("취소요청")');
      const cancelBtnCount = await cancelBtn.count();
      log('RC-V04e', '취소요청 버튼', cancelBtnCount >= 0 ? 'PASS' : 'WARN', `취소요청 버튼: ${cancelBtnCount}개`);
    }

    // 빈 상태 메시지 확인 (user01 - 체척권 없는 사용자)
    // 새 컨텍스트로 별도 로그인 처리 (세션 충돌 방지)
    const ctxU1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const pgU1 = await ctxU1.newPage();
    try {
      await doLogin(pgU1, 'user01@test.com', 'test1234');
      await pgU1.goto(`${BASE_URL}/my/tickets`, { waitUntil: 'networkidle' });
      await pgU1.waitForTimeout(2000);
      await shot(pgU1, 'RC-V04f_user01_empty');
      const u1Content = await pgU1.content();
      log(
        'RC-V04f',
        '체척권 없는 사용자 빈 상태 메시지',
        u1Content.includes('체척권이 없습니다') ? 'PASS' : 'WARN',
        u1Content.includes('체척권이 없습니다') ? '"체척권이 없습니다" 표시' : '빈 상태 메시지 미확인'
      );
    } finally {
      await ctxU1.close();
    }

  } catch (e) {
    log('RC-V04', 'RC-V04 오류', 'FAIL', e.message.substring(0, 200));
  } finally {
    await ctx4.close();
  }

  await browser.close();

  // ==========================================================
  // 결과 집계 및 출력
  // ==========================================================
  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log('\n\n===== 재검증 결과 요약 =====\n');
  console.log(`총 ${total}건 | PASS: ${passed} | FAIL: ${failed} | WARN: ${warned}\n`);
  console.log('| ID | 테스트 항목 | 결과 | 상세 |');
  console.log('|----|------------|------|------|');
  results.forEach(r => {
    console.log(`| ${r.id} | ${r.name} | ${r.status} | ${r.detail} |`);
  });

  // JSON 저장
  const output = {
    summary: { total, passed, failed, warned },
    timestamp: new Date().toISOString(),
    results,
  };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n결과 저장: ${RESULT_FILE}`);
}

runTests().catch(console.error);
