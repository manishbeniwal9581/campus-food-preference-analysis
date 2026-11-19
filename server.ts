import 'dotenv/config';
import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  readDatabase,
  resetDemoDatabase,
  writeDatabase,
} from './server/db';
import {
  CATEGORY_IMAGES,
  inferPriceRange,
} from './src/data/seedData';
import {
  FOOD_CATEGORIES,
  FoodCategory,
  HistoricalReport,
  MenuItem,
  PRICE_RANGES,
  PriceRange,
  SurveyResponse,
} from './src/types/campus';
import {
  answerQueryLocally,
  computeDashboardMetrics,
  computeRecommendations,
} from './src/utils/analytics';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '5mb' }));

function isValidCategory(val: string): val is FoodCategory {
  return (FOOD_CATEGORIES as string[]).includes(val);
}

function isValidPriceRange(val: string): val is PriceRange {
  return (PRICE_RANGES as string[]).includes(val);
}

function clampRating(val: unknown): number {
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  return Math.min(5, Math.max(1, Math.round(num)));
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'CampusBite AI', timestamp: new Date().toISOString() });
});

// Bootstrap all persistent app data
app.get('/api/bootstrap', (_req, res) => {
  const db = readDatabase();
  res.json({
    surveys: db.surveys,
    menuItems: db.menuItems,
    reports: db.reports,
    storageMode: 'Express Persistent Store (data/campusbite-db.json)',
  });
});

// Create a new student survey response
app.post('/api/surveys', (req, res) => {
  const body = req.body ?? {};
  const preferredCategory = String(body.preferredCategory || '').trim();
  const favouriteItem = String(body.favouriteItem || '').trim();
  const priceRange = String(body.priceRange || '').trim();
  const department = String(body.department || '').trim();
  const semester = String(body.semester || '').trim();
  const studentName = String(body.studentName || '').trim() || 'Anonymous Student';
  const suggestions = String(body.suggestions || '').trim();

  const qualityRating = clampRating(body.qualityRating);
  const tasteRating = clampRating(body.tasteRating);
  const hygieneRating = clampRating(body.hygieneRating);

  if (!department || !semester || !favouriteItem) {
    res.status(400).json({ error: 'Department, semester, and favourite food item are required.' });
    return;
  }
  if (!isValidCategory(preferredCategory)) {
    res.status(400).json({ error: 'Please select a valid food category.' });
    return;
  }
  if (!isValidPriceRange(priceRange)) {
    res.status(400).json({ error: 'Please select a valid price range.' });
    return;
  }
  if (qualityRating < 1 || tasteRating < 1 || hygieneRating < 1) {
    res.status(400).json({ error: 'Quality, taste, and hygiene ratings must be between 1 and 5.' });
    return;
  }

  const overallRating = Number(((qualityRating + tasteRating + hygieneRating) / 3).toFixed(2));
  const newSurvey: SurveyResponse = {
    id: `survey-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentName,
    department,
    semester,
    preferredCategory,
    favouriteItem,
    priceRange,
    qualityRating,
    tasteRating,
    hygieneRating,
    overallRating,
    suggestions,
    createdAt: new Date().toISOString(),
    isDemo: false,
    feedbackStatus: 'New',
  };

  const db = readDatabase();
  db.surveys.unshift(newSurvey);

  // Sync matching menu item rating incrementally if item exists
  const matchedMenu = db.menuItems.find(
    (m) => m.name.toLowerCase() === favouriteItem.toLowerCase()
  );
  if (matchedMenu) {
    const newCount = matchedMenu.reviewCount + 1;
    matchedMenu.rating = Number(
      ((matchedMenu.rating * matchedMenu.reviewCount + overallRating) / newCount).toFixed(2)
    );
    matchedMenu.reviewCount = newCount;
  }

  writeDatabase(db);
  res.status(201).json({ survey: newSurvey, menuItems: db.menuItems });
});

// Bulk import validated CSV survey records
app.post('/api/surveys/import', (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) {
    res.status(400).json({ error: 'No valid survey rows provided for import.' });
    return;
  }

  const db = readDatabase();
  const imported: SurveyResponse[] = [];

  for (const row of rows) {
    const preferredCategory = String(row.preferredCategory || '').trim();
    const priceRange = String(row.priceRange || '').trim();
    const favouriteItem = String(row.favouriteItem || '').trim();
    const department = String(row.department || '').trim();
    const semester = String(row.semester || '').trim();
    if (
      !isValidCategory(preferredCategory) ||
      !isValidPriceRange(priceRange) ||
      !favouriteItem ||
      !department ||
      !semester
    ) {
      continue;
    }
    const q = clampRating(row.qualityRating);
    const t = clampRating(row.tasteRating);
    const h = clampRating(row.hygieneRating);
    if (q < 1 || t < 1 || h < 1) continue;

    const parsedDate = row.createdAt && !Number.isNaN(Date.parse(String(row.createdAt)))
      ? new Date(String(row.createdAt)).toISOString()
      : new Date().toISOString();

    imported.push({
      id: `csv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      studentName: String(row.studentName || '').trim() || 'Anonymous Student',
      department,
      semester,
      preferredCategory,
      favouriteItem,
      priceRange,
      qualityRating: q,
      tasteRating: t,
      hygieneRating: h,
      overallRating: Number(((q + t + h) / 3).toFixed(2)),
      suggestions: String(row.suggestions || '').trim(),
      createdAt: parsedDate,
      isDemo: false,
      feedbackStatus: 'New',
    });
  }

  if (imported.length === 0) {
    res.status(400).json({ error: 'None of the rows passed schema validation.' });
    return;
  }

  db.surveys = [...imported, ...db.surveys];
  writeDatabase(db);
  res.status(201).json({ importedCount: imported.length, surveys: db.surveys });
});

