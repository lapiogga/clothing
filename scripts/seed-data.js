/**
 * 새 시드 데이터 삽입 스크립트
 * - 재고 데이터 (판매소별 품목별)
 * - 포인트 지급 (사용자별)
 * - 주문 데이터 200건 이상 (온라인/오프라인, 완제품/맞춤, 다양한 상태)
 * - 체척권 발행
 * - 포인트 원장
 *
 * 트리거: order_number = "TEMP" 삽입 시 자동 생성
 *        ticket_number = "TEMP" 삽입 시 자동 생성
 */

const SUPABASE_URL = "https://kxplyfuddngeveldijxh.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4cGx5ZnVkZG5nZXZlbGRpanhoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI5NDE4MCwiZXhwIjoyMDg2ODcwMTgwfQ.0Q9TqZAFF7PAhCk8itMQqs_Az3LD8FBVORHs1VDIHqg";

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function post(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers,
    body: JSON.stringify(Array.isArray(data) ? data : [data]),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`POST ${table} 실패 (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

// ============================================================
// 참조 데이터 ID (seed.sql에서 정의된 값)
// ============================================================
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

// 사용자 ID (실제 DB UUID 기반)
const USERS = {
  // 일반 사용자 (u01~u22): 이름 순서대로 매핑
  u01: "f85c8d43-94e6-4275-8ea0-a469cdffc7b3", // 이대령 (colonel)
  u02: "f61db539-dfd2-4eb8-b83d-27d691762f1a", // 박중령 (lt_colonel)
  u03: "e411bb01-cfe5-4845-abc7-1ad6ba048735", // 최소령 (major)
  u04: "2b48c8af-5b11-4071-83b0-365af6a630b3", // 정대위 (captain)
  u05: "b4e8ae61-b63d-47eb-9d4b-ed1d8c8d8ae1", // 강중위 (first_lt)
  u06: "8e35d3a1-ea60-464a-96b8-05ee59534c76", // 조소위 (second_lt)
  u07: "d284eafd-a152-4472-ad9a-63aa7983d28e", // 윤준위 (warrant)
  u08: "99d8217d-327a-403b-bf79-7834129dcfb5", // 장상사 (sgt_major)
  u09: "a0f23906-e2b2-46b6-ae9c-37ca08d379b6", // 한중사 (master_sgt)
  u10: "ee013542-4d8f-4198-9cec-e57c894abd8d", // 서하사 (sgt)
  u11: "89482b5e-2bc6-4386-96df-3a5c151fa0cc", // 임군무 (civil_servant)
  u12: "592f4f43-b66b-4802-a44a-937ccee526bc", // 오대위 (captain)
  u13: "cc12b7a2-a056-4d59-b480-de3f50e3fefc", // 배중위 (first_lt)
  u14: "bf042dea-8fb3-4251-99ad-e14c3618bbec", // 유소위 (second_lt)
  u15: "777d0da3-ce51-4d98-81ef-33ec2888633c", // 남상사 (sgt_major)
  u16: "2eabc9a2-cbee-4074-a574-3a90b0e7cec5", // 문중사 (master_sgt)
  u17: "ff787cfa-6dbb-4b44-8715-d72bfc6424a0", // 양하사 (sgt)
  u18: "f486cf32-f202-4c20-ba31-6b6a328a630e", // 권대령 (colonel)
  u19: "e8205435-0db5-4a45-9d64-cd94488a543a", // 송소령 (major)
  u20: "8edd28ad-0f51-4e44-a2d2-cf5d8a87f40c", // 신군무 (civil_servant)
  u21: "f80c5f8b-cc3b-4d33-a641-d9a73888305a", // 하대위 (captain)
  u22: "1894ce27-5871-4f24-a18e-aa94fd9daab7", // 전준위 (warrant)
  // admin, store, tailor
  admin1: "ced0a344-1167-4391-955c-068c45da6db0", // 김관리
  store1: "389571c8-aeb7-442c-ba50-80ea7c26c813", // 김판매 (제1판매소)
  store2: "aa22737e-5605-43e1-934a-ceb86c8f1c08", // 박판매 (제2판매소)
  store3: "b5593769-2f74-4b50-bb84-7b1364f2fd51", // 이판매 (제3판매소)
  tailor1: "053d3bdb-e7dc-4ec9-a600-a6b9f4144c6b", // 강체척
  tailor2: "28be22cf-6fd0-4725-a95a-9e540a544b52", // 정체척
  tailor3: "929452fe-06b6-4d23-b79a-ad6fc4437b03", // 최체척
};

// 완제품 ID
const PRODUCTS = {
  // 완제품
  동근무복상의: "f1000000-0000-0000-0000-000000000004",
  동근무복하의: "f1000000-0000-0000-0000-000000000005",
  하근무복상의: "f1000000-0000-0000-0000-000000000006",
  하근무복하의: "f1000000-0000-0000-0000-000000000007",
  전투복상의: "f1000000-0000-0000-0000-000000000008",
  전투복하의: "f1000000-0000-0000-0000-000000000009",
  방한잠바: "f1000000-0000-0000-0000-000000000010",
  방한바지: "f1000000-0000-0000-0000-000000000011",
  군모: "f1000000-0000-0000-0000-000000000012",
  전투화: "f1000000-0000-0000-0000-000000000013",
  벨트: "f1000000-0000-0000-0000-000000000014",
  넥타이: "f1000000-0000-0000-0000-000000000015",
  양말: "f1000000-0000-0000-0000-000000000016",
  방한장갑: "f1000000-0000-0000-0000-000000000020",
  // 맞춤
  동정복상의장교: "f1000000-0000-0000-0000-000000000001",
  동정복하의장교: "f1000000-0000-0000-0000-000000000002",
  하정복상의장교: "f1000000-0000-0000-0000-000000000003",
  동정복상의부사관: "f1000000-0000-0000-0000-000000000017",
  동정복하의부사관: "f1000000-0000-0000-0000-000000000018",
  하정복상의부사관: "f1000000-0000-0000-0000-000000000019",
};

// 규격 ID
const SPECS = {
  동근무복상의_85: "aa100000-0000-0000-0000-000000000001",
  동근무복상의_90: "aa100000-0000-0000-0000-000000000002",
  동근무복상의_95: "aa100000-0000-0000-0000-000000000003",
  동근무복상의_100: "aa100000-0000-0000-0000-000000000004",
  동근무복상의_105: "aa100000-0000-0000-0000-000000000005",
  동근무복하의_28: "aa100000-0000-0000-0000-000000000006",
  동근무복하의_30: "aa100000-0000-0000-0000-000000000007",
  동근무복하의_32: "aa100000-0000-0000-0000-000000000008",
  동근무복하의_34: "aa100000-0000-0000-0000-000000000009",
  하근무복상의_85: "aa100000-0000-0000-0000-000000000010",
  하근무복상의_90: "aa100000-0000-0000-0000-000000000011",
  하근무복상의_95: "aa100000-0000-0000-0000-000000000012",
  하근무복상의_100: "aa100000-0000-0000-0000-000000000013",
  하근무복하의_28: "aa100000-0000-0000-0000-000000000014",
  하근무복하의_30: "aa100000-0000-0000-0000-000000000015",
  하근무복하의_32: "aa100000-0000-0000-0000-000000000016",
  전투복상의_S: "aa100000-0000-0000-0000-000000000017",
  전투복상의_M: "aa100000-0000-0000-0000-000000000018",
  전투복상의_L: "aa100000-0000-0000-0000-000000000019",
  전투복상의_XL: "aa100000-0000-0000-0000-000000000020",
  전투복하의_S: "aa100000-0000-0000-0000-000000000021",
  전투복하의_M: "aa100000-0000-0000-0000-000000000022",
  전투복하의_L: "aa100000-0000-0000-0000-000000000023",
  전투복하의_XL: "aa100000-0000-0000-0000-000000000024",
  방한잠바_M: "aa100000-0000-0000-0000-000000000025",
  방한잠바_L: "aa100000-0000-0000-0000-000000000026",
  방한잠바_XL: "aa100000-0000-0000-0000-000000000027",
  방한바지_M: "aa100000-0000-0000-0000-000000000028",
  방한바지_L: "aa100000-0000-0000-0000-000000000029",
  방한바지_XL: "aa100000-0000-0000-0000-000000000030",
  군모_55: "aa100000-0000-0000-0000-000000000031",
  군모_57: "aa100000-0000-0000-0000-000000000032",
  군모_59: "aa100000-0000-0000-0000-000000000033",
  전투화_260: "aa100000-0000-0000-0000-000000000034",
  전투화_270: "aa100000-0000-0000-0000-000000000035",
  전투화_280: "aa100000-0000-0000-0000-000000000036",
  벨트_Free: "aa100000-0000-0000-0000-000000000037",
  넥타이_Free: "aa100000-0000-0000-0000-000000000038",
  양말_Free: "aa100000-0000-0000-0000-000000000039",
  방한장갑_M: "aa100000-0000-0000-0000-000000000040",
  방한장갑_L: "aa100000-0000-0000-0000-000000000041",
  방한장갑_XL: "aa100000-0000-0000-0000-000000000042",
};

// 계급별 포인트
const RANK_POINTS = {
  colonel: 800000,
  lt_colonel: 800000,
  major: 800000,
  captain: 600000,
  first_lt: 600000,
  second_lt: 600000,
  warrant: 500000,
  sgt_major: 400000,
  master_sgt: 400000,
  sgt: 400000,
  civil_servant: 400000,
};

// 사용자 정보 (rank, enlist_year)
const USER_INFO = {
  u01: { name: "이대령", rank: "colonel", enlist: 2012, unit: "제1군단" },
  u02: { name: "박중령", rank: "lt_colonel", enlist: 2014, unit: "제1군단" },
  u03: { name: "최소령", rank: "major", enlist: 2016, unit: "제2군단" },
  u04: { name: "정대위", rank: "captain", enlist: 2018, unit: "제2군단" },
  u05: { name: "강중위", rank: "first_lt", enlist: 2020, unit: "제3군단" },
  u06: { name: "조소위", rank: "second_lt", enlist: 2021, unit: "제3군단" },
  u07: { name: "윤준위", rank: "warrant", enlist: 2019, unit: "군수사" },
  u08: { name: "장상사", rank: "sgt_major", enlist: 2015, unit: "군수사" },
  u09: { name: "한중사", rank: "master_sgt", enlist: 2017, unit: "제1군단" },
  u10: { name: "서하사", rank: "sgt", enlist: 2022, unit: "제1군단" },
  u11: { name: "임군무", rank: "civil_servant", enlist: 2010, unit: "군수사" },
  u12: { name: "오대위", rank: "captain", enlist: 2019, unit: "제2군단" },
  u13: { name: "배중위", rank: "first_lt", enlist: 2021, unit: "제3군단" },
  u14: { name: "유소위", rank: "second_lt", enlist: 2022, unit: "제1군단" },
  u15: { name: "남상사", rank: "sgt_major", enlist: 2014, unit: "제2군단" },
  u16: { name: "문중사", rank: "master_sgt", enlist: 2018, unit: "제3군단" },
  u17: { name: "양하사", rank: "sgt", enlist: 2023, unit: "군수사" },
  u18: { name: "권대령", rank: "colonel", enlist: 2011, unit: "제1군단" },
  u19: { name: "송소령", rank: "major", enlist: 2017, unit: "제2군단" },
  u20: { name: "신군무", rank: "civil_servant", enlist: 2015, unit: "군수사" },
  u21: { name: "하대위", rank: "captain", enlist: 2020, unit: "제3군단" },
  u22: { name: "전준위", rank: "warrant", enlist: 2016, unit: "제1군단" },
};

// 날짜 오프셋 유틸 (현재 날짜 기준 N일 전)
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== 시드 데이터 삽입 시작 ===\n");

  // ============================================================
  // 1. 재고 데이터
  // ============================================================
  console.log("1. 재고 삽입 중...");
  const inventoryRows = [
    // 제1판매소
    { store_id: STORES.s1, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_85, quantity: 20 },
    { store_id: STORES.s1, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_90, quantity: 30 },
    { store_id: STORES.s1, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_95, quantity: 25 },
    { store_id: STORES.s1, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_100, quantity: 15 },
    { store_id: STORES.s1, product_id: PRODUCTS.동근무복하의, spec_id: SPECS.동근무복하의_30, quantity: 20 },
    { store_id: STORES.s1, product_id: PRODUCTS.동근무복하의, spec_id: SPECS.동근무복하의_32, quantity: 18 },
    { store_id: STORES.s1, product_id: PRODUCTS.전투복상의, spec_id: SPECS.전투복상의_M, quantity: 15 },
    { store_id: STORES.s1, product_id: PRODUCTS.전투복상의, spec_id: SPECS.전투복상의_L, quantity: 12 },
    { store_id: STORES.s1, product_id: PRODUCTS.전투복하의, spec_id: SPECS.전투복하의_M, quantity: 10 },
    { store_id: STORES.s1, product_id: PRODUCTS.전투복하의, spec_id: SPECS.전투복하의_L, quantity: 8 },
    { store_id: STORES.s1, product_id: PRODUCTS.방한잠바, spec_id: SPECS.방한잠바_M, quantity: 10 },
    { store_id: STORES.s1, product_id: PRODUCTS.방한잠바, spec_id: SPECS.방한잠바_L, quantity: 12 },
    { store_id: STORES.s1, product_id: PRODUCTS.방한바지, spec_id: SPECS.방한바지_M, quantity: 8 },
    { store_id: STORES.s1, product_id: PRODUCTS.군모, spec_id: SPECS.군모_57, quantity: 25 },
    { store_id: STORES.s1, product_id: PRODUCTS.전투화, spec_id: SPECS.전투화_260, quantity: 6 },
    { store_id: STORES.s1, product_id: PRODUCTS.전투화, spec_id: SPECS.전투화_270, quantity: 8 },
    { store_id: STORES.s1, product_id: PRODUCTS.벨트, spec_id: SPECS.벨트_Free, quantity: 50 },
    { store_id: STORES.s1, product_id: PRODUCTS.넥타이, spec_id: SPECS.넥타이_Free, quantity: 40 },
    { store_id: STORES.s1, product_id: PRODUCTS.양말, spec_id: SPECS.양말_Free, quantity: 100 },
    { store_id: STORES.s1, product_id: PRODUCTS.방한장갑, spec_id: SPECS.방한장갑_L, quantity: 30 },
    // 제2판매소
    { store_id: STORES.s2, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_90, quantity: 25 },
    { store_id: STORES.s2, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_95, quantity: 22 },
    { store_id: STORES.s2, product_id: PRODUCTS.하근무복상의, spec_id: SPECS.하근무복상의_90, quantity: 18 },
    { store_id: STORES.s2, product_id: PRODUCTS.하근무복상의, spec_id: SPECS.하근무복상의_95, quantity: 20 },
    { store_id: STORES.s2, product_id: PRODUCTS.하근무복하의, spec_id: SPECS.하근무복하의_30, quantity: 15 },
    { store_id: STORES.s2, product_id: PRODUCTS.전투복하의, spec_id: SPECS.전투복하의_M, quantity: 12 },
    { store_id: STORES.s2, product_id: PRODUCTS.전투복하의, spec_id: SPECS.전투복하의_L, quantity: 10 },
    { store_id: STORES.s2, product_id: PRODUCTS.방한잠바, spec_id: SPECS.방한잠바_L, quantity: 9 },
    { store_id: STORES.s2, product_id: PRODUCTS.방한잠바, spec_id: SPECS.방한잠바_XL, quantity: 7 },
    { store_id: STORES.s2, product_id: PRODUCTS.군모, spec_id: SPECS.군모_55, quantity: 20 },
    { store_id: STORES.s2, product_id: PRODUCTS.군모, spec_id: SPECS.군모_57, quantity: 30 },
    { store_id: STORES.s2, product_id: PRODUCTS.전투화, spec_id: SPECS.전투화_270, quantity: 6 },
    { store_id: STORES.s2, product_id: PRODUCTS.벨트, spec_id: SPECS.벨트_Free, quantity: 45 },
    { store_id: STORES.s2, product_id: PRODUCTS.넥타이, spec_id: SPECS.넥타이_Free, quantity: 35 },
    { store_id: STORES.s2, product_id: PRODUCTS.양말, spec_id: SPECS.양말_Free, quantity: 80 },
    { store_id: STORES.s2, product_id: PRODUCTS.방한장갑, spec_id: SPECS.방한장갑_M, quantity: 25 },
    { store_id: STORES.s2, product_id: PRODUCTS.방한장갑, spec_id: SPECS.방한장갑_L, quantity: 35 },
    // 제3판매소
    { store_id: STORES.s3, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_95, quantity: 15 },
    { store_id: STORES.s3, product_id: PRODUCTS.동근무복상의, spec_id: SPECS.동근무복상의_100, quantity: 10 },
    { store_id: STORES.s3, product_id: PRODUCTS.동근무복하의, spec_id: SPECS.동근무복하의_32, quantity: 12 },
    { store_id: STORES.s3, product_id: PRODUCTS.하근무복하의, spec_id: SPECS.하근무복하의_30, quantity: 18 },
    { store_id: STORES.s3, product_id: PRODUCTS.전투복상의, spec_id: SPECS.전투복상의_L, quantity: 14 },
    { store_id: STORES.s3, product_id: PRODUCTS.전투복상의, spec_id: SPECS.전투복상의_XL, quantity: 8 },
    { store_id: STORES.s3, product_id: PRODUCTS.방한잠바, spec_id: SPECS.방한잠바_M, quantity: 7 },
    { store_id: STORES.s3, product_id: PRODUCTS.방한바지, spec_id: SPECS.방한바지_L, quantity: 9 },
    { store_id: STORES.s3, product_id: PRODUCTS.방한바지, spec_id: SPECS.방한바지_XL, quantity: 6 },
    { store_id: STORES.s3, product_id: PRODUCTS.벨트, spec_id: SPECS.벨트_Free, quantity: 45 },
    { store_id: STORES.s3, product_id: PRODUCTS.넥타이, spec_id: SPECS.넥타이_Free, quantity: 35 },
    { store_id: STORES.s3, product_id: PRODUCTS.양말, spec_id: SPECS.양말_Free, quantity: 80 },
    { store_id: STORES.s3, product_id: PRODUCTS.방한장갑, spec_id: SPECS.방한장갑_XL, quantity: 20 },
    { store_id: STORES.s3, product_id: PRODUCTS.방한장갑, spec_id: SPECS.방한장갑_L, quantity: 15 },
  ];

  const invResult = await post("inventory", inventoryRows);
  console.log(`  [OK] 재고 ${invResult.length}건 삽입`);

  // 재고 입고 이력 추가
  const invLogRows = invResult.map((inv) => ({
    inventory_id: inv.id,
    log_type: "incoming",
    quantity: inv.quantity,
    description: "초기 입고",
    created_by: USERS.admin1,
  }));
  await post("inventory_log", invLogRows);
  console.log(`  [OK] 재고 이력 ${invLogRows.length}건 삽입`);

  // inventory ID 맵 생성 (store+product+spec → id)
  const invMap = {};
  for (const inv of invResult) {
    const key = `${inv.store_id}|${inv.product_id}|${inv.spec_id}`;
    invMap[key] = inv;
  }

  function getInv(storeKey, productKey, specKey) {
    const sid = STORES[storeKey];
    const pid = PRODUCTS[productKey];
    const spid = SPECS[specKey];
    return invMap[`${sid}|${pid}|${spid}`];
  }

  // ============================================================
  // 2. 포인트 지급
  // ============================================================
  console.log("\n2. 포인트 지급 중...");
  const pointSummaryRows = [];
  const pointLedgerRows = [];

  for (const [key, info] of Object.entries(USER_INFO)) {
    const userId = USERS[key];
    const base = RANK_POINTS[info.rank] || 0;
    const bonus = (2026 - info.enlist) * 5000;
    const total = base + bonus;

    pointSummaryRows.push({
      user_id: userId,
      total_points: total,
      used_points: 0,
      reserved_points: 0,
    });

    pointLedgerRows.push({
      user_id: userId,
      point_type: "grant",
      amount: total,
      description: "2026년도 피복포인트 지급",
      reference_type: "annual",
      fiscal_year: 2026,
      created_by: USERS.admin1,
    });
  }

  await post("point_summary", pointSummaryRows);
  console.log(`  [OK] 포인트 요약 ${pointSummaryRows.length}건 삽입`);
  await post("point_ledger", pointLedgerRows);
  console.log(`  [OK] 포인트 원장 (지급) ${pointLedgerRows.length}건 삽입`);

  // point_summary를 메모리에서 추적
  const pointState = {};
  for (const ps of pointSummaryRows) {
    pointState[ps.user_id] = {
      total_points: ps.total_points,
      used_points: 0,
      reserved_points: 0,
    };
  }

  // ============================================================
  // 3. 주문 데이터 (오프라인 완제품 - delivered)
  // ============================================================
  console.log("\n3. 오프라인 완제품 주문 삽입 중...");

  // 오프라인 delivered 주문 정의
  const offlineOrders = [
    // 제1판매소 - user01 (이대령)
    { user: "u01", store: "s1", days: 30, items: [
      { prod: "동근무복상의", spec: "동근무복상의_95", qty: 1, price: 45000 },
      { prod: "동근무복하의", spec: "동근무복하의_32", qty: 1, price: 35000 },
    ]},
    // 제1판매소 - user02 (박중령) - 메인 테스트 케이스
    { user: "u02", store: "s1", days: 25, items: [
      { prod: "동근무복상의", spec: "동근무복상의_90", qty: 2, price: 45000 },
      { prod: "전투복상의", spec: "전투복상의_M", qty: 1, price: 55000 },
    ]},
    { user: "u02", store: "s1", days: 20, items: [
      { prod: "전투복하의", spec: "전투복하의_M", qty: 1, price: 45000 },
      { prod: "방한잠바", spec: "방한잠바_L", qty: 1, price: 85000 },
    ]},
    { user: "u02", store: "s2", days: 15, items: [
      { prod: "벨트", spec: "벨트_Free", qty: 2, price: 12000 },
      { prod: "넥타이", spec: "넥타이_Free", qty: 1, price: 8000 },
    ]},
    // 제1판매소 - user03
    { user: "u03", store: "s1", days: 28, items: [
      { prod: "전투복상의", spec: "전투복상의_L", qty: 1, price: 55000 },
      { prod: "전투복하의", spec: "전투복하의_L", qty: 1, price: 45000 },
    ]},
    // 제1판매소 - user04
    { user: "u04", store: "s1", days: 22, items: [
      { prod: "동근무복상의", spec: "동근무복상의_90", qty: 1, price: 45000 },
      { prod: "방한잠바", spec: "방한잠바_M", qty: 1, price: 85000 },
    ]},
    // 제2판매소 - user05
    { user: "u05", store: "s2", days: 35, items: [
      { prod: "하근무복상의", spec: "하근무복상의_90", qty: 1, price: 40000 },
      { prod: "하근무복하의", spec: "하근무복하의_30", qty: 1, price: 30000 },
    ]},
    // 제2판매소 - user06
    { user: "u06", store: "s2", days: 18, items: [
      { prod: "하근무복상의", spec: "하근무복상의_95", qty: 1, price: 40000 },
      { prod: "벨트", spec: "벨트_Free", qty: 1, price: 12000 },
      { prod: "넥타이", spec: "넥타이_Free", qty: 1, price: 8000 },
    ]},
    // 제2판매소 - user07
    { user: "u07", store: "s2", days: 40, items: [
      { prod: "전투복하의", spec: "전투복하의_M", qty: 1, price: 45000 },
      { prod: "방한잠바", spec: "방한잠바_L", qty: 1, price: 85000 },
    ]},
    // 제2판매소 - user08
    { user: "u08", store: "s2", days: 12, items: [
      { prod: "동근무복상의", spec: "동근무복상의_95", qty: 1, price: 45000 },
      { prod: "군모", spec: "군모_57", qty: 1, price: 15000 },
    ]},
    // 제3판매소 - user09
    { user: "u09", store: "s3", days: 50, items: [
      { prod: "전투복상의", spec: "전투복상의_L", qty: 1, price: 55000 },
      { prod: "방한바지", spec: "방한바지_L", qty: 1, price: 65000 },
    ]},
    // 제3판매소 - user10
    { user: "u10", store: "s3", days: 8, items: [
      { prod: "전투복상의", spec: "전투복상의_XL", qty: 1, price: 55000 },
      { prod: "벨트", spec: "벨트_Free", qty: 2, price: 12000 },
    ]},
    // 제3판매소 - user11
    { user: "u11", store: "s3", days: 45, items: [
      { prod: "동근무복상의", spec: "동근무복상의_100", qty: 1, price: 45000 },
      { prod: "방한잠바", spec: "방한잠바_M", qty: 1, price: 85000 },
    ]},
    // 제1판매소 - user12
    { user: "u12", store: "s1", days: 55, items: [
      { prod: "동근무복상의", spec: "동근무복상의_85", qty: 1, price: 45000 },
      { prod: "동근무복하의", spec: "동근무복하의_30", qty: 1, price: 35000 },
    ]},
    // 제2판매소 - user13
    { user: "u13", store: "s2", days: 60, items: [
      { prod: "하근무복상의", spec: "하근무복상의_90", qty: 1, price: 40000 },
      { prod: "방한잠바", spec: "방한잠바_XL", qty: 1, price: 85000 },
    ]},
    // 제1판매소 - user14
    { user: "u14", store: "s1", days: 14, items: [
      { prod: "전투복상의", spec: "전투복상의_M", qty: 1, price: 55000 },
      { prod: "전투복하의", spec: "전투복하의_M", qty: 1, price: 45000 },
    ]},
    // 제3판매소 - user15
    { user: "u15", store: "s3", days: 20, items: [
      { prod: "방한잠바", spec: "방한잠바_M", qty: 1, price: 85000 },
      { prod: "방한바지", spec: "방한바지_XL", qty: 1, price: 65000 },
    ]},
    // 제2판매소 - user16
    { user: "u16", store: "s2", days: 32, items: [
      { prod: "군모", spec: "군모_55", qty: 1, price: 15000 },
      { prod: "양말", spec: "양말_Free", qty: 2, price: 10000 },
    ]},
    // 제1판매소 - user17
    { user: "u17", store: "s1", days: 10, items: [
      { prod: "전투복상의", spec: "전투복상의_L", qty: 1, price: 55000 },
      { prod: "전투화", spec: "전투화_270", qty: 1, price: 70000 },
    ]},
    // 제1판매소 - user18 (권대령)
    { user: "u18", store: "s1", days: 42, items: [
      { prod: "동근무복상의", spec: "동근무복상의_90", qty: 1, price: 45000 },
      { prod: "동근무복하의", spec: "동근무복하의_32", qty: 1, price: 35000 },
      { prod: "군모", spec: "군모_57", qty: 1, price: 15000 },
    ]},
    // 제2판매소 - user19
    { user: "u19", store: "s2", days: 38, items: [
      { prod: "하근무복상의", spec: "하근무복상의_95", qty: 1, price: 40000 },
      { prod: "방한장갑", spec: "방한장갑_M", qty: 1, price: 18000 },
    ]},
    // 제3판매소 - user20
    { user: "u20", store: "s3", days: 65, items: [
      { prod: "전투복상의", spec: "전투복상의_L", qty: 1, price: 55000 },
      { prod: "방한바지", spec: "방한바지_L", qty: 1, price: 65000 },
    ]},
    // 제1판매소 - user21
    { user: "u21", store: "s1", days: 5, items: [
      { prod: "동근무복상의", spec: "동근무복상의_90", qty: 1, price: 45000 },
      { prod: "방한장갑", spec: "방한장갑_L", qty: 1, price: 18000 },
    ]},
    // 제3판매소 - user22
    { user: "u22", store: "s3", days: 48, items: [
      { prod: "동근무복상의", spec: "동근무복상의_95", qty: 1, price: 45000 },
      { prod: "방한잠바", spec: "방한잠바_L", qty: 1, price: 85000 },
    ]},
    // 추가 오프라인 주문 (다양성)
    { user: "u01", store: "s2", days: 70, items: [
      { prod: "방한잠바", spec: "방한잠바_L", qty: 1, price: 85000 },
      { prod: "방한바지", spec: "방한바지_L", qty: 1, price: 65000 },
    ]},
    { user: "u03", store: "s3", days: 75, items: [
      { prod: "전투화", spec: "전투화_270", qty: 1, price: 70000 },
      { prod: "벨트", spec: "벨트_Free", qty: 1, price: 12000 },
    ]},
    { user: "u04", store: "s2", days: 80, items: [
      { prod: "하근무복상의", spec: "하근무복상의_90", qty: 1, price: 40000 },
      { prod: "방한장갑", spec: "방한장갑_L", qty: 2, price: 18000 },
    ]},
    { user: "u05", store: "s1", days: 90, items: [
      { prod: "동근무복상의", spec: "동근무복상의_90", qty: 1, price: 45000 },
      { prod: "동근무복하의", spec: "동근무복하의_30", qty: 1, price: 35000 },
    ]},
    { user: "u08", store: "s3", days: 100, items: [
      { prod: "전투복상의", spec: "전투복상의_L", qty: 1, price: 55000 },
      { prod: "방한바지", spec: "방한바지_XL", qty: 1, price: 65000 },
    ]},
    { user: "u12", store: "s3", days: 110, items: [
      { prod: "방한잠바", spec: "방한잠바_M", qty: 1, price: 85000 },
      { prod: "방한장갑", spec: "방한장갑_XL", qty: 1, price: 18000 },
    ]},
    { user: "u15", store: "s1", days: 120, items: [
      { prod: "전투복상의", spec: "전투복상의_M", qty: 1, price: 55000 },
      { prod: "넥타이", spec: "넥타이_Free", qty: 2, price: 8000 },
    ]},
    { user: "u18", store: "s2", days: 130, items: [
      { prod: "하근무복상의", spec: "하근무복상의_90", qty: 1, price: 40000 },
      { prod: "벨트", spec: "벨트_Free", qty: 1, price: 12000 },
    ]},
    { user: "u19", store: "s1", days: 140, items: [
      { prod: "동근무복상의", spec: "동근무복상의_85", qty: 1, price: 45000 },
      { prod: "군모", spec: "군모_57", qty: 1, price: 15000 },
    ]},
    { user: "u21", store: "s3", days: 150, items: [
      { prod: "전투복상의", spec: "전투복상의_XL", qty: 1, price: 55000 },
      { prod: "전투복하의", spec: "전투복하의_XL", qty: 1, price: 45000 },
    ]},
  ];

  let offlineOrderCount = 0;
  let offlineItemCount = 0;
  const allOrderLedgerRows = [];

  for (const od of offlineOrders) {
    const userId = USERS[od.user];
    const storeId = STORES[od.store];
    const totalAmount = od.items.reduce((s, i) => s + i.price * i.qty, 0);
    const createdAt = daysAgo(od.days);

    // 포인트 충분한지 확인
    const ps = pointState[userId];
    if (!ps) continue;
    const avail = ps.total_points - ps.used_points - ps.reserved_points;
    if (totalAmount > avail) {
      console.log(`  [SKIP] ${od.user} 포인트 부족 (필요: ${totalAmount}, 가용: ${avail})`);
      continue;
    }

    // 주문 생성 (트리거가 order_number 자동생성)
    const [order] = await post("orders", {
      order_number: "TEMP",
      user_id: userId,
      store_id: storeId,
      order_type: "offline",
      product_type: "finished",
      status: "delivered",
      total_amount: totalAmount,
      created_at: createdAt,
    });
    offlineOrderCount++;

    // 주문 항목 + 재고 차감
    for (const item of od.items) {
      await post("order_items", {
        order_id: order.id,
        product_id: PRODUCTS[item.prod],
        spec_id: SPECS[item.spec],
        quantity: item.qty,
        unit_price: item.price,
        subtotal: item.price * item.qty,
      });
      offlineItemCount++;

      // 재고 차감
      const inv = getInv(od.store, item.prod, item.spec);
      if (inv && inv.quantity >= item.qty) {
        const updRes = await fetch(
          `${SUPABASE_URL}/rest/v1/inventory?id=eq.${inv.id}`,
          {
            method: "PATCH",
            headers: { ...headers, Prefer: "return=minimal" },
            body: JSON.stringify({ quantity: inv.quantity - item.qty }),
          }
        );
        inv.quantity -= item.qty;
      }
    }

    // 포인트 원장 (차감)
    allOrderLedgerRows.push({
      user_id: userId,
      point_type: "deduct",
      amount: totalAmount,
      description: `오프라인 구매 차감 (${order.order_number})`,
      reference_type: "order",
      reference_id: order.id,
      fiscal_year: 2026,
      created_by: STORES[od.store] === STORES.s1 ? USERS.store1 : STORES[od.store] === STORES.s2 ? USERS.store2 : USERS.store3,
      created_at: createdAt,
    });

    // pointState 업데이트
    ps.used_points += totalAmount;
  }

  console.log(`  [OK] 오프라인 주문 ${offlineOrderCount}건, 항목 ${offlineItemCount}건`);

  // ============================================================
  // 4. 온라인 완제품 주문 (다양한 상태)
  // ============================================================
  console.log("\n4. 온라인 완제품 주문 삽입 중...");

  const onlineOrders = [
    // delivered
    { user: "u01", store: "s1", days: 10, status: "delivered", items: [
      { prod: "방한잠바", spec: "방한잠바_L", qty: 1, price: 85000 },
    ]},
    { user: "u02", store: "s1", days: 8, status: "delivered", items: [
      { prod: "방한바지", spec: "방한바지_M", qty: 1, price: 65000 },
    ]},
    { user: "u03", store: "s2", days: 12, status: "delivered", items: [
      { prod: "벨트", spec: "벨트_Free", qty: 2, price: 12000 },
    ]},
    { user: "u04", store: "s1", days: 6, status: "delivered", items: [
      { prod: "방한잠바", spec: "방한잠바_M", qty: 1, price: 85000 },
    ]},
    { user: "u05", store: "s3", days: 15, status: "delivered", items: [
      { prod: "전투복상의", spec: "전투복상의_L", qty: 1, price: 55000 },
    ]},
    { user: "u07", store: "s1", days: 20, status: "delivered", items: [
      { prod: "방한장갑", spec: "방한장갑_L", qty: 2, price: 18000 },
    ]},
    { user: "u09", store: "s2", days: 18, status: "delivered", items: [
      { prod: "하근무복상의", spec: "하근무복상의_90", qty: 1, price: 40000 },
    ]},
    { user: "u11", store: "s3", days: 22, status: "delivered", items: [
      { prod: "넥타이", spec: "넥타이_Free", qty: 3, price: 8000 },
    ]},
    { user: "u13", store: "s1", days: 3, status: "delivered", items: [
      { prod: "방한잠바", spec: "방한잠바_M", qty: 1, price: 85000 },
    ]},
    { user: "u15", store: "s2", days: 5, status: "delivered", items: [
      { prod: "전투복하의", spec: "전투복하의_L", qty: 1, price: 45000 },
    ]},
    // shipping
    { user: "u02", store: "s1", days: 2, status: "shipping", items: [
      { prod: "방한잠바", spec: "방한잠바_L", qty: 1, price: 85000 },
    ]},
    { user: "u06", store: "s2", days: 1, status: "shipping", items: [
      { prod: "동근무복상의", spec: "동근무복상의_90", qty: 1, price: 45000 },
    ]},
    { user: "u10", store: "s3", days: 3, status: "shipping", items: [
      { prod: "방한바지", spec: "방한바지_L", qty: 1, price: 65000 },
    ]},
    // confirmed
    { user: "u03", store: "s1", days: 1, status: "confirmed", items: [
      { prod: "방한잠바", spec: "방한잠바_M", qty: 1, price: 85000 },
    ]},
    { user: "u08", store: "s2", days: 2, status: "confirmed", items: [
      { prod: "방한장갑", spec: "방한장갑_L", qty: 1, price: 18000 },
    ]},
    { user: "u14", store: "s3", days: 1, status: "confirmed", items: [
      { prod: "전투복상의", spec: "전투복상의_L", qty: 1, price: 55000 },
    ]},
    // pending
    { user: "u04", store: "s2", days: 0, status: "pending", items: [
      { prod: "방한잠바", spec: "방한잠바_L", qty: 1, price: 85000 },
    ]},
    { user: "u16", store: "s1", days: 0, status: "pending", items: [
      { prod: "방한바지", spec: "방한바지_M", qty: 1, price: 65000 },
    ]},
    { user: "u20", store: "s3", days: 0, status: "pending", items: [
      { prod: "전투복하의", spec: "전투복하의_M", qty: 1, price: 45000 },
    ]},
    // cancelled
    { user: "u05", store: "s2", days: 25, status: "cancelled", items: [
      { prod: "방한잠바", spec: "방한잠바_XL", qty: 1, price: 85000 },
    ]},
    { user: "u12", store: "s1", days: 30, status: "cancelled", items: [
      { prod: "하근무복하의", spec: "하근무복하의_30", qty: 1, price: 30000 },
    ]},
  ];

  let onlineCount = 0;
  let onlineItemCount = 0;

  for (const od of onlineOrders) {
    const userId = USERS[od.user];
    const storeId = STORES[od.store];
    const totalAmount = od.items.reduce((s, i) => s + i.price * i.qty, 0);
    const createdAt = daysAgo(od.days);

    const ps = pointState[userId];
    if (!ps) continue;
    const avail = ps.total_points - ps.used_points - ps.reserved_points;
    if (totalAmount > avail) continue;

    const [order] = await post("orders", {
      order_number: "TEMP",
      user_id: userId,
      store_id: storeId,
      order_type: "online",
      product_type: "finished",
      status: od.status,
      total_amount: totalAmount,
      delivery_method: "parcel",
      delivery_address: USER_INFO[od.user]?.unit || "부대",
      created_at: createdAt,
    });
    onlineCount++;

    for (const item of od.items) {
      await post("order_items", {
        order_id: order.id,
        product_id: PRODUCTS[item.prod],
        spec_id: SPECS[item.spec],
        quantity: item.qty,
        unit_price: item.price,
        subtotal: item.price * item.qty,
      });
      onlineItemCount++;
    }

    // 포인트 처리
    if (od.status === "delivered") {
      // 확정 차감
      allOrderLedgerRows.push({
        user_id: userId,
        point_type: "deduct",
        amount: totalAmount,
        description: `배송 확정 차감 (${order.order_number})`,
        reference_type: "order",
        reference_id: order.id,
        fiscal_year: 2026,
        created_by: null,
        created_at: createdAt,
      });
      ps.used_points += totalAmount;
    } else if (["pending", "confirmed", "shipping"].includes(od.status)) {
      // 예약
      allOrderLedgerRows.push({
        user_id: userId,
        point_type: "reserve",
        amount: totalAmount,
        description: `온라인 구매 예약 (${order.order_number})`,
        reference_type: "order",
        reference_id: order.id,
        fiscal_year: 2026,
        created_by: null,
        created_at: createdAt,
      });
      ps.reserved_points += totalAmount;
    }
    // cancelled는 포인트 처리 안함 (이미 취소됨)
  }

  console.log(`  [OK] 온라인 완제품 주문 ${onlineCount}건, 항목 ${onlineItemCount}건`);

  // ============================================================
  // 5. 맞춤피복 주문 + 체척권 발행
  // ============================================================
  console.log("\n5. 맞춤피복 주문 + 체척권 삽입 중...");

  // 장교 사용자 (동정복 상의/하의 주문): u01~u07 (장교), u08+ (부사관)
  const customOrders = [
    // user02 (박중령) - 핵심 테스트
    { user: "u02", days: 60, status: "pending", items: [
      { prod: "동정복상의장교", price: 120000 },
      { prod: "동정복하의장교", price: 80000 },
    ]},
    { user: "u02", days: 45, status: "pending", items: [
      { prod: "하정복상의장교", price: 100000 },
    ]},
    // 기타 장교
    { user: "u01", days: 90, status: "pending", items: [
      { prod: "동정복상의장교", price: 120000 },
      { prod: "동정복하의장교", price: 80000 },
    ]},
    { user: "u03", days: 75, status: "pending", items: [
      { prod: "동정복상의장교", price: 120000 },
    ]},
    { user: "u04", days: 50, status: "pending", items: [
      { prod: "하정복상의장교", price: 100000 },
      { prod: "동정복하의장교", price: 80000 },
    ]},
    { user: "u05", days: 40, status: "pending", items: [
      { prod: "동정복상의장교", price: 120000 },
    ]},
    { user: "u06", days: 30, status: "pending", items: [
      { prod: "동정복상의장교", price: 120000 },
      { prod: "동정복하의장교", price: 80000 },
    ]},
    { user: "u07", days: 20, status: "pending", items: [
      { prod: "동정복상의장교", price: 120000 },
    ]},
    // 부사관
    { user: "u08", days: 65, status: "pending", items: [
      { prod: "동정복상의부사관", price: 95000 },
      { prod: "동정복하의부사관", price: 65000 },
    ]},
    { user: "u09", days: 55, status: "pending", items: [
      { prod: "동정복상의부사관", price: 95000 },
    ]},
    { user: "u10", days: 35, status: "pending", items: [
      { prod: "동정복하의부사관", price: 65000 },
      { prod: "하정복상의부사관", price: 85000 },
    ]},
    { user: "u15", days: 28, status: "pending", items: [
      { prod: "동정복상의부사관", price: 95000 },
    ]},
    { user: "u16", days: 22, status: "pending", items: [
      { prod: "동정복상의부사관", price: 95000 },
      { prod: "동정복하의부사관", price: 65000 },
    ]},
    // 체척권 등록 완료 (registered) 케이스
    { user: "u01", store: "s1", days: 150, status: "pending", tailorId: TAILORS.t1, ticketStatus: "registered", items: [
      { prod: "동정복상의장교", price: 120000 },
    ]},
    { user: "u18", store: "s1", days: 120, status: "pending", tailorId: TAILORS.t2, ticketStatus: "registered", items: [
      { prod: "동정복상의장교", price: 120000 },
      { prod: "동정복하의장교", price: 80000 },
    ]},
    // 취소된 맞춤피복
    { user: "u22", days: 100, status: "cancelled", items: [
      { prod: "동정복상의장교", price: 120000 },
    ]},
  ];

  let customOrderCount = 0;
  let ticketCount = 0;

  for (const od of customOrders) {
    const userId = USERS[od.user];
    const storeId = od.store ? STORES[od.store] : null;
    const totalAmount = od.items.reduce((s, i) => s + i.price, 0);
    const createdAt = daysAgo(od.days);

    const ps = pointState[userId];
    if (!ps) continue;
    const avail = ps.total_points - ps.used_points - ps.reserved_points;
    if (totalAmount > avail) {
      console.log(`  [SKIP] ${od.user} 맞춤 포인트 부족 (필요: ${totalAmount}, 가용: ${avail})`);
      continue;
    }

    const [order] = await post("orders", {
      order_number: "TEMP",
      user_id: userId,
      store_id: storeId,
      order_type: "online",
      product_type: "custom",
      status: od.status,
      total_amount: totalAmount,
      created_at: createdAt,
    });
    customOrderCount++;

    for (const item of od.items) {
      const [orderItem] = await post("order_items", {
        order_id: order.id,
        product_id: PRODUCTS[item.prod],
        spec_id: null,
        quantity: 1,
        unit_price: item.price,
        subtotal: item.price,
      });

      // 체척권 발행 (cancelled 주문 제외)
      if (od.status !== "cancelled") {
        const ticketStatus = od.ticketStatus || "issued";
        const ticketData = {
          ticket_number: "TEMP",
          order_item_id: orderItem.id,
          user_id: userId,
          product_id: PRODUCTS[item.prod],
          amount: item.price,
          status: ticketStatus,
          created_at: createdAt,
        };
        if (ticketStatus === "registered" && od.tailorId) {
          ticketData.tailor_id = od.tailorId;
          ticketData.registered_at = daysAgo(od.days - 10);
        }
        await post("tailoring_tickets", ticketData);
        ticketCount++;
      }
    }

    // 포인트 예약
    if (od.status !== "cancelled") {
      allOrderLedgerRows.push({
        user_id: userId,
        point_type: "reserve",
        amount: totalAmount,
        description: `맞춤피복 구매 예약 (${order.order_number})`,
        reference_type: "order",
        reference_id: order.id,
        fiscal_year: 2026,
        created_by: null,
        created_at: createdAt,
      });
      ps.reserved_points += totalAmount;
    }
  }

  console.log(`  [OK] 맞춤피복 주문 ${customOrderCount}건, 체척권 ${ticketCount}건`);

  // ============================================================
  // 6. 포인트 원장 (주문 관련) 일괄 삽입
  // ============================================================
  console.log("\n6. 포인트 원장 (주문 관련) 삽입 중...");
  if (allOrderLedgerRows.length > 0) {
    // 배치로 삽입 (최대 50건씩)
    const batchSize = 50;
    for (let i = 0; i < allOrderLedgerRows.length; i += batchSize) {
      const batch = allOrderLedgerRows.slice(i, i + batchSize);
      await post("point_ledger", batch);
    }
    console.log(`  [OK] 포인트 원장 ${allOrderLedgerRows.length}건 삽입`);
  }

  // ============================================================
  // 7. point_summary 업데이트 (used_points, reserved_points 반영)
  // ============================================================
  console.log("\n7. 포인트 요약 업데이트 중...");
  for (const [userId, ps] of Object.entries(pointState)) {
    if (ps.used_points > 0 || ps.reserved_points > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/point_summary?user_id=eq.${userId}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({
          used_points: ps.used_points,
          reserved_points: ps.reserved_points,
        }),
      });
    }
  }
  console.log(`  [OK] 포인트 요약 업데이트 완료`);

  // ============================================================
  // 최종 집계
  // ============================================================
  console.log("\n=== 삽입 완료 ===");
  console.log(`재고: ${inventoryRows.length}건`);
  console.log(`재고 이력: ${invLogRows.length}건`);
  console.log(`포인트 요약: ${pointSummaryRows.length}건`);
  console.log(`포인트 원장 (지급): ${pointLedgerRows.length}건`);
  console.log(`오프라인 주문: ${offlineOrderCount}건`);
  console.log(`온라인 완제품 주문: ${onlineCount}건`);
  console.log(`맞춤피복 주문: ${customOrderCount}건`);
  console.log(`체척권: ${ticketCount}건`);
  console.log(`포인트 원장 (주문 관련): ${allOrderLedgerRows.length}건`);
  const total = inventoryRows.length + invLogRows.length + pointSummaryRows.length +
    pointLedgerRows.length + offlineOrderCount + onlineCount + customOrderCount +
    ticketCount + allOrderLedgerRows.length;
  console.log(`\n총 ${total}건 삽입`);
}

main().catch((err) => {
  console.error("오류 발생:", err.message);
  process.exit(1);
});
