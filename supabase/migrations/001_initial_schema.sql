-- ============================================
-- 피복 구매관리 시스템 - 전체 마이그레이션
-- ============================================

-- 1. stores (피복판매소)
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

-- 2. tailors (체척업체)
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

-- 3. users (사용자)
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

-- 4. categories (품목 분류, 자기참조 3단계)
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

-- 5. products (품목)
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

-- 6. product_specs (규격, 완제품만)
CREATE TABLE product_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  spec_name varchar(50) NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_product_specs_product_id ON product_specs(product_id);

-- 7. delivery_zones (직접 배송지)
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

-- 8. inventory (재고)
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

-- 9. inventory_log (재고 변동 이력)
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

-- 10. point_summary (포인트 요약)
CREATE TABLE point_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id),
  total_points integer DEFAULT 0,
  used_points integer DEFAULT 0,
  reserved_points integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- 11. point_ledger (포인트 원장)
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

-- 12. orders (주문)
CREATE SEQUENCE order_seq START 1;

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

-- 13. order_items (주문 상세)
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

-- inventory_log FK 추가
ALTER TABLE inventory_log ADD CONSTRAINT fk_inventory_log_order_item
  FOREIGN KEY (order_item_id) REFERENCES order_items(id);

-- 14. tailoring_tickets (체척권)
CREATE SEQUENCE ticket_seq START 1;

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

-- 15. tailor_settlements (체척업체 정산)
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

-- 16. menus (메뉴)
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
-- 주문번호 자동생성 트리거
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('order_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_order_number BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================
-- 체척권번호 자동생성 트리거
-- ============================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('ticket_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ticket_number BEFORE INSERT ON tailoring_tickets FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

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
-- RLS 헬퍼 함수
-- ============================================
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

-- ============================================
-- RLS 정책
-- ============================================

-- users
CREATE POLICY "admin_all" ON users FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "store_select_users" ON users FOR SELECT USING (get_user_role() = 'store');
CREATE POLICY "self_select" ON users FOR SELECT USING (auth.uid() = id);

-- stores
CREATE POLICY "authenticated_select_stores" ON stores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify_stores" ON stores FOR ALL USING (get_user_role() = 'admin');

-- tailors
CREATE POLICY "authenticated_select_tailors" ON tailors FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify_tailors" ON tailors FOR ALL USING (get_user_role() = 'admin');

-- categories
CREATE POLICY "authenticated_select_categories" ON categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify_categories" ON categories FOR ALL USING (get_user_role() = 'admin');

-- products
CREATE POLICY "authenticated_select_products" ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify_products" ON products FOR ALL USING (get_user_role() = 'admin');

-- product_specs
CREATE POLICY "authenticated_select_specs" ON product_specs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify_specs" ON product_specs FOR ALL USING (get_user_role() = 'admin');

-- delivery_zones
CREATE POLICY "store_own_zones" ON delivery_zones FOR ALL USING (store_id = get_user_store_id());
CREATE POLICY "admin_all_zones" ON delivery_zones FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "user_select_zones" ON delivery_zones FOR SELECT USING (get_user_role() = 'user');

-- inventory
CREATE POLICY "store_own_inventory" ON inventory FOR ALL USING (store_id = get_user_store_id());
CREATE POLICY "admin_select_inventory" ON inventory FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "user_select_inventory" ON inventory FOR SELECT USING (get_user_role() = 'user');

-- inventory_log
CREATE POLICY "store_own_inv_log" ON inventory_log FOR ALL
  USING (inventory_id IN (SELECT id FROM inventory WHERE store_id = get_user_store_id()));
CREATE POLICY "admin_select_inv_log" ON inventory_log FOR SELECT USING (get_user_role() = 'admin');

-- point_summary
CREATE POLICY "admin_all_points" ON point_summary FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "user_own_points" ON point_summary FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "store_select_points" ON point_summary FOR SELECT USING (get_user_role() = 'store');

-- point_ledger
CREATE POLICY "admin_all_ledger" ON point_ledger FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "user_own_ledger" ON point_ledger FOR SELECT USING (user_id = auth.uid());

-- orders
CREATE POLICY "admin_all_orders" ON orders FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "store_own_orders" ON orders FOR ALL USING (store_id = get_user_store_id());
CREATE POLICY "user_select_orders" ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_insert_orders" ON orders FOR INSERT WITH CHECK (user_id = auth.uid());

-- order_items
CREATE POLICY "admin_all_items" ON order_items FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "store_own_items" ON order_items FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE store_id = get_user_store_id()));
CREATE POLICY "user_own_items" ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));

-- tailoring_tickets
CREATE POLICY "admin_all_tickets" ON tailoring_tickets FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "tailor_own_tickets" ON tailoring_tickets FOR ALL
  USING (tailor_id = get_user_tailor_id() OR (get_user_role() = 'tailor' AND tailor_id IS NULL));
CREATE POLICY "user_own_tickets" ON tailoring_tickets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "store_select_tickets" ON tailoring_tickets FOR SELECT USING (get_user_role() = 'store');

-- tailor_settlements
CREATE POLICY "admin_all_settlements" ON tailor_settlements FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "tailor_own_settlements" ON tailor_settlements FOR SELECT USING (tailor_id = get_user_tailor_id());

-- menus
CREATE POLICY "authenticated_select_menus" ON menus FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_modify_menus" ON menus FOR ALL USING (get_user_role() = 'admin');
