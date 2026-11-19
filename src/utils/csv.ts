import {
  FOOD_CATEGORIES,
  FoodCategory,
  MenuItem,
  PRICE_RANGES,
  PriceRange,
  SurveyResponse,
} from '../types/campus';
import { computeDashboardMetrics, computeRecommendations } from './analytics';

export interface CsvParseResult {
  validRows: Array<{
    studentName: string;
    department: string;
    semester: string;
    preferredCategory: FoodCategory;
    favouriteItem: string;
    priceRange: PriceRange;
    qualityRating: number;
    tasteRating: number;
    hygieneRating: number;
    suggestions: string;
    createdAt?: string;
  }>;
  errors: string[];
  totalLines: number;
}

const REQUIRED_HEADERS = [
  'department',
  'semester',
  'preferredcategory',
  'favouriteitem',
  'pricerange',
  'qualityrating',
  'tasterating',
  'hygienerating',
];

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizePriceRange(raw: string): PriceRange | null {
  const clean = raw.replace(/\s+/g, '').replace(/-/g, '–');
  const exact = PRICE_RANGES.find(
    (p) => p.replace(/\s+/g, '').toLowerCase() === clean.toLowerCase()
  );
  if (exact) return exact;
  if (clean.includes('20') && clean.includes('50')) return '₹20–₹50';
  if (clean.includes('50') && clean.includes('100')) return '₹50–₹100';
  if (clean.includes('100') && clean.includes('150')) return '₹100–₹150';
  if (clean.includes('150')) return '₹150+';
  return null;
}

function normalizeCategory(raw: string): FoodCategory | null {
  const clean = raw.trim().toLowerCase();
  return FOOD_CATEGORIES.find((c) => c.toLowerCase() === clean) || null;
}

export function parseSurveyCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      validRows: [],
      errors: ['CSV file must contain a header row and at least one data row.'],
      totalLines: lines.length,
    };
  }

  const rawHeaders = parseCsvLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  const missingHeaders = REQUIRED_HEADERS.filter((req) => !rawHeaders.includes(req));
  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      errors: [
        `Missing required columns: ${missingHeaders.join(', ')}. Download the Sample CSV template for exact column names.`,
      ],
      totalLines: lines.length - 1,
    };
  }

  const idx = (name: string) => rawHeaders.indexOf(name);
  const errors: string[] = [];
  const validRows: CsvParseResult['validRows'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = parseCsvLine(lines[i]);
    if (cols.length < REQUIRED_HEADERS.length) {
      errors.push(`Row ${rowNum}: Incomplete column count (${cols.length} found).`);
      continue;
    }

    const studentName = idx('studentname') >= 0 ? cols[idx('studentname')] || 'Anonymous Student' : 'Anonymous Student';
    const department = cols[idx('department')] || '';
    const semester = cols[idx('semester')] || '';
    const categoryRaw = cols[idx('preferredcategory')] || '';
    const favouriteItem = cols[idx('favouriteitem')] || '';
    const priceRaw = cols[idx('pricerange')] || '';
    const qualityRating = Number(cols[idx('qualityrating')]);
    const tasteRating = Number(cols[idx('tasterating')]);
    const hygieneRating = Number(cols[idx('hygienerating')]);
    const suggestions = idx('suggestions') >= 0 ? cols[idx('suggestions')] || '' : '';
    const createdAt = idx('createdat') >= 0 ? cols[idx('createdat')] || undefined : undefined;

    if (!department || !semester || !favouriteItem) {
      errors.push(`Row ${rowNum}: Department, semester, and favouriteItem cannot be blank.`);
      continue;
    }

    const category = normalizeCategory(categoryRaw);
    if (!category) {
      errors.push(
        `Row ${rowNum}: Invalid preferredCategory "${categoryRaw}". Must be one of: ${FOOD_CATEGORIES.join(', ')}.`
      );
      continue;
    }

    const priceRange = normalizePriceRange(priceRaw);
    if (!priceRange) {
      errors.push(
        `Row ${rowNum}: Invalid priceRange "${priceRaw}". Must be one of: ${PRICE_RANGES.join(', ')}.`
      );
      continue;
    }

    if (
      [qualityRating, tasteRating, hygieneRating].some(
        (r) => Number.isNaN(r) || r < 1 || r > 5
      )
    ) {
      errors.push(`Row ${rowNum}: Quality, taste, and hygiene ratings must be numbers between 1 and 5.`);
      continue;
    }

    validRows.push({
      studentName,
      department,
      semester,
      preferredCategory: category,
      favouriteItem,
      priceRange,
      qualityRating: Math.round(qualityRating),
      tasteRating: Math.round(tasteRating),
      hygieneRating: Math.round(hygieneRating),
      suggestions,
      createdAt,
    });
  }

  return {
    validRows,
    errors,
    totalLines: lines.length - 1,
  };
}

