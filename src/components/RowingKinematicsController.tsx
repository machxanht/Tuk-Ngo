import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Gauge,
  Activity,
  Flame,
  Zap,
  Info,
  Waves,
} from 'lucide-react';
import { STROKE_PHASES, StrokePhaseInfo } from '../utils/rowingKinematics';

interface RowingKinematicsControllerProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  strokeCadenceSPM: number;
  onChangeCadence: (spm: number) => void;
  currentPhase: StrokePhaseInfo;
  phaseProgress: number;
  globalCycleProgress: number; // 0.0 -> 1.0
  onScrubCycle: (normalizedTime: number) => void;
  onStepPhase: (direction: -1 | 1) => void;
}

export const RowingKinematicsController: React.FC<RowingKinematicsControllerProps> = ({
  isPlaying,
  onTogglePlay,
  strokeCadenceSPM,
  onChangeCadence,
  currentPhase,
  phaseProgress,
  globalCycleProgress,
  onScrubCycle,
  onStepPhase,
}) => {
  // Speed estimation based on cadence: V = Cadence * 0.058 (m/s)
  const estimatedSpeedKmh = ((strokeCadenceSPM * 0.054 * 3.6)).toFixed(1);
  const cycleDurationSec = (60 / strokeCadenceSPM).toFixed(2);

  // Live telemetry for blade and torso
  const isBladeSubmerged = globalCycleProgress >= 0.0 && globalCycleProgress < 0.60;
  const bladeDepthCm = isBladeSubmerged
    ? Math.round(18 * Math.sin((globalCycleProgress / 0.60) * Math.PI))
    : 0;

  return (
    <div className="w-full bg-slate-950/95 border-t border-slate-800 p-3.5 backdrop-blur-md select-none font-mono text-xs text-slate-300 shadow-2xl">
      {/* 1. Top Row: Active Phase Banner & Biomechanical Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3 pb-2.5 border-b border-slate-800/80">
        {/* Left: Active Phase Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs ${currentPhase.bgClass} ${currentPhase.borderClass} ${currentPhase.textClass}`}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>{currentPhase.nameVi}</span>
            <span className="text-[10px] opacity-80 uppercase tracking-wide hidden sm:inline">
              ({currentPhase.badge})
            </span>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
            {currentPhase.description}
          </span>
        </div>

        {/* Right: Real-time Telemetry Readout */}
        <div className="flex items-center gap-2 text-[11px]">
          <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500">Lưỡi dầm:</span>
            <span
              className={`font-bold ${
                isBladeSubmerged ? 'text-emerald-400' : 'text-purple-400'
              }`}
            >
              {isBladeSubmerged ? `Ngập nước -${bladeDepthCm}cm` : 'Trên không +20cm'}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
            <span className="text-slate-500">Tốc độ ước tính:</span>
            <strong className="text-sky-400 font-bold">{estimatedSpeedKmh} km/h</strong>
          </div>
        </div>
      </div>

      {/* 2. Middle Row: 5-Phase Interactive Timeline Strip */}
      <div className="space-y-1.5 mb-3.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-bold text-slate-300">CHU KỲ CHÈO 5 GIAI ĐOẠN:</span>
          <span>
            Tiến trình: <strong>{Math.round(globalCycleProgress * 100)}%</strong> ({cycleDurationSec}s / nhịp)
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 w-full">
          {STROKE_PHASES.map((p, idx) => {
            const isCurrent = currentPhase.id === p.id;
            const phaseWidth = (p.range[1] - p.range[0]) * 100;

            return (
              <button
                key={p.id}
                id={`btn-select-phase-${p.id.toLowerCase()}`}
                onClick={() => onScrubCycle(p.range[0] + 0.02)}
                className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? `${p.bgClass} ${p.borderClass} ${p.textClass} font-bold ring-1 ring-sky-500/40 shadow-lg`
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] truncate max-w-full">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.colorHex }} />
                  <span className="truncate">{p.badge}</span>
                </div>
                <span className="text-[9px] opacity-70">
                  {Math.round(p.range[0] * 100)}%-{Math.round(p.range[1] * 100)}%
                </span>

                {/* Live phase internal progress bar */}
                {isCurrent && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800 rounded-b-lg overflow-hidden">
                    <div
                      className="h-full transition-all duration-75"
                      style={{
                        width: `${Math.min(100, Math.max(0, phaseProgress * 100))}%`,
                        backgroundColor: p.colorHex,
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Cycle Slider Scrubber (for manual frame inspection) */}
        <div className="relative pt-1">
          <input
            id="slider-cycle-scrubber"
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={globalCycleProgress}
            onChange={(e) => onScrubCycle(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            title="Kéo để kiểm tra từng khung hình chuyển động"
          />
        </div>
      </div>

      {/* 3. Bottom Row: Play Controls & Cadence Rate Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left: Play/Pause and Step Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-controller-toggle-play"
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-lg transition ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Tạm dừng' : 'Chạy mô phỏng'}</span>
          </button>

          <button
            id="btn-controller-step-back"
            onClick={() => onStepPhase(-1)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
            title="Lùi 1 giai đoạn"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-controller-step-forward"
            onClick={() => onStepPhase(1)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
            title="Tiến 1 giai đoạn"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Cadence (Stroke Rate) Presets & Live Slider */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Stroke Rate:</span>
            <strong className="text-white font-mono text-xs">{strokeCadenceSPM}</strong>
            <span className="text-sky-400 text-[10px]">SPM</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              id="btn-spm-preset-warmup"
              onClick={() => onChangeCadence(85)}
              className={`px-2 py-0.5 rounded text-[10px] transition ${
                strokeCadenceSPM === 85
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Nhịp xuất phát / Khởi động: 85 SPM"
            >
              85 (Khởi động)
            </button>
            <button
              id="btn-spm-preset-pace"
              onClick={() => onChangeCadence(105)}
              className={`px-2 py-0.5 rounded text-[10px] transition ${
                strokeCadenceSPM === 105
                  ? 'bg-sky-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Nhịp giữ nước đường trường: 105 SPM"
            >
              105 (Đường trường)
            </button>
            <button
              id="btn-spm-preset-sprint"
              onClick={() => onChangeCadence(122)}
              className={`px-2 py-0.5 rounded text-[10px] transition ${
                strokeCadenceSPM === 122
                  ? 'bg-rose-600 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Nhịp bứt tốc về đích: 122 SPM"
            >
              122 (Bứt tốc)
            </button>
          </div>

          {/* Cadence Slider */}
          <div className="w-20 sm:w-28 hidden xs:block">
            <input
              id="slider-controller-cadence"
              type="range"
              min="65"
              max="130"
              step="1"
              value={strokeCadenceSPM}
              onChange={(e) => onChangeCadence(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded"
              title="Điều chỉnh tốc độ nhịp chèo (65 - 130 SPM)"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
