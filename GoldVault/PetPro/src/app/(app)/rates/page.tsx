import { getRates } from "@/lib/data";
import { PURITIES } from "@/lib/gold";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RateRow } from "@/components/rates-form";

export default async function RatesPage() {
  const { rows } = await getRates();
  const by = new Map(rows.map((r) => [r.purity, r]));
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="font-serif text-2xl font-semibold">Gold Rates</h1>
      <p className="text-sm text-muted-foreground">
        Enter today&apos;s rate per gram for each purity. If you only set 24K, other karats are estimated proportionally (22K = 22/24 of the 24K rate). Rates are saved until you change them.
      </p>
      <Card>
        <CardHeader><CardTitle>Current rates</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {PURITIES.map((p) => <RateRow key={p} purity={p} current={by.get(p)?.rate_per_gram} updatedAt={by.get(p)?.updated_at} />)}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Estimated values are for the gold metal only and are not a guaranteed resale price. Making charges, wastage, taxes, and jeweller deductions will change what you actually receive.
      </p>
    </div>
  );
}
