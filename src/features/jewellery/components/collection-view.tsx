"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { CATEGORIES, PURITIES, STATUSES, type RateMap } from "@/domain/gold";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { JewelleryCard } from "@/features/jewellery/components/jewellery-card";
import type { JewelleryWithCover } from "@/features/jewellery/queries";

type Sort = "date_desc" | "date_asc" | "weight_desc" | "weight_asc" | "price_desc" | "price_asc";

export function CollectionView({ items, rates }: { items: JewelleryWithCover[]; rates: RateMap }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [purity, setPurity] = useState("");
  const [status, setStatus] = useState("owned");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<Sort>("date_desc");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((i) =>
      (!status || i.status === status) &&
      (!category || i.category === category) &&
      (!purity || i.purity === purity) &&
      (!from || i.purchase_date >= from) &&
      (!to || i.purchase_date <= to) &&
      (!needle || [i.name, i.shop_name, i.notes, i.invoice_number, i.huid].some((f) => f?.toLowerCase().includes(needle))),
    );
    const [key, dir] = sort.split("_") as ["date" | "weight" | "price", "asc" | "desc"];
    const val = (i: JewelleryWithCover) => key === "date" ? i.purchase_date : key === "weight" ? i.net_gold_weight : i.purchase_price;
    return list.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return dir === "asc" ? c : -c;
    });
  }, [items, q, category, purity, status, from, to, sort]);

  const reset = () => { setQ(""); setCategory(""); setPurity(""); setStatus("owned"); setFrom(""); setTo(""); };

  if (!items.length) {
    return (
      <div className="mt-16 text-center">
        <h2 className="font-serif text-xl font-semibold">No jewellery yet</h2>
        <p className="mt-1 text-muted-foreground">Your collection will appear here.</p>
        <Link href="/add" className="gold-gradient mt-5 inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium text-gold-foreground shadow"><Plus className="h-5 w-5" />Add Gold</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input aria-label="Search" placeholder="Search name, shop, invoice, HUID…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        <Select aria-label="Purity" value={purity} onChange={(e) => setPurity(e.target.value)}>
          <option value="">All purities</option>{PURITIES.map((p) => <option key={p}>{p}</option>)}
        </Select>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
        <Input aria-label="Purchased from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input aria-label="Purchased to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="date_desc">Newest first</option><option value="date_asc">Oldest first</option>
          <option value="weight_desc">Heaviest first</option><option value="weight_asc">Lightest first</option>
          <option value="price_desc">Highest price</option><option value="price_asc">Lowest price</option>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} items</p>
        <div className="flex gap-1">
          <Button variant={layout === "grid" ? "default" : "outline"} size="icon" aria-label="Grid view" onClick={() => setLayout("grid")}><LayoutGrid className="h-5 w-5" /></Button>
          <Button variant={layout === "list" ? "default" : "outline"} size="icon" aria-label="List view" onClick={() => setLayout("list")}><List className="h-5 w-5" /></Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No jewellery matches these filters.</p>
          <Button variant="outline" className="mt-3" onClick={reset}>Clear filters</Button>
        </div>
      ) : (
        <div className={layout === "grid" ? "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" : "grid gap-3"}>
          {filtered.map((i) => <JewelleryCard key={i.id} item={i} rates={rates} layout={layout} />)}
        </div>
      )}
    </div>
  );
}
