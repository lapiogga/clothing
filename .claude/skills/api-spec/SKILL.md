---
name: api-spec
description: 피복 구매관리 시스템 API 명세서. Server Actions 기반 API의 입력, 출력, 에러, 권한을 정의한다.
---

# API 명세서

> 모든 API는 Next.js Server Actions으로 구현한다.
> 반환 형식: `{ success: boolean; data?: T; error?: string }`

---

## 1. 인증 (actions/auth.ts)

### login
- **권한**: 공개
- **입력**: `{ email: string; password: string }`
- **처리**: `supabase.auth.signInWithPassword` → users 테이블에서 role 조회
- **출력**: `{ role: UserRole }` (리다이렉트용)
- **에러**: `AUTH_INVALID` - 이메일 또는 비밀번호 오류

### logout
- **권한**: 인증 사용자
- **처리**: `supabase.auth.signOut`
- **출력**: `{ success: true }`

### resetPassword
- **권한**: 공개
- **입력**: `{ email: string }`
- **처리**: `supabase.auth.resetPasswordForEmail`
- **출력**: `{ success: true }`

### updatePassword
- **권한**: 인증 사용자
- **입력**: `{ password: string; confirmPassword: string }`
- **유효성**: 최소 8자, 두 필드 일치
- **처리**: `supabase.auth.updateUser`
- **출력**: `{ success: true }`
- **에러**: `VALIDATION` - 유효성 검사 실패

---

## 2. 사용자 관리 (actions/users.ts)

### getUsers
- **권한**: admin, store
- **입력**: `{ page?: number; limit?: number; role?: UserRole; rank?: Rank; search?: string }`
- **출력**: `{ users: User[]; total: number }`

### getUserById
- **권한**: admin, 본인
- **입력**: `{ id: string }`
- **출력**: `{ user: User }`
- **에러**: `NOT_FOUND`

### createUser
- **권한**: admin
- **입력**: `{ email: string; name: string; role: UserRole; rank?: Rank; military_number?: string; unit?: string; enlist_date?: string; promotion_date?: string; retirement_date?: string; store_id?: string; tailor_id?: string }`
- **처리**:
  1. `supabase.auth.admin.createUser`
  2. `users` 테이블 INSERT
  3. `point_summary` 초기 레코드 생성
- **유효성**: 이메일 중복, role=store 시 store_id 필수, role=tailor 시 tailor_id 필수
- **에러**: `DUPLICATE_EMAIL`, `VALIDATION`

### bulkCreateUsers
- **권한**: admin
- **입력**: `{ users: CreateUserInput[] }`
- **출력**: `{ success_count: number; fail_count: number; failures: { row: number; error: string }[] }`

### updateUser
- **권한**: admin
- **입력**: `{ id: string; name?: string; rank?: Rank; unit?: string; promotion_date?: string; retirement_date?: string; is_active?: boolean }`
- **처리**:
  1. `users` 테이블 UPDATE
  2. 계급 변경 시 진급 포인트 자동 계산 (triggerPromotionPoints 호출)
- **에러**: `NOT_FOUND`, `VALIDATION`

### getCurrentUser
- **권한**: 인증 사용자
- **출력**: `{ user: User }`

---

## 3. 품목 관리 (actions/products.ts)

### getCategories
- **권한**: 인증 사용자
- **입력**: `{ parent_id?: string; level?: number }`
- **출력**: `{ categories: Category[] }`

### createCategory
- **권한**: admin
- **입력**: `{ name: string; parent_id?: string; level: 1|2|3; sort_order?: number }`
- **유효성**: level=1이면 parent_id 없어야 함, level=2이면 parent가 level=1
- **에러**: `VALIDATION`

### updateCategory
- **권한**: admin
- **입력**: `{ id: string; name?: string; sort_order?: number; is_active?: boolean }`

### deleteCategory
- **권한**: admin
- **입력**: `{ id: string }`
- **유효성**: 하위 분류 존재 시 삭제 불가
- **에러**: `HAS_CHILDREN`

### getProducts
- **권한**: 인증 사용자
- **입력**: `{ category_id?: string; product_type?: ProductType; search?: string; page?: number; limit?: number; is_active?: boolean }`
- **출력**: `{ products: Product[]; total: number }`

