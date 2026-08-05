import { Search, ArrowUpRight, Globe, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import type { SearchConsoleStats } from "@/lib/search-console.functions";

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("ar-EG");
}

function formatPercent(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

function formatPosition(n: number) {
  return n > 0 ? n.toFixed(1) : "—";
}

function shortenPath(url: string) {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}

interface SearchConsoleDashboardProps {
  stats: SearchConsoleStats;
}

export function SearchConsoleDashboard({ stats }: SearchConsoleDashboardProps) {
  const isIndexed =
    stats.homepageInspection.verdict === "INDEXING_ALLOWED" ||
    stats.homepageInspection.coverageState?.toLowerCase().includes("indexed");

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cyber-border rounded-xl bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4 text-primary" />
            حالة الصفحة الرئيسية
          </div>
          <div className="flex items-center gap-2 text-lg font-bold">
            {isIndexed ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span className="text-green-400">مفهرسة</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <span className="text-amber-400">غير مفهرسة / قيد المراجعة</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.homepageInspection.coverageState || stats.homepageInspection.verdict}
          </p>
        </div>

        <div className="cyber-border rounded-xl bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-accent" />
            عدد الروابط في Sitemap
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatNumber(stats.sitemap.submittedUrls)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.sitemap.errors ? `${stats.sitemap.errors} خطأ · ` : ""}
            {stats.sitemap.warnings ? `${stats.sitemap.warnings} تحذير · ` : ""}
            {stats.sitemap.isPending ? "قيد المعالجة" : "تمت المعالجة"}
          </p>
        </div>

        <div className="cyber-border rounded-xl bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpRight className="h-4 w-4 text-green-400" />
            النقرات (28 يوم)
          </div>
          <div className="text-2xl font-bold text-foreground">{formatNumber(stats.totals.clicks)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatNumber(stats.totals.impressions)} ظهور · CTR {formatPercent(stats.totals.ctr)}
          </p>
        </div>

        <div className="cyber-border rounded-xl bg-card p-5">
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 text-primary" />
            متوسط المركز
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatPosition(stats.totals.position)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">في نتائج Google</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top queries */}
        <div className="cyber-border rounded-xl bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Search className="h-5 w-5 text-primary" />
            أعلى الكلمات المفتاحية
          </h3>
          {stats.topQueries.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات كلمات مفتاحية بعد (يحتاج وقت).</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 text-right">الكلمة</th>
                    <th className="py-2 text-right">نقرات</th>
                    <th className="py-2 text-right">ظهور</th>
                    <th className="py-2 text-right">مركز</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topQueries.map((q) => (
                    <tr key={q.query} className="border-b border-border/50 last:border-0">
                      <td className="py-2 font-medium">{q.query}</td>
                      <td className="py-2">{formatNumber(q.clicks)}</td>
                      <td className="py-2">{formatNumber(q.impressions)}</td>
                      <td className="py-2">{formatPosition(q.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top pages */}
        <div className="cyber-border rounded-xl bg-card p-5">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <FileText className="h-5 w-5 text-accent" />
            أعلى الصفحات ظهوراً
          </h3>
          {stats.topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد صفحات ظاهرة في النتائج بعد.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-2 text-right">الصفحة</th>
                    <th className="py-2 text-right">نقرات</th>
                    <th className="py-2 text-right">ظهور</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPages.map((p) => (
                    <tr key={p.page} className="border-b border-border/50 last:border-0">
                      <td className="py-2 font-medium">{shortenPath(p.page)}</td>
                      <td className="py-2">{formatNumber(p.clicks)}</td>
                      <td className="py-2">{formatNumber(p.impressions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        البيانات من Google Search Console آخر 28 يوم. يتم التحديث كلما فتحت الصفحة.
      </p>
    </div>
  );
}
