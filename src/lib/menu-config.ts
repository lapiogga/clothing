// 역할별 메뉴 구성
export const MENU_CONFIG = {
  admin: [
    { label: "대시보드", href: "/admin/dashboard" },
    {
      label: "사용자관리",
      children: [
        { label: "사용자 목록", href: "/admin/users" },
        { label: "사용자 등록", href: "/admin/users/new" },
      ],
    },
    {
      label: "포인트관리",
      children: [
        { label: "포인트 산정/지급", href: "/admin/points" },
        { label: "포인트 현황", href: "/admin/points/status" },
      ],
    },
    { label: "품목관리", href: "/admin/products" },
    {
      label: "기초데이터",
      children: [
        { label: "판매소 관리", href: "/admin/stores" },
        { label: "체척업체 관리", href: "/admin/tailors" },
      ],
    },
    {
      label: "체척권관리",
      children: [
        { label: "체척권 관리", href: "/admin/tickets" },
        { label: "정산 관리", href: "/admin/settlements" },
      ],
    },
    { label: "메뉴관리", href: "/admin/menus" },
  ],
  store: [
    { label: "대시보드", href: "/store/dashboard" },
    {
      label: "오프라인판매",
      children: [
        { label: "판매 등록", href: "/store/sales/new" },
        { label: "판매 내역", href: "/store/sales" },
        { label: "반품 처리", href: "/store/sales/return" },
      ],
    },
    {
      label: "온라인주문",
      children: [
        { label: "주문 관리", href: "/store/orders" },
      ],
    },
    {
      label: "재고관리",
      children: [
        { label: "재고 현황", href: "/store/inventory" },
        { label: "입고 처리", href: "/store/inventory/incoming" },
        { label: "재고 조정", href: "/store/inventory/adjust" },
      ],
    },
    { label: "배송지관리", href: "/store/delivery" },
    {
      label: "통계",
      children: [
        { label: "일별 판매현황", href: "/store/stats/daily" },
        { label: "품목별 판매현황", href: "/store/stats/products" },
        { label: "사용자별 판매현황", href: "/store/stats/users" },
      ],
    },
  ],
  tailor: [
    { label: "대시보드", href: "/tailor/dashboard" },
    { label: "체척권 등록", href: "/tailor/tickets/register" },
    { label: "체척권 현황", href: "/tailor/tickets" },
  ],
  user: [
    { label: "쇼핑", href: "/my/shop" },
    { label: "장바구니", href: "/my/cart" },
    { label: "구매내역", href: "/my/orders" },
    { label: "포인트", href: "/my/points" },
    { label: "체척권", href: "/my/tickets" },
  ],
} as const;
