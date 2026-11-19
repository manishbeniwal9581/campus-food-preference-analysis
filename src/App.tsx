import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bot,
  ClipboardList,
  Database,
  LayoutDashboard,
  Lightbulb,
  Menu,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  buildInitialSurveys,
  INITIAL_MENU_ITEMS,
  INITIAL_REPORTS,
} from './data/seedData';
import { fetchBootstrapData, syncLocalCache } from './services/api';
import {
  AppTab,
  HistoricalReport,
  MenuItem,
  SurveyResponse,
} from './types/campus';
import { DashboardView } from './components/views/DashboardView';
import { SurveyFormView } from './components/views/SurveyFormView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { MenuManagementView } from './components/views/MenuManagementView';
import { RecommendationsView } from './components/views/RecommendationsView';
import { AdminAnalyticsView } from './components/views/AdminAnalyticsView';
import { ImportExportView } from './components/views/ImportExportView';

interface NavItem {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Main Dashboard', icon: LayoutDashboard },
  { id: 'survey', label: 'Student Survey', icon: ClipboardList },
  { id: 'assistant', label: 'CampusBite AI', icon: Bot },
  { id: 'menu', label: 'Menu Management', icon: UtensilsCrossed },
  { id: 'recommendations', label: 'Smart Insights', icon: Lightbulb },
  { id: 'analytics', label: 'Admin Analytics', icon: BarChart3 },
  { id: 'import-export', label: 'Import & Export', icon: Database },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  // Initialize immediately with seed data so there is zero unnecessary loading screen
  const [surveys, setSurveys] = useState<SurveyResponse[]>(() => buildInitialSurveys());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => INITIAL_MENU_ITEMS);
  const [reports, setReports] = useState<HistoricalReport[]>(() => INITIAL_REPORTS);
  const [storageMode, setStorageMode] = useState<string>('Express Persistent Store');

  useEffect(() => {
    let mounted = true;
    fetchBootstrapData().then((data) => {
      if (!mounted) return;
      setSurveys(data.surveys);
      setMenuItems(data.menuItems);
      setReports(data.reports);
      setStorageMode(data.storageMode);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Mirror state changes to localStorage cache
  useEffect(() => {
    syncLocalCache(surveys, menuItems, reports, storageMode);
  }, [surveys, menuItems, reports, storageMode]);

  const handleNavigate = (tab: AppTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
  };

  const handleSurveyAdded = (survey: SurveyResponse, updatedMenu?: MenuItem[]) => {
    setSurveys((prev) => [survey, ...prev]);
    if (updatedMenu) {
      setMenuItems(updatedMenu);
    }
  };

  const handleSurveyDeleted = (id: string) => {
    setSurveys((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFeedbackUpdated = (updated: SurveyResponse) => {
    setSurveys((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleReportCreated = (report: HistoricalReport) => {
    setReports((prev) => [report, ...prev]);
  };

  const activeNavMeta = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Dark Navy Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#0B1426] text-slate-100 border-r border-slate-800/80 z-30 print:hidden">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
            {!logoFailed ? (
              <img
                src="/src/assets/images/campusbite_logo_1795116790576.jpg"
                alt="CampusBite AI logo"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <UtensilsCrossed className="w-4 h-4 text-orange-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-extrabold tracking-tight text-white leading-tight">
              CampusBite <span className="text-orange-400">AI</span>
            </div>
            <div className="text-xs text-slate-400 truncate">
              Campus Canteen Intelligence
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary Sidebar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Responses</span>
            <span className="font-semibold text-white tabular-nums font-mono-tabular">
              {surveys.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Menu Items</span>
            <span className="font-semibold text-emerald-400 tabular-nums font-mono-tabular">
              {menuItems.length}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#0B1426] text-white flex flex-col h-full z-10">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
                  {!logoFailed ? (
                    <img
                      src="/src/assets/images/campusbite_logo_1795116790576.jpg"
                      alt="CampusBite AI logo"
                      referrerPolicy="no-referrer"
                      onError={() => setLogoFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <span className="text-lg font-extrabold truncate">
                  CampusBite <span className="text-orange-400">AI</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 lg:pl-64 print:pl-0 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-1 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-400">
                CampusBite AI <span aria-hidden="true">/</span>{' '}
                <span className="text-slate-700 font-medium">{activeNavMeta.label}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeNavMeta.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate('survey')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              + New Survey
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 print:p-0 max-w-[1440px] w-full mx-auto">
          {activeTab === 'overview' && (
            <DashboardView
              surveys={surveys}
              menuItems={menuItems}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'survey' && (
            <SurveyFormView
              surveys={surveys}
              menuItems={menuItems}
              onSurveyAdded={handleSurveyAdded}
              onSurveyDeleted={handleSurveyDeleted}
              onNavigate={handleNavigate}
            />
          )}
          {activeTab === 'assistant' && (
            <AiAssistantView surveys={surveys} menuItems={menuItems} />
          )}
          {activeTab === 'menu' && (
            <MenuManagementView
              menuItems={menuItems}
              onMenuChanged={setMenuItems}
            />
          )}
          {activeTab === 'recommendations' && (
            <RecommendationsView
              surveys={surveys}
              menuItems={menuItems}
              onMenuChanged={setMenuItems}
            />
          )}
          {activeTab === 'analytics' && (
            <AdminAnalyticsView
              surveys={surveys}
              menuItems={menuItems}
              reports={reports}
              onFeedbackUpdated={handleFeedbackUpdated}
              onReportCreated={handleReportCreated}
            />
          )}
          {activeTab === 'import-export' && (
            <ImportExportView
              surveys={surveys}
              menuItems={menuItems}
              storageMode={storageMode}
              onSurveysReplaced={setSurveys}
            />
          )}
        </main>
      </div>
    </div>
  );
}
