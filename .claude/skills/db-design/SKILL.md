---
name: db-design
description: 피복 구매관리 시스템 DB 설계서. 테이블 스키마, 관계, 인덱스, RLS 정책, 마이그레이션 SQL을 정의한다.
---

# DB 설계서

## 1. ER 관계도 (텍스트)

```
users ──┬── point_ledger
        ├── point_summary
        ├── orders ──── order_items ──── tailoring_tickets
        └── (store_id) → stores ──── delivery_zones
                                  ──── inventory ──── inventory_log
            (tailor_id) → tailors ──── tailor_settlements

categories (self-ref) ──── products ──── product_specs
menus (self-ref)
```

## 2. 테이블 상세 스키마

### 2.1 stores (피복판매소)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| name | varchar(100) | NOT NULL | 판매소명 |
| address | text | | 주소 |
| phone | varchar(20) | | 연락처 |
| manager_name | varchar(50) | | 담당자명 |
| is_active | boolean | default true | 사용 여부 |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### 2.2 tailors (체척업체)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| name | varchar(100) | NOT NULL | 업체명 |
| business_number | varchar(20) | | 사업자번호 |
| representative | varchar(50) | | 대표자 |
| address | text | | 주소 |
| phone | varchar(20) | | 연락처 |
| bank_name | varchar(50) | | 은행명 |
| account_number | varchar(50) | | 계좌번호 |
| account_holder | varchar(50) | | 예금주 |
| is_active | boolean | default true | 사용 여부 |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### 2.3 users (사용자)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, FK → auth.users.id | Supabase Auth 연동 |
| email | varchar(255) | UNIQUE, NOT NULL | 이메일 |
| name | varchar(50) | NOT NULL | 이름 |
| role | varchar(20) | NOT NULL, CHECK(admin/store/tailor/user) | 역할 |
| rank | varchar(20) | | 계급 (일반사용자만) |
| military_number | varchar(30) | | 군번/사번 |
| unit | varchar(100) | | 소속 |
| enlist_date | date | | 입대일/근무시작일 |
| promotion_date | date | | 최근 진급일 |
| retirement_date | date | | 퇴직예정일 |
| store_id | uuid | FK → stores.id | 소속 판매소 (store 역할) |
| tailor_id | uuid | FK → tailors.id | 소속 업체 (tailor 역할) |
| is_active | boolean | default true | 활성 상태 |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### 2.4 categories (품목 분류)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| name | varchar(100) | NOT NULL | 분류명 |
| parent_id | uuid | FK → categories.id, NULLABLE | 상위 분류 |
| level | smallint | NOT NULL, CHECK(1,2,3) | 단계 |
| sort_order | integer | default 0 | 정렬 순서 |
| is_active | boolean | default true | 사용 여부 |
| created_at | timestamptz | default now() | |

### 2.5 products (품목)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| name | varchar(200) | NOT NULL | 품목명 |
| category_id | uuid | FK → categories.id, NOT NULL | 소분류 |
| product_type | varchar(20) | NOT NULL, CHECK(finished/custom) | 완제품/맞춤피복 |
| price | integer | NOT NULL, CHECK(>= 0) | 단가(원) |
| image_url | text | | 이미지 URL |
| description | text | | 설명 |
| is_active | boolean | default true | 사용 여부 |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### 2.6 product_specs (규격)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| product_id | uuid | FK → products.id, NOT NULL | 품목 |
| spec_name | varchar(50) | NOT NULL | 규격명 (예: 95, 100) |
| sort_order | integer | default 0 | 정렬 순서 |
| is_active | boolean | default true | 사용 여부 |
| created_at | timestamptz | default now() | |

**제약**: product_id의 product_type이 'finished'인 경우만 규격 생성 가능 (앱 레벨 검증)