// Update feedback workflow status (New / Reviewed / Actioned)
app.patch('/api/surveys/:id/status', (req, res) => {
  const { id } = req.params;
  const status = String(req.body?.feedbackStatus || '');
  if (!['New', 'Reviewed', 'Actioned'].includes(status)) {
    res.status(400).json({ error: 'Invalid feedback status.' });
    return;
  }
  const db = readDatabase();
  const target = db.surveys.find((s) => s.id === id);
  if (!target) {
    res.status(404).json({ error: 'Survey response not found.' });
    return;
  }
  target.feedbackStatus = status as SurveyResponse['feedbackStatus'];
  writeDatabase(db);
  res.json({ survey: target });
});

// Delete a survey entry
app.delete('/api/surveys/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const prevLen = db.surveys.length;
  db.surveys = db.surveys.filter((s) => s.id !== id);
  if (db.surveys.length === prevLen) {
    res.status(404).json({ error: 'Survey response not found.' });
    return;
  }
  writeDatabase(db);
  res.json({ ok: true });
});

// Restore demo data
app.post('/api/surveys/reset-demo', (_req, res) => {
  const nextDb = resetDemoDatabase();
  res.json({ surveys: nextDb.surveys });
});

// Menu CRUD
app.post('/api/menu', (req, res) => {
  const body = req.body ?? {};
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const price = Number(body.price);
  if (!name || !isValidCategory(category) || Number.isNaN(price) || price <= 0) {
    res.status(400).json({ error: 'Valid item name, category, and positive price are required.' });
    return;
  }

  const newItem: MenuItem = {
    id: `menu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category,
    price: Math.round(price),
    priceRange: inferPriceRange(price),
    imageUrl: String(body.imageUrl || '').trim() || CATEGORY_IMAGES[category],
    availability: ['Available', 'Sold Out', 'Seasonal'].includes(body.availability)
      ? body.availability
      : 'Available',
    rating: Math.min(5, Math.max(1, Number(body.rating || 4.2))),
    reviewCount: Math.max(0, Number(body.reviewCount || 1)),
    isVeg: Boolean(body.isVeg ?? true),
    description: String(body.description || '').trim() || `${category} campus canteen specialty.`,
    prepTimeMins: Math.max(2, Number(body.prepTimeMins || 8)),
  };

  const db = readDatabase();
  db.menuItems.unshift(newItem);
  writeDatabase(db);
  res.status(201).json({ item: newItem });
});

app.put('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const db = readDatabase();
  const idx = db.menuItems.findIndex((m) => m.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Menu item not found.' });
    return;
  }

  const existing = db.menuItems[idx];
  const nextCategory = isValidCategory(String(body.category || ''))
    ? (body.category as FoodCategory)
    : existing.category;
  const nextPrice =
    body.price !== undefined && !Number.isNaN(Number(body.price)) && Number(body.price) > 0
      ? Math.round(Number(body.price))
      : existing.price;

  const updated: MenuItem = {
    ...existing,
    name: String(body.name ?? existing.name).trim() || existing.name,
    category: nextCategory,
    price: nextPrice,
    priceRange: inferPriceRange(nextPrice),
    imageUrl: String(body.imageUrl ?? existing.imageUrl).trim() || CATEGORY_IMAGES[nextCategory],
    availability: ['Available', 'Sold Out', 'Seasonal'].includes(body.availability)
      ? body.availability
      : existing.availability,
    rating:
      body.rating !== undefined && !Number.isNaN(Number(body.rating))
        ? Math.min(5, Math.max(1, Number(body.rating)))
        : existing.rating,
    isVeg: body.isVeg !== undefined ? Boolean(body.isVeg) : existing.isVeg,
    description: String(body.description ?? existing.description).trim(),
    prepTimeMins:
      body.prepTimeMins !== undefined && !Number.isNaN(Number(body.prepTimeMins))
        ? Math.max(2, Number(body.prepTimeMins))
        : existing.prepTimeMins,
  };

  db.menuItems[idx] = updated;
  writeDatabase(db);
  res.json({ item: updated });
});

app.delete('/api/menu/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const prevLen = db.menuItems.length;
  db.menuItems = db.menuItems.filter((m) => m.id !== id);
  if (db.menuItems.length === prevLen) {
    res.status(404).json({ error: 'Menu item not found.' });
    return;
  }
  writeDatabase(db);
  res.json({ ok: true });
});

// Save historical analytical report snapshot
app.post('/api/reports', (req, res) => {
  const db = readDatabase();
  const metrics = computeDashboardMetrics(db.surveys, db.menuItems);
  const recs = computeRecommendations(db.surveys, db.menuItems);
  const periodType = ['Daily', 'Weekly', 'Monthly'].includes(req.body?.periodType)
    ? req.body.periodType
    : 'Daily';

  const report: HistoricalReport = {
    id: `report-${Date.now()}`,
    title:
      String(req.body?.title || '').trim() ||
      `${periodType} Campus Food Intelligence Report (${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })})`,
    periodType,
    createdAt: new Date().toISOString(),
    totalResponses: metrics.totalResponses,
    avgRating: metrics.avgFoodRating,
    satisfactionPct: metrics.satisfactionPct,
    topCategory: metrics.mostPreferredCategory,
    topPriceRange: metrics.mostPopularPriceRange,
    summaryNotes:
      String(req.body?.summaryNotes || '').trim() ||
      `Top category: ${metrics.mostPreferredCategory} (${metrics.mostPreferredCategoryShare}%). Avg rating: ${metrics.avgFoodRating}/5. #1 new dish demand: ${recs.newDishProposals[0]?.dishName || 'Iced Cold Coffee'}.`,
  };

  db.reports.unshift(report);
  writeDatabase(db);
  res.status(201).json({ report });
});

