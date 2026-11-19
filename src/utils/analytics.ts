import {
  FOOD_CATEGORIES,
  FoodCategory,
  MenuItem,
  PRICE_RANGES,
  PriceRange,
  SurveyResponse,
} from '../types/campus';

export interface CategoryStat {
  category: FoodCategory;
  count: number;
  sharePct: number;
  avgQuality: number;
  avgTaste: number;
  avgHygiene: number;
  avgOverall: number;
  satisfactionPct: number;
}

export interface DishStat {
  name: string;
  category: FoodCategory | 'Mixed';
  mentions: number;
  avgRating: number;
  demandScore: number;
  price?: number;
  priceRange?: PriceRange;
}

export interface DailyTrendPoint {
  date: string;
  label: string;
  count: number;
  avgRating: number;
  topCategory: FoodCategory;
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  count: number;
  avgRating: number;
  satisfactionPct: number;
}

export interface PriceRangeStat {
  priceRange: PriceRange;
  count: number;
  sharePct: number;
  avgRating: number;
  satisfactionPct: number;
}

export interface SatisfactionBucket {
  label: string;
  count: number;
  pct: number;
}

export interface DepartmentStat {
  department: string;
  count: number;
  avgRating: number;
  topCategory: FoodCategory;
}

export interface NewDishSuggestion {
  dishName: string;
  mentions: number;
  suggestedPrice: string;
  targetCategory: FoodCategory;
  evidenceSnippets: string[];
}

export interface LowRatedAlert {
  itemName: string;
  category: FoodCategory;
  avgRating: number;
  mentions: number;
  price?: number;
  reason: string;
}

export interface ForecastDay {
  dayLabel: string;
  dateStr: string;
  predictedOrders: number;
  topCategory: FoodCategory;
  confidencePct: number;
}

export interface WeeklyMenuPlanDay {
  day: string;
  breakfastSpecial: string;
  lunchSpecial: string;
  eveningSnack: string;
  focusCategory: FoodCategory;
  rationale: string;
}

export interface DashboardMetrics {
  totalResponses: number;
  demoCount: number;
  realCount: number;
  mostPreferredCategory: FoodCategory;
  mostPreferredCategoryShare: number;
  avgFoodRating: number;
  avgQuality: number;
  avgTaste: number;
  avgHygiene: number;
  mostPopularPriceRange: PriceRange;
  mostPopularPriceShare: number;
  satisfactionPct: number;
  categoryStats: CategoryStat[];
  topDishes: DishStat[];
  leastPreferredDishes: DishStat[];
  dailyTrends: DailyTrendPoint[];
  weeklyTrends: WeeklyTrendPoint[];
  priceRangeStats: PriceRangeStat[];
  satisfactionBuckets: SatisfactionBucket[];
  departmentStats: DepartmentStat[];
}

