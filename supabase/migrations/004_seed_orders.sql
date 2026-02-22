-- ============================================
-- 테스트 주문 데이터 (제2판매소 중심)
-- users 테이블에서 실제 user_id를 동적으로 참조
-- ============================================

DO $$
DECLARE
  u1 uuid; u2 uuid; u3 uuid; u4 uuid; u5 uuid;
  o1 uuid := 'b0100000-0000-0000-0000-000000000001';
  o2 uuid := 'b0100000-0000-0000-0000-000000000002';
  o3 uuid := 'b0100000-0000-0000-0000-000000000003';
  o4 uuid := 'b0100000-0000-0000-0000-000000000004';
  o5 uuid := 'b0100000-0000-0000-0000-000000000005';
  store2 uuid := 'a1000000-0000-0000-0000-000000000002';
BEGIN
  -- 이미 주문이 존재하면 건너뜀
  IF EXISTS (SELECT 1 FROM orders WHERE id = o1) THEN
    RAISE NOTICE '테스트 주문 데이터가 이미 존재합니다. 건너뜁니다.';
    RETURN;
  END IF;

  -- users 테이블에서 일반사용자 5명 순서대로 조회
  SELECT id INTO u1 FROM users WHERE role = 'user' ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO u2 FROM users WHERE role = 'user' ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO u3 FROM users WHERE role = 'user' ORDER BY created_at LIMIT 1 OFFSET 2;
  SELECT id INTO u4 FROM users WHERE role = 'user' ORDER BY created_at LIMIT 1 OFFSET 3;
  SELECT id INTO u5 FROM users WHERE role = 'user' ORDER BY created_at LIMIT 1 OFFSET 4;

  IF u1 IS NULL THEN
    RAISE NOTICE '일반사용자(role=user)가 없습니다. 테스트 주문 데이터 생성을 건너뜁니다.';
    RETURN;
  END IF;

  -- 온라인 주문 5건 (제2판매소)
  INSERT INTO orders (id, user_id, store_id, order_type, product_type, status, total_amount, delivery_method, delivery_address, created_at)
  VALUES
    (o1, u1, store2, 'online', 'finished', 'pending',  80000, 'parcel', '경기도 고양시 일산서구 대화동 100', now() - interval '5 days'),
    (o2, u2, store2, 'online', 'finished', 'confirmed', 45000, 'direct', NULL,                              now() - interval '4 days'),
    (o3, u3, store2, 'online', 'finished', 'shipping',  85000, 'parcel', '강원도 춘천시 소양강로 20',          now() - interval '3 days'),
    (o4, u4, store2, 'online', 'finished', 'delivered', 70000, 'parcel', '충북 청주시 흥덕구 직지대로 1',       now() - interval '7 days'),
    (o5, u5, store2, 'online', 'finished', 'cancelled', 45000, 'parcel', '서울시 강남구 테헤란로 100',          now() - interval '6 days');

  -- 주문 항목
  INSERT INTO order_items (order_id, product_id, spec_id, quantity, unit_price, subtotal)
  VALUES
    (o1, 'f1000000-0000-0000-0000-000000000004', 'aa100000-0000-0000-0000-000000000002', 1, 45000, 45000),
    (o1, 'f1000000-0000-0000-0000-000000000009', 'aa100000-0000-0000-0000-000000000022', 1, 35000, 35000),
    (o2, 'f1000000-0000-0000-0000-000000000006', 'aa100000-0000-0000-0000-000000000011', 1, 45000, 45000),
    (o3, 'f1000000-0000-0000-0000-000000000010', 'aa100000-0000-0000-0000-000000000026', 1, 85000, 85000),
    (o4, 'f1000000-0000-0000-0000-000000000013', 'aa100000-0000-0000-0000-000000000034', 1, 70000, 70000),
    (o5, 'f1000000-0000-0000-0000-000000000004', 'aa100000-0000-0000-0000-000000000003', 1, 45000, 45000);

  -- 포인트: 주문1 예약
  INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
  VALUES (u1, 'reserve', 80000, '온라인 구매 예약', 'order', o1, 2026);
  UPDATE point_summary SET reserved_points = reserved_points + 80000 WHERE user_id = u1;

  -- 포인트: 주문2 예약
  INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
  VALUES (u2, 'reserve', 45000, '온라인 구매 예약', 'order', o2, 2026);
  UPDATE point_summary SET reserved_points = reserved_points + 45000 WHERE user_id = u2;

  -- 포인트: 주문3 예약
  INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
  VALUES (u3, 'reserve', 85000, '온라인 구매 예약', 'order', o3, 2026);
  UPDATE point_summary SET reserved_points = reserved_points + 85000 WHERE user_id = u3;

  -- 포인트: 주문4 배송완료 (예약→차감)
  INSERT INTO point_ledger (user_id, point_type, amount, description, reference_type, reference_id, fiscal_year)
  VALUES
    (u4, 'reserve',  70000, '온라인 구매 예약',   'order', o4, 2026),
    (u4, 'deduct',   70000, '배송 확정 차감',     'order', o4, 2026),
    (u4, 'release',  70000, '배송 확정 예약해제', 'order', o4, 2026);
  UPDATE point_summary SET used_points = used_points + 70000 WHERE user_id = u4;

  -- 재고 차감: 주문4 (전투화 260, 제2판매소)
  UPDATE inventory SET quantity = quantity - 1
  WHERE store_id = store2
    AND product_id = 'f1000000-0000-0000-0000-000000000013'
    AND spec_id    = 'aa100000-0000-0000-0000-000000000034';

  RAISE NOTICE '테스트 주문 5건 생성 완료';
END $$;
