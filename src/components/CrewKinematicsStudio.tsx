import React, { useState } from 'react';
import { CREW_ROSTER, STROKE_PHASES } from '../data/technicalReferenceData';
import { Users, Activity, Sliders, ChevronRight, Zap, Award, Target, CheckCircle2 } from 'lucide-react';

export const CrewKinematicsStudio: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<number>(1);
  const [activeCadence, setActiveCadence] = useState<number>(105);

  const activePhaseData = STROKE_PHASES.find((p) => p.phaseIndex === selectedPhase) || STROKE_PHASES[0];

  return (
    <div id="crew-kinematics-studio" className="space-y-6">
      {/* 4-Phase Stroke Cycle Visualizer */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-sky-400" />
              <h3 className="text-lg font-bold text-white font-serif">
                Kỹ động học & Sinh cơ học nhịp chèo đồng bộ
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Chu kỳ nước rút tần số cao (95-125 nhịp/phút) được mô hình hóa qua 4 pha chuyển động then chốt.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-xs font-mono text-slate-400">Nhịp mô phỏng:</span>
            <input
              type="range"
              min="60"
              max="125"
              value={activeCadence}
              onChange={(e) => setActiveCadence(Number(e.target.value))}
              className="w-24 accent-sky-500 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-sky-400">{activeCadence} SPM</span>
          </div>
        </div>

        {/* Phase Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STROKE_PHASES.map((phase) => {
            const isSelected = phase.phaseIndex === selectedPhase;
            return (
              <button
                key={phase.phaseIndex}
                id={`btn-phase-${phase.phaseIndex}`}
                onClick={() => setSelectedPhase(phase.phaseIndex)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/70 border-sky-500 shadow-lg shadow-sky-900/20'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className={isSelected ? 'text-sky-400 font-bold' : 'text-slate-400'}>
                    Pha 0{phase.phaseIndex}
                  </span>
                  <span className="text-[10px] text-slate-400">{phase.timePercentage}</span>
                </div>
                <div className="font-bold text-xs text-white truncate">{phase.vietnameseName}</div>
                <div className="text-[11px] text-slate-400 truncate">{phase.phaseName}</div>
              </button>
            );
          })}
        </div>

        {/* Detailed Phase Inspection Box */}
        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800">
                Pha 0{activePhaseData.phaseIndex}: {activePhaseData.vietnameseName}
              </span>
              <span className="text-xs text-slate-400">({activePhaseData.phaseName})</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activePhaseData.description}
            </p>
          </div>

          <div className="space-y-1.5 font-mono text-xs border-l border-slate-800/80 pl-4">
            <div className="text-slate-400 text-[11px]">THÔNG SỐ KHỚP XƯƠNG & GÓC ĐỘ:</div>
            <div className="flex justify-between text-slate-300">
              <span>Góc dầm bơi (Paddle Angle):</span>
              <span className="font-bold text-sky-400">{activePhaseData.paddleAngleDeg}°</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Độ sâu ngập dầm:</span>
              <span className="font-bold text-emerald-400">{activePhaseData.bladeDepthM} m</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Góc gập thân người (Torso):</span>
              <span className="font-bold text-amber-400">{activePhaseData.torsoAngleDeg}°</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Véc-tơ lực đẩy:</span>
              <span className="font-bold text-purple-400">{activePhaseData.forceVector}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 55-Crew Roster & Positions */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white font-serif">
              Cơ cấu đội hình vô địch (55-58 Vận động viên)
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-mono font-bold">
            BIÊN CHẾ ĐÃ XÁC THỰC (CONFIRMED)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CREW_ROSTER.map((crew) => (
            <div
              key={crew.roleId}
              id={`crew-card-${crew.roleId}`}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white font-serif">
                    {crew.vietnameseName}
                  </h4>
                  <p className="text-xs text-slate-400">{crew.roleName}</p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 font-mono font-bold text-xs">
                  {crew.count} vận động viên
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">VỊ TRÍ (TỪ MŨI)</span>
                  <span className="text-slate-200">{crew.positionRangeMeters}</span>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-500 block text-[10px]">LOẠI DẦM BƠI</span>
                  <span className="text-slate-200">{crew.paddleType} ({crew.paddleLengthM}m)</span>
                </div>
              </div>

              <div className="text-xs text-slate-300 pt-1">
                <strong className="text-slate-400 font-mono text-[11px] block mb-0.5">VÒNG LẶP CHUYỂN ĐỘNG (ANIMATION LOOP):</strong>
                <p className="text-[11px] leading-relaxed text-slate-400">{crew.primaryAnimationLoop}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
