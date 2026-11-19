import fs from 'fs';
import path from 'path';
import {
  buildInitialSurveys,
  INITIAL_MENU_ITEMS,
  INITIAL_REPORTS,
} from '../src/data/seedData';
import {
  HistoricalReport,
  MenuItem,
  SurveyResponse,
} from '../src/types/campus';

export interface CampusDatabase {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
  reports: HistoricalReport[];
  updatedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'campusbite-db.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createInitialDb(): CampusDatabase {
  return {
    surveys: buildInitialSurveys(),
    menuItems: INITIAL_MENU_ITEMS,
    reports: INITIAL_REPORTS,
    updatedAt: new Date().toISOString(),
  };
}

export function readDatabase(): CampusDatabase {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<CampusDatabase>;
    const surveys = Array.isArray(parsed.surveys) ? parsed.surveys : buildInitialSurveys();
    const menuItems = Array.isArray(parsed.menuItems) ? parsed.menuItems : INITIAL_MENU_ITEMS;
    const reports = Array.isArray(parsed.reports) ? parsed.reports : INITIAL_REPORTS;
    return {
      surveys,
      menuItems,
      reports,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    const fallback = createInitialDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

export function writeDatabase(db: CampusDatabase): CampusDatabase {
  ensureDataDir();
  const nextDb: CampusDatabase = {
    ...db,
    updatedAt: new Date().toISOString(),
  };
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(nextDb, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
  return nextDb;
}

export function resetDemoDatabase(): CampusDatabase {
  const current = readDatabase();
  const realSurveys = current.surveys.filter((s) => !s.isDemo);
  const demoSurveys = buildInitialSurveys();
  return writeDatabase({
    surveys: [...realSurveys, ...demoSurveys],
    menuItems: current.menuItems.length > 0 ? current.menuItems : INITIAL_MENU_ITEMS,
    reports: current.reports.length > 0 ? current.reports : INITIAL_REPORTS,
    updatedAt: new Date().toISOString(),
  });
}
