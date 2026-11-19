import React, { useMemo, useState } from 'react';
import { ChartConfiguration } from 'chart.js';
import {
  CheckCircle2,
  FilePlus2,
  Filter,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import {
  createReportApi,
  updateFeedbackStatusApi,
} from '../../services/api';
import {
  FOOD_CATEGORIES,
  FeedbackStatus,
  FoodCategory,
  HistoricalReport,
  MenuItem,
  SurveyResponse,
} from '../../types/campus';
import { computeDashboardMetrics } from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';

interface AdminAnalyticsViewProps {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
  reports: HistoricalReport[];
  onFeedbackUpdated: (survey: SurveyResponse) => void;
  onReportCreated: (report: HistoricalReport) => void;
}

type DatePreset = 'all' | '7d' | '14d' | '30d' | 'custom';

export const AdminAnalyticsView: React.FC<AdminAnalyticsViewProps> = ({
  surveys,
  menuItems,
  reports,
  onFeedbackUpdated,
  onReportCreated,
}) => {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | FoodCategory>('All');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'All' | FeedbackStatus>('All');
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [savingReport, setSavingReport] = useState(false);
  const [reportBanner, setReportBanner] = useState<string | null>(null);

  const filteredSurveys = useMemo(() => {
    const nowMs = Date.now();
    return surveys.filter((s) => {
      if (categoryFilter !== 'All' && s.preferredCategory !== categoryFilter) {
        return false;
      }
      const createdMs = new Date(s.createdAt).getTime();
      if (datePreset === '7d' && nowMs - createdMs > 7 * 86400000) return false;
      if (datePreset === '14d' && nowMs - createdMs > 14 * 86400000) return false;
      if (datePreset === '30d' && nowMs - createdMs > 30 * 86400000) return false;
      if (datePreset === 'custom') {
        if (startDate && s.createdAt.slice(0, 10) < startDate) return false;
        if (endDate && s.createdAt.slice(0, 10) > endDate) return false;
      }
      return true;
    });
  }, [surveys, categoryFilter, datePreset, startDate, endDate]);

  const metrics = useMemo(
    () => computeDashboardMetrics(filteredSurveys, menuItems),
    [filteredSurveys, menuItems]
  );

  // Quality vs Taste vs Hygiene Comparison Chart
  const qualityRadarBarConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: metrics.categoryStats.map((c) => c.category),
        datasets: [
          {
            label: 'Quality',
            data: metrics.categoryStats.map((c) => c.avgQuality),
            backgroundColor: '#0F172A',
            borderRadius: 4,
          },
          {
            label: 'Taste',
            data: metrics.categoryStats.map((c) => c.avgTaste),
            backgroundColor: '#F97316',
            borderRadius: 4,
          },
          {
            label: 'Hygiene',
            data: metrics.categoryStats.map((c) => c.avgHygiene),
            backgroundColor: '#16A34A',
            borderRadius: 4,
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
          x: { grid: { display: false }, ticks: { color: '#0F172A', font: { size: 11 } } },
          y: {
            min: 0,
            max: 5,
            grid: { color: '#F1F5F9' },
            ticks: { color: '#64748B' },
          },
        },
      },
    }),
    [metrics.categoryStats]
  );

  // Price vs Popularity Analysis Chart
  const pricePopularityConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: metrics.priceRangeStats.map((p) => p.priceRange),
        datasets: [
          {
            label: 'Student Preference Count',
            data: metrics.priceRangeStats.map((p) => p.count),
            backgroundColor: '#0F172A',
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Satisfaction (%)',
            data: metrics.priceRangeStats.map((p) => p.satisfactionPct),
            borderColor: '#F97316',
            backgroundColor: '#F97316',
            tension: 0.3,
            pointRadius: 5,
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
            ticks: { precision: 0, color: '#0F172A' },
            grid: { color: '#F1F5F9' },
          },
          y1: {
            position: 'right',
            min: 0,
            max: 100,
            ticks: { callback: (v) => `${v}%`, color: '#EA580C' },
            grid: { drawOnChartArea: false },
          },
        },
      },
    }),
    [metrics.priceRangeStats]
  );

  const feedbackRows = useMemo(() => {
    const q = feedbackSearch.trim().toLowerCase();
    return filteredSurveys.filter((s) => {
      if (feedbackStatusFilter !== 'All' && s.feedbackStatus !== feedbackStatusFilter) {
        return false;
      }
      if (!s.suggestions && !q) return true;
      if (q) {
        return (
          s.suggestions.toLowerCase().includes(q) ||
          s.favouriteItem.toLowerCase().includes(q) ||
          s.studentName.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filteredSurveys, feedbackStatusFilter, feedbackSearch]);

  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    try {
      const res = await updateFeedbackStatusApi(id, status);
      onFeedbackUpdated(res.survey);
    } catch {
      // ignore
    }
  };

  const handleGenerateSnapshot = async () => {
    setSavingReport(true);
    setReportBanner(null);
    try {
      const res = await createReportApi({
        title: `${reportPeriod} Canteen Analytics Report (${new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })})`,
        periodType: reportPeriod,
      });
      onReportCreated(res.report);
      setReportBanner(`Saved "${res.report.title}" to historical reports.`);
    } finally {
      setSavingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Admin Deep-Dive Analytics & Feedback Control
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredSurveys.length} matching records out of {surveys.length} stored responses
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="inline-flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All Time' },
                  { id: '7d', label: '7D' },
                  { id: '14d', label: '14D' },
                  { id: '30d', label: '30D' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    datePreset === p.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'All' | FoodCategory)}
              aria-label="Filter by food category"
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="All">All Categories</option>
              {FOOD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center gap-2 text-slate-600">
              <span>From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded-md"
              />
            </label>
            <label className="flex items-center gap-2 text-slate-600">
              <span>To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 border border-slate-300 rounded-md"
              />
            </label>
          </div>
        )}
      </div>

      {/* Quality/Taste/Hygiene + Price vs Popularity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCanvas
          title="Food Quality, Taste & Hygiene Analysis"
          subtitle="Average score (out of 5) across every food category"
          config={qualityRadarBarConfig}
          exportFilename="campusbite_quality_taste_hygiene"
          heightClass="h-72"
        />

        <ChartCanvas
          title="Price vs Popularity & Satisfaction"
          subtitle="Comparing student demand volume against satisfaction rate by price band"
          config={pricePopularityConfig}
          exportFilename="campusbite_price_vs_popularity"
          heightClass="h-72"
        />
      </div>

      {/* Top 5 Preferred & Least Preferred Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">
              Top 5 Most Preferred Dishes
            </h3>
            <ThumbsUp className="w-4 h-4 text-emerald-600" />
          </div>
          {metrics.topDishes.length === 0 ? (
            <p className="text-sm text-slate-500">No responses match current filter.</p>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 font-semibold">#</th>
                  <th className="py-2 font-semibold">Dish</th>
                  <th className="py-2 font-semibold">Category</th>
                  <th className="py-2 font-semibold text-right">Votes</th>
                  <th className="py-2 font-semibold text-right">Avg Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.topDishes.slice(0, 5).map((d, i) => (
                  <tr key={d.name}>
                    <td className="py-2.5 text-xs font-mono-tabular text-slate-400">
                      0{i + 1}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-900">{d.name}</td>
                    <td className="py-2.5 text-xs text-slate-600">{d.category}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono-tabular">
                      {d.mentions}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-mono-tabular text-emerald-700 font-semibold">
                      {d.avgRating.toFixed(2)}★
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">
              Least Preferred / Lowest-Rated Dishes
            </h3>
            <ThumbsDown className="w-4 h-4 text-red-600" />
          </div>
          {metrics.leastPreferredDishes.length === 0 ? (
            <p className="text-sm text-slate-500">No responses match current filter.</p>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 font-semibold">Dish</th>
                  <th className="py-2 font-semibold">Category</th>
                  <th className="py-2 font-semibold text-right">Votes</th>
                  <th className="py-2 font-semibold text-right">Avg Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.leastPreferredDishes.slice(0, 5).map((d) => (
                  <tr key={d.name}>
                    <td className="py-2.5 font-semibold text-slate-900">{d.name}</td>
                    <td className="py-2.5 text-xs text-slate-600">{d.category}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono-tabular">
                      {d.mentions}
                    </td>
                    <td
                      className={`py-2.5 text-right tabular-nums font-mono-tabular font-semibold ${
                        d.avgRating < 3.5 ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {d.avgRating.toFixed(2)}★
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Category Comparison + Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            Food Category Comparison Matrix
          </h3>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 font-semibold">Category</th>
                <th className="py-2 font-semibold text-right">Responses</th>
                <th className="py-2 font-semibold text-right">Share</th>
                <th className="py-2 font-semibold text-right">Quality</th>
                <th className="py-2 font-semibold text-right">Taste</th>
                <th className="py-2 font-semibold text-right">Hygiene</th>
                <th className="py-2 font-semibold text-right">Satisfaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.categoryStats.map((c) => (
                <tr key={c.category}>
                  <td className="py-2.5 font-semibold text-slate-900">{c.category}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular">{c.count}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular">{c.sharePct}%</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular">{c.avgQuality}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular">{c.avgTaste}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular">{c.avgHygiene}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular font-semibold text-emerald-700">
                    {c.satisfactionPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 overflow-x-auto">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            Department Preference Breakdown
          </h3>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 font-semibold">Department</th>
                <th className="py-2 font-semibold">Top Category</th>
                <th className="py-2 font-semibold text-right">Responses</th>
                <th className="py-2 font-semibold text-right">Avg Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.departmentStats.map((dept) => (
                <tr key={dept.department}>
                  <td className="py-2.5 font-semibold text-slate-900">{dept.department}</td>
                  <td className="py-2.5 text-xs text-slate-600">{dept.topCategory}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular">{dept.count}</td>
                  <td className="py-2.5 text-right tabular-nums font-mono-tabular font-semibold text-slate-900">
                    {dept.avgRating.toFixed(2)}★
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Daily/Weekly/Monthly Reports */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Daily, Weekly & Monthly Report Archive ({reports.length})
            </h3>
            <p className="text-xs text-slate-500">
              Capture persistent point-in-time snapshots of campus canteen metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={reportPeriod}
              onChange={(e) =>
                setReportPeriod(e.target.value as 'Daily' | 'Weekly' | 'Monthly')
              }
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="Daily">Daily Report</option>
              <option value="Weekly">Weekly Report</option>
              <option value="Monthly">Monthly Report</option>
            </select>
            <button
              type="button"
              disabled={savingReport}
              onClick={handleGenerateSnapshot}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-orange-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>{savingReport ? 'Saving...' : 'Save Snapshot'}</span>
            </button>
          </div>
        </div>

        {reportBanner && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{reportBanner}</span>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {reports.map((rep) => (
            <div
              key={rep.id}
              className="py-3 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">{rep.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {rep.periodType} · {new Date(rep.createdAt).toLocaleDateString()} · Top:{' '}
                  {rep.topCategory} ({rep.topPriceRange})
                </div>
                <p className="text-xs text-slate-600 mt-1">{rep.summaryNotes}</p>
              </div>
              <div className="flex items-center gap-4 text-xs shrink-0 tabular-nums font-mono-tabular">
                <span className="text-slate-700">{rep.totalResponses} responses</span>
                <span className="font-semibold text-slate-900">{rep.avgRating}★</span>
                <span className="font-semibold text-emerald-700">{rep.satisfactionPct}% sat</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Feedback Management */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Student Feedback & Complaint Management
              </h3>
              <p className="text-xs text-slate-500">
                Triage student suggestions and track operational follow-through
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={feedbackSearch}
              onChange={(e) => setFeedbackSearch(e.target.value)}
              placeholder="Search feedback text..."
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg w-48"
            />
            <select
              value={feedbackStatusFilter}
              onChange={(e) =>
                setFeedbackStatusFilter(e.target.value as 'All' | FeedbackStatus)
              }
              className="px-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Actioned">Actioned</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2 pr-3 font-semibold">Student / Dept</th>
                <th className="py-2 pr-3 font-semibold">Dish & Rating</th>
                <th className="py-2 pr-3 font-semibold">Feedback / Suggestion</th>
                <th className="py-2 font-semibold text-right">Workflow Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feedbackRows.slice(0, 20).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 text-xs">{row.studentName}</div>
                    <div className="text-[11px] text-slate-500">
                      {row.department} · {row.semester}
                    </div>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-slate-900">{row.favouriteItem}</div>
                    <div
                      className={`text-[11px] tabular-nums font-semibold ${
                        row.overallRating < 3.4 ? 'text-red-600' : 'text-emerald-700'
                      }`}
                    >
                      {row.overallRating.toFixed(1)}★ ({row.priceRange})
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-600 max-w-md">
                    {row.suggestions || <span className="text-slate-400">No comment provided</span>}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <select
                      value={row.feedbackStatus}
                      onChange={(e) =>
                        handleStatusChange(row.id, e.target.value as FeedbackStatus)
                      }
                      aria-label={`Feedback status for ${row.studentName}`}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer ${
                        row.feedbackStatus === 'Actioned'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : row.feedbackStatus === 'Reviewed'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="New">New</option>
                      <option value="Reviewed">Reviewed</option>
                      <option value="Actioned">Actioned</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