// CampusBite AI Assistant endpoint (Gemini API + deterministic local data science fallback)
app.post('/api/ai/chat', async (req, res) => {
  const question = String(req.body?.question || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-6) : [];
  if (!question) {
    res.status(400).json({ error: 'Question cannot be empty.' });
    return;
  }

  const db = readDatabase();
  const metrics = computeDashboardMetrics(db.surveys, db.menuItems);
  const recs = computeRecommendations(db.surveys, db.menuItems);

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const answer = answerQueryLocally(question, db.surveys, db.menuItems);
    res.json({ answer, source: 'local-analytics' });
    return;
  }

  const liveDataSnapshot = {
    datasetCounts: {
      totalResponses: metrics.totalResponses,
      demoResponses: metrics.demoCount,
      realStudentEntries: metrics.realCount,
      menuItemCount: db.menuItems.length,
    },
    ratings: {
      overallAvg: metrics.avgFoodRating,
      qualityAvg: metrics.avgQuality,
      tasteAvg: metrics.avgTaste,
      hygieneAvg: metrics.avgHygiene,
      satisfactionPct: metrics.satisfactionPct,
    },
    categoryPreferences: metrics.categoryStats,
    priceRangeDistribution: metrics.priceRangeStats,
    topDishes: metrics.topDishes.slice(0, 8),
    leastPreferredDishes: metrics.leastPreferredDishes.slice(0, 5),
    lowRatedAlerts: recs.lowRatedAlerts,
    requestedNewDishesFromFeedback: recs.newDishProposals,
    complaintThemes: recs.majorComplaints,
    demandForecastNext7Days: recs.demandForecast,
    sampleRecentSuggestions: db.surveys
      .slice(0, 15)
      .map((s) => ({
        dept: s.department,
        category: s.preferredCategory,
        dish: s.favouriteItem,
        priceRange: s.priceRange,
        overall: s.overallRating,
        suggestion: s.suggestions,
      })),
  };

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const conversationContext = history
      .map((h: { role?: string; content?: string }) => `${h.role === 'user' ? 'Admin' : 'Assistant'}: ${h.content}`)
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `LIVE CANTEEN DATABASE METRICS (JSON):\n${JSON.stringify(liveDataSnapshot)}\n\nRECENT CONVERSATION:\n${conversationContext || 'None'}\n\nUSER QUESTION:\n${question}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'You are CampusBite AI Assistant, a senior campus food data scientist. Answer strictly using the LIVE CANTEEN DATABASE METRICS JSON provided. Cite exact counts, percentages, ratings, rupee price ranges, dish names, and student feedback evidence. Keep answers crisp, structured with clear bullet points, actionable, and concise (under 220 words). Never invent numbers not present in the dataset.',
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Empty model response');
    }
    res.json({ answer: text, source: 'gemini' });
  } catch (err) {
    console.warn('Gemini API unavailable, switching to local analytics engine:', err);
    const answer = answerQueryLocally(question, db.surveys, db.menuItems);
    res.json({ answer, source: 'local-analytics' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusBite AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
