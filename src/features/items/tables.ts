/** Where each kind of vault item lives in Supabase. Photos and bills share the same buckets. */
export const JEWELLERY = { items: "jewellery", images: "jewellery_images", fk: "jewellery_id", noun: "Jewellery" } as const;
export const DIAMONDS = { items: "diamonds", images: "diamond_images", fk: "diamond_id", noun: "Diamond" } as const;

export type ItemTables = typeof JEWELLERY | typeof DIAMONDS;
