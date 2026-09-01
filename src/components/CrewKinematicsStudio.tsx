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
              Chu kỳ nước rút tần số cao (95-125 nhịp/phút) được mô hình hóa qua 7 pha chuyển động sinh cơ học chuẩn xác từ video thực tế.
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

        {/* Phase Selection Tabs (7 Authentic Phases) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
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
                  <span className="text-[10px] text-slate-400">{phase.timePercentage.split(' ')[0]}</span>
                </div>
                <div className="font-bold text-xs text-white truncate">{phase.vietnameseName.split(':')[1] || phase.vietnameseName}</div>
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

      {/* Official Animation Reference Document & Source URLs Panel */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white font-serif">
                Hồ sơ tham chiếu động học & Nguồn đối chiếu bắt buộc
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Tệp lưu trữ: <code className="text-sky-400">docs/tum-nup-2/rowing-animation-reference.md</code>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[11px] font-mono">
            Ưu tiên: Video/Frame thật → Ảnh thật → Tài liệu
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <a
            href="https://baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich-ca-nam-va-nu-f8b6c2a/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 transition group flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[10px] text-sky-400 mb-1">
                <span>[NGUỒN 1 — THI ĐẤU 2024]</span>
                <span className="group-hover:translate-x-0.5 transition">↗</span>
              </div>
              <strong className="text-white block">Tum Núp 2 — Video & Báo ảnh Vô địch 2024</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Báo Sóc Trăng — Phân tích từng frame chung kết nam 1.200m</p>
            </div>
            <span className="text-slate-500 text-[10px] truncate font-mono">baosoctrang.org.vn/multimedia/202411/media-ghe-ngo-chua-tum-nup-vo-dich...</span>
          </a>

          <a
            href="https://baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/oi-ghe-ngo-nam-nu-chua-tum-nup-quyet-tam-giu-vung-ngoi-vo-ich-bab3c5d/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 transition group flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[10px] text-sky-400 mb-1">
                <span>[NGUỒN 2 — TẬP LUYỆN]</span>
                <span className="group-hover:translate-x-0.5 transition">↗</span>
              </div>
              <strong className="text-white block">Tum Núp — Phim phóng sự tập luyện cạn & dưới nước</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Báo Sóc Trăng — Tư thế ngồi giàn giằng, thế tay tì be ghe, còi dẫn nhịp</p>
            </div>
            <span className="text-slate-500 text-[10px] truncate font-mono">baosoctrang.org.vn/van-hoa-the-thao-du-lich/202411/oi-ghe-ngo-nam-nu...</span>
          </a>

          <a
            href="https://duaghengo.cantho.gov.vn/160_video-clips-60.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 transition group flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[10px] text-sky-400 mb-1">
                <span>[NGUỒN 3 — KHO VIDEO]</span>
                <span className="group-hover:translate-x-0.5 transition">↗</span>
              </div>
              <strong className="text-white block">Kho video đua ghe Ngo Cần Thơ & ĐBSCL</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Cổng TTĐT Đua Ghe Ngo — Tư liệu video góc quay truyền hình sông nước</p>
            </div>
            <span className="text-slate-500 text-[10px] truncate font-mono">duaghengo.cantho.gov.vn/160_video-clips-60.html</span>
          </a>

          <a
            href="https://vnanet.vn/vi/anh/anh-thoi-su-trong-nuoc-1014/trao-thuong-giai-dua-ghe-ngo-tinh-soc-trang-nam-2024-7706595.html"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 transition group flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between font-mono text-[10px] text-sky-400 mb-1">
                <span>[NGUỒN 4 — BỘ ẢNH TTXVN]</span>
                <span className="group-hover:translate-x-0.5 transition">↗</span>
              </div>
              <strong className="text-white block">Ảnh Giải Đua Ghe Ngo Tỉnh Sóc Trăng 2024 (TTXVN)</strong>
              <p className="text-slate-400 text-[11px] mt-0.5">Thông tấn xã Việt Nam — Độ nét cao kiểm tra trang phục, dầm và thế ngồi</p>
            </div>
            <span className="text-slate-500 text-[10px] truncate font-mono">vnanet.vn/vi/anh/anh-thoi-su-trong-nuoc-1014/trao-thuong-giai-dua...</span>
          </a>
        </div>
      </div>
    </div>
  );
};
