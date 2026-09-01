import React, { useState } from 'react';
import { TECHNICAL_SECTIONS, SOURCES_CATALOG } from './data/technicalReferenceData';
import { ConfidenceLevel } from './types';
import { Interactive3DBlueprint } from './components/Interactive3DBlueprint';
import { SectionCard } from './components/SectionCard';
import { SourceTriageViewer } from './components/SourceTriageViewer';
import { CrewKinematicsStudio } from './components/CrewKinematicsStudio';
import { EnvironmentSpecsViewer } from './components/EnvironmentSpecsViewer';
import { ExportDossierModal } from './components/ExportDossierModal';
import {
  Anchor,
  Box,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Download,
  Search,
  Filter,
  Layers,
  Users,
  MapPin,
  FileText,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'ALL_SECTIONS' | '3D_BLUEPRINT' | 'SOURCE_TRIAGE' | 'CREW_KINEMATICS' | 'ENVIRONMENT'>('ALL_SECTIONS');
  const [selectedConfidence, setSelectedConfidence] = useState<ConfidenceLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Filter sections by confidence and query
  const filteredSections = TECHNICAL_SECTIONS.filter((sec) => {
    const matchesConfidence = selectedConfidence === 'ALL' || sec.confidence === selectedConfidence;
    const matchesQuery =
      searchQuery === '' ||
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.vietnameseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.specifications.some((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()) || s.value.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesConfidence && matchesQuery;
  });

  const confidenceCounts = {
    CONFIRMED: TECHNICAL_SECTIONS.filter((s) => s.confidence === 'CONFIRMED').length,
    APPROXIMATE: TECHNICAL_SECTIONS.filter((s) => s.confidence === 'APPROXIMATE').length,
    INFERRED: TECHNICAL_SECTIONS.filter((s) => s.confidence === 'INFERRED').length,
    UNKNOWN: TECHNICAL_SECTIONS.filter((s) => s.confidence === 'UNKNOWN').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Application Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/20 border border-sky-400/30">
              <Anchor className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide font-serif">
                  ĐUA GHE NGO SÓC TRĂNG
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                  VÔ ĐỊCH 2024
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Mẫu ghe (Asset): <strong className="text-sky-400">TUM_NUP_2_2024_MASTER_V2</strong> • Hồ sơ tham chiếu kỹ thuật
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-open-export"
              onClick={() => setIsExportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono font-bold shadow-lg shadow-sky-600/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất hồ sơ kỹ thuật (Export Dossier)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Metric Quick-Glance Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Ghe mục tiêu</span>
            <div className="text-sm font-bold text-white truncate">Tum Núp 2 (Đội Nam)</div>
            <div className="text-[11px] text-sky-400 font-mono">Chùa Bô Tum Răng Sây [XÁC THỰC]</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Kích thước tham chiếu (Dài x Rộng)</span>
            <div className="text-sm font-bold text-emerald-400 font-mono">30.20m x 1.12m</div>
            <div className="text-[11px] text-emerald-400 font-mono">[XÁC THỰC] Tỷ lệ 27.0:1</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Biên chế & Tải trọng</span>
            <div className="text-sm font-bold text-sky-400 font-mono">55 - 58 VĐV <span className="text-[10px] text-emerald-400">[XÁC THỰC]</span></div>
            <div className="text-[11px] text-amber-400 font-mono">Choán nước ~5.100 kg [SUY LUẬN]</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Nhịp chèo nước rút</span>
            <div className="text-sm font-bold text-amber-400 font-mono">95 - 125 SPM</div>
            <div className="text-[11px] text-slate-400 font-mono">Đường đua 1.200m Maspéro [XÁC THỰC]</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Kết cấu chịu lực dọc</span>
            <div className="text-sm font-bold text-purple-400 font-mono">Cây Kềm (Kềm Spring Truss)</div>
            <div className="text-[11px] text-emerald-400 font-mono">Cây Kềm: ĐÃ XÁC NHẬN</div>
          </div>
        </div>

        {/* 3D Interactive Orthographic CAD Blueprint Viewer Section */}
        <section id="cad-blueprint-section" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white font-serif tracking-wide">
                Bản vẽ 3D tương tác & Mô phỏng chuyển động (Kinematics)
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Dữ liệu chuẩn hóa phục vụ dựng 3D Blender & Unreal Engine 5
            </span>
          </div>

          <Interactive3DBlueprint />
        </section>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <button
              id="tab-all-sections"
              onClick={() => setActiveTab('ALL_SECTIONS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'ALL_SECTIONS'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tất cả 25 Hạng mục Kỹ thuật</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-sky-300">
                25
              </span>
            </button>

            <button
              id="tab-source-triage"
              onClick={() => setActiveTab('SOURCE_TRIAGE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'SOURCE_TRIAGE'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ma trận nguồn & Bằng chứng</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-sky-300">
                13
              </span>
            </button>

            <button
              id="tab-crew-kinematics"
              onClick={() => setActiveTab('CREW_KINEMATICS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'CREW_KINEMATICS'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Sơ đồ VĐV & Kỹ động học (Kinematics)</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-[10px] text-emerald-300">
                55
              </span>
            </button>

            <button
              id="tab-environment"
              onClick={() => setActiveTab('ENVIRONMENT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition ${
                activeTab === 'ENVIRONMENT'
                  ? 'bg-sky-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Đường đua Maspéro & Môi trường</span>
            </button>
          </div>

          {/* Search Box when on Sections Tab */}
          {activeTab === 'ALL_SECTIONS' && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-sections"
                type="text"
                placeholder="Tìm kiếm 25 thông số kỹ thuật..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
        </div>

        {/* Tab 1: All 25 Technical Sections */}
        {activeTab === 'ALL_SECTIONS' && (
          <div className="space-y-5">
            {/* Confidence Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Filter className="w-3.5 h-3.5 text-sky-400" />
                <span>Lọc theo độ tin cậy của bằng chứng:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="filter-confidence-all"
                  onClick={() => setSelectedConfidence('ALL')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition ${
                    selectedConfidence === 'ALL'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Tất cả (25)
                </button>

                <button
                  id="filter-confidence-confirmed"
                  onClick={() => setSelectedConfidence('CONFIRMED')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition ${
                    selectedConfidence === 'CONFIRMED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>XÁC THỰC ({confidenceCounts.CONFIRMED})</span>
                </button>

                <button
                  id="filter-confidence-approximate"
                  onClick={() => setSelectedConfidence('APPROXIMATE')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition ${
                    selectedConfidence === 'APPROXIMATE'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>ƯỚC TÍNH ({confidenceCounts.APPROXIMATE})</span>
                </button>

                <button
                  id="filter-confidence-inferred"
                  onClick={() => setSelectedConfidence('INFERRED')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition ${
                    selectedConfidence === 'INFERRED'
                      ? 'bg-sky-950 text-sky-300 border border-sky-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <HelpCircle className="w-3 h-3 text-sky-400" />
                  <span>SUY LUẬN ({confidenceCounts.INFERRED})</span>
                </button>

                <button
                  id="filter-confidence-unknown"
                  onClick={() => setSelectedConfidence('UNKNOWN')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition ${
                    selectedConfidence === 'UNKNOWN'
                      ? 'bg-rose-950 text-rose-300 border border-rose-500 font-bold'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>CHƯA XÁC ĐỊNH ({confidenceCounts.UNKNOWN})</span>
                </button>
              </div>
            </div>

            {/* Sections Stack */}
            <div className="space-y-4">
              {filteredSections.map((section) => (
                <SectionCard key={section.id} section={section} />
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Source Triage Matrix */}
        {activeTab === 'SOURCE_TRIAGE' && <SourceTriageViewer />}

        {/* Tab 3: Crew Kinematics Studio */}
        {activeTab === 'CREW_KINEMATICS' && <CrewKinematicsStudio />}

        {/* Tab 4: Environment Specs */}
        {activeTab === 'ENVIRONMENT' && <EnvironmentSpecsViewer />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-mono">
          NGO_ST_TUMNUP2_2024_MASTER • Hồ Sơ Kỹ Thuật 3D Ghe Ngo Khmer Sóc Trăng
        </p>
        <p className="text-[11px] text-slate-600 max-w-2xl mx-auto px-4">
          Nghiên cứu thị giác nghiêm ngặt được tổng hợp từ Cổng thông tin điện tử tỉnh Sóc Trăng, Báo Sóc Trăng, Cục Di sản Văn hóa Việt Nam và Mẫu vật Bảo tàng Dân tộc học Việt Nam.
        </p>
      </footer>

      {/* Export Modal */}
      <ExportDossierModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
}
