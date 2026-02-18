-- ============================================
-- 스키마 불일치 수정 마이그레이션
-- ============================================

-- 1. tailor_settlements: 컬럼명 변경 + created_by 추가
ALTER TABLE tailor_settlements RENAME COLUMN settlement_period_start TO period_from;
ALTER TABLE tailor_settlements RENAME COLUMN settlement_period_end TO period_to;
ALTER TABLE tailor_settlements ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

-- 2. tailoring_tickets: settlement_id 추가
ALTER TABLE tailoring_tickets ADD COLUMN IF NOT EXISTS settlement_id uuid REFERENCES tailor_settlements(id);
CREATE INDEX IF NOT EXISTS idx_tailoring_tickets_settlement_id ON tailoring_tickets(settlement_id);

-- 3. inventory_log: reason → description 변경
ALTER TABLE inventory_log RENAME COLUMN reason TO description;
