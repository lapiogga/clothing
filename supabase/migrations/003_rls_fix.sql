-- ============================================
-- RLS 정책 누락 수정 + store_id nullable 처리
-- ============================================

-- 1. point_ledger INSERT 권한 추가
--    - 일반 사용자: 본인 user_id 레코드만 INSERT (온라인 구매 예약포인트)
--    - 판매소 담당자: 모든 레코드 INSERT (오프라인 판매, 배송 확정 차감)
CREATE POLICY "user_insert_ledger" ON point_ledger
  FOR INSERT WITH CHECK (user_id = auth.uid() AND get_user_role() = 'user');

CREATE POLICY "store_insert_ledger" ON point_ledger
  FOR INSERT WITH CHECK (get_user_role() = 'store');

-- 2. point_summary UPDATE 권한 추가
--    - 일반 사용자: 본인 레코드만 UPDATE (온라인 구매 예약포인트)
--    - 판매소 담당자: 모든 레코드 UPDATE (오프라인 판매, 배송 확정 차감)
CREATE POLICY "user_update_own_summary" ON point_summary
  FOR UPDATE USING (user_id = auth.uid() AND get_user_role() = 'user');

CREATE POLICY "store_update_summary" ON point_summary
  FOR UPDATE USING (get_user_role() = 'store');

-- 3. orders.store_id nullable로 변경 (맞춤피복 주문은 판매소 불필요)
ALTER TABLE orders ALTER COLUMN store_id DROP NOT NULL;

-- 4. store_own_orders 정책 수정 (store_id NULL인 맞춤피복 주문 제외)
DROP POLICY "store_own_orders" ON orders;
CREATE POLICY "store_own_orders" ON orders FOR ALL
  USING (store_id IS NOT NULL AND store_id = get_user_store_id());
