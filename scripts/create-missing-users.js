/**
 * user06~user22 Auth 및 public.users 생성 스크립트
 */

const SUPABASE_URL = "https://kxplyfuddngeveldijxh.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGx5ZnVkZG5nZXZlbGRpanhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI5NDE4MCwiZXhwIjoyMDg2ODcwMTgwfQ.0Q9TqZAFF7PAhCk8itMQqs_Az3LD8FBVORHs1VDIHqg";

const STORES = {
  s1: "a1000000-0000-0000-0000-000000000001",
  s2: "a1000000-0000-0000-0000-000000000002",
  s3: "a1000000-0000-0000-0000-000000000003",
};

const TAILORS = {
  t1: "b1000000-0000-0000-0000-000000000001",
  t2: "b1000000-0000-0000-0000-000000000002",
  t3: "b1000000-0000-0000-0000-000000000003",
};

// user06~22 정보
const MISSING_USERS = [
  { email: "user06@test.com", name: "조소위", role: "user", rank: "second_lt", military_number: "21-67890", unit: "제3군단", enlist_date: "2021-03-01" },
  { email: "user07@test.com", name: "윤준위", role: "user", rank: "warrant", military_number: "19-78901", unit: "군수사", enlist_date: "2019-03-01" },
  { email: "user08@test.com", name: "장상사", role: "user", rank: "sgt_major", military_number: "15-89012", unit: "군수사", enlist_date: "2015-03-01" },
  { email: "user09@test.com", name: "한중사", role: "user", rank: "master_sgt", military_number: "17-90123", unit: "제1군단", enlist_date: "2017-03-01" },
  { email: "user10@test.com", name: "서하사", role: "user", rank: "sgt", military_number: "22-01234", unit: "제1군단", enlist_date: "2022-03-01" },
  { email: "user11@test.com", name: "임군무", role: "user", rank: "civil_servant", military_number: "99-11111", unit: "군수사", enlist_date: "2010-03-01" },
  { email: "user12@test.com", name: "오대위", role: "user", rank: "captain", military_number: "19-12121", unit: "제2군단", enlist_date: "2019-03-01" },
  { email: "user13@test.com", name: "배중위", role: "user", rank: "first_lt", military_number: "21-13131", unit: "제3군단", enlist_date: "2021-06-01" },
  { email: "user14@test.com", name: "유소위", role: "user", rank: "second_lt", military_number: "22-14141", unit: "제1군단", enlist_date: "2022-06-01" },
  { email: "user15@test.com", name: "남상사", role: "user", rank: "sgt_major", military_number: "14-15151", unit: "제2군단", enlist_date: "2014-03-01" },
  { email: "user16@test.com", name: "문중사", role: "user", rank: "master_sgt", military_number: "18-16161", unit: "제3군단", enlist_date: "2018-03-01" },
  { email: "user17@test.com", name: "양하사", role: "user", rank: "sgt", military_number: "23-17171", unit: "군수사", enlist_date: "2023-03-01" },
  { email: "user18@test.com", name: "권대령", role: "user", rank: "colonel", military_number: "11-18181", unit: "제1군단", enlist_date: "2011-03-01" },
  { email: "user19@test.com", name: "송소령", role: "user", rank: "major", military_number: "17-19191", unit: "제2군단", enlist_date: "2017-06-01" },
  { email: "user20@test.com", name: "신군무", role: "user", rank: "civil_servant", military_number: "99-20202", unit: "군수사", enlist_date: "2015-03-01" },
  { email: "user21@test.com", name: "하대위", role: "user", rank: "captain", military_number: "20-21212", unit: "제3군단", enlist_date: "2020-03-01" },
  { email: "user22@test.com", name: "전준위", role: "user", rank: "warrant", military_number: "16-22222", unit: "제1군단", enlist_date: "2016-03-01" },
];

// 기존 users 테이블에 있는 user01~05도 rank/military_number 정보 업데이트
const EXISTING_USER_UPDATES = [
  { email: "user01@test.com", name: "이대령", rank: "colonel", military_number: "20-12345", unit: "제1군단", enlist_date: "2012-03-01" },
  { email: "user02@test.com", name: "박중령", rank: "lt_colonel", military_number: "20-23456", unit: "제1군단", enlist_date: "2014-03-01" },
  { email: "user03@test.com", name: "최소령", rank: "major", military_number: "20-34567", unit: "제2군단", enlist_date: "2016-03-01" },
  { email: "user04@test.com", name: "정대위", rank: "captain", military_number: "20-45678", unit: "제2군단", enlist_date: "2018-03-01" },
  { email: "user05@test.com", name: "강중위", rank: "first_lt", military_number: "20-56789", unit: "제3군단", enlist_date: "2020-03-01" },
];

async function main() {
  console.log("=== 누락 사용자 생성 시작 ===\n");

  const createdUsers = {}; // email -> id

  // Auth 사용자 생성
  for (const user of MISSING_USERS) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          password: "test1234",
          email_confirm: true,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`  [OK] Auth 생성: ${user.email} -> ${data.id}`);
        createdUsers[user.email] = data.id;
      } else {
        console.error(`  [ERR] Auth 생성 실패: ${user.email}:`, data.message || JSON.stringify(data));
      }
    } catch (e) {
      console.error(`  [ERR] ${user.email}:`, e.message);
    }
  }

  // public.users 레코드 생성
  console.log("\n--- public.users 레코드 생성 ---");
  for (const user of MISSING_USERS) {
    const id = createdUsers[user.email];
    if (!id) {
      console.log(`  [SKIP] ${user.email}: Auth ID 없음`);
      continue;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        id,
        email: user.email,
        name: user.name,
        role: user.role,
        rank: user.rank,
        military_number: user.military_number,
        unit: user.unit,
        enlist_date: user.enlist_date,
      }),
    });
    if (res.ok) {
      console.log(`  [OK] public.users 생성: ${user.email}`);
    } else {
      const text = await res.text();
      console.error(`  [ERR] public.users 생성 실패: ${user.email}:`, text);
    }
  }

  // 기존 user01~05 정보 업데이트
  console.log("\n--- 기존 user01~05 정보 업데이트 ---");
  // 기존 users 조회
  const existingRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email&role=eq.user`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  const existingUsers = await existingRes.json();
  const emailToId = {};
  existingUsers.forEach(u => emailToId[u.email] = u.id);

  for (const upd of EXISTING_USER_UPDATES) {
    const id = emailToId[upd.email];
    if (!id) continue;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name: upd.name,
        rank: upd.rank,
        military_number: upd.military_number,
        unit: upd.unit,
        enlist_date: upd.enlist_date,
      }),
    });
    if (res.ok) {
      console.log(`  [OK] 업데이트: ${upd.email}`);
    } else {
      console.error(`  [ERR] 업데이트 실패: ${upd.email}:`, await res.text());
    }
  }

  // 최종 확인: 생성된 ID 목록 출력 (seed-data.js에 사용할 매핑)
  console.log("\n=== 생성된 사용자 ID 매핑 (seed-data.js 업데이트용) ===");
  const finalRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,email&role=eq.user&order=email`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  const finalUsers = await finalRes.json();
  finalUsers.forEach(u => console.log(`  ${u.email}: ${u.id}`));
}

main().catch(console.error);
