"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { CLARITIES, COLOURS, CUTS, DIAMOND_TYPES, LABS, SETTING_METALS, SHAPES } from "@/domain/diamond";
import { diamondSchema } from "@/domain/schemas";
import { createDiamond, updateDiamond } from "@/features/diamonds/service";
import { ImageUploader } from "@/features/items/components/image-uploader";
import { BillPicker } from "@/features/items/components/bill-picker";
import { useItemFiles } from "@/features/items/use-item-files";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { Diamond } from "@/domain/types";

interface Props {
  /** When provided, the form edits this diamond. */
  existing?: { item: Diamond; images: { id: string; url: string | null; is_cover: boolean }[]; billUrl: string | null };
}

const today = () => new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd in local time

/** A select whose first option means "not specified" (saved as null). */
function OptionalSelect({ value, onChange, options, label }: { value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: readonly string[]; label: string }) {
  return (
    <Select value={value} onChange={onChange} aria-label={label}>
      <option value="">Not specified</option>
      {options.map((o) => <option key={o}>{o}</option>)}
    </Select>
  );
}

export function DiamondForm({ existing }: Props) {
  const router = useRouter();
  const item = existing?.item;
  const idRef = useRef(item?.id ?? crypto.randomUUID());

  const [f, setF] = useState({
    name: item?.name ?? "",
    diamond_type: item?.diamond_type ?? "Ring",
    purchase_date: item?.purchase_date ?? today(),
    shop_name: item?.shop_name ?? "",
    invoice_number: item?.invoice_number ?? "",
    carat: item ? String(item.carat) : "",
    stone_count: item ? String(item.stone_count) : "1",
    shape: item?.shape ?? "Round",
    cut: item?.cut ?? "",
    colour: item?.colour ?? "",
    clarity: item?.clarity ?? "",
    certificate_lab: item?.certificate_lab ?? "",
    certificate_number: item?.certificate_number ?? "",
    setting_metal: item?.setting_metal ?? "",
    purchase_price: item ? String(item.purchase_price) : "",
    current_value: item?.current_value != null ? String(item.current_value) : "",
    notes: item?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const files = useItemFiles(existing && { images: existing.images, hasBill: !!item?.bill_path });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (f.purchase_price.trim() === "") return setErrors({ purchase_price: "Enter the price you paid" });
    const parsed = diamondSchema.safeParse(f);
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
      const payload = { id: idRef.current, values: f, ...(await files.toSaveInput()) };
      const res = existing ? await updateDiamond(payload) : await createDiamond(payload);
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(existing ? "Diamond updated" : "Diamond added to your vault");
      router.push(`/diamonds/item?id=${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Card>
        <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
        <CardContent>
          <ImageUploader photos={files.photos} coverKey={files.coverKey} onAdd={files.addPhotos} onRemove={files.removePhoto} onCover={files.setCoverKey} disabled={busy} compressing={files.compressing} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Diamond details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name} className="sm:col-span-2">
            <Input value={f.name} onChange={set("name")} placeholder="e.g. Solitaire ring" maxLength={120} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Type"><Select value={f.diamond_type} onChange={set("diamond_type")}>{DIAMOND_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Shape"><Select value={f.shape} onChange={set("shape")}>{SHAPES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Total carat weight (ct)" hint="Add up all stones if there are several" error={errors.carat}>
            <Input type="number" inputMode="decimal" step="any" min="0" value={f.carat} onChange={set("carat")} aria-invalid={!!errors.carat} />
          </Field>
          <Field label="Number of stones" error={errors.stone_count}>
            <Input type="number" inputMode="numeric" step="1" min="1" value={f.stone_count} onChange={set("stone_count")} aria-invalid={!!errors.stone_count} />
          </Field>
          <Field label="Purchase date" error={errors.purchase_date}>
            <Input type="date" value={f.purchase_date} max={today()} onChange={set("purchase_date")} suppressHydrationWarning aria-invalid={!!errors.purchase_date} />
          </Field>
          <Field label="Shop"><Input value={f.shop_name} onChange={set("shop_name")} maxLength={120} /></Field>
          <Field label="Invoice / bill number (optional)" error={errors.invoice_number} className="sm:col-span-2">
            <Input value={f.invoice_number} onChange={set("invoice_number")} maxLength={60} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Grading (the 4 Cs)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Cut"><OptionalSelect label="Cut" value={f.cut} onChange={set("cut")} options={CUTS} /></Field>
          <Field label="Colour" hint="D is colourless; later letters are warmer"><OptionalSelect label="Colour" value={f.colour} onChange={set("colour")} options={COLOURS} /></Field>
          <Field label="Clarity" hint="FL is flawless; I3 has the most inclusions"><OptionalSelect label="Clarity" value={f.clarity} onChange={set("clarity")} options={CLARITIES} /></Field>
          <Field label="Setting metal"><OptionalSelect label="Setting metal" value={f.setting_metal} onChange={set("setting_metal")} options={SETTING_METALS} /></Field>
          <Field label="Certificate lab"><OptionalSelect label="Certificate lab" value={f.certificate_lab} onChange={set("certificate_lab")} options={LABS} /></Field>
          <Field label="Certificate number" error={errors.certificate_number}>
            <Input value={f.certificate_number} onChange={set("certificate_number")} maxLength={40} autoCapitalize="characters" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Price</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Price you paid (₹)" error={errors.purchase_price}>
            <Input type="number" inputMode="decimal" step="any" min="0" value={f.purchase_price} onChange={set("purchase_price")} aria-invalid={!!errors.purchase_price} />
          </Field>
          <Field
            label="Current estimated value (₹, optional)"
            hint={item?.value_updated_at ? `Last updated ${formatDate(item.value_updated_at)}` : "For example from a jeweller's quote or a recent appraisal"}
            error={errors.current_value}
          >
            <Input type="number" inputMode="decimal" step="any" min="0" value={f.current_value} onChange={set("current_value")} aria-invalid={!!errors.current_value} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Bill & notes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <BillPicker files={files} disabled={busy} />
          <Field label="Notes"><Textarea value={f.notes} onChange={set("notes")} maxLength={2000} /></Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex gap-2 md:static">
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()} disabled={busy}>Cancel</Button>
        <Button type="submit" size="lg" className="flex-1" disabled={busy || files.compressing}>
          {busy ? <><Loader2 className="h-5 w-5 animate-spin" />Saving…</> : existing ? "Save changes" : "Save to vault"}
        </Button>
      </div>
    </form>
  );
}
