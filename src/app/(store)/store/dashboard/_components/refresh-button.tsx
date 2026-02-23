"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="h-7 text-xs">
      {loading ? "갱신 중..." : "새로고침"}
    </Button>
  );
}
