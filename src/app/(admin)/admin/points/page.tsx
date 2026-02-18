"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { calculateAnnualPoints, grantAnnualPoints } from "@/actions/points";
import { RANK_LABELS } from "@/lib/constants";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function PointsPage() {
  const [fiscalYear, setFiscalYear] = useState(currentYear.toString());
  const [calculations, setCalculations] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [calculated, setCalculated] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleCalculate() {
    setPending(true);
    const result = await calculateAnnualPoints(parseInt(fiscalYear));
    if (result.error) {
      toast.error(result.error);
    } else {
      setCalculations(result.calculations);
      setTotalAmount(result.total_amount);
      setCalculated(true);
    }
    setPending(false);
  }

  async function handleGrant() {
    if (!confirm(`${fiscalYear}년도 포인트를 지급하시겠습니까?\n총 ${calculations.length}명, ${totalAmount.toLocaleString()}원`)) return;
    setPending(true);
    const result = await grantAnnualPoints(
      parseInt(fiscalYear),
      calculations.map((c) => ({ user_id: c.user_id, final_amount: c.final_amount }))
    );
    if (result.success) {
      toast.success(`${result.count}명에게 포인트가 지급되었습니다`);
      setCalculated(false);
      setCalculations([]);
    } else {
      toast.error(result.error || "지급에 실패했습니다");
    }
    setPending(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">포인트 산정/지급</h1>

      <div className="flex items-end gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">산정 연도</label>
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}년</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCalculate} disabled={pending}>
          {pending ? "산정 중..." : "산정하기"}
        </Button>
        {calculated && calculations.length > 0 && (
          <Button onClick={handleGrant} disabled={pending} variant="default">
            지급 확정
          </Button>
        )}
      </div>

      {calculated && (
        <>
          <Card className="mb-4">
            <CardContent className="pt-4 flex gap-8">
              <div>
                <div className="text-sm text-muted-foreground">대상 인원</div>
                <div className="text-2xl font-bold">{calculations.length}명</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">총 지급 예정</div>
                <div className="text-2xl font-bold">{totalAmount.toLocaleString()}원</div>
              </div>
            </CardContent>
          </Card>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>계급</TableHead>
                <TableHead className="text-right">기본금액</TableHead>
                <TableHead className="text-right">호봉</TableHead>
                <TableHead className="text-right">호봉추가</TableHead>
                <TableHead className="text-right">일할비율</TableHead>
                <TableHead className="text-right">최종금액</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculations.map((calc) => (
                <TableRow key={calc.user_id}>
                  <TableCell>{calc.name}</TableCell>
                  <TableCell>{RANK_LABELS[calc.rank as keyof typeof RANK_LABELS] || calc.rank}</TableCell>
                  <TableCell className="text-right">{calc.base_amount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{calc.step}</TableCell>
                  <TableCell className="text-right">{calc.step_bonus.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {calc.proration_ratio !== null ? `${(calc.proration_ratio * 100).toFixed(1)}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right font-bold">{calc.final_amount.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