### 2.7 delivery_zones (직접 배송지)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| store_id | uuid | FK → stores.id, NOT NULL | 소속 판매소 |
| name | varchar(100) | NOT NULL | 배송지명 |
| address | text | | 주소 |
| note | text | | 비고 |
| is_active | boolean | default true | 사용 여부 |
| created_at | timestamptz | default now() | |

### 2.8 inventory (재고)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| store_id | uuid | FK → stores.id, NOT NULL | 판매소 |
| product_id | uuid | FK → products.id, NOT NULL | 품목 |
| spec_id | uuid | FK → product_specs.id | 규격 (완제품만) |
| quantity | integer | NOT NULL, default 0, CHECK(>= 0) | 현재고 |
| updated_at | timestamptz | default now() | 최종변동일 |

**UNIQUE**: (store_id, product_id, spec_id)

### 2.9 inventory_log (재고 변동 이력)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| inventory_id | uuid | FK → inventory.id, NOT NULL | 재고 |
| log_type | varchar(20) | NOT NULL | incoming/sale/return/adjust_up/adjust_down |
| quantity | integer | NOT NULL | 변동 수량 |
| reason | text | | 사유 |
| order_item_id | uuid | FK → order_items.id | 관련 주문항목 |
| created_by | uuid | FK → users.id | 처리자 |
| created_at | timestamptz | default now() | |

### 2.10 point_summary (포인트 요약)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → users.id, UNIQUE, NOT NULL | 사용자 |
| total_points | integer | default 0 | 총 지급 포인트 |
| used_points | integer | default 0 | 사용 포인트 |
| reserved_points | integer | default 0 | 예약 포인트 |
| updated_at | timestamptz | default now() | |

**파생값**: `available_points = total_points - used_points - reserved_points`

### 2.11 point_ledger (포인트 원장)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| user_id | uuid | FK → users.id, NOT NULL | 사용자 |
| point_type | varchar(20) | NOT NULL | grant/deduct/add/return/reserve/release |
| amount | integer | NOT NULL | 금액 (양수) |
| balance_after | integer | | 변동 후 잔액 |
| description | text | | 설명 |
| reference_type | varchar(30) | | 참조 유형 (order/ticket/annual 등) |
| reference_id | uuid | | 참조 ID |
| fiscal_year | smallint | | 회계연도 |
| created_by | uuid | FK → users.id | 처리자 |
| created_at | timestamptz | default now() | |

### 2.12 orders (주문)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| order_number | varchar(30) | UNIQUE, NOT NULL | 주문번호 (자동생성) |
| user_id | uuid | FK → users.id, NOT NULL | 구매자 |
| store_id | uuid | FK → stores.id, NOT NULL | 판매소 |
| order_type | varchar(20) | NOT NULL, CHECK(online/offline) | 주문유형 |
| product_type | varchar(20) | NOT NULL, CHECK(finished/custom) | 품목유형 |
| status | varchar(20) | NOT NULL, default 'pending' | 주문상태 |
| total_amount | integer | NOT NULL, default 0 | 총 금액 |
| delivery_method | varchar(20) | | parcel/direct (온라인만) |
| delivery_zone_id | uuid | FK → delivery_zones.id | 직접배송지 (direct일 때) |
| delivery_address | text | | 택배 배송주소 |
| cancel_reason | text | | 취소 사유 |
| cancelled_by | uuid | FK → users.id | 취소 처리자 |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### 2.13 order_items (주문 상세)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| order_id | uuid | FK → orders.id, NOT NULL | 주문 |
| product_id | uuid | FK → products.id, NOT NULL | 품목 |
| spec_id | uuid | FK → product_specs.id | 규격 (완제품만) |
| quantity | integer | NOT NULL, default 1 | 수량 |
| unit_price | integer | NOT NULL | 단가 |
| subtotal | integer | NOT NULL | 소계 |
| status | varchar(20) | NOT NULL, default 'active' | active/returned |
| created_at | timestamptz | default now() | |

