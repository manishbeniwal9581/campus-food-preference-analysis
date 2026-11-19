import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import { ChatMessage, MenuItem, SurveyResponse } from '../../types/campus';
import { askCampusBiteAiApi } from '../../services/api';
import { computeDashboardMetrics } from '../../utils/analytics';

interface AiAssistantViewProps {
  surveys: SurveyResponse[];
  menuItems: MenuItem[];
}

const SUGGESTED_QUESTIONS = [
  'Which food category is most popular?',
  'What is the average student food rating?',
  'Which price range do students prefer?',
  'What food should the canteen introduce?',
  'How can the canteen improve student satisfaction?',
  'What are the major food-related complaints?',
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  surveys,
  menuItems,
}) => {
  const metrics = useMemo(
    () => computeDashboardMetrics(surveys, menuItems),
    [surveys, menuItems]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `Hello! I am CampusBite AI Assistant. I am currently connected to your live dataset of ${surveys.length} student survey responses and ${menuItems.length} menu items.\n\nAsk me anything about food category demand, average quality/taste/hygiene ratings, optimal student pricing, new dishes to introduce, or complaint root causes.`,
      timestamp: new Date().toISOString(),
      source: 'local-analytics',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const sendQuestion = async (questionText: string) => {
    const clean = questionText.trim();
    if (!clean || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: clean,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    const history = nextMessages.map((m) => ({ role: m.role, content: m.content }));
    const res = await askCampusBiteAiApi(clean, history, surveys, menuItems);

    const assistantMsg: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: res.answer,
      timestamp: new Date().toISOString(),
      source: res.source,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Main Chat Panel */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col h-[700px]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                CampusBite AI Assistant
              </h2>
              <p className="text-xs text-slate-500">
                Real-time natural-language analyst grounded in {metrics.totalResponses} stored survey responses
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-700 tabular-nums shrink-0">
            Live Data Synced
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/60">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-orange-400" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.content}
                  {!isUser && msg.source && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between gap-4">
                      <span>
                        Engine: {msg.source === 'gemini' ? 'Gemini AI Analyst' : 'Local Data Science Engine'}
                      </span>
                      <span className="tabular-nums">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-orange-400" />
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
                Analyzing {metrics.totalResponses} student survey responses...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-slate-200 bg-white rounded-b-xl flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about student preferences, menu pricing, or feedback..."
            className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Analyze</span>
          </button>
        </form>
      </div>

      {/* Right: Prompt Library + Live Grounding Context */}
      <div className="lg:col-span-4 space-y-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Recommended Analyst Prompts
          </h3>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={loading}
                onClick={() => sendQuestion(q)}
                className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-orange-50 hover:text-orange-800 border border-slate-200 hover:border-orange-200 rounded-lg transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-5">
          <h3 className="text-sm font-bold mb-3">Live Dataset Context Fed to AI</h3>
          <dl className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <dt className="text-slate-400">Survey Records</dt>
              <dd className="font-semibold tabular-nums font-mono-tabular">
                {metrics.totalResponses} ({metrics.realCount} live)
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <dt className="text-slate-400">Top Category</dt>
              <dd className="font-semibold text-orange-400">
                {metrics.mostPreferredCategory} ({metrics.mostPreferredCategoryShare}%)
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <dt className="text-slate-400">Composite Avg Rating</dt>
              <dd className="font-semibold tabular-nums font-mono-tabular">
                {metrics.avgFoodRating.toFixed(2)} / 5.0
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <dt className="text-slate-400">Satisfaction Rate</dt>
              <dd className="font-semibold text-emerald-400 tabular-nums font-mono-tabular">
                {metrics.satisfactionPct.toFixed(1)}%
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">Top Price Band</dt>
              <dd className="font-semibold tabular-nums font-mono-tabular">
                {metrics.mostPopularPriceRange}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
