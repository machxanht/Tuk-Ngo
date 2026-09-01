import React, { useState } from 'react';
import { SOURCES_CATALOG } from '../data/technicalReferenceData';
import { SourceCategory } from '../types';
import { ExternalLink, CheckCircle, Search, Filter, ShieldCheck, Database, Anchor, Users, MapPin } from 'lucide-react';

export const SourceTriageViewer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<SourceCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'ALL', label: 'All 13 Sources', count: SOURCES_CATALOG.length, icon: Database },
    { id: 'A_TUMNUP2_2024', label: 'Group A: Tum Núp 2 (2024)', count: SOURCES_CATALOG.filter(s => s.category === 'A_TUMNUP2_2024').length, icon: ShieldCheck, color: 'text-sky-400' },
    { id: 'B_OTHER_NGO_BOATS', label: 'Group B: Other Ngo Boats', count: SOURCES_CATALOG.filter(s => s.category === 'B_OTHER_NGO_BOATS').length, icon: Anchor, color: 'text-amber-400' },
    { id: 'C_HISTORICAL_MUSEUM', label: 'Group C: Historical / Museum', count: SOURCES_CATALOG.filter(s => s.category === 'C_HISTORICAL_MUSEUM').length, icon: Database, color: 'text-emerald-400' },
    { id: 'D_RACE_ENVIRONMENT', label: 'Group D: Race Environment', count: SOURCES_CATALOG.filter(s => s.category === 'D_RACE_ENVIRONMENT').length, icon: MapPin, color: 'text-purple-400' },
  ];

  const filteredSources = SOURCES_CATALOG.filter((src) => {
    const matchesCategory = selectedCategory === 'ALL' || src.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      src.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      src.primarySubject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      src.evidenceNotes.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div id="source-triage-viewer" className="space-y-5">
      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`tab-source-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id as SourceCategory | 'ALL')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-lg'
                    : 'bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${cat.color || ''}`} />
                <span>{cat.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search verified evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            id={`source-card-${source.id}`}
            className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition shadow"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800">
                  Source #{source.id}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {source.categoryLabel}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white font-serif mb-1">
                {source.title}
              </h4>
              <p className="text-xs text-slate-400 mb-2">
                <strong className="text-slate-300">Subject:</strong> {source.primarySubject}
              </p>

              <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 mb-3">
                <p className="leading-relaxed text-[11px]">
                  <strong className="text-sky-400 font-mono">Evidence Verification:</strong> {source.evidenceNotes}
                </p>
              </div>

              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                  Verified Physical Features:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {source.verifiedFeatures.map((feat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                    >
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{feat}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/60">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between w-full px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-sky-900/30 text-sky-400 hover:text-sky-300 border border-slate-800 text-xs font-mono transition"
              >
                <span className="truncate pr-2">{source.url}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
