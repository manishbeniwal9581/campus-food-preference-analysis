import React, { useMemo, useState } from 'react';
import { CheckCircle2, Send, Star, Trash2 } from 'lucide-react';
import {
  AppTab,
  FOOD_CATEGORIES,
  FoodCategory,
  MenuItem,
  PRICE_RANGES,
  PriceRange,
  SurveyResponse,
} from '../../types/campus';
import { submitSurveyApi, deleteSurveyApi } from '../../services/api';

interface SurveyFormViewProps {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
  onSurveyAdded: (survey: SurveyResponse, updatedMenu?: MenuItem[]) => void;
  onSurveyDeleted: (id: string) => void;
  onNavigate: (tab: AppTab) => void;
}

const DEPARTMENTS = [
  'CSE',
  'IT',
  'ECE',
  'Mechanical',
  'Civil',
  'Biotech',
  'MBA',
  'BBA',
];

const SEMESTERS = [
  'Sem 1',
  'Sem 2',
  'Sem 3',
  'Sem 4',
  'Sem 5',
  'Sem 6',
  'Sem 7',
  'Sem 8',
];

interface StarInputProps {
  label: string;
  helper: string;
  value: number;
  onChange: (val: number) => void;
}

const StarRatingInput: React.FC<StarInputProps> = ({
  label,
  helper,
  value,
  onChange,
}) => (
  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className="text-xs font-semibold text-orange-600 tabular-nums font-mono-tabular">
        {value > 0 ? `${value} / 5` : 'Not rated'}
      </span>
    </div>
    <p className="text-xs text-slate-500 mb-2.5">{helper}</p>
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${label}: ${star} stars`}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              active
                ? 'text-orange-500 bg-orange-50'
                : 'text-slate-300 hover:text-orange-400 hover:bg-white'
            }`}
          >
            <Star className={`w-5 h-5 ${active ? 'fill-orange-500' : ''}`} />
          </button>
        );
      })}
    </div>
  </div>
);

