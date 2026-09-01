import React from 'react';
import { TechnicalSection, ConfidenceLevel } from '../types';
import { SOURCES_CATALOG } from '../data/technicalReferenceData';
import { CheckCircle2, AlertTriangle, HelpCircle, FileText, Box, Cpu, Eye, ExternalLink } from 'lucide-react';

interface SectionCardProps {
  section: TechnicalSection;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  isExpanded = true,
  onToggleExpand,
}) => {
  const getBadgeStyle = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'CONFIRMED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/40';
      case 'APPROXIMATE':
        return 'bg-amber-950 text-amber-300 border-amber-500/40';
      case 'INFERRED':
        return 'bg-sky-950 text-sky-300 border-sky-500/40';
      case 'UNKNOWN':
        return 'bg-rose-950 text-rose-300 border-rose-500/40';
    }
  };

  const getBadgeLabel = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'CONFIRMED':
        return 'XÁC THỰC (CONFIRMED)';
      case 'APPROXIMATE':
        return 'ƯỚC TÍNH (APPROXIMATE)';
      case 'INFERRED':
        return 'SUY LUẬN (INFERRED)';
      case 'UNKNOWN':
        return 'CHƯA XÁC ĐỊNH (UNKNOWN)';
    }
  };

  const getBadgeIcon = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'CONFIRMED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'APPROXIMATE':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'INFERRED':
        return <HelpCircle className="w-3.5 h-3.5 text-sky-400" />;
      case 'UNKNOWN':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <div
      id={`section-card-${section.sectionNumber}`}
      className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-lg transition-all hover:border-slate-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 font-mono font-bold text-sm border border-sky-500/20">
            {section.sectionNumber.toString().padStart(2, '0')}
          </span>
          <div>
            <h3 className="text-base font-bold text-white font-serif tracking-wide">
              {section.vietnameseTitle || section.title}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {section.title}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${getBadgeStyle(section.confidence)}`}>
          {getBadgeIcon(section.confidence)}
          <span>{getBadgeLabel(section.confidence)}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-5 text-sm">
        {/* Executive Summary */}
        <p className="text-slate-300 leading-relaxed">
          {section.summary}
        </p>

        {/* Specifications Matrix Table */}
        <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold">Thông số kỹ thuật (Parameter)</th>
                <th className="py-2.5 px-3.5 font-semibold">Giá trị / Đơn vị (Value / Metric)</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Mức độ xác thực (Evidence Status)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {section.specifications.map((spec, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="py-2.5 px-3.5 text-slate-300 font-medium">{spec.label}</td>
                  <td className="py-2.5 px-3.5 text-white font-mono">{spec.value}</td>
                  <td className="py-2.5 px-3.5 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${getBadgeStyle(spec.confidence)}`}>
                      {getBadgeLabel(spec.confidence)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3D Modeling & CAD Guidelines */}
        {section.geometryDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {section.geometryDetails.blenderDimensions && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-sky-400 font-mono font-bold mb-1">
                  <Box className="w-3.5 h-3.5" />
                  <span>Thông số hình học & Lưới 3D (Blender Specs)</span>
                </div>
                <p className="text-slate-300 font-mono text-[11px] leading-relaxed">
                  {section.geometryDetails.blenderDimensions}
                </p>
                {section.geometryDetails.meshTopology && (
                  <p className="text-slate-400 text-[11px] mt-1">
                    <strong className="text-slate-300">Cấu trúc lưới (Topology):</strong> {section.geometryDetails.meshTopology}
                  </p>
                )}
              </div>
            )}

            {section.geometryDetails.materialShader && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Thiết lập Shader & Vật lý (Unreal Engine 5)</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Vật liệu Shader:</strong> {section.geometryDetails.materialShader}
                </p>
                {section.geometryDetails.physicsSimulation && (
                  <p className="text-slate-400 text-[11px] mt-1">
                    <strong className="text-slate-300">Mô phỏng vật lý:</strong> {section.geometryDetails.physicsSimulation}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Visual Observations & Differentiators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs mb-1.5">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bằng chứng hình ảnh & Video xác thực (2024 Footage)</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
              {section.visualObservations.map((obs, idx) => (
                <li key={idx} className="leading-snug">{obs}</li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Đặc điểm phân biệt với các ghe Ngo khác</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
              {section.comparativeDifferentiators.map((diff, idx) => (
                <li key={idx} className="leading-snug">{diff}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verified Reference Citations */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            Nguồn tài liệu đối chiếu đã xác thực:
          </span>
          {section.verifiedSources.map((srcId) => {
            const src = SOURCES_CATALOG.find((s) => s.id === srcId);
            if (!src) return null;
            return (
              <a
                key={srcId}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                title={src.title}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/80 text-sky-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition"
              >
                <span>Tài liệu #{src.id}: {src.title.slice(0, 24)}...</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};
