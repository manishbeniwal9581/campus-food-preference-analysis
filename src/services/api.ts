import {
  buildInitialSurveys,
  INITIAL_MENU_ITEMS,
  INITIAL_REPORTS,
} from '../data/seedData';
import {
  BootstrapPayload,
  FeedbackStatus,
  HistoricalReport,
  MenuItem,
  SurveyResponse,
} from '../types/campus';
import { answerQueryLocally } from '../utils/analytics';

const LOCAL_STORAGE_KEY = 'campusbite_ai_persistent_store_v1';

function saveLocalBackup(data: BootstrapPayload): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

function loadLocalBackup(): BootstrapPayload {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BootstrapPayload;
      if (Array.isArray(parsed.surveys) && Array.isArray(parsed.menuItems)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seed
  }
  const initial: BootstrapPayload = {
    surveys: buildInitialSurveys(),
    menuItems: INITIAL_MENU_ITEMS,
    reports: INITIAL_REPORTS,
    storageMode: 'Browser LocalStorage Fallback',
  };
  saveLocalBackup(initial);
  return initial;
}

export async function fetchBootstrapData(): Promise<BootstrapPayload> {
  try {
    const res = await fetch('/api/bootstrap');
    if (!res.ok) throw new Error('Bootstrap failed');
    const data = (await res.json()) as BootstrapPayload;
    saveLocalBackup(data);
    return data;
  } catch {
    return loadLocalBackup();
  }
}

export function syncLocalCache(
  surveys: SurveyResponse[],
  menuItems: MenuItem[],
  reports: HistoricalReport[],
  storageMode: string
): void {
  saveLocalBackup({ surveys, menuItems, reports, storageMode });
}

export async function submitSurveyApi(payload: {
  studentName: string;
  department: string;
  semester: string;
  preferredCategory: SurveyResponse['preferredCategory'];
  favouriteItem: string;
  priceRange: SurveyResponse['priceRange'];
  qualityRating: number;
  tasteRating: number;
  hygieneRating: number;
  suggestions: string;
}): Promise<{ survey: SurveyResponse; menuItems?: MenuItem[] }> {
  const res = await fetch('/api/surveys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save survey response');
  }
  return res.json();
}

export async function importSurveysApi(
  rows: Array<Partial<SurveyResponse>>
): Promise<{ importedCount: number; surveys: SurveyResponse[] }> {
  const res = await fetch('/api/surveys/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'CSV import failed');
  }
  return res.json();
}

export async function updateFeedbackStatusApi(
  id: string,
  feedbackStatus: FeedbackStatus
): Promise<{ survey: SurveyResponse }> {
  const res = await fetch(`/api/surveys/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedbackStatus }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update feedback status');
  }
  return res.json();
}

export async function deleteSurveyApi(id: string): Promise<void> {
  const res = await fetch(`/api/surveys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete survey entry');
  }
}

export async function resetDemoDataApi(): Promise<{ surveys: SurveyResponse[] }> {
  const res = await fetch('/api/surveys/reset-demo', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restore demo data');
  return res.json();
}

export async function createMenuItemApi(
  item: Omit<MenuItem, 'id' | 'priceRange' | 'reviewCount'>
): Promise<{ item: MenuItem }> {
  const res = await fetch('/api/menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add menu item');
  }
  return res.json();
}

export async function updateMenuItemApi(
  id: string,
  item: Partial<MenuItem>
): Promise<{ item: MenuItem }> {
  const res = await fetch(`/api/menu/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update menu item');
  }
  return res.json();
}

export async function deleteMenuItemApi(id: string): Promise<void> {
  const res = await fetch(`/api/menu/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete menu item');
  }
}

export async function createReportApi(payload: {
  title: string;
  periodType: 'Daily' | 'Weekly' | 'Monthly';
  summaryNotes?: string;
}): Promise<{ report: HistoricalReport }> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save report snapshot');
  return res.json();
}

export async function askCampusBiteAiApi(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  surveys: SurveyResponse[],
  menuItems: MenuItem[]
): Promise<{ answer: string; source: 'gemini' | 'local-analytics' }> {
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }),
    });
    if (!res.ok) throw new Error('AI API error');
    return await res.json();
  } catch {
    return {
      answer: answerQueryLocally(question, surveys, menuItems),
      source: 'local-analytics',
    };
  }
}
