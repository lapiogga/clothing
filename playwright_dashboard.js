const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // 1. http://localhost:3000 접속
    console.log('1. localhost:3000 접속 중...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('접속 완료:', page.url());

    // 2. 로그인 - 이메일, 비밀번호 입력 후 버튼 클릭
    console.log('2. 로그인 시도...');

    // 이메일 입력 (id="email")
    await page.fill('#email', 'admin1@test.com');
    // 비밀번호 입력 (id="password")
    await page.fill('#password', 'test1234');

    // 로그인 버튼 클릭 및 네비게이션 대기
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    // 추가 대기 (리다이렉트 처리)
    await page.waitForTimeout(3000);
    console.log('로그인 후 URL:', page.url());

    // 여전히 루트에 있으면 재시도
    if (page.url() === 'http://localhost:3000/' || page.url() === 'http://localhost:3000') {
      console.log('로그인 재시도 중...');
      await page.fill('#email', 'admin1@test.com');
      await page.fill('#password', 'test1234');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      console.log('재시도 후 URL:', page.url());
    }

    // 3. /admin/dashboard 로 이동
    console.log('3. /admin/dashboard 이동 중...');
    await page.goto('http://localhost:3000/admin/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    console.log('대시보드 URL:', page.url());

    // 4. 전체 페이지 스크린샷 저장
    console.log('4. 스크린샷 저장 중...');
    await page.screenshot({
      path: 'C:\\Study_5\\public\\screenshot_dashboard_v2.png',
      fullPage: true
    });
    console.log('스크린샷 저장 완료: C:\\Study_5\\public\\screenshot_dashboard_v2.png');

  } catch (error) {
    console.error('오류 발생:', error.message);
    // 오류 시에도 현재 상태 스크린샷 저장
    try {
      await page.screenshot({
        path: 'C:\\Study_5\\public\\screenshot_dashboard_v2.png',
        fullPage: true
      });
      console.log('현재 상태 스크린샷 저장됨');
    } catch (e) {}
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
