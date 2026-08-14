export type MemoryCategory =
  | "percakapan"
  | "perjalanan"
  | "momen-spesial"
  | "hal-kecil";

export interface MemoryItem {
  id: string;
  date: string;
  title: string;
  story: string;
  imageUrl: string;
  /** Kategori untuk filter chip di Gallery. Default: "momen-spesial" jika kosong. */
  category?: MemoryCategory;
  /** Opsional — dipakai untuk badge lokasi di kartu & hitungan stat "Lokasi". */
  location?: string;
  /** Opsional — tandai true untuk kenangan yang ingin ditampilkan lebih besar di grid. */
  featured?: boolean;
}

export const MEMORY_CATEGORY_LABEL: Record<MemoryCategory, string> = {
  percakapan: "Percakapan",
  perjalanan: "Perjalanan",
  "momen-spesial": "Momen Spesial",
  "hal-kecil": "Hal Kecil",
};
