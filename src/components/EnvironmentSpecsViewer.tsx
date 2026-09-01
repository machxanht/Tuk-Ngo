import React from 'react';
import { MapPin, Flag, Waves, Users, Volume2, Camera, Navigation, CheckCircle, FileText, ExternalLink, Trophy } from 'lucide-react';
import { COLOR_PALETTE } from '../data/technicalReferenceData';

export const EnvironmentSpecsViewer: React.FC = () => {
  return (
    <div id="environment-specs-viewer" className="space-y-6">
      {/* Reference Document Dossier Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-serif">
              Hồ sơ khảo sát hiện trường: docs/race-course/2025-race-course-reference.md
            </h4>
            <p className="text-xs text-slate-400 font-mono">
              Tổng hợp phân tích từ YouTube Livestream 2024 (Timestamp 00:15:20, 00:45:10, 01:12:00, 01:30:10)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[11px] font-mono font-bold">
            8 CONFIRMED • 3 APPROXIMATE
          </span>
        </div>
      </div>

      {/* 1,200m Course Blueprint Map */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-bold text-white font-serif">
                Sơ đồ kỹ thuật đường đua sông Maspéro (TP. Sóc Trăng)
              </h3>
              <p className="text-xs text-slate-400">
                Đoạn đua thẳng 1.200m chính thức từ cầu C2 đến khán đài trung tâm và cầu Quay.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono font-bold">
            SƠ ĐỒ ĐƯỜNG ĐUA ĐÃ XÁC THỰC
          </span>
        </div>

        {/* Visual Course Layout Schematic */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Flag className="w-3.5 h-3.5" /> 0m (PHAO XUẤT PHÁT - CẦU C2)
            </span>
            <span className="text-amber-400">800m (KHU VỰC TĂNG TỐC BỨT PHÁ)</span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <Camera className="w-3.5 h-3.5" /> 1.200m (THÁP ĐÍCH - KHÁN ĐÀI)
            </span>
          </div>

          {/* Graphical River Track */}
          <div className="relative h-20 w-full rounded-lg bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border border-amber-800/40 flex flex-col justify-between p-2 overflow-hidden">
            {/* Bank Revetment Lines */}
            <div className="w-full flex items-center justify-between text-[9px] text-slate-500">
              <span>◄ BỜ BẮC (PHÍA HUYỆN CHÂU THÀNH - BỜ KÈ BẬC THANG)</span>
              <span>HƠN 100.000 KHÁN GIẢ ►</span>
            </div>

            {/* Lane Separator Buoy String */}
            <div className="w-full border-b-2 border-dashed border-sky-400/40 flex items-center justify-around text-[10px]">
              <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800">
                LÀN 1 (Phía Khán đài chính)
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                LÀN 2 (Phía bờ đối diện)
              </span>
            </div>

            <div className="w-full flex items-center justify-between text-[9px] text-slate-500">
              <span>◄ BỜ NAM (KHÁN ĐÀI VIP TRUNG TÂM & THÁP TRUYỀN HÌNH)</span>
              <span>KHU VỰC CÁN ĐÍCH & QUAY CHẬM ►</span>
            </div>
          </div>
        </div>

        {/* Environmental Parameter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[11px] block">KÍCH THƯỚC ĐƯỜNG THỦY</span>
            <div className="text-white font-bold font-mono">Chiều dài: 1.200m (Nam) / 1.000m (Nữ)</div>
            <div className="text-slate-300 font-mono">Chiều rộng lòng sông: 65m - 85m</div>
            <div className="text-slate-300 font-mono">Độ sâu: 2.5m - 4.5m (thay đổi theo triều)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[11px] block">TÍNH CHẤT DÒNG NƯỚC</span>
            <div className="text-amber-400 font-bold font-mono">Nước phù sa đục màu nâu đỏ</div>
            <div className="text-slate-300 font-mono">Khối lượng riêng: 1.018 kg/m³</div>
            <div className="text-slate-300 font-mono">Màu nước: #85583E (Nhiều bùn cát)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[11px] block">KHÔNG KHÍ & KHÁN GIẢ</span>
            <div className="text-purple-400 font-bold font-mono">100.000 - 150.000 người trực tiếp</div>
            <div className="text-slate-300 font-mono">Trống Chhay-dăm & Cồng chiêng</div>
            <div className="text-slate-300 font-mono">Tiếng hò reo vang dội dọc 2 bờ kè</div>
          </div>
        </div>
      </div>

      {/* Color Palette Spec */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white font-serif">
              Hệ thống màu sắc & Vật liệu nhận diện
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-xs font-mono font-bold">
            HỆ MÀU ĐÃ XÁC THỰC
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {COLOR_PALETTE.map((color, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg shadow border border-white/20 shrink-0"
                style={{ backgroundColor: color.hex }}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{color.vietnameseName || color.name}</div>
                <div className="text-[10px] font-mono text-sky-400">{color.hex} • {color.rgb}</div>
                <div className="text-[10px] text-slate-400 truncate">{color.vietnameseRole || color.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