### 2.14 tailoring_tickets (체척권)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| ticket_number | varchar(30) | UNIQUE, NOT NULL | 체척권번호 (자동생성) |
| order_item_id | uuid | FK → order_items.id, NOT NULL | 주문항목 |
| user_id | uuid | FK → users.id, NOT NULL | 사용자 |
| product_id | uuid | FK → products.id, NOT NULL | 품목 |
| amount | integer | NOT NULL | 금액 |
| status | varchar(20) | NOT NULL, default 'issued' | issued/registered/cancel_requested/cancelled |
| tailor_id | uuid | FK → tailors.id | 등록 업체 |
| registered_at | timestamptz | | 등록일시 |
| cancelled_at | timestamptz | | 취소일시 |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### 2.15 tailor_settlements (체척업체 정산)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| tailor_id | uuid | FK → tailors.id, NOT NULL | 업체 |
| settlement_period_start | date | NOT NULL | 정산 시작일 |
| settlement_period_end | date | NOT NULL | 정산 종료일 |
| ticket_count | integer | NOT NULL | 건수 |
| total_amount | integer | NOT NULL | 총 금액 |
| status | varchar(20) | default 'pending' | pending/confirmed |
| confirmed_at | timestamptz | | 확정일시 |
| confirmed_by | uuid | FK → users.id | 확정자 |
| created_at | timestamptz | default now() | |

### 2.16 menus (메뉴)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | |
| name | varchar(100) | NOT NULL | 메뉴명 |
| url | varchar(255) | | URL 경로 |
| parent_id | uuid | FK → menus.id | 상위 메뉴 |
| sort_order | integer | default 0 | 정렬 순서 |
| role_access | text[] | | 접근 가능 역할 배열 |
| is_active | boolean | default true | 사용 여부 |
| created_at | timestamptz | default now() | |

## 3. 인덱스

```sql
-- users
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_users_tailor_id ON users(tailor_id);
CREATE INDEX idx_users_rank ON users(rank);

-- categories
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);

-- products
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_product_type ON products(product_type);

-- product_specs
CREATE INDEX idx_product_specs_product_id ON product_specs(product_id);

-- inventory
CREATE UNIQUE INDEX idx_inventory_unique ON inventory(store_id, product_id, spec_id);
CREATE INDEX idx_inventory_store_id ON inventory(store_id);

-- inventory_log
CREATE INDEX idx_inventory_log_inventory_id ON inventory_log(inventory_id);
CREATE INDEX idx_inventory_log_created_at ON inventory_log(created_at);

-- point_summary
CREATE UNIQUE INDEX idx_point_summary_user_id ON point_summary(user_id);

-- point_ledger
CREATE INDEX idx_point_ledger_user_id ON point_ledger(user_id);
CREATE INDEX idx_point_ledger_fiscal_year ON point_ledger(fiscal_year);
CREATE INDEX idx_point_ledger_created_at ON point_ledger(created_at);

-- orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- tailoring_tickets
CREATE INDEX idx_tailoring_tickets_user_id ON tailoring_tickets(user_id);
CREATE INDEX idx_tailoring_tickets_tailor_id ON tailoring_tickets(tailor_id);
CREATE INDEX idx_tailoring_tickets_status ON tailoring_tickets(status);

-- tailor_settlements
CREATE INDEX idx_tailor_settlements_tailor_id ON tailor_settlements(tailor_id);

-- menus
CREATE INDEX idx_menus_parent_id ON menus(parent_id);
```

## 4. RLS 정책

### 4.1 users
```sql
-- 군수담당자: 모든 사용자 조회/수정 가능
CREATE POLICY "admin_all" ON users FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- 판매소: 일반사용자 조회 가능 (판매 시 사용자 검색)
CREATE POLICY "store_select_users" ON users FOR SELECT
  USING (auth.jwt() ->> 'role' = 'store' AND role = 'user');

-- 본인: 자기 정보 조회
CREATE POLICY "self_select" ON users FOR SELECT
  USING (auth.uid() = id);
```

