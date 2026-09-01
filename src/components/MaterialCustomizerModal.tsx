import React from 'react';
import { BoatMaterialConfig, MATERIAL_PRESETS, PatternPreset } from '../utils/boatMaterialSystem';
import { Palette, Check, Sparkles, X, RotateCcw, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';

interface MaterialCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: BoatMaterialConfig;
  onChange: (newConfig: BoatMaterialConfig) => void;
}

export const MaterialCustomizerModal: React.FC<MaterialCustomizerModalProps> = ({
  isOpen,
  onClose,
  config,
  onChange,
}) => {
  if (!isOpen) return null;

  const handleSelectPreset = (presetKey: PatternPreset) => {
    onChange({ ...MATERIAL_PRESETS[presetKey] });
  };

  const handleColorChange = (key: keyof BoatMaterialConfig, value: string | boolean) => {
    onChange({
      ...config,
      preset: 'CUSTOM',
      [key]: value,
    });
  };

  const handleResetToDefault = () => {
    onChange({ ...MATERIAL_PRESETS.TUM_NUP_2_2024 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-950/90 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-600/20 border border-sky-500/30 text-sky-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-serif">
                TÙY BIẾN VẬT LIỆU & HOA VĂN (MATERIAL SYSTEM)
              </h3>
              <p className="text-[11px] text-slate-400">
                Hệ thống màu sắc linh hoạt • Dễ dàng thay thế texture khi có ảnh độ phân giải cao
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-[11px]"
              title="Đặt lại màu Tum Núp 2 Vô Địch 2024"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Mặc định</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Preset Buttons */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Bộ màu chuẩn hóa (Presets):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => handleSelectPreset('TUM_NUP_2_2024')}
                className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  config.preset === 'TUM_NUP_2_2024'
                    ? 'bg-sky-950/80 border-sky-500 shadow-md shadow-sky-950'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-white text-xs">Tum Núp 2 (2024)</strong>
                  {config.preset === 'TUM_NUP_2_2024' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#0a0f1d' }} title="Thân đen tuyền" />
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#f59e0b' }} title="Viền vàng" />
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#1e40af' }} title="Áo Royal Blue" />
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#dc2626' }} title="Dầm đỏ" />
                </div>
                <span className="text-[10px] text-emerald-400 font-mono mt-1.5">[CONFIRMED] Video 2024</span>
              </button>

              <button
                onClick={() => handleSelectPreset('KHMER_ROYAL_GOLD')}
                className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  config.preset === 'KHMER_ROYAL_GOLD'
                    ? 'bg-amber-950/80 border-amber-500 shadow-md shadow-amber-950'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-white text-xs">Hoàng Kim Khmer</strong>
                  {config.preset === 'KHMER_ROYAL_GOLD' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#b45309' }} />
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#fbbf24' }} />
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#f59e0b' }} />
                </div>
                <span className="text-[10px] text-amber-400 font-mono mt-1.5">[APPROXIMATE] Truyền thống</span>
              </button>

              <button
                onClick={() => handleSelectPreset('RACING_CRIMSON')}
                className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                  config.preset === 'RACING_CRIMSON'
                    ? 'bg-rose-950/80 border-rose-500 shadow-md shadow-rose-950'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong className="text-white text-xs">Hỏa Long Đỏ</strong>
                  {config.preset === 'RACING_CRIMSON' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#7f1d1d' }} />
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#fbbf24' }} />
                  <span className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: '#dc2626' }} />
                </div>
                <span className="text-[10px] text-rose-400 font-mono mt-1.5">[CUSTOM] Biến thể</span>
              </button>
            </div>
          </div>

          {/* Color Configuration Grid */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Chi tiết màu sắc từng bộ phận:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. Màu thân ghe */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Vỏ thân chính</span>
                  <span className="text-[10px] text-emerald-400">[CONFIRMED] Đen tuyền / Sơn then</span>
                </div>
                <input
                  type="color"
                  value={config.hullColor}
                  onChange={(e) => handleColorChange('hullColor', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              {/* 2. Màu nẹp be ghe */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Nẹp be mạn trên</span>
                  <span className="text-[10px] text-emerald-400">[CONFIRMED] Vàng kim Khmer</span>
                </div>
                <input
                  type="color"
                  value={config.gunwaleColor}
                  onChange={(e) => handleColorChange('gunwaleColor', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              {/* 3. Màu dải hoa văn quả trám */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Dải băng hoa văn</span>
                  <span className="text-[10px] text-emerald-400">[CONFIRMED] Đỏ cờ viền vàng</span>
                </div>
                <input
                  type="color"
                  value={config.sheerTrimColor}
                  onChange={(e) => handleColorChange('sheerTrimColor', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              {/* 4. Màu lá dầm */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Lá mái chèo</span>
                  <span className="text-[10px] text-emerald-400">[CONFIRMED] Sơn đỏ Tum Núp</span>
                </div>
                <input
                  type="color"
                  value={config.paddleBladeColor}
                  onChange={(e) => handleColorChange('paddleBladeColor', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              {/* 5. Màu áo đồng phục */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Áo đồng phục VĐV</span>
                  <span className="text-[10px] text-emerald-400">[CONFIRMED] Royal Blue 2024</span>
                </div>
                <input
                  type="color"
                  value={config.jerseyColor}
                  onChange={(e) => handleColorChange('jerseyColor', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>

              {/* 6. Màu sọc áo & Băng đô */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Băng đô & Sọc áo</span>
                  <span className="text-[10px] text-emerald-400">[CONFIRMED] Đỏ / Vàng kim</span>
                </div>
                <input
                  type="color"
                  value={config.headbandColor}
                  onChange={(e) => handleColorChange('headbandColor', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Evidence Documentation Note */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ghi chú kỹ thuật về Material System:</span>
            </div>
            <p>
              Toàn bộ shader PBR được thiết kế tham số hóa (procedural parametric). Khi có ảnh chụp hoa văn vector gốc hoặc texture độ phân giải cao, chỉ cần nạp tệp texture vào shader mà không cần thay đổi cấu trúc lưới hình học 3D.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-5 py-3 bg-slate-950/90 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow"
          >
            Đóng & Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
};
