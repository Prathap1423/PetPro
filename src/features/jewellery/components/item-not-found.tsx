import Link from "next/link";

export function ItemNotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h1 className="font-serif text-2xl font-semibold">Jewellery not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
      <Link href="/collection" className="mt-6 inline-flex h-11 items-center rounded-md glass-control px-4 text-sm font-medium hover:bg-foreground/5">Back to collection</Link>
    </div>
  );
}
