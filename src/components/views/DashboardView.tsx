import React, { useMemo, useState } from 'react';
import { ChartConfiguration } from 'chart.js';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  IndianRupee,
  MessageSquarePlus,
  Printer,
  Smile,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AppTab, MenuItem, SurveyResponse } from '../../types/campus';
import {
  computeDashboardMetrics,
  computeRecommendations,
} from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';
import { DownloadReportButton } from '../DownloadReportButton';

interface DashboardViewProps {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
  onNavigate: (tab: AppTab) => void;
}

const NAVY_PALETTE = [
  '#0F172A',
  '#F97316',
  '#16A34A',
  '#2563EB',
  '#F59E0B',
  '#0D9488',
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  surveys,
  menuItems,
  onNavigate,
}) => {
  const [trendMode, setTrendMode] = useState<'daily' | 'weekly'>('daily');

  const metrics = useMemo(
    () => computeDashboardMetrics(surveys, menuItems),
    [surveys, menuItems]
  );

  const recs = useMemo(
    () => computeRecommendations(surveys, menuItems),
    [surveys, menuItems]
  );

  const quickFacts = useMemo(() => {
    const activeMenu = menuItems.filter((m) => m.availability === 'Available');
    const pool = activeMenu.length > 0 ? activeMenu : menuItems;
    const topRatedItem = [...pool].sort(
      (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount
    )[0];

    const topHygieneCat = [...metrics.categoryStats]
      .filter((c) => c.count > 0)
      .sort((a, b) => b.avgHygiene - a.avgHygiene)[0];

    const topNewDish = recs.newDishProposals[0];

    return {
      topRatedItem,
      topHygieneCat,
      topNewDish,
      availableMenuCount: activeMenu.length,
    };
  }, [menuItems, metrics.categoryStats, recs.newDishProposals]);

  // 1. Pie Chart: Food Category Preferences
  const categoryPieConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'pie',
      data: {
        labels: metrics.categoryStats.map((c) => c.category),
        datasets: [
          {
            data: metrics.categoryStats.map((c) => c.count),
            backgroundColor: NAVY_PALETTE,
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              padding: 14,
              font: { family: "'DM Sans', sans-serif", size: 12 },
              color: '#334155',
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const stat = metrics.categoryStats[idx];
                return ` ${stat.category}: ${stat.count} (${stat.sharePct}%) · ${stat.avgOverall}★`;
              },
            },
          },
        },
      },
    }),
    [metrics.categoryStats]
  );

  // 2. Bar Chart: Most Popular Food Items
  const popularItemsBarConfig = useMemo<ChartConfiguration>(() => {
    const top7 = metrics.topDishes.slice(0, 7);
    return {
      type: 'bar',
      data: {
        labels: top7.map((d) => (d.name.length > 22 ? `${d.name.slice(0, 20)}…` : d.name)),
        datasets: [
          {
            label: 'Student Mentions',
            data: top7.map((d) => d.mentions),
            backgroundColor: '#F97316',
            borderRadius: 6,
            barThickness: 22,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const dish = top7[ctx.dataIndex];
                return ` ${dish.mentions} votes · Avg ${dish.avgRating}/5★`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0, color: '#64748B' },
            grid: { color: '#F1F5F9' },
          },
          y: {
            ticks: { color: '#0F172A', font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    };
  }, [metrics.topDishes]);

  // 3. Line Chart: Daily / Weekly Survey Trends
  const trendsLineConfig = useMemo<ChartConfiguration>(() => {
    const isDaily = trendMode === 'daily';
    const labels = isDaily
      ? metrics.dailyTrends.map((d) => d.label)
      : metrics.weeklyTrends.map((w) => w.weekLabel);
    const counts = isDaily
      ? metrics.dailyTrends.map((d) => d.count)
      : metrics.weeklyTrends.map((w) => w.count);
    const ratings = isDaily
      ? metrics.dailyTrends.map((d) => d.avgRating)
      : metrics.weeklyTrends.map((w) => w.avgRating);

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Survey Responses',
            data: counts,
            borderColor: '#0F172A',
            backgroundColor: 'rgba(15, 23, 42, 0.08)',
            fill: true,
            tension: 0.32,
            pointRadius: 4,
            pointBackgroundColor: '#0F172A',
            yAxisID: 'y',
          },
          {
            label: 'Avg Rating (★)',
            data: ratings,
            borderColor: '#16A34A',
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            tension: 0.32,
            pointRadius: 4,
            pointBackgroundColor: '#16A34A',
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, color: '#334155', font: { size: 12 } },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 11 } } },
          y: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            ticks: { precision: 0, color: '#0F172A' },
            grid: { color: '#F1F5F9' },
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 1,
            max: 5,
            ticks: { color: '#16A34A' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };
  }, [metrics.dailyTrends, metrics.weeklyTrends, trendMode]);

  // 4. Doughnut Chart: Student Satisfaction
  const satisfactionDoughnutConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'doughnut',
      data: {
        labels: metrics.satisfactionBuckets.map((b) => b.label),
        datasets: [
          {
            data: metrics.satisfactionBuckets.map((b) => b.count),
            backgroundColor: ['#16A34A', '#22C55E', '#F59E0B', '#DC2626'],
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 10, padding: 12, color: '#334155', font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const b = metrics.satisfactionBuckets[ctx.dataIndex];
                return ` ${b.label}: ${b.count} students (${b.pct}%)`;
              },
            },
          },
        },
      },
    }),
    [metrics.satisfactionBuckets]
  );

  // 5. Price Range Comparison Chart
  const priceComparisonConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: metrics.priceRangeStats.map((p) => p.priceRange),
        datasets: [
          {
            label: 'Response Share (%)',
            data: metrics.priceRangeStats.map((p) => p.sharePct),
            backgroundColor: '#0F172A',
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            label: 'Avg Rating (★)',
            data: metrics.priceRangeStats.map((p) => p.avgRating),
            backgroundColor: '#16A34A',
            borderRadius: 6,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { boxWidth: 10, color: '#334155', font: { size: 12 } },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#0F172A' } },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { callback: (v) => `${v}%`, color: '#0F172A' },
            grid: { color: '#F1F5F9' },
          },
          y1: {
            position: 'right',
            min: 0,
            max: 5,
            ticks: { color: '#16A34A' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    }),
    [metrics.priceRangeStats]
  );

  return (
    <div className="space-y-6">
      {/* Print-Only Executive Summary Masthead */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600">
              CampusBite AI · Executive Analytics Summary
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              Campus Canteen & Food Preference Dashboard Report
            </h2>
          </div>
          <div className="text-right text-xs text-slate-600 tabular-nums">
            <div>Printed {new Date().toLocaleDateString()}</div>
            <div>
              {metrics.totalResponses} responses ({metrics.realCount} live · {metrics.demoCount} demo)
            </div>
          </div>
        </div>
      </div>

      {/* Executive Header Strip */}
      <div className="bg-slate-900 text-white rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 print:hidden">
        <div>
          <div className="text-xs font-medium text-orange-400 tracking-wide">
            Campus Canteen Intelligence · Live Dataset ({metrics.demoCount} Demo + {metrics.realCount} Live Entries)
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-1 text-balance">
            Student Food Preference & Menu Performance Overview
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Every chart, recommendation, and forecast below updates automatically as students submit new survey responses or CSV datasets are imported.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-orange-400" />
            <span>Print Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('survey')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Submit Survey</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('assistant')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>Ask CampusBite AI</span>
          </button>
        </div>
      </div>

      {/* Quick Facts Section */}
      <section aria-label="Quick Facts" className="space-y-2.5 print:break-inside-avoid">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Quick Facts
          </h3>
          <span className="text-xs text-slate-500 tabular-nums">
            Live Snapshot · {quickFacts.availableMenuCount} of {menuItems.length} dishes available
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          <div className="bg-slate-900 text-white rounded-xl px-4 py-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-400">Total Surveyed Students</div>
                <div className="text-xl font-bold mt-0.5 tabular-nums font-mono-tabular">
                  {metrics.totalResponses}
                </div>
                <div className="text-xs text-slate-300 mt-0.5 truncate tabular-nums">
                  Across {metrics.departmentStats.length} campus departments
                </div>
              </div>
              <Users className="w-5 h-5 text-orange-400 shrink-0" />
            </div>
            <div className="pt-2.5 border-t border-slate-800 flex justify-end print:hidden">
              <DownloadReportButton
                compact
                darkSurface
                getPayload={() => ({
                  title: 'Quick Fact — Total Surveyed Students',
                  subtitle: 'Department participation breakdown across stored student surveys',
                  filename: 'campusbite_total_surveyed_students',
                  summaryLines: [
                    `Total Surveyed Students: ${metrics.totalResponses}`,
                    `Live Entries: ${metrics.realCount} | Demo Baseline: ${metrics.demoCount}`,
                    `Departments Represented: ${metrics.departmentStats.length}`,
                  ],
                  headers: ['Department', 'Responses', 'Top Category', 'Avg Rating'],
                  rows: metrics.departmentStats.map((d) => [
                    d.department,
                    d.count,
                    d.topCategory,
                    d.avgRating.toFixed(2),
                  ]),
                })}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Top Rated Canteen Item</div>
                <div className="text-base font-bold text-slate-900 mt-0.5 truncate">
                  {quickFacts.topRatedItem?.name ?? 'N/A'}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-0.5 tabular-nums">
                  {quickFacts.topRatedItem
                    ? `${quickFacts.topRatedItem.rating.toFixed(1)} / 5.0★ · ₹${quickFacts.topRatedItem.price}`
                    : 'No items available'}
                </div>
              </div>
              <Award className="w-5 h-5 text-orange-500 shrink-0" />
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex justify-end print:hidden">
              <DownloadReportButton
                compact
                getPayload={() => ({
                  title: 'Quick Fact — Top Rated Canteen Items',
                  subtitle: 'Highest-rated active canteen dishes ranked by student rating',
                  filename: 'campusbite_top_rated_canteen_items',
                  summaryLines: [
                    `Top Rated Item: ${quickFacts.topRatedItem?.name ?? 'N/A'}`,
                    `Rating: ${quickFacts.topRatedItem?.rating.toFixed(1) ?? '0'} / 5.0`,
                    `Active Available Menu SKUs: ${quickFacts.availableMenuCount} of ${menuItems.length}`,
                  ],
                  headers: ['Dish Name', 'Category', 'Price (INR)', 'Rating', 'Reviews', 'Status'],
                  rows: [...menuItems]
                    .sort((a, b) => b.rating - a.rating)
                    .slice(0, 10)
                    .map((m) => [
                      m.name,
                      m.category,
                      m.price,
                      m.rating.toFixed(1),
                      m.reviewCount,
                      m.availability,
                    ]),
                })}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Most Requested New Dish</div>
                <div className="text-base font-bold text-slate-900 mt-0.5 truncate">
                  {quickFacts.topNewDish?.dishName ?? 'All Requests Fulfilled'}
                </div>
                <div className="text-xs text-orange-600 font-semibold mt-0.5 tabular-nums">
                  {quickFacts.topNewDish
                    ? `${quickFacts.topNewDish.mentions} student requests · ${quickFacts.topNewDish.suggestedPrice}`
                    : 'Menu aligned with demand'}
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-orange-500 shrink-0" />
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex justify-end print:hidden">
              <DownloadReportButton
                compact
                getPayload={() => ({
                  title: 'Quick Fact — Most Requested New Dishes',
                  subtitle: 'New menu additions mined from student survey suggestion logs',
                  filename: 'campusbite_requested_new_dishes',
                  summaryLines: [
                    `Top Requested Dish: ${quickFacts.topNewDish?.dishName ?? 'All Requests Fulfilled'}`,
                    `Total New Dish Proposals Identified: ${recs.newDishProposals.length}`,
                  ],
                  headers: ['Proposed Dish', 'Target Category', 'Student Requests', 'Suggested Price'],
                  rows: recs.newDishProposals.map((d) => [
                    d.dishName,
                    d.targetCategory,
                    d.mentions,
                    d.suggestedPrice,
                  ]),
                })}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Highest Hygiene Counter</div>
                <div className="text-base font-bold text-slate-900 mt-0.5 truncate">
                  {quickFacts.topHygieneCat?.category ?? 'N/A'}
                </div>
                <div className="text-xs text-emerald-700 font-semibold mt-0.5 tabular-nums">
                  {quickFacts.topHygieneCat
                    ? `${quickFacts.topHygieneCat.avgHygiene.toFixed(2)} / 5.0★ hygiene avg`
                    : 'Awaiting ratings'}
                </div>
              </div>
              <Smile className="w-5 h-5 text-emerald-600 shrink-0" />
            </div>
            <div className="pt-2.5 border-t border-slate-100 flex justify-end print:hidden">
              <DownloadReportButton
                compact
                getPayload={() => ({
                  title: 'Quick Fact — Hygiene & Quality by Counter',
                  subtitle: 'Student hygiene, quality, and taste ratings per canteen category',
                  filename: 'campusbite_hygiene_by_counter',
                  summaryLines: [
                    `Top Hygiene Category: ${quickFacts.topHygieneCat?.category ?? 'N/A'}`,
                    `Overall Campus Hygiene Average: ${metrics.avgHygiene.toFixed(2)} / 5.0`,
                  ],
                  headers: ['Category', 'Responses', 'Avg Hygiene', 'Avg Quality', 'Avg Taste'],
                  rows: metrics.categoryStats.map((c) => [
                    c.category,
                    c.count,
                    c.avgHygiene.toFixed(2),
                    c.avgQuality.toFixed(2),
                    c.avgTaste.toFixed(2),
                  ]),
                })}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 print:grid-cols-5 print:break-inside-avoid">
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Total Survey Responses</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 tabular-nums font-mono-tabular">
              {metrics.totalResponses}
            </div>
            <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
              {metrics.realCount} live · {metrics.demoCount} demo baseline
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end print:hidden">
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: 'KPI Report — Total Survey Responses',
                subtitle: 'Participation summary across live student submissions and demo baseline',
                filename: 'campusbite_kpi_total_responses',
                summaryLines: [
                  `Total Survey Responses: ${metrics.totalResponses}`,
                  `Live Student Submissions: ${metrics.realCount}`,
                  `Demo Baseline Records: ${metrics.demoCount}`,
                ],
                headers: ['Department', 'Responses', 'Top Category', 'Avg Rating'],
                rows: metrics.departmentStats.map((d) => [
                  d.department,
                  d.count,
                  d.topCategory,
                  d.avgRating.toFixed(2),
                ]),
              })}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Top Food Category</span>
              <Award className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 truncate">
              {metrics.mostPreferredCategory}
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-1.5 tabular-nums">
              {metrics.mostPreferredCategoryShare}% of student votes
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end print:hidden">
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: 'KPI Report — Top Food Category',
                subtitle: 'Student food category share and rating performance',
                filename: 'campusbite_kpi_top_category',
                summaryLines: [
                  `Most Preferred Category: ${metrics.mostPreferredCategory}`,
                  `Category Vote Share: ${metrics.mostPreferredCategoryShare}%`,
                ],
                headers: ['Category', 'Votes', 'Share (%)', 'Avg Overall Rating'],
                rows: metrics.categoryStats.map((c) => [
                  c.category,
                  c.count,
                  `${c.sharePct}%`,
                  c.avgOverall.toFixed(2),
                ]),
              })}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Average Food Rating</span>
              <Star className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mt-2 tabular-nums font-mono-tabular">
              {metrics.avgFoodRating.toFixed(2)}
              <span className="text-sm font-normal text-slate-400"> / 5.0</span>
            </div>
            <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
              Q {metrics.avgQuality} · T {metrics.avgTaste} · H {metrics.avgHygiene}
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end print:hidden">
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: 'KPI Report — Average Food Rating',
                subtitle: 'Composite quality, taste, and hygiene breakdown',
                filename: 'campusbite_kpi_average_rating',
                summaryLines: [
                  `Composite Overall Rating: ${metrics.avgFoodRating.toFixed(2)} / 5.0`,
                  `Quality Avg: ${metrics.avgQuality.toFixed(2)} | Taste Avg: ${metrics.avgTaste.toFixed(2)} | Hygiene Avg: ${metrics.avgHygiene.toFixed(2)}`,
                ],
                headers: ['Category', 'Quality Avg', 'Taste Avg', 'Hygiene Avg', 'Overall Avg'],
                rows: metrics.categoryStats.map((c) => [
                  c.category,
                  c.avgQuality.toFixed(2),
                  c.avgTaste.toFixed(2),
                  c.avgHygiene.toFixed(2),
                  c.avgOverall.toFixed(2),
                ]),
              })}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Popular Price Range</span>
              <IndianRupee className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums font-mono-tabular">
              {metrics.mostPopularPriceRange}
            </div>
            <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
              {metrics.mostPopularPriceShare}% student preference
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end print:hidden">
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: 'KPI Report — Popular Price Range',
                subtitle: 'Student budget distribution and satisfaction by price band',
                filename: 'campusbite_kpi_price_range',
                summaryLines: [
                  `Most Popular Price Band: ${metrics.mostPopularPriceRange}`,
                  `Share of Student Preferences: ${metrics.mostPopularPriceShare}%`,
                ],
                headers: ['Price Range', 'Responses', 'Share (%)', 'Avg Rating', 'Satisfaction (%)'],
                rows: metrics.priceRangeStats.map((p) => [
                  p.priceRange,
                  p.count,
                  `${p.sharePct}%`,
                  p.avgRating.toFixed(2),
                  `${p.satisfactionPct}%`,
                ]),
              })}
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Student Satisfaction</span>
              <Smile className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-bold text-emerald-700 mt-2 tabular-nums font-mono-tabular">
              {metrics.satisfactionPct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 mt-1.5">
              Ratings ≥ 3.8★ composite score
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex justify-end print:hidden">
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: 'KPI Report — Student Satisfaction',
                subtitle: 'Distribution of student ratings across satisfaction tiers',
                filename: 'campusbite_kpi_satisfaction',
                summaryLines: [
                  `Overall Student Satisfaction (>= 3.8 stars): ${metrics.satisfactionPct.toFixed(1)}%`,
                  `Total Evaluated Responses: ${metrics.totalResponses}`,
                ],
                headers: ['Satisfaction Tier', 'Student Count', 'Share (%)'],
                rows: metrics.satisfactionBuckets.map((b) => [
                  b.label,
                  b.count,
                  `${b.pct}%`,
                ]),
              })}
            />
          </div>
        </div>
      </div>

      {/* Primary Charts Row: Daily/Weekly Trend + Food Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ChartCanvas
            title={trendMode === 'daily' ? 'Daily Food Survey Trends' : 'Weekly Food Preference Trends'}
            subtitle="Volume of survey responses paired with composite average food rating"
            config={trendsLineConfig}
            exportFilename={`campusbite_${trendMode}_trends`}
            heightClass="h-72"
            reportSummary={[
              `Trend Granularity: ${trendMode === 'daily' ? 'Daily (Last 14 Days)' : 'Weekly'}`,
              `Total Responses Analyzed: ${metrics.totalResponses}`,
              `Overall Composite Rating: ${metrics.avgFoodRating.toFixed(2)} / 5.0`,
            ]}
            reportHeaders={
              trendMode === 'daily'
                ? ['Date', 'Label', 'Responses', 'Avg Rating', 'Top Category']
                : ['Week', 'Responses', 'Avg Rating', 'Satisfaction (%)']
            }
            reportRows={
              trendMode === 'daily'
                ? metrics.dailyTrends.map((d) => [
                    d.date,
                    d.label,
                    d.count,
                    d.avgRating.toFixed(2),
                    d.topCategory,
                  ])
                : metrics.weeklyTrends.map((w) => [
                    w.weekLabel,
                    w.count,
                    w.avgRating.toFixed(2),
                    `${w.satisfactionPct}%`,
                  ])
            }
            headerRight={
              <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setTrendMode('daily')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    trendMode === 'daily'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setTrendMode('weekly')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    trendMode === 'weekly'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Weekly
                </button>
              </div>
            }
          />
        </div>

        <div className="lg:col-span-5">
          <ChartCanvas
            title="Food Category Preferences"
            subtitle="Distribution across the 6 campus canteen cuisine categories"
            config={categoryPieConfig}
            exportFilename="campusbite_category_preferences"
            heightClass="h-72"
            reportSummary={[
              `Top Food Category: ${metrics.mostPreferredCategory} (${metrics.mostPreferredCategoryShare}% share)`,
              `Total Categorized Votes: ${metrics.totalResponses}`,
            ]}
            reportHeaders={['Category', 'Votes', 'Share (%)', 'Avg Overall', 'Satisfaction (%)']}
            reportRows={metrics.categoryStats.map((c) => [
              c.category,
              c.count,
              `${c.sharePct}%`,
              c.avgOverall.toFixed(2),
              `${c.satisfactionPct}%`,
            ])}
          />
        </div>
      </div>

      {/* Secondary Charts Row: Popular Items Bar + Satisfaction Doughnut + Price Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <ChartCanvas
            title="Most Popular Food Items"
            subtitle="Top dishes ranked by student survey selections"
            config={popularItemsBarConfig}
            exportFilename="campusbite_popular_items"
            heightClass="h-72"
            reportSummary={[
              `#1 Dish: ${metrics.topDishes[0]?.name ?? 'N/A'} (${metrics.topDishes[0]?.mentions ?? 0} votes)`,
              `Distinct Dishes Evaluated: ${metrics.topDishes.length}`,
            ]}
            reportHeaders={['Dish Name', 'Category', 'Mentions', 'Avg Rating', 'Demand Score']}
            reportRows={metrics.topDishes.slice(0, 10).map((d) => [
              d.name,
              d.category,
              d.mentions,
              d.avgRating.toFixed(2),
              d.demandScore.toFixed(1),
            ])}
          />
        </div>

        <div className="lg:col-span-3">
          <ChartCanvas
            title="Student Satisfaction"
            subtitle="Breakdown by composite rating tier"
            config={satisfactionDoughnutConfig}
            exportFilename="campusbite_satisfaction_tiers"
            heightClass="h-72"
            reportSummary={[
              `Overall Satisfaction (>= 3.8 stars): ${metrics.satisfactionPct.toFixed(1)}%`,
              `Total Responses: ${metrics.totalResponses}`,
            ]}
            reportHeaders={['Rating Tier', 'Student Count', 'Share (%)']}
            reportRows={metrics.satisfactionBuckets.map((b) => [b.label, b.count, `${b.pct}%`])}
          />
        </div>

        <div className="lg:col-span-4">
          <ChartCanvas
            title="Price Range Comparison"
            subtitle="Student budget share (%) vs average food rating"
            config={priceComparisonConfig}
            exportFilename="campusbite_price_comparison"
            heightClass="h-72"
            reportSummary={[
              `Dominant Student Budget: ${metrics.mostPopularPriceRange} (${metrics.mostPopularPriceShare}%)`,
              recs.optimalPriceAdvice,
            ]}
            reportHeaders={['Price Range', 'Responses', 'Share (%)', 'Avg Rating', 'Satisfaction (%)']}
            reportRows={metrics.priceRangeStats.map((p) => [
              p.priceRange,
              p.count,
              `${p.sharePct}%`,
              p.avgRating.toFixed(2),
              `${p.satisfactionPct}%`,
            ])}
          />
        </div>
      </div>

      {/* Operational Insights Row: Low-Rated Alerts + Forecast + New Dish Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 print:grid-cols-3 print:break-inside-avoid">
        {/* Low-Rated Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Low-Rated Food Alerts</h3>
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            {recs.lowRatedAlerts.length === 0 ? (
              <p className="text-sm text-slate-500">
                All active canteen items are currently scoring above 3.4★.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recs.lowRatedAlerts.slice(0, 3).map((alert) => (
                  <li key={alert.itemName} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {alert.itemName}
                      </span>
                      <span className="text-xs font-semibold text-red-700 tabular-nums shrink-0">
                        {alert.avgRating.toFixed(1)} / 5.0★
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 print:hidden">
            <button
              type="button"
              onClick={() => onNavigate('recommendations')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              <span>View improvement plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: 'Low-Rated Food Alerts Report',
                subtitle: 'Menu items and surveyed dishes scoring below 3.5 stars',
                filename: 'campusbite_low_rated_alerts',
                summaryLines: [
                  `Flagged Items Count: ${recs.lowRatedAlerts.length}`,
                  recs.lowRatedAlerts[0]
                    ? `Lowest Rated: ${recs.lowRatedAlerts[0].itemName} (${recs.lowRatedAlerts[0].avgRating.toFixed(1)}/5)`
                    : 'All items performing above 3.4 stars.',
                ],
                headers: ['Item Name', 'Category', 'Avg Rating', 'Mentions', 'Feedback Reason'],
                rows: recs.lowRatedAlerts.map((a) => [
                  a.itemName,
                  a.category,
                  a.avgRating.toFixed(1),
                  a.mentions,
                  a.reason,
                ]),
              })}
            />
          </div>
        </div>

        {/* Demand Forecast Preview */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Next 3-Day Demand Prediction</h3>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <ul className="divide-y divide-slate-100">
              {recs.demandForecast.slice(0, 3).map((day) => (
                <li key={day.dateStr} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {day.dayLabel} · {day.dateStr}
                    </div>
                    <div className="text-xs text-slate-500">
                      Led by {day.topCategory}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900 tabular-nums font-mono-tabular">
                      ~{day.predictedOrders} orders
                    </div>
                    <div className="text-xs text-emerald-700 tabular-nums">
                      {day.confidencePct}% confidence
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 print:hidden">
            <button
              type="button"
              onClick={() => onNavigate('recommendations')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              <span>7-day forecast</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: '7-Day Campus Food Demand Prediction',
                subtitle: 'Projected daily order volume and lead cuisine category',
                filename: 'campusbite_demand_forecast',
                summaryLines: [
                  `Base Survey Dataset: ${metrics.totalResponses} responses`,
                  `Next Day Projected Orders: ${recs.demandForecast[0]?.predictedOrders ?? 0} (${recs.demandForecast[0]?.topCategory ?? ''})`,
                ],
                headers: ['Day', 'Date', 'Predicted Orders', 'Lead Category', 'Confidence (%)'],
                rows: recs.demandForecast.map((d) => [
                  d.dayLabel,
                  d.dateStr,
                  d.predictedOrders,
                  d.topCategory,
                  `${d.confidencePct}%`,
                ]),
              })}
            />
          </div>
        </div>

        {/* New Dishes Requested */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-slate-900">Top Requested New Dishes</h3>
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
            {recs.newDishProposals.length === 0 ? (
              <p className="text-sm text-slate-500">
                Collect student suggestions in the survey form to uncover new menu demand.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recs.newDishProposals.slice(0, 3).map((dish) => (
                  <li key={dish.dishName} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {dish.dishName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {dish.targetCategory} · {dish.suggestedPrice}
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                      {dish.mentions} requests
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 print:hidden">
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              <span>Manage menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <DownloadReportButton
              compact
              getPayload={() => ({
                title: 'Top Requested New Dishes Report',
                subtitle: 'Student-requested menu items extracted from survey suggestions',
                filename: 'campusbite_new_dish_requests',
                summaryLines: [
                  `Proposals Found: ${recs.newDishProposals.length}`,
                  recs.newDishProposals[0]
                    ? `#1 Requested: ${recs.newDishProposals[0].dishName} (${recs.newDishProposals[0].mentions} requests)`
                    : 'No unfulfilled dish requests.',
                ],
                headers: ['Dish Name', 'Target Category', 'Requests', 'Suggested Price'],
                rows: recs.newDishProposals.map((d) => [
                  d.dishName,
                  d.targetCategory,
                  d.mentions,
                  d.suggestedPrice,
                ]),
              })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