### 4.2 orders
```sql
-- 군수담당자: 전체 조회
CREATE POLICY "admin_all" ON orders FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- 판매소: 자기 판매소 주문 조회/수정
CREATE POLICY "store_own" ON orders FOR ALL
  USING (store_id IN (SELECT store_id FROM users WHERE id = auth.uid()));

-- 일반사용자: 자기 주문 조회/생성
CREATE POLICY "user_own" ON orders FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON orders FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

### 4.3 inventory
```sql
-- 판매소: 자기 판매소 재고만
CREATE POLICY "store_own" ON inventory FOR ALL
  USING (store_id IN (SELECT store_id FROM users WHERE id = auth.uid()));
```

### 4.4 tailoring_tickets
```sql
-- 군수담당자: 전체
CREATE POLICY "admin_all" ON tailoring_tickets FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- 체척업체: 자사 체척권
CREATE POLICY "tailor_own" ON tailoring_tickets FOR ALL
  USING (tailor_id IN (SELECT tailor_id FROM users WHERE id = auth.uid()));

-- 일반사용자: 본인 체척권 조회
CREATE POLICY "user_own" ON tailoring_tickets FOR SELECT
  USING (user_id = auth.uid());
```

### 4.5 point_summary / point_ledger
```sql
-- 군수담당자: 전체
CREATE POLICY "admin_all" ON point_summary FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "admin_all" ON point_ledger FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- 일반사용자: 본인만
CREATE POLICY "user_own" ON point_summary FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "user_own" ON point_ledger FOR SELECT
  USING (user_id = auth.uid());
```

## 5. 마이그레이션 SQL

```sql
-- ============================================
-- 피복 구매관리 시스템 - 전체 마이그레이션
-- ============================================

-- 1. stores
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  address text,
  phone varchar(20),
  manager_name varchar(50),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. tailors
CREATE TABLE tailors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  business_number varchar(20),
  representative varchar(50),
  address text,
  phone varchar(20),
  bank_name varchar(50),
  account_number varchar(50),
  account_holder varchar(50),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. users
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email varchar(255) UNIQUE NOT NULL,
  name varchar(50) NOT NULL,
  role varchar(20) NOT NULL CHECK (role IN ('admin', 'store', 'tailor', 'user')),
  rank varchar(20) CHECK (rank IN ('general','colonel','lt_colonel','major','captain','first_lt','second_lt','warrant','sgt_major','master_sgt','sgt','civil_servant')),
  military_number varchar(30),
  unit varchar(100),
  enlist_date date,
  promotion_date date,
  retirement_date date,
  store_id uuid REFERENCES stores(id),
  tailor_id uuid REFERENCES tailors(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_store_id ON users(store_id);
CREATE INDEX idx_users_tailor_id ON users(tailor_id);

-- 4. categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  parent_id uuid REFERENCES categories(id),
  level smallint NOT NULL CHECK (level IN (1, 2, 3)),
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- 5. products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id),
  product_type varchar(20) NOT NULL CHECK (product_type IN ('finished', 'custom')),
  price integer NOT NULL CHECK (price >= 0),
  image_url text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_product_type ON products(product_type);

-- 6. product_specs
CREATE TABLE product_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_name varchar(50) NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_product_specs_product_id ON product_specs(product_id);

-- 7. delivery_zones
CREATE TABLE delivery_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  name varchar(100) NOT NULL,
  address text,
  note text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_delivery_zones_store_id ON delivery_zones(store_id);

-- 8. inventory
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  product_id uuid NOT NULL REFERENCES products(id),
  spec_id uuid REFERENCES product_specs(id),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (store_id, product_id, spec_id)
);
CREATE INDEX idx_inventory_store_id ON inventory(store_id);