### getProductById
- **권한**: 인증 사용자
- **입력**: `{ id: string }`
- **출력**: `{ product: Product & { specs: ProductSpec[]; category: Category } }`

### createProduct
- **권한**: admin
- **입력**: `{ name: string; category_id: string; product_type: ProductType; price: number; image_url?: string; description?: string }`
- **유효성**: category가 level=3(소분류)인지 확인, price >= 0
- **에러**: `VALIDATION`

### updateProduct
- **권한**: admin
- **입력**: `{ id: string; name?: string; price?: number; image_url?: string; description?: string; is_active?: boolean }`

### deleteProduct
- **권한**: admin
- **입력**: `{ id: string }`
- **유효성**: 관련 주문 존재 시 삭제 불가 (비활성 처리 권장)

### getSpecs
- **권한**: 인증 사용자
- **입력**: `{ product_id: string }`
- **출력**: `{ specs: ProductSpec[] }`

### createSpec
- **권한**: admin
- **입력**: `{ product_id: string; spec_name: string; sort_order?: number }`
- **유효성**: product가 finished 타입인지 확인
- **에러**: `INVALID_PRODUCT_TYPE`

### updateSpec
- **권한**: admin
- **입력**: `{ id: string; spec_name?: string; sort_order?: number; is_active?: boolean }`

### deleteSpec
- **권한**: admin
- **입력**: `{ id: string }`
- **유효성**: 관련 재고 존재 시 삭제 불가
- **에러**: `HAS_INVENTORY`

---

## 4. 포인트 관리 (actions/points.ts)

### calculateAnnualPoints
- **권한**: admin
- **입력**: `{ fiscal_year: number }`
- **출력**: `{ calculations: { user_id: string; name: string; rank: Rank; base_amount: number; step: number; step_bonus: number; proration_ratio?: number; final_amount: number }[]; total_amount: number }`
- **처리**: 계산만 수행 (미리보기), DB 변경 없음

### grantAnnualPoints
- **권한**: admin
- **입력**: `{ fiscal_year: number; calculations: CalculationResult[] }`
- **처리**:
  1. 해당 연도 기 지급 여부 확인
  2. 각 사용자에 대해 point_ledger INSERT (type='grant')
  3. point_summary.total_points 갱신
- **유효성**: 중복 지급 불가
- **에러**: `ALREADY_GRANTED`

### triggerPromotionPoints
- **권한**: admin
- **입력**: `{ user_id: string; old_rank: Rank; new_rank: Rank; promotion_date: string }`
- **처리**: 잔여일수 차액 계산 → point_ledger INSERT (type='add') → point_summary 갱신
- **출력**: `{ added_amount: number }`

### getPointSummary
- **권한**: admin (전체), user (본인)
- **입력**: `{ user_id?: string; page?: number; limit?: number; search?: string; rank?: Rank }`
- **출력**: `{ summaries: PointSummary[]; total: number }` 또는 `{ summary: PointSummary }`

### getPointLedger
- **권한**: admin (전체), user (본인)
- **입력**: `{ user_id: string; page?: number; limit?: number; fiscal_year?: number; point_type?: PointType }`
- **출력**: `{ ledger: PointLedger[]; total: number }`

### getAvailablePoints
- **권한**: 인증 사용자
- **입력**: `{ user_id: string }`
- **출력**: `{ total: number; used: number; reserved: number; available: number }`

---

## 5. 주문/판매 (actions/orders.ts)

### createOfflineSale
- **권한**: store
- **입력**: `{ user_id: string; product_type: ProductType; items: { product_id: string; spec_id?: string; quantity: number }[] }`
- **처리**:
  1. 가용포인트 검증
  2. 재고 검증 (완제품)
  3. orders INSERT (type='offline', status='delivered')
  4. order_items INSERT
  5. 재고 차감 + inventory_log (완제품)
  6. 포인트 차감 (point_ledger + point_summary)
  7. 맞춤피복 → 체척권 발행
- **에러**: `INSUFFICIENT_POINTS`, `INSUFFICIENT_STOCK`, `VALIDATION`