function escapeCsvCell(val: string | number | boolean): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function triggerFileDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadSurveysCsv(surveys: SurveyResponse[]): void {
  const headers = [
    'id',
    'studentName',
    'department',
    'semester',
    'preferredCategory',
    'favouriteItem',
    'priceRange',
    'qualityRating',
    'tasteRating',
    'hygieneRating',
    'overallRating',
    'suggestions',
    'isDemo',
    'feedbackStatus',
    'createdAt',
  ];
  const lines = [
    headers.join(','),
    ...surveys.map((s) =>
      [
        s.id,
        s.studentName,
        s.department,
        s.semester,
        s.preferredCategory,
        s.favouriteItem,
        s.priceRange,
        s.qualityRating,
        s.tasteRating,
        s.hygieneRating,
        s.overallRating,
        s.suggestions,
        s.isDemo,
        s.feedbackStatus,
        s.createdAt,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];
  triggerFileDownload(
    `campusbite_surveys_${new Date().toISOString().slice(0, 10)}.csv`,
    lines.join('\n'),
    'text/csv;charset=utf-8;'
  );
}

export function downloadSampleCsv(): void {
  const sample = [
    'studentName,department,semester,preferredCategory,favouriteItem,priceRange,qualityRating,tasteRating,hygieneRating,suggestions',
    'Anjali Nair,CSE,Sem 5,South Indian,Masala Dosa,₹50–₹100,5,5,5,"Crispy dosa and fast service. Please add Cold Coffee."',
    'Rishabh Verma,ECE,Sem 3,North Indian,Paneer Butter Masala Thali,₹100–₹150,4,5,4,"Great portion size. Rajma Chawal would be awesome."',
    'Kriti Malhotra,MBA,Sem 2,Healthy Food,Quinoa & Grilled Tofu Bowl,₹100–₹150,5,4,5,"Love the clean ingredients. Add Whole Wheat Wraps."',
  ].join('\n');
  triggerFileDownload('campusbite_sample_survey_template.csv', sample, 'text/csv;charset=utf-8;');
}

export function downloadAnalyticalReportMarkdown(
  surveys: SurveyResponse[],
  menuItems: MenuItem[]
): void {
  const metrics = computeDashboardMetrics(surveys, menuItems);
  const recs = computeRecommendations(surveys, menuItems);

  const lines = [
    '# CampusBite AI — Campus Canteen & Food Preference Analytical Report',
    `Generated: ${new Date().toLocaleString()}`,
    `Dataset Size: ${metrics.totalResponses} responses (${metrics.realCount} live student entries, ${metrics.demoCount} demo baseline)`,
    '',
    '## Executive KPI Summary',
    `- Most Preferred Food Category: ${metrics.mostPreferredCategory} (${metrics.mostPreferredCategoryShare}% share)`,
    `- Average Overall Food Rating: ${metrics.avgFoodRating} / 5.00`,
    `- Quality / Taste / Hygiene Averages: ${metrics.avgQuality} / ${metrics.avgTaste} / ${metrics.avgHygiene}`,
    `- Student Satisfaction Rate (>= 3.8 stars): ${metrics.satisfactionPct}%`,
    `- Most Popular Price Range: ${metrics.mostPopularPriceRange} (${metrics.mostPopularPriceShare}% share)`,
    '',
    '## Category Breakdown',
    ...metrics.categoryStats.map(
      (c) =>
        `- ${c.category}: ${c.count} responses (${c.sharePct}%), Avg Rating ${c.avgOverall}/5, Satisfaction ${c.satisfactionPct}%`
    ),
    '',
    '## Top 5 Most Preferred Dishes',
    ...metrics.topDishes
      .slice(0, 5)
      .map((d, i) => `${i + 1}. ${d.name} (${d.category}) — ${d.mentions} votes, ${d.avgRating}/5 avg`),
    '',
    '## Recommended New Dishes (Text-Mined from Student Suggestions)',
    ...recs.newDishProposals.map(
      (n) => `- ${n.dishName} (${n.targetCategory}) — ${n.mentions} requests · Target Price: ${n.suggestedPrice}`
    ),
    '',
    '## Low-Rated Food Alerts',
    ...(recs.lowRatedAlerts.length > 0
      ? recs.lowRatedAlerts.map(
          (a) => `- ${a.itemName} (${a.avgRating}/5★): ${a.reason}`
        )
      : ['- No dishes flagged below 3.4 stars.']),
    '',
    '## Price & Waste Optimization Recommendations',
    `- Pricing Strategy: ${recs.optimalPriceAdvice}`,
    ...recs.wasteReductionActions.map((w) => `- ${w.title} (${w.impact}): ${w.detail}`),
  ];

  triggerFileDownload(
    `campusbite_analytical_report_${new Date().toISOString().slice(0, 10)}.md`,
    lines.join('\n'),
    'text/markdown;charset=utf-8;'
  );
}

export function downloadAnalyticalReportCsv(
  surveys: SurveyResponse[],
  menuItems: MenuItem[]
): void {
  const metrics = computeDashboardMetrics(surveys, menuItems);
  const rows = [
    ['Section', 'Metric / Category', 'Count / Share', 'Avg Quality', 'Avg Taste', 'Avg Hygiene', 'Overall / Satisfaction'].join(','),
    ...metrics.categoryStats.map((c) =>
      [
        'Category Analysis',
        c.category,
        `${c.count} (${c.sharePct}%)`,
        c.avgQuality,
        c.avgTaste,
        c.avgHygiene,
        `${c.avgOverall}/5 (${c.satisfactionPct}%)`,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
    ...metrics.priceRangeStats.map((p) =>
      [
        'Price Range Analysis',
        p.priceRange,
        `${p.count} (${p.sharePct}%)`,
        '-',
        '-',
        '-',
        `${p.avgRating}/5 (${p.satisfactionPct}%)`,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
    ...metrics.topDishes.slice(0, 8).map((d) =>
      [
        'Top Dishes',
        d.name,
        `${d.mentions} votes`,
        '-',
        '-',
        '-',
        `${d.avgRating}/5 (Demand ${d.demandScore})`,
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];
  triggerFileDownload(
    `campusbite_summary_metrics_${new Date().toISOString().slice(0, 10)}.csv`,
    rows.join('\n'),
    'text/csv;charset=utf-8;'
  );
}