export const SurveyFormView: React.FC<SurveyFormViewProps> = ({
  surveys,
  menuItems,
  onSurveyAdded,
  onSurveyDeleted,
  onNavigate,
}) => {
  const [studentName, setStudentName] = useState('');
  const [department, setDepartment] = useState('CSE');
  const [semester, setSemester] = useState('Sem 5');
  const [preferredCategory, setPreferredCategory] =
    useState<FoodCategory>('South Indian');
  const [favouriteItem, setFavouriteItem] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>('₹50–₹100');
  const [qualityRating, setQualityRating] = useState(5);
  const [tasteRating, setTasteRating] = useState(5);
  const [hygieneRating, setHygieneRating] = useState(4);
  const [suggestions, setSuggestions] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    dish: string;
    overall: number;
  } | null>(null);

  const quickDishes = useMemo(() => {
    const inCat = menuItems
      .filter((m) => m.category === preferredCategory)
      .map((m) => m.name);
    return inCat.length > 0
      ? inCat
      : ['Masala Dosa', 'Paneer Butter Masala Thali', 'Veg Hakka Noodles'];
  }, [menuItems, preferredCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    if (!department.trim() || !semester.trim()) {
      setErrorMsg('Please select your department and semester.');
      return;
    }
    if (!favouriteItem.trim() || favouriteItem.trim().length < 2) {
      setErrorMsg('Please enter or select your favourite food item.');
      return;
    }
    if (qualityRating < 1 || tasteRating < 1 || hygieneRating < 1) {
      setErrorMsg('Please provide 1–5 star ratings for Quality, Taste, and Hygiene.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitSurveyApi({
        studentName: studentName.trim() || 'Anonymous Student',
        department,
        semester,
        preferredCategory,
        favouriteItem: favouriteItem.trim(),
        priceRange,
        qualityRating,
        tasteRating,
        hygieneRating,
        suggestions: suggestions.trim(),
      });
      onSurveyAdded(result.survey, result.menuItems);
      setSuccessInfo({
        dish: result.survey.favouriteItem,
        overall: result.survey.overallRating,
      });
      setStudentName('');
      setFavouriteItem('');
      setSuggestions('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit survey.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSurveyApi(id);
      onSurveyDeleted(id);
    } catch {
      // ignore
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left: Survey Form */}
      <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">
            Student Canteen Food Preference Survey
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Responses are persisted immediately and dynamically recalculate all dashboard charts, demand forecasts, and AI recommendations.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        {successInfo && (
          <div className="mb-5 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-950">
                  Survey response saved for {successInfo.dish} ({successInfo.overall}/5★)
                </div>
                <div className="text-xs text-emerald-800 mt-0.5">
                  Dashboard KPIs, charts, and AI analyst context have been updated.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              View Updated Charts
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Student Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="studentName"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Student Name (Optional)
              </label>
              <input
                id="studentName"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aarav Patel"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="department"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Department *
              </label>
              <select
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="semester"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Semester *
              </label>
              <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preferred Food Category */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Preferred Food Category *
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FOOD_CATEGORIES.map((category) => {
                const selected = preferredCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setPreferredCategory(category)}
                    className={`px-3 py-2.5 text-sm font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Favourite Food Item */}
          <div>
            <label
              htmlFor="favouriteItem"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Favourite Food Item *
            </label>
            <input
              id="favouriteItem"
              type="text"
              value={favouriteItem}
              onChange={(e) => setFavouriteItem(e.target.value)}
              placeholder={`Type a dish or pick below (e.g. ${quickDishes[0]})`}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
              required
            />
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-500 mr-1">Quick fill:</span>
              {quickDishes.map((dish) => (
                <button
                  key={dish}
                  type="button"
                  onClick={() => setFavouriteItem(dish)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    favouriteItem === dish
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {dish}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Price Range */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Preferred Price Range per Meal *
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRICE_RANGES.map((range) => {
                const selected = priceRange === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setPriceRange(range)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border text-center tabular-nums transition-colors cursor-pointer ${
                      selected
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {range}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Star Rating Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StarRatingInput
              label="Food Quality"
              helper="Freshness, portion & temperature"
              value={qualityRating}
              onChange={setQualityRating}
            />
            <StarRatingInput
              label="Taste Rating"
              helper="Flavor, spice & consistency"
              value={tasteRating}
              onChange={setTasteRating}
            />
            <StarRatingInput
              label="Hygiene Rating"
              helper="Counter cleanliness & prep"
              value={hygieneRating}
              onChange={setHygieneRating}
            />
          </div>

          {/* Suggestions */}
          <div>
            <label
              htmlFor="suggestions"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Suggestions, New Dish Requests & Feedback
            </label>
            <textarea
              id="suggestions"
              rows={3}
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              placeholder="Tell the canteen team what dishes to add (e.g., Cold Coffee, Momos, Rajma Chawal) or service issues to fix..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Composite score preview:{' '}
              <strong className="text-slate-900 tabular-nums">
                {((qualityRating + tasteRating + hygieneRating) / 3).toFixed(2)} / 5.0
              </strong>
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Saving Response...' : 'Submit Survey Response'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right: Recent Survey Feed */}
      <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Recent Stored Responses ({surveys.length})
            </h3>
            <p className="text-xs text-slate-500">
              Demo baseline records are labeled separately from live submissions
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto pr-1">
          {surveys.slice(0, 18).map((s) => (
            <div key={s.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {s.favouriteItem}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    <span>{s.studentName}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{s.department} {s.semester}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{s.preferredCategory}</span>
                    <span aria-hidden="true"> · </span>
                    <span className={s.isDemo ? 'text-slate-400' : 'text-emerald-700 font-medium'}>
                      {s.isDemo ? 'Demo Data' : 'Live Entry'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-900 tabular-nums font-mono-tabular">
                    {s.overallRating.toFixed(1)}★
                  </span>
                  {!s.isDemo && (
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      title="Delete entry"
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {s.suggestions && (
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  “{s.suggestions}”
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
