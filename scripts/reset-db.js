/**
 * DB 데이터 초기화 스크립트
 * - tailoring_tickets, tailor_settlements, order_items, orders 삭제
 * - point_ledger, point_summary 삭제
 * - inventory_log, inventory 삭제
 * - testuser 계정 삭제 (Auth)
 * - 기존 seed 계정은 유지 (admin1~2, store1~3, tailor1~3, user01~22)
 */

const SUPABASE_URL = "https://kxplyfuddngeveldijxh.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGx5ZnVkZG5nZXZlbGRpanhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI5NDE4MCwiZXhwIjoyMDg2ODcwMTgwfQ.0Q9TqZAFF7PAhCk8itMQqs_Az3LD8FBVORHs1VDIHqg";

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function deleteTable(table, filter = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${filter || "?id=neq.00000000-0000-0000-0000-000000000000"}`;
  const res = await fetch(url, { method: "DELETE", headers });
  if (res.ok) {
    console.log(`  [OK] ${table} 삭제 완료`);
  } else {
    const text = await res.text();
    console.error(`  [ERR] ${table} 삭제 실패: ${res.status} ${text}`);
  }
}

async function resetDb() {
  console.log("=== DB 데이터 초기화 시작 ===\n");

  // 외래키 의존 순서: 하위 테이블부터 삭제
  console.log("1. 정산 데이터 삭제...");
  await deleteTable("tailor_settlements");

  console.log("2. 체척권 삭제...");
  await deleteTable("tailoring_tickets");

  console.log("3. 재고 이력 삭제 (order_items 참조 먼저)...");
  await deleteTable("inventory_log");

  console.log("4. 주문 항목 삭제...");
  await deleteTable("order_items");

  console.log("5. 주문 삭제...");
  await deleteTable("orders");

  console.log("6. 포인트 원장 삭제...");
  await deleteTable("point_ledger");

  console.log("7. 포인트 요약 삭제...");
  await deleteTable("point_summary");

  console.log("8. 재고 삭제...");
  await deleteTable("inventory");

  // testuser 계정 삭제 (Auth API)
  console.log("\n9. testuser Auth 계정 삭제...");
  await deleteTestUsers();

  console.log("\n=== 초기화 완료 ===");
}

async function deleteTestUsers() {
  // Auth 사용자 목록 조회
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (!listRes.ok) {
    console.error("  [ERR] Auth 사용자 목록 조회 실패:", await listRes.text());
    return;
  }

  const data = await listRes.json();
  const users = data.users || [];

  // 유지할 계정 이메일 목록
  const keepEmails = [
    "admin1@test.com",
    "admin2@test.com",
    "store1@test.com",
    "store2@test.com",
    "store3@test.com",
    "tailor1@test.com",
    "tailor2@test.com",
    "tailor3@test.com",
    "user01@test.com",
    "user02@test.com",
    "user03@test.com",
    "user04@test.com",
    "user05@test.com",
    "user06@test.com",
    "user07@test.com",
    "user08@test.com",
    "user09@test.com",
    "user10@test.com",
    "user11@test.com",
    "user12@test.com",
    "user13@test.com",
    "user14@test.com",
    "user15@test.com",
    "user16@test.com",
    "user17@test.com",
    "user18@test.com",
    "user19@test.com",
    "user20@test.com",
    "user21@test.com",
    "user22@test.com",
  ];

  const toDelete = users.filter((u) => !keepEmails.includes(u.email));

  if (toDelete.length === 0) {
    console.log("  삭제할 testuser 없음");
    return;
  }

  for (const user of toDelete) {
    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });
    if (delRes.ok) {
      console.log(`  [OK] Auth 사용자 삭제: ${user.email}`);
    } else {
      console.error(`  [ERR] Auth 삭제 실패: ${user.email}`, await delRes.text());
    }
  }
}

resetDb().catch(console.error);
