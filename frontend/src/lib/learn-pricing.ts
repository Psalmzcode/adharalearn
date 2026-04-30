export type PublicCourseListModule = {
  isFree: boolean;
  price: number | null;
};

export type PublicCourseListBundle = {
  name: string;
  price: number;
  moduleCount: number;
};

export type PublicCourseListItem = {
  slug: string;
  title: string;
  description?: string | null;
  price: number;
  currency?: string;
  mode?: string;
  modules: PublicCourseListModule[];
  bundles: PublicCourseListBundle[];
};

/** Short lines for cards: full track, modules, bundles. */
export function learnPricingSummary(c: PublicCourseListItem): string[] {
  const out: string[] = [];
  out.push(`Full track · ₦${Number(c.price ?? 0).toLocaleString()}`);

  const paid = c.modules.filter((m) => !m.isFree && m.price != null && m.price > 0);
  if (paid.length) {
    const prices = paid.map((m) => m.price!);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    out.push(lo === hi ? `Modules · from ₦${lo.toLocaleString()} each` : `Modules · ₦${lo.toLocaleString()}–₦${hi.toLocaleString()} each`);
  } else if (c.modules.some((m) => m.isFree)) {
    out.push('Some modules · free to start');
  }

  if (c.bundles.length === 1) {
    const b = c.bundles[0];
    out.push(`Bundle · ${b.name} — ₦${b.price.toLocaleString()} (${b.moduleCount} modules)`);
  } else if (c.bundles.length > 1) {
    const lo = Math.min(...c.bundles.map((b) => b.price));
    out.push(`Bundles · from ₦${lo.toLocaleString()}`);
  }

  return out;
}
