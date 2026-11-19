import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { importSurveysApi, resetDemoDataApi } from '../../services/api';
import { MenuItem, SurveyResponse } from '../../types/campus';
import {
  CsvParseResult,
  downloadAnalyticalReportCsv,
  downloadAnalyticalReportMarkdown,
  downloadSampleCsv,
  downloadSurveysCsv,
  parseSurveyCsv,
} from '../../utils/csv';

interface ImportExportViewProps {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
  storageMode: string;
  onSurveysReplaced: (nextSurveys: SurveyResponse[]) => void;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({
  surveys,
  menuItems,
  storageMode,
  onSurveysReplaced,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const handleFileSelected = async (file: File) => {
    setImportSuccess(null);
    setImportError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseResult(null);
      setImportError('Invalid file format. Please upload a .csv file.');
      return;
    }
    const text = await file.text();
    const parsed = parseSurveyCsv(text);
    setFileName(file.name);
    setParseResult(parsed);
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await importSurveysApi(parseResult.validRows);
      onSurveysReplaced(res.surveys);
      setImportSuccess(
        `Successfully imported ${res.importedCount} student survey responses. All dashboard charts and AI insights have been updated.`
      );
      setParseResult(null);
      setFileName('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import CSV rows.');
    } finally {
      setImporting(false);
    }
  };

  const handleRestoreDemo = async () => {
    setResetting(true);
    setImportSuccess(null);
    try {
      const res = await resetDemoDataApi();
      onSurveysReplaced(res.surveys);
      setImportSuccess(
        'Demo baseline dataset (54 fictional responses) verified and synced alongside your live entries.'
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Data Import, Export & Reporting Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active Persistence Layer: <span className="font-semibold text-slate-700">{storageMode}</span> · {surveys.length} total survey records stored
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestoreDemo}
          disabled={resetting}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{resetting ? 'Restoring...' : 'Verify / Restore Demo Dataset'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: CSV Upload & Validator */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Upload Survey Responses (CSV)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Validates headers, food categories, ₹ price ranges, and 1–5 star ratings before saving
              </p>
            </div>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Sample CSV</span>
            </button>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelected(file);
            }}
            className="border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-xl p-8 text-center bg-slate-50/70 transition-colors"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
            <div className="text-sm font-semibold text-slate-900">
              Drag & drop a survey CSV file here
            </div>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Required columns: department, semester, preferredCategory, favouriteItem, priceRange, qualityRating, tasteRating, hygieneRating
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Select CSV File
            </button>
          </div>

          {importError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{importSuccess}</span>
            </div>
          )}

          {parseResult && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-900">
                  Validation Preview: {fileName}
                </div>
                <div className="text-xs tabular-nums">
                  <span className="font-semibold text-emerald-700">
                    {parseResult.validRows.length} valid
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-semibold text-red-600">
                    {parseResult.errors.length} errors
                  </span>
                </div>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="text-xs font-bold text-red-900 mb-1">
                    Validation Errors Found:
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-xs text-red-800">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {parseResult.validRows.length > 0 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-600">
                    Ready to append {parseResult.validRows.length} validated responses to database.
                  </span>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleConfirmImport}
                    className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg cursor-pointer"
                  >
                    {importing
                      ? 'Importing...'
                      : `Import ${parseResult.validRows.length} Valid Rows`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Export Datasets & Analytical Reports */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Export Datasets & Analytical Reports
            </h3>

            <div className="divide-y divide-slate-100">
              <div className="py-3 first:pt-0 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Full Survey Dataset (CSV)
                    </div>
                    <p className="text-xs text-slate-500">
                      All {surveys.length} stored student responses with ratings & suggestions
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadSurveysCsv(surveys)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Download CSV
                </button>
              </div>

              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Executive Analytical Report (MD)
                    </div>
                    <p className="text-xs text-slate-500">
                      KPIs, category breakdown, dish requests, alerts & waste recommendations
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadAnalyticalReportMarkdown(surveys, menuItems)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Export Report
                </button>
              </div>

              <div className="py-3 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Aggregated Metrics Summary (CSV)
                    </div>
                    <p className="text-xs text-slate-500">
                      Spreadsheet-ready category, price-band & top-dish metrics
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadAnalyticalReportCsv(surveys, menuItems)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Download Summary
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5">
            <h4 className="text-sm font-bold mb-1.5">Chart PNG Exports</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every visualization across the Main Dashboard, Smart Recommendations, and Admin Analytics includes a dedicated <strong className="text-white">PNG</strong> export button in its top-right corner for inserting high-resolution charts directly into presentations and project reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
