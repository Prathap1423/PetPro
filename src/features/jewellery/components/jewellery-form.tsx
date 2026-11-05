"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { createJewellery, updateJewellery } from "@/features/jewellery/service";
import { jewellerySchema } from "@/domain/schemas";
import { MAX_PHOTOS } from "@/domain/jewellery";
import {
  CATEGORIES, PURITIES, chargeAmount, estimatePurchaseCost, formatGrams, formatINR, formatSovereigns,
  gramsToSovereigns, netGoldWeight, roundWeight, sovereignsToGrams, type Charge,
} from "@/domain/gold";
import { BILL_MAX_BYTES, compressImage, isAllowedBill, isAllowedImage } from "@/lib/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ImageUploader, type PhotoItem } from "@/features/jewellery/components/image-uploader";
import type { Jewellery } from "@/domain/types";

interface Props {
  /** When provided, the form edits this item. */
  existing?: { item: Jewellery; images: { id: string; url: string | null; is_cover: boolean }[]; billUrl: string | null };
}

type ChargeMode = "fixed" | "percent";
const today = () => new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd in local time

export function JewelleryForm({ existing }: Props) {
  const router = useRouter();
  const item = existing?.item;
  const idRef = useRef(item?.id ?? crypto.randomUUID());

  const [f, setF] = useState({
    name: item?.name ?? "",
    category: item?.category ?? "Chain",
    purchase_date: item?.purchase_date ?? today(),
    shop_name: item?.shop_name ?? "",
    invoice_number: item?.invoice_number ?? "",
    purity: item?.purity ?? "22K",
    huid: item?.huid ?? "",
    gross_weight: item ? String(item.gross_weight) : "",
    non_gold_weight: item ? String(item.non_gold_weight) : "0",
    gold_rate_at_purchase: item?.gold_rate_at_purchase ? String(item.gold_rate_at_purchase) : "",
    making: item ? String(item.making_charges) : "0",
    wastage: item ? String(item.wastage_charges) : "0",
    tax: item ? String(item.tax) : "3",
    other_charges: item ? String(item.other_charges) : "0",
    purchase_price: item ? String(item.purchase_price) : "",
    notes: item?.notes ?? "",
  });
  const [unit, setUnit] = useState<"g" | "sov">("g");
  const [makingMode, setMakingMode] = useState<ChargeMode>("fixed");
  const [wastageMode, setWastageMode] = useState<ChargeMode>("fixed");
  const [taxMode, setTaxMode] = useState<ChargeMode>(item ? "fixed" : "percent");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const [photos, setPhotos] = useState<PhotoItem[]>(
    (existing?.images ?? []).filter((i) => i.url).map((i) => ({ key: i.id, url: i.url!, imageId: i.id })),
  );
  const [coverKey, setCoverKey] = useState<string | null>(existing?.images.find((i) => i.is_cover)?.id ?? existing?.images[0]?.id ?? null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [bill, setBill] = useState<File | null>(null);
  const [removeBill, setRemoveBill] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  // ----- derived numbers (display only; the server recomputes net weight) -----
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? 0 : Number(s));
  const grossG = unit === "g" ? num(f.gross_weight) : sovereignsToGrams(num(f.gross_weight));
  const nonGoldG = num(f.non_gold_weight);
  const netG = grossG > 0 ? netGoldWeight(grossG, nonGoldG) : 0;
  const mk: Charge = { type: makingMode, value: num(f.making) };
  const wg: Charge = { type: wastageMode, value: num(f.wastage) };
  const tx: Charge = { type: taxMode, value: num(f.tax) };
  const estimate = useMemo(
    () => estimatePurchaseCost({ netWeight: Math.max(netG, 0), ratePerGram: num(f.gold_rate_at_purchase), making: mk, wastage: wg, tax: tx, otherCharges: num(f.other_charges) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [netG, f.gold_rate_at_purchase, f.making, f.wastage, f.tax, f.other_charges, makingMode, wastageMode, taxMode],
  );
  const canEstimate = netG > 0 && num(f.gold_rate_at_purchase) > 0;

  const switchUnit = (next: "g" | "sov") => {
    if (next === unit) return;
    const v = num(f.gross_weight);
    if (v > 0) setF((p) => ({ ...p, gross_weight: String(next === "sov" ? gramsToSovereigns(v) : sovereignsToGrams(v)) }));
    setUnit(next);
  };

  // ----- photos -----
  const addPhotos = async (files: File[]) => {
    const valid = files.filter((x) => {
      if (!isAllowedImage(x)) { toast.error(`${x.name}: only JPG, PNG, WebP or HEIC photos`); return false; }
      return true;
    });
    const room = MAX_PHOTOS - photos.length;
    if (valid.length > room) toast.error(`You can add up to ${MAX_PHOTOS} photos`);
    setCompressing(true);
    try {
      const added: PhotoItem[] = [];
      for (const file of valid.slice(0, Math.max(room, 0))) {
        try {
          const small = await compressImage(file);
          added.push({ key: crypto.randomUUID(), url: URL.createObjectURL(small), file: small });
        } catch {
          toast.error(`Could not process ${file.name}`);
        }
      }
      setPhotos((p) => [...p, ...added]);
      setCoverKey((c) => c ?? added[0]?.key ?? null);
    } finally {
      setCompressing(false);
    }
  };
  const removePhoto = (key: string) => {
    const p = photos.find((x) => x.key === key);
    if (p?.imageId) setRemovedIds((r) => [...r, p.imageId!]);
    if (p?.file) URL.revokeObjectURL(p.url);
    const rest = photos.filter((x) => x.key !== key);
    setPhotos(rest);
    if (coverKey === key) setCoverKey(rest[0]?.key ?? null);
  };

  const pickBill = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isAllowedBill(file)) return void toast.error("Bill must be a PDF or an image");
    if (file.size > BILL_MAX_BYTES) return void toast.error("Bill must be under 10 MB");
    setBill(file);
    setRemoveBill(false);
  };

  // ----- submit -----
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const values = {
      name: f.name, category: f.category, purchase_date: f.purchase_date, shop_name: f.shop_name,
      invoice_number: f.invoice_number, purity: f.purity, huid: f.huid,
      gross_weight: grossG, non_gold_weight: nonGoldG,
      gold_rate_at_purchase: f.gold_rate_at_purchase,
      making_charges: chargeAmount(mk, estimate.metalValue),
      wastage_charges: chargeAmount(wg, estimate.metalValue),
      tax: chargeAmount(tx, estimate.metalValue + estimate.making + estimate.wastage),
      other_charges: num(f.other_charges),
      purchase_price: f.purchase_price,
      notes: f.notes,
    };
    if (f.purchase_price.trim() === "") return setErrors({ purchase_price: "Enter the final price you paid" });
    const parsed = jewellerySchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] ??= i.message; });
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const newPhotos = photos.filter((x) => x.file);
      const coverPhoto = photos.find((p) => p.key === coverKey);
      const cover = !coverPhoto ? null
        : coverPhoto.imageId ? { imageId: coverPhoto.imageId }
        : { newPhotoIndex: newPhotos.findIndex((x) => x.key === coverKey) };
      const billFile = bill && bill.type.startsWith("image/") ? await compressImage(bill) : bill;

      const payload = {
        id: idRef.current, values, newPhotos: newPhotos.map((p) => p.file!), cover,
        removedImageIds: removedIds, bill: billFile, removeBill,
      };
      const res = existing ? await updateJewellery(payload) : await createJewellery(payload);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(existing ? "Jewellery updated" : "Gold added to your vault");
      router.push(`/jewellery?id=${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  // A plain render function (not a component) so inputs keep focus while typing.
  const renderCharge = ({ label, name, mode, setMode, error }: { label: string; name: "making" | "wastage" | "tax"; mode: ChargeMode; setMode: (m: ChargeMode) => void; error?: string }) => (
    <Field label={label} error={error}>
      <div className="flex gap-2">
        <Input type="number" inputMode="decimal" step="any" min="0" value={f[name]} onChange={set(name)} aria-invalid={!!error} />
        <Select value={mode} onChange={(e) => setMode(e.target.value as ChargeMode)} className="w-24 shrink-0" aria-label={`${label} type`}>
          <option value="fixed">₹</option><option value="percent">%</option>
        </Select>
      </div>
    </Field>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Card>
        <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
        <CardContent>
          <ImageUploader photos={photos} coverKey={coverKey} onAdd={addPhotos} onRemove={removePhoto} onCover={setCoverKey} disabled={busy} compressing={compressing} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Jewellery details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Jewellery name" error={errors.name} className="sm:col-span-2">
            <Input value={f.name} onChange={set("name")} placeholder="e.g. Gold chain" maxLength={120} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Category"><Select value={f.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
          <Field label="Gold purity"><Select value={f.purity} onChange={set("purity")}>{PURITIES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
          <Field label="Purchase date" error={errors.purchase_date}>
            <Input type="date" value={f.purchase_date} max={today()} onChange={set("purchase_date")} suppressHydrationWarning aria-invalid={!!errors.purchase_date} />
          </Field>
          <Field label="Jewellery shop"><Input value={f.shop_name} onChange={set("shop_name")} maxLength={120} /></Field>
          <Field label="Invoice / bill number (optional)" error={errors.invoice_number}><Input value={f.invoice_number} onChange={set("invoice_number")} maxLength={60} /></Field>
          <Field label="Hallmark / HUID (optional)"><Input value={f.huid} onChange={set("huid")} maxLength={20} autoCapitalize="characters" /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Weight</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={`Gross weight (${unit === "g" ? "grams" : "sovereigns"})`} error={errors.gross_weight}>
            <div className="flex gap-2">
              <Input type="number" inputMode="decimal" step="any" min="0" value={f.gross_weight} onChange={set("gross_weight")} aria-invalid={!!errors.gross_weight} />
              <Select value={unit} onChange={(e) => switchUnit(e.target.value as "g" | "sov")} className="w-28 shrink-0" aria-label="Weight unit">
                <option value="g">grams</option><option value="sov">sovereign</option>
              </Select>
            </div>
          </Field>
          <Field label="Stone / non-gold weight (grams)" error={errors.non_gold_weight}>
            <Input type="number" inputMode="decimal" step="any" min="0" value={f.non_gold_weight} onChange={set("non_gold_weight")} aria-invalid={!!errors.non_gold_weight} />
          </Field>
          <div className="rounded-md bg-foreground/5 p-3 text-sm sm:col-span-2" aria-live="polite">
            <p>Net gold weight: <strong>{formatGrams(netG)}</strong></p>
            <p>In sovereigns (1 sov = 8 g): <strong>{formatSovereigns(gramsToSovereigns(netG))}</strong></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Price</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Gold rate per gram at purchase (₹)" hint="Optional — used for the cost estimate" error={errors.gold_rate_at_purchase}>
            <Input type="number" inputMode="decimal" step="any" min="0" value={f.gold_rate_at_purchase} onChange={set("gold_rate_at_purchase")} />
          </Field>
          <Field label="Other charges (₹)"><Input type="number" inputMode="decimal" step="any" min="0" value={f.other_charges} onChange={set("other_charges")} /></Field>
          {renderCharge({ label: "Making charges", name: "making", mode: makingMode, setMode: setMakingMode, error: errors.making_charges })}
          {renderCharge({ label: "Wastage charges", name: "wastage", mode: wastageMode, setMode: setWastageMode, error: errors.wastage_charges })}
          {renderCharge({ label: "GST / tax", name: "tax", mode: taxMode, setMode: setTaxMode, error: errors.tax })}
          <div className="rounded-md bg-foreground/5 p-3 text-sm" aria-live="polite">
            {canEstimate ? (
              <>
                <p>Metal {formatINR(estimate.metalValue)} + making {formatINR(estimate.making)} + wastage {formatINR(estimate.wastage)} + tax {formatINR(estimate.tax)} + other {formatINR(estimate.other)}</p>
                <p className="mt-1">Estimated total: <strong>{formatINR(estimate.total)}</strong></p>
              </>
            ) : <p className="text-muted-foreground">Enter weight and rate to see an estimated cost.</p>}
          </div>
          <Field label="Final purchase price you paid (₹)" hint="This is the number that is saved. It is never changed automatically." error={errors.purchase_price} className="sm:col-span-2">
            <div className="flex gap-2">
              <Input type="number" inputMode="decimal" step="any" min="0" value={f.purchase_price} onChange={set("purchase_price")} aria-invalid={!!errors.purchase_price} />
              {canEstimate && <Button type="button" variant="outline" className="shrink-0" onClick={() => setF((p) => ({ ...p, purchase_price: String(estimate.total) }))}>Use estimate</Button>}
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bill & notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5">
              <FileText className="h-5 w-5" />{bill || (item?.bill_path && !removeBill) ? "Replace bill" : "Upload purchase bill (optional)"}
              <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={pickBill} disabled={busy} />
            </label>
            {bill && <p className="text-sm">{bill.name} <button type="button" className="ml-2 text-destructive underline" onClick={() => setBill(null)}>remove</button></p>}
            {!bill && item?.bill_path && !removeBill && (
              <p className="text-sm">Bill attached <button type="button" className="ml-2 text-destructive underline" onClick={() => setRemoveBill(true)}>remove</button></p>
            )}
          </div>
          <Field label="Notes"><Textarea value={f.notes} onChange={set("notes")} maxLength={2000} /></Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex gap-2 md:static">
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={busy}>Cancel</Button>
        <Button type="submit" size="lg" className="flex-1" disabled={busy || compressing}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" />Saving…</> : existing ? "Save changes" : "Save to vault"}
        </Button>
      </div>
    </form>
  );
}