-- 9. inventory_log
CREATE TABLE inventory_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id),
  log_type varchar(20) NOT NULL CHECK (log_type IN ('incoming','sale','return','adjust_up','adjust_down')),
  quantity integer NOT NULL,
  reason text,
  order_item_id uuid,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_inventory_log_inventory_id ON inventory_log(inventory_id);
CREATE INDEX idx_inventory_log_created_at ON inventory_log(created_at);

-- 10. point_summary
CREATE TABLE point_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id),
  total_points integer DEFAULT 0,
  used_points integer DEFAULT 0,
  reserved_points integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 11. point_ledger
CREATE TABLE point_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  point_type varchar(20) NOT NULL CHECK (point_type IN ('grant','deduct','add','return','reserve','release')),
  amount integer NOT NULL,
  balance_after integer,
  description text,
  reference_type varchar(30),
  reference_id uuid,
  fiscal_year smallint,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_point_ledger_user_id ON point_ledger(user_id);
CREATE INDEX idx_point_ledger_fiscal_year ON point_ledger(fiscal_year);
CREATE INDEX idx_point_ledger_created_at ON point_ledger(created_at);

-- 12. orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(30) UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id),
  store_id uuid NOT NULL REFERENCES stores(id),
  order_type varchar(20) NOT NULL CHECK (order_type IN ('online', 'offline')),
  product_type varchar(20) NOT NULL CHECK (product_type IN ('finished', 'custom')),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipping','delivered','cancelled','returned')),
  total_amount integer NOT NULL DEFAULT 0,
  delivery_method varchar(20) CHECK (delivery_method IN ('parcel', 'direct')),
  delivery_zone_id uuid REFERENCES delivery_zones(id),
  delivery_address text,
  cancel_reason text,
  cancelled_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_store_id ON orders(store_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 13. order_items
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  spec_id uuid REFERENCES product_specs(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  subtotal integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- order_items FK for inventory_log
ALTER TABLE inventory_log ADD CONSTRAINT fk_inventory_log_order_item
  FOREIGN KEY (order_item_id) REFERENCES order_items(id);

-- 14. tailoring_tickets
CREATE TABLE tailoring_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number varchar(30) UNIQUE NOT NULL,
  order_item_id uuid NOT NULL REFERENCES order_items(id),
  user_id uuid NOT NULL REFERENCES users(id),
  product_id uuid NOT NULL REFERENCES products(id),
  amount integer NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','registered','cancel_requested','cancelled')),
  tailor_id uuid REFERENCES tailors(id),
  registered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_tailoring_tickets_user_id ON tailoring_tickets(user_id);
CREATE INDEX idx_tailoring_tickets_tailor_id ON tailoring_tickets(tailor_id);
CREATE INDEX idx_tailoring_tickets_status ON tailoring_tickets(status);

-- 15. tailor_settlements
CREATE TABLE tailor_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tailor_id uuid NOT NULL REFERENCES tailors(id),
  settlement_period_start date NOT NULL,
  settlement_period_end date NOT NULL,
  ticket_count integer NOT NULL,
  total_amount integer NOT NULL,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_tailor_settlements_tailor_id ON tailor_settlements(tailor_id);

-- 16. menus
CREATE TABLE menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  url varchar(255),
  parent_id uuid REFERENCES menus(id),
  sort_order integer DEFAULT 0,
  role_access text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_menus_parent_id ON menus(parent_id);

-- ============================================
-- updated_at 자동 갱신 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_tailors_updated_at BEFORE UPDATE ON tailors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_point_summary_updated_at BEFORE UPDATE ON point_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_tailoring_tickets_updated_at BEFORE UPDATE ON tailoring_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS 활성화
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailors ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailoring_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tailor_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 주문번호 / 체척권번호 자동생성 함수
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_seq START 1;
CREATE TRIGGER tr_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('ticket_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE ticket_seq START 1;
CREATE TRIGGER tr_ticket_number BEFORE INSERT ON tailoring_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();
```

## 6. RLS 상세 정책 SQL

```sql
-- ============================================
-- RLS 정책
-- ============================================

-- 사용자 역할 조회 헬퍼 함수
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_store_id()
RETURNS uuid AS $$
  SELECT store_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_tailor_id()
RETURNS uuid AS $$
  SELECT tailor_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- users
CREATE POLICY "admin_all" ON users FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "store_select_users" ON users FOR SELECT USING (get_user_role() = 'store');
CREATE POLICY "self_select" ON users FOR SELECT USING (auth.uid() = id);

-- stores (모든 인증 사용자 조회 가능, 수정은 admin만)
CREATE POLICY "authenticated_select" ON stores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify" ON stores FOR ALL USING (get_user_role() = 'admin');

-- tailors
CREATE POLICY "authenticated_select" ON tailors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify" ON tailors FOR ALL USING (get_user_role() = 'admin');

-- categories (모든 인증 사용자 조회, admin만 수정)
CREATE POLICY "authenticated_select" ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify" ON categories FOR ALL USING (get_user_role() = 'admin');

-- products (모든 인증 사용자 조회, admin만 수정)
CREATE POLICY "authenticated_select" ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify" ON products FOR ALL USING (get_user_role() = 'admin');

-- product_specs (모든 인증 사용자 조회, admin만 수정)
CREATE POLICY "authenticated_select" ON product_specs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify" ON product_specs FOR ALL USING (get_user_role() = 'admin');

-- delivery_zones
CREATE POLICY "store_own" ON delivery_zones FOR ALL USING (store_id = get_user_store_id());
CREATE POLICY "admin_all" ON delivery_zones FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "user_select" ON delivery_zones FOR SELECT USING (get_user_role() = 'user');

-- inventory
CREATE POLICY "store_own" ON inventory FOR ALL USING (store_id = get_user_store_id());
CREATE POLICY "admin_select" ON inventory FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "user_select" ON inventory FOR SELECT USING (get_user_role() = 'user');

-- inventory_log
CREATE POLICY "store_own" ON inventory_log FOR ALL
  USING (inventory_id IN (SELECT id FROM inventory WHERE store_id = get_user_store_id()));
CREATE POLICY "admin_select" ON inventory_log FOR SELECT USING (get_user_role() = 'admin');

-- point_summary
CREATE POLICY "admin_all" ON point_summary FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "user_own" ON point_summary FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "store_select" ON point_summary FOR SELECT USING (get_user_role() = 'store');

-- point_ledger
CREATE POLICY "admin_all" ON point_ledger FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "user_own" ON point_ledger FOR SELECT USING (user_id = auth.uid());

-- orders
CREATE POLICY "admin_all" ON orders FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "store_own" ON orders FOR ALL USING (store_id = get_user_store_id());
CREATE POLICY "user_select" ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON orders FOR INSERT WITH CHECK (user_id = auth.uid());

-- order_items
CREATE POLICY "admin_all" ON order_items FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "store_own" ON order_items FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE store_id = get_user_store_id()));
CREATE POLICY "user_own" ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

-- tailoring_tickets
CREATE POLICY "admin_all" ON tailoring_tickets FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "tailor_own" ON tailoring_tickets FOR ALL
  USING (tailor_id = get_user_tailor_id() OR (get_user_role() = 'tailor' AND tailor_id IS NULL));
CREATE POLICY "user_own" ON tailoring_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "store_select" ON tailoring_tickets FOR SELECT USING (get_user_role() = 'store');

-- tailor_settlements
CREATE POLICY "admin_all" ON tailor_settlements FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "tailor_own" ON tailor_settlements FOR SELECT USING (tailor_id = get_user_tailor_id());

-- menus (모든 인증 사용자 조회, admin만 수정)
CREATE POLICY "authenticated_select" ON menus FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify" ON menus FOR ALL USING (get_user_role() = 'admin');
```