### createOnlineOrder
- **권한**: user
- **입력**: `{ store_id: string; product_type: ProductType; items: { product_id: string; spec_id?: string; quantity: number }[]; delivery_method: DeliveryMethod; delivery_zone_id?: string; delivery_address?: string }`
- **처리**:
  1. 가용포인트 검증
  2. 재고 확인 (완제품, 경고 수준)
  3. orders INSERT (type='online', status='pending')
  4. order_items INSERT
  5. 예약포인트 추가 (point_ledger type='reserve', point_summary.reserved_points 증가)
  6. 맞춤피복 → 체척권 발행
- **에러**: `INSUFFICIENT_POINTS`, `VALIDATION`

### cancelOrder
- **권한**: user (본인), store (직권)
- **입력**: `{ order_id: string; cancel_reason?: string }`
- **유효성**: status가 pending/confirmed인 경우만
- **처리**:
  1. orders.status → 'cancelled'
  2. 예약포인트 해제 (point_ledger type='release', point_summary.reserved_points 감소)
  3. 맞춤피복 체척권 취소 (미등록 시)
- **에러**: `INVALID_STATUS`, `NOT_FOUND`

### processReturn
- **권한**: store
- **입력**: `{ order_id: string; items: { order_item_id: string; quantity: number }[] }`
- **유효성**: 오프라인 주문만, 맞춤피복은 체척권 미등록 시에만
- **처리**:
  1. order_items.status → 'returned'
  2. 재고 추가 + inventory_log (완제품)
  3. 포인트 반환 (point_ledger type='add', point_summary 갱신)
  4. 맞춤피복 체척권 취소
- **에러**: `TICKET_REGISTERED`, `INVALID_ORDER_TYPE`

### updateOrderStatus
- **권한**: store
- **입력**: `{ order_id: string; status: 'confirmed' | 'shipping' | 'delivered' }`
- **처리**:
  - confirmed: status 변경만
  - shipping: status 변경만
  - delivered: 재고 차감 + 포인트 실차감 + 예약 해제
- **유효성**: 상태 전이 규칙 준수 (pending→confirmed→shipping→delivered)
- **에러**: `INVALID_STATUS_TRANSITION`, `INSUFFICIENT_STOCK`

### getOrders
- **권한**: admin (전체), store (자기 판매소), user (본인)
- **입력**: `{ page?: number; limit?: number; status?: OrderStatus; order_type?: OrderType; product_type?: ProductType; search?: string; date_from?: string; date_to?: string }`
- **출력**: `{ orders: Order[]; total: number }`

### getOrderById
- **권한**: admin, store (자기 판매소), user (본인)
- **입력**: `{ id: string }`
- **출력**: `{ order: Order & { items: OrderItem[]; user: User } }`

---

## 6. 재고 관리 (actions/inventory.ts)

### getInventory
- **권한**: store (자기 판매소), admin, user (조회만)
- **입력**: `{ store_id: string; category_id?: string; low_stock?: boolean; page?: number; limit?: number }`
- **출력**: `{ inventory: (Inventory & { product: Product; spec: ProductSpec })[]; total: number }`

### processIncoming
- **권한**: store
- **입력**: `{ store_id: string; product_id: string; spec_id: string; quantity: number }`
- **처리**: inventory.quantity += quantity, inventory_log INSERT (type='incoming')
- **유효성**: quantity > 0

### adjustInventory
- **권한**: store
- **입력**: `{ inventory_id: string; adjustment: number; reason: string }`
- **처리**:
  1. inventory.quantity += adjustment
  2. inventory_log INSERT (type='adjust_up' or 'adjust_down')
- **유효성**: 조정 후 수량 >= 0, reason 필수
- **에러**: `NEGATIVE_RESULT`

### getInventoryLog
- **권한**: store (자기 판매소), admin
- **입력**: `{ inventory_id: string; page?: number; limit?: number }`
- **출력**: `{ logs: InventoryLog[]; total: number }`

### getStoreInventoryForProduct
- **권한**: 인증 사용자
- **입력**: `{ product_id: string; spec_id?: string }`
- **출력**: `{ stores: { store_id: string; store_name: string; quantity: number }[] }`
- **용도**: 온라인 구매 시 재고 있는 판매소 목록

---

## 7. 체척권 관리 (actions/tickets.ts)