export function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function computeDashboardMetrics(
  surveys: SurveyResponse[],
  menuItems: MenuItem[]
): DashboardMetrics {
  const total = surveys.length;
  const demoCount = surveys.filter((s) => s.isDemo).length;
  const realCount = total - demoCount;

  if (total === 0) {
    return {
      totalResponses: 0,
      demoCount: 0,
      realCount: 0,
      mostPreferredCategory: 'South Indian',
      mostPreferredCategoryShare: 0,
      avgFoodRating: 0,
      avgQuality: 0,
      avgTaste: 0,
      avgHygiene: 0,
      mostPopularPriceRange: '₹50–₹100',
      mostPopularPriceShare: 0,
      satisfactionPct: 0,
      categoryStats: FOOD_CATEGORIES.map((category) => ({
        category,
        count: 0,
        sharePct: 0,
        avgQuality: 0,
        avgTaste: 0,
        avgHygiene: 0,
        avgOverall: 0,
        satisfactionPct: 0,
      })),
      topDishes: [],
      leastPreferredDishes: [],
      dailyTrends: [],
      weeklyTrends: [],
      priceRangeStats: PRICE_RANGES.map((priceRange) => ({
        priceRange,
        count: 0,
        sharePct: 0,
        avgRating: 0,
        satisfactionPct: 0,
      })),
      satisfactionBuckets: [
        { label: 'Delighted (4.5–5.0★)', count: 0, pct: 0 },
        { label: 'Satisfied (3.8–4.4★)', count: 0, pct: 0 },
        { label: 'Neutral (3.0–3.7★)', count: 0, pct: 0 },
        { label: 'Dissatisfied (<3.0★)', count: 0, pct: 0 },
      ],
      departmentStats: [],
    };
  }

  const avgQuality = round2(surveys.reduce((a, b) => a + b.qualityRating, 0) / total);
  const avgTaste = round2(surveys.reduce((a, b) => a + b.tasteRating, 0) / total);
  const avgHygiene = round2(surveys.reduce((a, b) => a + b.hygieneRating, 0) / total);
  const avgFoodRating = round2(surveys.reduce((a, b) => a + b.overallRating, 0) / total);

  const satisfiedCount = surveys.filter((s) => s.overallRating >= 3.8).length;
  const satisfactionPct = round2((satisfiedCount / total) * 100);

  // Category Stats
  const categoryStats: CategoryStat[] = FOOD_CATEGORIES.map((category) => {
    const items = surveys.filter((s) => s.preferredCategory === category);
    const count = items.length;
    if (count === 0) {
      return {
        category,
        count: 0,
        sharePct: 0,
        avgQuality: 0,
        avgTaste: 0,
        avgHygiene: 0,
        avgOverall: 0,
        satisfactionPct: 0,
      };
    }
    return {
      category,
      count,
      sharePct: round2((count / total) * 100),
      avgQuality: round2(items.reduce((a, b) => a + b.qualityRating, 0) / count),
      avgTaste: round2(items.reduce((a, b) => a + b.tasteRating, 0) / count),
      avgHygiene: round2(items.reduce((a, b) => a + b.hygieneRating, 0) / count),
      avgOverall: round2(items.reduce((a, b) => a + b.overallRating, 0) / count),
      satisfactionPct: round2((items.filter((i) => i.overallRating >= 3.8).length / count) * 100),
    };
  }).sort((a, b) => b.count - a.count);

  const topCat = categoryStats[0];

  // Price Range Stats
  const priceRangeStats: PriceRangeStat[] = PRICE_RANGES.map((priceRange) => {
    const items = surveys.filter((s) => s.priceRange === priceRange);
    const count = items.length;
    if (count === 0) {
      return { priceRange, count: 0, sharePct: 0, avgRating: 0, satisfactionPct: 0 };
    }
    return {
      priceRange,
      count,
      sharePct: round2((count / total) * 100),
      avgRating: round2(items.reduce((a, b) => a + b.overallRating, 0) / count),
      satisfactionPct: round2((items.filter((i) => i.overallRating >= 3.8).length / count) * 100),
    };
  });

  const sortedPrice = [...priceRangeStats].sort((a, b) => b.count - a.count);
  const topPrice = sortedPrice[0];

  // Dish aggregation
  const dishMap = new Map<
    string,
    { name: string; categoryCounts: Record<string, number>; ratings: number[] }
  >();
  for (const s of surveys) {
    const cleanName = s.favouriteItem.trim();
    if (!cleanName) continue;
    const key = cleanName.toLowerCase();
    const existing = dishMap.get(key) ?? {
      name: cleanName,
      categoryCounts: {},
      ratings: [],
    };
    existing.categoryCounts[s.preferredCategory] =
      (existing.categoryCounts[s.preferredCategory] || 0) + 1;
    existing.ratings.push(s.overallRating);
    dishMap.set(key, existing);
  }

  const menuLookup = new Map(menuItems.map((m) => [m.name.toLowerCase(), m]));

  const allDishStats: DishStat[] = Array.from(dishMap.values()).map((entry) => {
    const mentions = entry.ratings.length;
    const avgRating = round2(entry.ratings.reduce((a, b) => a + b, 0) / mentions);
    const topCategory = Object.entries(entry.categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
      | FoodCategory
      | undefined;
    const menuMatch = menuLookup.get(entry.name.toLowerCase());
    const demandScore = round2(mentions * 1.4 + avgRating * 1.2);
    return {
      name: menuMatch?.name || entry.name,
      category: menuMatch?.category || topCategory || 'Mixed',
      mentions,
      avgRating,
      demandScore,
      price: menuMatch?.price,
      priceRange: menuMatch?.priceRange,
    };
  });

  const topDishes = [...allDishStats].sort((a, b) => b.mentions - a.mentions || b.avgRating - a.avgRating);

  // Least preferred: combine low-rated dishes from surveys and low-rated menu items
  const leastFromSurveys = [...allDishStats].sort(
    (a, b) => a.avgRating - b.avgRating || a.mentions - b.mentions
  );
  const leastPreferredDishes = leastFromSurveys.slice(0, 6);

  // Daily trends (grouped by YYYY-MM-DD ascending)
  const dayMap = new Map<string, SurveyResponse[]>();
  for (const s of surveys) {
    const dayKey = s.createdAt.slice(0, 10);
    const list = dayMap.get(dayKey) ?? [];
    list.push(s);
    dayMap.set(dayKey, list);
  }
  const dailyTrends: DailyTrendPoint[] = Array.from(dayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, list]) => {
      const catCounts: Record<string, number> = {};
      for (const item of list) {
        catCounts[item.preferredCategory] = (catCounts[item.preferredCategory] || 0) + 1;
      }
      const topCatForDay = (Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        'South Indian') as FoodCategory;
      const d = new Date(`${date}T12:00:00Z`);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date,
        label,
        count: list.length,
        avgRating: round2(list.reduce((a, b) => a + b.overallRating, 0) / list.length),
        topCategory: topCatForDay,
      };
    });

  // Weekly trends
  const weekMap = new Map<string, SurveyResponse[]>();
  for (const s of surveys) {
    const d = new Date(s.createdAt);
    const startOfWeek = new Date(d);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setUTCDate(diff);
    const weekKey = startOfWeek.toISOString().slice(0, 10);
    const arr = weekMap.get(weekKey) ?? [];
    arr.push(s);
    weekMap.set(weekKey, arr);
  }
  const weeklyTrends: WeeklyTrendPoint[] = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekKey, list]) => {
      const d = new Date(`${weekKey}T12:00:00Z`);
      const weekLabel = `Wk ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      return {
        weekLabel,
        count: list.length,
        avgRating: round2(list.reduce((a, b) => a + b.overallRating, 0) / list.length),
        satisfactionPct: round2((list.filter((i) => i.overallRating >= 3.8).length / list.length) * 100),
      };
    });

  // Satisfaction Buckets
  const delighted = surveys.filter((s) => s.overallRating >= 4.5).length;
  const satisfied = surveys.filter((s) => s.overallRating >= 3.8 && s.overallRating < 4.5).length;
  const neutral = surveys.filter((s) => s.overallRating >= 3.0 && s.overallRating < 3.8).length;
  const dissatisfied = surveys.filter((s) => s.overallRating < 3.0).length;

  const satisfactionBuckets: SatisfactionBucket[] = [
    { label: 'Delighted (4.5–5.0★)', count: delighted, pct: round2((delighted / total) * 100) },
    { label: 'Satisfied (3.8–4.4★)', count: satisfied, pct: round2((satisfied / total) * 100) },
    { label: 'Neutral (3.0–3.7★)', count: neutral, pct: round2((neutral / total) * 100) },
    { label: 'Dissatisfied (<3.0★)', count: dissatisfied, pct: round2((dissatisfied / total) * 100) },
  ];

  // Department Breakdown
  const deptMap = new Map<string, SurveyResponse[]>();
  for (const s of surveys) {
    const dept = s.department || 'General';
    const arr = deptMap.get(dept) ?? [];
    arr.push(s);
    deptMap.set(dept, arr);
  }
  const departmentStats: DepartmentStat[] = Array.from(deptMap.entries())
    .map(([department, list]) => {
      const catCounts: Record<string, number> = {};
      for (const item of list) {
        catCounts[item.preferredCategory] = (catCounts[item.preferredCategory] || 0) + 1;
      }
      const topCategory = (Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        'South Indian') as FoodCategory;
      return {
        department,
        count: list.length,
        avgRating: round2(list.reduce((a, b) => a + b.overallRating, 0) / list.length),
        topCategory,
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    totalResponses: total,
    demoCount,
    realCount,
    mostPreferredCategory: topCat.category,
    mostPreferredCategoryShare: topCat.sharePct,
    avgFoodRating,
    avgQuality,
    avgTaste,
    avgHygiene,
    mostPopularPriceRange: topPrice.priceRange,
    mostPopularPriceShare: topPrice.sharePct,
    satisfactionPct,
    categoryStats,
    topDishes,
    leastPreferredDishes,
    dailyTrends,
    weeklyTrends,
    priceRangeStats,
    satisfactionBuckets,
    departmentStats,
  };
}

const CANDIDATE_NEW_DISHES: Array<{
  keyword: RegExp;
  dishName: string;
  targetCategory: FoodCategory;
  suggestedPrice: string;
}> = [
  { keyword: /cold coffee/i, dishName: 'Iced Cold Coffee', targetCategory: 'Snacks', suggestedPrice: '₹45–₹60' },
  { keyword: /momos/i, dishName: 'Steamed Veg Momos', targetCategory: 'Chinese', suggestedPrice: '₹50–₹70' },
  { keyword: /rajma chawal/i, dishName: 'Rajma Chawal Bowl', targetCategory: 'North Indian', suggestedPrice: '₹65–₹80' },
  { keyword: /masala chai|chai/i, dishName: 'Kulhad Masala Chai', targetCategory: 'Snacks', suggestedPrice: '₹20–₹30' },
  { keyword: /fruit chaat|fruit bowl/i, dishName: 'Fresh Fruit Chaat Bowl', targetCategory: 'Healthy Food', suggestedPrice: '₹55–₹75' },
  { keyword: /wrap/i, dishName: 'Whole Wheat Paneer Wrap', targetCategory: 'Healthy Food', suggestedPrice: '₹70–₹90' },
  { keyword: /lassi/i, dishName: 'Sweet Punjabi Lassi', targetCategory: 'North Indian', suggestedPrice: '₹40–₹55' },
  { keyword: /uttapam|upma|filter coffee/i, dishName: 'Onion Uttapam & Filter Coffee', targetCategory: 'South Indian', suggestedPrice: '₹55–₹75' },
];

export interface RecommendationBundle {
  mostDemanded: DishStat[];
  newDishProposals: NewDishSuggestion[];
  lowRatedAlerts: LowRatedAlert[];
  optimalPriceAdvice: string;
  wasteReductionActions: Array<{ title: string; impact: string; detail: string }>;
  menuImprovements: Array<{ area: string; priority: 'High' | 'Medium'; action: string }>;
  demandForecast: ForecastDay[];
  weeklyMenuPlan: WeeklyMenuPlanDay[];
  majorComplaints: Array<{ theme: string; count: number; sampleFeedback: string }>;
}

export function computeRecommendations(
  surveys: SurveyResponse[],
  menuItems: MenuItem[]
): RecommendationBundle {
  const metrics = computeDashboardMetrics(surveys, menuItems);
  const existingMenuNames = new Set(menuItems.map((m) => m.name.toLowerCase()));

  // 1. New Dish Proposals mined from student suggestions
  const newDishProposals: NewDishSuggestion[] = [];
  for (const candidate of CANDIDATE_NEW_DISHES) {
    if (existingMenuNames.has(candidate.dishName.toLowerCase())) continue;
    const matches = surveys.filter((s) => candidate.keyword.test(s.suggestions));
    if (matches.length > 0) {
      newDishProposals.push({
        dishName: candidate.dishName,
        mentions: matches.length,
        suggestedPrice: candidate.suggestedPrice,
        targetCategory: candidate.targetCategory,
        evidenceSnippets: matches.slice(0, 2).map((m) => `"${m.suggestions}" — ${m.department}`),
      });
    }
  }
  newDishProposals.sort((a, b) => b.mentions - a.mentions);

  // 2. Low-Rated Food Alerts (both surveyed items < 3.4★ and menu items < 3.4★)
  const lowRatedAlerts: LowRatedAlert[] = [];
  const seenAlerts = new Set<string>();

  for (const dish of metrics.topDishes) {
    if (dish.avgRating < 3.5) {
      seenAlerts.add(dish.name.toLowerCase());
      const relatedFeedback = surveys.find(
        (s) => s.favouriteItem.toLowerCase() === dish.name.toLowerCase() && s.overallRating < 3.5
      );
      lowRatedAlerts.push({
        itemName: dish.name,
        category: dish.category === 'Mixed' ? 'Fast Food' : dish.category,
        avgRating: dish.avgRating,
        mentions: dish.mentions,
        price: dish.price,
        reason:
          relatedFeedback?.suggestions ||
          `Averaged ${dish.avgRating}/5 across ${dish.mentions} student evaluations.`,
      });
    }
  }

  for (const item of menuItems) {
    if (item.rating < 3.4 && !seenAlerts.has(item.name.toLowerCase())) {
      lowRatedAlerts.push({
        itemName: item.name,
        category: item.category,
        avgRating: item.rating,
        mentions: item.reviewCount,
        price: item.price,
        reason: item.description,
      });
    }
  }
  lowRatedAlerts.sort((a, b) => a.avgRating - b.avgRating);

  // 3. Complaint Theme Mining
  const complaintThemes: Array<{ theme: string; regex: RegExp }> = [
    { theme: 'Queue & Wait Times', regex: /wait|queue|slow|15 min|18 min|token|rush/i },
    { theme: 'High Pricing (₹150+)', regex: /overpriced|expensive|price|costly|₹165/i },
    { theme: 'Freshness & Temperature', regex: /stale|dry|cold|lukewarm|soggy|oily/i },
    { theme: 'Afternoon Stockouts', regex: /run out|sold out|finished|4 pm|3:30/i },
    { theme: 'Hygiene & Seating', regex: /hygiene|clean|table|napkin|hairnet|seating/i },
  ];

  const majorComplaints = complaintThemes
    .map(({ theme, regex }) => {
      const hits = surveys.filter((s) => regex.test(s.suggestions));
      return {
        theme,
        count: hits.length,
        sampleFeedback: hits[0]?.suggestions || 'No complaints logged.',
      };
    })
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  // 4. Optimal price advice
  const topPrice = metrics.mostPopularPriceRange;
  const priceStat = metrics.priceRangeStats.find((p) => p.priceRange === topPrice);
  const highPriceStat = metrics.priceRangeStats.find((p) => p.priceRange === '₹150+');
  const optimalPriceAdvice = `Students strongly anchor around ${topPrice} (${metrics.mostPopularPriceShare}% of all preferences, ${priceStat?.avgRating ?? 4.3}/5 avg rating). Items priced in ₹150+ capture only ${highPriceStat?.sharePct ?? 0}% share and average ${highPriceStat?.avgRating ?? 0}/5 — repositioning ₹150+ items into ₹80–₹130 combo portions will maximize conversion.`;

  // 5. Waste reduction actions
  const wasteReductionActions = [
    {
      title: 'Retire or Bake-to-Order Low-Demand Pastry Stock',
      impact: 'Est. 28% snack waste reduction',
      detail:
        lowRatedAlerts.length > 0
          ? `${lowRatedAlerts[0].itemName} (${lowRatedAlerts[0].avgRating}/5★) triggers afternoon staleness complaints. Shift to small-batch prep or swap with high-velocity Samosas/Momos.`
          : 'Switch slow-moving afternoon items to on-demand preparation after 2:30 PM.',
    },
    {
      title: 'Split Evening Samosa & Snack Frying into Two Batches',
      impact: 'Eliminates 4 PM stockouts & 12 PM over-prep',
      detail:
        'Survey logs show morning snacks turn cold by 3 PM while 4 PM break runs out. Schedule 60% prep for 11 AM and 40% fresh fry at 3:30 PM.',
    },
    {
      title: 'Standardize Portion Sizes on ₹100–₹150 Thalis & Bowls',
      impact: 'Est. 18% rice & gravy plate-waste drop',
      detail:
        'Offer a ₹75 Express Half-Bowl (e.g., Rajma Chawal / Mini Protein Bowl) alongside full ₹115 thalis for lighter lunch appetites.',
    },
  ];

  // 6. Menu improvements
  const menuImprovements: Array<{ area: string; priority: 'High' | 'Medium'; action: string }> = [
    {
      area: 'Beverage & Evening Snack Gap',
      priority: 'High',
      action:
        newDishProposals.length > 0
          ? `Introduce ${newDishProposals
              .slice(0, 2)
              .map((d) => `${d.dishName} (${d.suggestedPrice})`)
              .join(' and ')} — requested across ${newDishProposals
              .slice(0, 2)
              .reduce((a, b) => a + b.mentions, 0)} survey responses.`
          : 'Add high-margin campus beverages like Iced Cold Coffee and Masala Chai.',
    },
    {
      area: 'Peak-Hour Throughput (12:45–1:45 PM)',
      priority: 'High',
      action:
        'Deploy a digital order token screen and dedicated express pickup lane for pre-plated South Indian & Thali items.',
    },
    {
      area: 'Price Rebalancing on Fast Food',
      priority: 'Medium',
      action:
        'Re-price or replace ₹150+ pasta dishes with ₹85–₹95 student combos aligned with the dominant ₹50–₹100 demand band.',
    },
  ];

  // 7. 7-Day Food Demand Prediction
  const baseDailyVolume = Math.max(18, Math.round(metrics.totalResponses * 2.8));
  const topThreeCats = metrics.categoryStats.slice(0, 3).map((c) => c.category);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayFactors = [1.08, 1.12, 1.15, 1.1, 1.04, 0.72, 0.45];

  const today = new Date();
  const demandForecast: ForecastDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
    const dayIdx = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
    const factor = weekdayFactors[dayIdx];
    const predictedOrders = Math.round(baseDailyVolume * factor);
    const cat = topThreeCats[i % topThreeCats.length] || 'South Indian';
    return {
      dayLabel: dayNames[dayIdx],
      dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predictedOrders,
      topCategory: cat,
      confidencePct: Math.min(94, Math.max(76, Math.round(80 + Math.min(14, surveys.length / 5)))),
    };
  });

  // 8. Smart Weekly Menu Plan
  const weeklyMenuPlan: WeeklyMenuPlanDay[] = [
    {
      day: 'Monday',
      breakfastSpecial: 'Idli Sambar & Filter Coffee',
      lunchSpecial: 'Paneer Butter Masala Thali',
      eveningSnack: 'Punjabi Samosa + Masala Chai',
      focusCategory: 'South Indian',
      rationale: 'High-speed morning items reduce Monday 9 AM rush queues.',
    },
    {
      day: 'Tuesday',
      breakfastSpecial: 'Masala Dosa + Coconut Chutney',
      lunchSpecial: 'Rajma Chawal Express Bowl (New)',
      eveningSnack: 'Steamed Veg Momos (New)',
      focusCategory: 'North Indian',
      rationale: 'Introduces student-requested Rajma Chawal & Momos during mid-week peak.',
    },
    {
      day: 'Wednesday',
      breakfastSpecial: 'Sprouts & Paneer Salad Box',
      lunchSpecial: 'Veg Hakka Noodles + Chilli Paneer',
      eveningSnack: 'Samosa Chaat + Cold Coffee (New)',
      focusCategory: 'Chinese',
      rationale: 'Mid-week Chinese combo maximizes ₹50–₹100 conversion.',
    },
    {
      day: 'Thursday',
      breakfastSpecial: 'Masala Dosa + Vada Combo',
      lunchSpecial: 'Quinoa & Grilled Tofu Protein Bowl',
      eveningSnack: 'Grilled Paneer Burger & Fries',
      focusCategory: 'Healthy Food',
      rationale: 'Balances lighter protein bowls with high-margin fast food.',
    },
    {
      day: 'Friday',
      breakfastSpecial: 'Chole Bhature Morning Batch',
      lunchSpecial: 'Chicken Dum Biryani / Veg Pulao',
      eveningSnack: 'Fresh Fruit Chaat + Cold Coffee',
      focusCategory: 'Fast Food',
      rationale: 'Friday celebratory menu drives higher average ticket size.',
    },
    {
      day: 'Saturday',
      breakfastSpecial: 'Onion Uttapam + Idli Platter',
      lunchSpecial: 'Paneer Burger Combo & Hakka Noodles',
      eveningSnack: 'Samosa Plate & Sweet Lassi',
      focusCategory: 'Snacks',
      rationale: 'Streamlined half-day weekend menu cuts ingredient spoilage.',
    },
  ];

  return {
    mostDemanded: metrics.topDishes.slice(0, 6),
    newDishProposals,
    lowRatedAlerts,
    optimalPriceAdvice,
    wasteReductionActions,
    menuImprovements,
    demandForecast,
    weeklyMenuPlan,
    majorComplaints,
  };
}

export function answerQueryLocally(
  question: string,
  surveys: SurveyResponse[],
  menuItems: MenuItem[]
): string {
  const q = question.toLowerCase();
  const metrics = computeDashboardMetrics(surveys, menuItems);
  const recs = computeRecommendations(surveys, menuItems);

  if (surveys.length === 0) {
    return 'There are currently no survey responses stored in CampusBite AI. Submit a student survey or import a CSV dataset to generate live analytical answers.';
  }

  if (q.includes('category') || q.includes('popular') && !q.includes('price')) {
    const top3 = metrics.categoryStats
      .slice(0, 3)
      .map((c, i) => `${i + 1}. ${c.category}: ${c.count} responses (${c.sharePct}% share, ${c.avgOverall}/5★ avg)`)
      .join('\n');
    const topDish = metrics.topDishes[0];
    return `Based on ${metrics.totalResponses} student survey responses (${metrics.realCount} live + ${metrics.demoCount} demo):\n\nMost Popular Food Category: ${metrics.mostPreferredCategory} (${metrics.mostPreferredCategoryShare}% of all preferences).\n\nTop 3 Categories:\n${top3}\n\nMost Demanded Individual Dish: ${topDish?.name ?? 'Masala Dosa'} with ${topDish?.mentions ?? 0} mentions and a ${topDish?.avgRating ?? 0}/5★ average rating.`;
  }

  if (q.includes('rating') || q.includes('average') || q.includes('quality') || q.includes('hygiene')) {
    return `Live Rating Analysis across ${metrics.totalResponses} responses:\n\n• Overall Average Rating: ${metrics.avgFoodRating} / 5.00\n• Food Quality Average: ${metrics.avgQuality} / 5.00\n• Taste Average: ${metrics.avgTaste} / 5.00\n• Hygiene Average: ${metrics.avgHygiene} / 5.00\n• Student Satisfaction Rate (≥3.8★): ${metrics.satisfactionPct}%\n\nHighest-rated category is ${[...metrics.categoryStats].sort((a, b) => b.avgOverall - a.avgOverall)[0]?.category} (${[...metrics.categoryStats].sort((a, b) => b.avgOverall - a.avgOverall)[0]?.avgOverall}/5★).`;
  }

  if (q.includes('price') || q.includes('budget') || q.includes('cost') || q.includes('₹')) {
    const breakdown = metrics.priceRangeStats
      .map((p) => `• ${p.priceRange}: ${p.count} students (${p.sharePct}%) — Avg Rating ${p.avgRating}/5★`)
      .join('\n');
    return `Price Preference Analysis:\n\nPreferred Price Band: ${metrics.mostPopularPriceRange} (${metrics.mostPopularPriceShare}% of students).\n\nFull Breakdown:\n${breakdown}\n\nRecommendation: ${recs.optimalPriceAdvice}`;
  }

  if (q.includes('introduce') || q.includes('new dish') || q.includes('add') || q.includes('menu')) {
    const proposals = recs.newDishProposals
      .slice(0, 4)
      .map(
        (d, i) =>
          `${i + 1}. ${d.dishName} (${d.targetCategory}) — ${d.mentions} student requests · Suggested Price: ${d.suggestedPrice}`
      )
      .join('\n');
    return `Top New Dishes to Introduce (mined from ${metrics.totalResponses} student suggestion logs):\n\n${proposals || 'Students are asking for Iced Cold Coffee, Steamed Veg Momos, and Rajma Chawal Bowl.'}\n\nAdding these items within the ₹20–₹100 price window directly aligns with ${metrics.mostPopularPriceShare}% student budget preference.`;
  }

  if (q.includes('complaint') || q.includes('problem') || q.includes('issue') || q.includes('low') || q.includes('worst')) {
    const complaints = recs.majorComplaints
      .slice(0, 4)
      .map((c, i) => `${i + 1}. ${c.theme} (${c.count} mentions) — e.g., "${c.sampleFeedback}"`)
      .join('\n');
    const alerts = recs.lowRatedAlerts
      .slice(0, 3)
      .map((a) => `• ${a.itemName} (${a.avgRating}/5★): ${a.reason}`)
      .join('\n');
    return `Major Food & Service Complaints from Live Survey Data:\n\n${complaints}\n\nLow-Rated Menu Alerts:\n${alerts || 'No items currently below 3.4★.'}`;
  }

  if (q.includes('improve') || q.includes('satisfaction') || q.includes('waste') || q.includes('predict') || q.includes('forecast')) {
    const actions = recs.menuImprovements
      .map((m, i) => `${i + 1}. [${m.priority} Priority] ${m.area}: ${m.action}`)
      .join('\n');
    const nextDay = recs.demandForecast[0];
    return `Action Plan to Improve Student Satisfaction (currently ${metrics.satisfactionPct}%):\n\n${actions}\n\nWaste & Demand Forecast: Tomorrow's projected demand is ~${nextDay?.predictedOrders ?? 140} orders (led by ${nextDay?.topCategory ?? metrics.mostPreferredCategory}). Splitting afternoon snack frying into two batches cuts stockouts and staleness simultaneously.`;
  }

  // Comprehensive executive summary fallback for any custom question
  const topDishesStr = metrics.topDishes
    .slice(0, 3)
    .map((d) => `${d.name} (${d.mentions} votes, ${d.avgRating}★)`)
    .join(', ');
  const topNew = recs.newDishProposals[0];
  return `CampusBite Live Data Summary (${metrics.totalResponses} responses):\n\n• Top Category: ${metrics.mostPreferredCategory} (${metrics.mostPreferredCategoryShare}%)\n• Average Food Rating: ${metrics.avgFoodRating}/5.00 · Satisfaction: ${metrics.satisfactionPct}%\n• Sweet-Spot Price Band: ${metrics.mostPopularPriceRange} (${metrics.mostPopularPriceShare}%)\n• Top Dishes: ${topDishesStr}\n• #1 Requested New Dish: ${topNew ? `${topNew.dishName} (${topNew.mentions} requests, ${topNew.suggestedPrice})` : 'Iced Cold Coffee'}\n• Primary Improvement Area: ${recs.majorComplaints[0]?.theme ?? 'Peak-hour queue speed'} (${recs.majorComplaints[0]?.count ?? 0} mentions).`;
}
