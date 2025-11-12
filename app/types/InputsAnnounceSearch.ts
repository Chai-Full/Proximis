export type InputsAnnounceSearch = {
  keyword: string;
  category?: string;
  distance?: number;
  priceMin?: number;
  priceMax?: number;
  price?: number;
  date?: string;
  // optional selected slots: day (1-7) and a single ISO time (user-provided hour)
  slots?: { day: number; time: string | null }[];
  // selected days (used in the availability UI)
  availableDays?: number[];
}