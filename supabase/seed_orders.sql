-- ============================================
-- 테스트 주문 데이터 (제2판매소 중심)
-- Supabase SQL Editor (service_role)에서 실행
-- ============================================

-- 온라인 주문 5건 (제2판매소)
INSERT INTO orders (id, user_id, store_id, order_type, product_type, status, total_amount, delivery_method, delivery_address, created_at)
VALUES
  ('b0100000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'online', 'finished', 'pending',  80000, 'parcel', '경기도 고양시 일산서구 대화동 100',      now() - interval '5 days'),
  ('b0100000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'online', 'finished', 'confirmed', 45000, 'direct', NULL,                                    now() - interval '4 days'),
  ('b0100000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002', 'online', 'finished', 'shipping',  85000, 'parcel', '강원도 춘천시 소양강로 20',                now() - interval '3 days'),
  ('b0100000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002', 'online', 'finished', 'delivered', 70000, 'parcel', '충북 청주시 흥덕구 직지대로 1',            now() - interval '7 days'),
  ('b0100000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'online', 'finished', 'cancelled', 45000, 'parcel', '서울시 강남구 테헤란로 100',               now() - interval '6 days');

-- 주문 항목 (order_items)
INSERT INTO order_items (order_id, product_id, spec_id, quantity, unit_price, subtotal)
VALUES
  -- 주문1 (pending): 이대령 - 동근무복상의90 + 전투복하의M
  ('b0100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000004', 'aa100000-0000-0000-0000-000000000002', 1, 45000, 45000),
  ('b0100000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000009', 'aa100000-0000-0000-0000-000000000022', 1, 35000, 35000),
  -- 주문2 (confirmed): 박중령 - 하근무복상의90
  ('b0100000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000006', 'aa100000-0000-0000-0000-000000000011', 1, 45000, 45000),
  -- 주문3 (shipping): 최소령 - 방한잠바L
  ('b0100000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000010', 'aa100000-0000-0000-0000-000000000026', 1, 85000, 85000),
  -- 주문4 (delivered): 정대위 - 전투화260
  ('b0100000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000013', 'aa100000-0000-0000-0000-000000000034', 1, 70000, 70000),
  -- 주문5 (cancelled): 강중위 - 동근무복상의95
  ('b0100000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000004', 'aa100000-0000-0000-0000-000000000003', 1, 45000, 45000);

-- 포인트 반영 (point_ledger + point_summary)
-- 주문1 (pending): 이대령 80000 예약
INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
VALUES ('d1000000-0000-0000-0000-000000000001', 'reserve', 80000, '온라인 구매 예약', 'order', 'b0100000-0000-0000-0000-000000000001', 2026);
UPDATE point_summary SET reserved_points = reserved_points + 80000 WHERE user_id = 'd1000000-0000-0000-0000-000000000001';

-- 주문2 (confirmed): 박중령 45000 예약
INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
VALUES ('d1000000-0000-0000-0000-000000000002', 'reserve', 45000, '온라인 구매 예약', 'order', 'b0100000-0000-0000-0000-000000000002', 2026);
UPDATE point_summary SET reserved_points = reserved_points + 45000 WHERE user_id = 'd1000000-0000-0000-0000-000000000002';

-- 주문3 (shipping): 최소령 85000 예약
INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
VALUES ('d1000000-0000-0000-0000-000000000003', 'reserve', 85000, '온라인 구매 예약', 'order', 'b0100000-0000-0000-0000-000000000003', 2026);
UPDATE point_summary SET reserved_points = reserved_points + 85000 WHERE user_id = 'd1000000-0000-0000-0000-000000000003';

-- 주문4 (delivered): 정대위 70000 차감 + 예약해제
INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
VALUES
  ('d1000000-0000-0000-0000-000000000004', 'reserve',  70000, '온라인 구매 예약',        'order', 'b0100000-0000-0000-0000-000000000004', 2026),
  ('d1000000-0000-0000-0000-000000000004', 'deduct',   70000, '배송 확정 차감',           'order', 'b0100000-0000-0000-0000-000000000004', 2026),
  ('d1000000-0000-0000-0000-000000000004', 'release',  70000, '배송 확정 예약해제',        'order', 'b0100000-0000-0000-0000-000000000004', 2026);
UPDATE point_summary SET used_points = used_points + 70000 WHERE user_id = 'd1000000-0000-0000-0000-000000000004';

-- 주문4 재고 차감 (전투화 260, 제2판매소)
UPDATE inventory SET quantity = quantity - 1
WHERE store_id = 'a1000000-0000-0000-0000-000000000002'
  AND product_id = 'f1000000-0000-0000-0000-000000000013'
  AND spec_id = 'aa100000-0000-0000-0000-000000000034';

-- 주문5 (cancelled): 강중위 - 예약 없음 (취소 상태이므로 포인트 변동 없음)
