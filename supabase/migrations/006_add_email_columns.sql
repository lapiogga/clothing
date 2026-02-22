-- stores, tailors 테이블에 email 컬럼 추가
ALTER TABLE stores ADD COLUMN IF NOT EXISTS email varchar(255);
ALTER TABLE tailors ADD COLUMN IF NOT EXISTS email varchar(255);
