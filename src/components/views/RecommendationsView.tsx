import React, { useMemo, useState } from 'react';
import { ChartConfiguration } from 'chart.js';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Flame,
  IndianRupee,
  Leaf,
  PlusCircle,
  TrendingUp,
} from 'lucide-react';
import { CATEGORY_IMAGES } from '../../data/seedData';
import { createMenuItemApi } from '../../services/api';
import { MenuItem, SurveyResponse } from '../../types/campus';
import {
  computeDashboardMetrics,
  computeRecommendations,
  NewDishSuggestion,
} from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';

interface RecommendationsViewProps {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
  onMenuChanged: (nextItems: MenuItem[]) => void;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({
  surveys,
  menuItems,
  onMenuChanged,
}) => {
  const [addedNotice, setAddedNotice] = useState<string | null>(null);
  const [addingDish, setAddingDish] = useState<string | null>(null);

  const metrics = useMemo(
    () => computeDashboardMetrics(surveys, menuItems),
    [surveys, menuItems]
  );

  const recs = useMemo(
    () => computeRecommendations(surveys, menuItems),
    [surveys, menuItems]
  );

  const forecastChartConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: recs.demandForecast.map((d) => `${d.dayLabel} (${d.dateStr})`),
        datasets: [
          {
            label: 'Projected Orders',
            data: recs.demandForecast.map((d) => d.predictedOrders),
            backgroundColor: '#0F172A',
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Model Confidence (%)',
            data: recs.demandForecast.map((d) => d.confidencePct),
            borderColor: '#16A34A',
            backgroundColor: '#16A34A',
            tension: 0.3,
            pointRadius: 4,
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
          x: { grid: { display: false }, ticks: { color: '#334155', font: { size: 11 } } },
          y: {
            beginAtZero: true,
            grid: { color: '#F1F5F9' },
            ticks: { color: '#0F172A' },
          },
          y1: {
            position: 'right',
            min: 60,
            max: 100,
            grid: { drawOnChartArea: false },
            ticks: { callback: (v) => `${v}%`, color: '#16A34A' },
          },
        },
      },
    }),
    [recs.demandForecast]
  );

  const handleQuickAddProposal = async (proposal: NewDishSuggestion) => {
    setAddingDish(proposal.dishName);
    setAddedNotice(null);
    const priceMatch = proposal.suggestedPrice.match(/\d+/);
    const numericPrice = priceMatch ? Number(priceMatch[0]) + 10 : 60;
    try {
      const res = await createMenuItemApi({
        name: proposal.dishName,
        category: proposal.targetCategory,
        price: numericPrice,
        availability: 'Available',
        rating: 4.5,
        isVeg: true,
        imageUrl: CATEGORY_IMAGES[proposal.targetCategory],
        description: `Introduced via CampusBite AI Recommendation Engine (${proposal.mentions} student survey requests).`,
        prepTimeMins: 7,
      });
      onMenuChanged([res.item, ...menuItems]);
      setAddedNotice(`${proposal.dishName} added to the active canteen menu at ₹${numericPrice}.`);
    } finally {
      setAddingDish(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Smart Recommendations, Demand Forecast & Menu Planning
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Data-backed actions derived from {metrics.totalResponses} student evaluations and {menuItems.length} menu SKUs
          </p>
        </div>
        <div className="text-xs font-medium text-slate-600 tabular-nums">
          Sweet-Spot Price Band:{' '}
          <span className="font-bold text-slate-900">{metrics.mostPopularPriceRange}</span>
        </div>
      </div>

      {addedNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{addedNotice}</span>
        </div>
      )}

      {/* Row 1: Most Demanded Items & New Dish Proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Most Demanded */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Most Demanded Food Items
              </h3>
              <p className="text-xs text-slate-500">
                Ranked by composite demand score (mention velocity × student rating)
              </p>
            </div>
            <Flame className="w-4 h-4 text-orange-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-2 font-semibold">Dish</th>
                  <th className="py-2 font-semibold">Category</th>
                  <th className="py-2 font-semibold text-right">Votes</th>
                  <th className="py-2 font-semibold text-right">Rating</th>
                  <th className="py-2 font-semibold text-right">Demand Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recs.mostDemanded.map((dish) => (
                  <tr key={dish.name} className="hover:bg-slate-50">
                    <td className="py-2.5 font-semibold text-slate-900">{dish.name}</td>
                    <td className="py-2.5 text-xs text-slate-600">{dish.category}</td>
                    <td className="py-2.5 text-right tabular-nums font-mono-tabular">
                      {dish.mentions}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-mono-tabular text-emerald-700 font-semibold">
                      {dish.avgRating.toFixed(1)}★
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-mono-tabular font-bold text-slate-900">
                      {dish.demandScore.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* New Dishes to Introduce */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Recommended New Dishes to Introduce
              </h3>
              <p className="text-xs text-slate-500">
                Extracted via text-mining student feedback & suggestion logs
              </p>
            </div>
            <PlusCircle className="w-4 h-4 text-emerald-600" />
          </div>

          {recs.newDishProposals.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">
              All top requested student suggestions have already been added to the canteen menu!
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recs.newDishProposals.map((proposal) => (
                <div key={proposal.dishName} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">
                        {proposal.dishName}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {proposal.targetCategory} · {proposal.mentions} requests · Suggested{' '}
                        <span className="font-semibold text-slate-700">
                          {proposal.suggestedPrice}
                        </span>
                      </div>
                      {proposal.evidenceSnippets[0] && (
                        <p className="text-xs text-slate-600 mt-1 italic">
                          {proposal.evidenceSnippets[0]}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={addingDish === proposal.dishName}
                      onClick={() => handleQuickAddProposal(proposal)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-orange-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {addingDish === proposal.dishName ? 'Adding...' : '+ Add to Menu'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Low Rated Alerts + Price & Waste Reduction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Low Rated & Unpopular */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">
              Unpopular & Low-Rated Items
            </h3>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          {recs.lowRatedAlerts.length === 0 ? (
            <p className="text-sm text-slate-500">No items flagged below 3.4★.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recs.lowRatedAlerts.map((alert) => (
                <li key={alert.itemName} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {alert.itemName}
                    </span>
                    <span className="text-xs font-bold text-red-700 tabular-nums">
                      {alert.avgRating.toFixed(1)}★
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {alert.category}
                    {alert.price ? ` · ₹${alert.price}` : ''} · {alert.mentions} reviews
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{alert.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pricing & Menu Improvement */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">
                Suitable Price Range Strategy
              </h3>
              <IndianRupee className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {recs.optimalPriceAdvice}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
              Priority Menu Improvements
            </h4>
            <ul className="space-y-2.5">
              {recs.menuImprovements.map((imp) => (
                <li key={imp.area} className="text-xs">
                  <div className="font-semibold text-slate-900">
                    {imp.area} ·{' '}
                    <span
                      className={
                        imp.priority === 'High' ? 'text-orange-600' : 'text-slate-600'
                      }
                    >
                      {imp.priority} Priority
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{imp.action}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Waste Reduction */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">
              Food Waste Reduction Plan
            </h3>
            <Leaf className="w-4 h-4 text-emerald-600" />
          </div>
          <ul className="divide-y divide-slate-100">
            {recs.wasteReductionActions.map((w) => (
              <li key={w.title} className="py-3 first:pt-0 last:pb-0">
                <div className="text-sm font-semibold text-slate-900">{w.title}</div>
                <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                  {w.impact}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{w.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Row 3: 7-Day Food Demand Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ChartCanvas
            title="7-Day Food Demand Prediction"
            subtitle="Projected daily canteen order volume using survey velocity and weekday seasonality"
            config={forecastChartConfig}
            exportFilename="campusbite_7day_demand_forecast"
            heightClass="h-72"
          />
        </div>
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900">
              Daily Prep Allocation Forecast
            </h3>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-semibold">Day</th>
                  <th className="py-2 font-semibold">Lead Category</th>
                  <th className="py-2 font-semibold text-right">Est. Orders</th>
                  <th className="py-2 font-semibold text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recs.demandForecast.map((day) => (
                  <tr key={day.dateStr}>
                    <td className="py-2.5 font-semibold text-slate-900">
                      {day.dayLabel} · {day.dateStr}
                    </td>
                    <td className="py-2.5 text-slate-600">{day.topCategory}</td>
                    <td className="py-2.5 text-right font-bold tabular-nums font-mono-tabular text-slate-900">
                      {day.predictedOrders}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                      {day.confidencePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: Smart Weekly Menu Planning */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Smart Weekly Menu Planner (Mon–Sat Rotation)
            </h3>
            <p className="text-xs text-slate-500">
              Balanced daily specials combining top-rated staples, high-demand new dishes, and waste-minimization prep
            </p>
          </div>
          <CalendarDays className="w-4 h-4 text-slate-700" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-2.5 pr-4 font-semibold">Day</th>
                <th className="py-2.5 pr-4 font-semibold">Breakfast</th>
                <th className="py-2.5 pr-4 font-semibold">Lunch Feature</th>
                <th className="py-2.5 pr-4 font-semibold">Evening Snack</th>
                <th className="py-2.5 font-semibold">Data Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recs.weeklyMenuPlan.map((row) => (
                <tr key={row.day} className="hover:bg-slate-50">
                  <td className="py-3 pr-4 font-bold text-slate-900 whitespace-nowrap">
                    {row.day}
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{row.breakfastSpecial}</td>
                  <td className="py-3 pr-4 text-slate-900 font-medium">{row.lunchSpecial}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.eveningSnack}</td>
                  <td className="py-3 text-xs text-slate-500">{row.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