### getTickets
- **권한**: admin (전체), tailor (자사), user (본인), store (조회)
- **입력**: `{ page?: number; limit?: number; status?: TicketStatus; user_id?: string; tailor_id?: string; date_from?: string; date_to?: string }`
- **출력**: `{ tickets: TailoringTicket[]; total: number }`

### registerTicket
- **권한**: tailor
- **입력**: `{ ticket_number: string }`
- **처리**:
  1. 체척권 조회 (ticket_number)
  2. status 확인 (issued만 가능)
  3. status → 'registered', tailor_id 지정, registered_at 기록
- **에러**: `NOT_FOUND`, `INVALID_STATUS` (이미 등록/취소된 경우)

### requestCancelTicket
- **권한**: user (본인), store
- **입력**: `{ ticket_id: string }`
- **유효성**: status='issued'만 가능
- **처리**: status → 'cancel_requested'
- **에러**: `INVALID_STATUS`

### approveCancelTicket
- **권한**: admin
- **입력**: `{ ticket_id: string; approved: boolean }`
- **처리**:
  - approved=true: status → 'cancelled', 포인트 반환
  - approved=false: status → 'issued' (원상복구)
- **에러**: `INVALID_STATUS`

### getTicketByNumber
- **권한**: tailor, admin
- **입력**: `{ ticket_number: string }`
- **출력**: `{ ticket: TailoringTicket & { user: User; product: Product } }`

---

## 8. 정산 관리 (actions/settlements.ts)

### getSettlements
- **권한**: admin, tailor (자사)
- **입력**: `{ tailor_id?: string; status?: string; page?: number; limit?: number }`
- **출력**: `{ settlements: TailorSettlement[]; total: number }`

### calculateSettlement
- **권한**: admin
- **입력**: `{ tailor_id: string; period_start: string; period_end: string }`
- **처리**: 해당 기간 registered 상태 체척권 집계
- **출력**: `{ ticket_count: number; total_amount: number; tickets: TailoringTicket[] }`

### createSettlement
- **권한**: admin
- **입력**: `{ tailor_id: string; period_start: string; period_end: string; ticket_count: number; total_amount: number }`
- **처리**: tailor_settlements INSERT (status='pending')

### confirmSettlement
- **권한**: admin
- **입력**: `{ settlement_id: string }`
- **처리**: status → 'confirmed', confirmed_at/confirmed_by 기록

---

## 9. 기초 데이터 (actions/ 내 포함)

### stores CRUD (actions/users.ts 또는 별도)
- `getStores({ page?, limit?, search?, is_active? })` → admin, 인증사용자(조회)
- `createStore({ name, address?, phone?, manager_name? })` → admin
- `updateStore({ id, ... })` → admin
- `deleteStore({ id })` → admin (소속 사용자/재고 확인)

### tailors CRUD
- `getTailors({ page?, limit?, search?, is_active? })` → admin, 인증사용자(조회)
- `createTailor({ name, business_number?, ... })` → admin
- `updateTailor({ id, ... })` → admin
- `deleteTailor({ id })` → admin (등록 체척권 확인)

### delivery_zones CRUD
- `getDeliveryZones({ store_id })` → store(자기), user(조회)
- `createDeliveryZone({ store_id, name, address?, note? })` → store
- `updateDeliveryZone({ id, ... })` → store
- `deleteDeliveryZone({ id })` → store

### menus CRUD
- `getMenus({ role? })` → 인증사용자
- `createMenu({ name, url?, parent_id?, sort_order?, role_access[] })` → admin
- `updateMenu({ id, ... })` → admin
- `deleteMenu({ id })` → admin (하위 메뉴 확인)

---

## 10. 통계 (actions/orders.ts 내 포함)

### getDailySalesStats
- **권한**: store
- **입력**: `{ store_id: string; date_from: string; date_to: string }`
- **출력**: `{ stats: { date: string; count: number; amount: number }[] }`

### getProductSalesStats
- **권한**: store
- **입력**: `{ store_id: string; date_from: string; date_to: string; category_id?: string }`
- **출력**: `{ stats: { product_name: string; spec_name?: string; quantity: number; amount: number }[] }`

### getUserSalesStats
- **권한**: store
- **입력**: `{ store_id: string; date_from: string; date_to: string; search?: string }`
- **출력**: `{ stats: { user_name: string; rank: string; count: number; amount: number }[] }`
