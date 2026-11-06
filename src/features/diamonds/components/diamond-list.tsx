"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Diamond as DiamondIcon, LayoutGrid, List, Plus, Search } from "lucide-react";
import { DIAMOND_TYPES, SHAPES } from "@/domain/diamond";
import { STATUSES } from "@/domain/gold";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DiamondCard } from "@/features/diamonds/components/diamond-card";
import type { DiamondWithCover } from "@/features/diamonds/queries";

type Sort = "date_desc" | "date_asc" | "carat_desc" | "carat_asc" | "price_desc" | "price_asc";

export function DiamondList({ items }: { items: DiamondWithCover[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [shape, setShape] = useState("");
  const [status, setStatus] = useState("owned");
  const [sort, setSort] = useState<Sort>("date_desc");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = items.filter((i) =>
      (!status || i.status === status) &&
      (!type || i.diamond_type === type) &&
      (!shape || i.shape === shape) &&
      (!needle || [i.name, i.shop_name, i.notes, i.invoice_number, i.certificate_number].some((f) => f?.toLowerCase().includes(needle))),
    );
    const [key, dir] = sort.split("_") as ["date" | "carat" | "price", "asc" | "desc"];
    const val = (i: DiamondWithCover) => key === "date" ? i.purchase_date : key === "carat" ? i.carat : i.purchase_price;
    return list.sort((a, b) => {
      const x = val(a), y = val(b);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return dir === "asc" ? c : -c;
    });
  }, [items, q, type, shape, status, sort]);

  const reset = () => { setQ(""); setType(""); setShape(""); setStatus("owned"); };

  if (!items.length) {
    return (
      <div className="mt-16 text-center">
        <span className="glass animate-pop mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full text-gold"><DiamondIcon className="h-8 w-8" /></span>
        <h2 className="font-serif text-xl font-semibold">No diamonds yet</h2>
        <p className="mt-1 text-muted-foreground">Add a ring, earrings or a loose stone with its grading and certificate.</p>
        <Link href="/diamonds/add" className="gold-gradient gold-shine transition active:scale-[0.97] mt-5 inline-flex h-12 items-center gap-2 rounded-md px-6 font-medium text-gold-foreground shadow"><Plus className="h-5 w-5" />Add Diamond</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input aria-label="Search" placeholder="Search name, shop, invoice, certificate…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>{DIAMOND_TYPES.map((t) => <option key={t}>{t}</option>)}
        </Select>
        <Select aria-label="Shape" value={shape} onChange={(e) => setShape(e.target.value)}>
          <option value="">All shapes</option>{SHAPES.map((s) => <option key={s}>{s}</option>)}
        </Select>
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="date_desc">Newest first</option><option value="date_asc">Oldest first</option>
          <option value="carat_desc">Largest first</option><option value="carat_asc">Smallest first</option>
          <option value="price_desc">Highest price</option><option value="price_asc">Lowest price</option>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} of {items.length} diamonds</p>
        <div className="flex gap-1">
          <Button variant={layout === "grid" ? "default" : "outline"} size="icon" aria-label="Grid view" onClick={() => setLayout("grid")}><LayoutGrid className="h-5 w-5" /></Button>
          <Button variant={layout === "list" ? "default" : "outline"} size="icon" aria-label="List view" onClick={() => setLayout("list")}><List className="h-5 w-5" /></Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No diamonds match these filters.</p>
          <Button variant="outline" className="mt-3" onClick={reset}>Clear filters</Button>
        </div>
      ) : (
        <div className={layout === "grid" ? "stagger grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" : "stagger grid gap-3"}>
          {filtered.map((i) => <DiamondCard key={i.id} item={i} layout={layout} />)}
        </div>
      )}
    </div>
  );
}
