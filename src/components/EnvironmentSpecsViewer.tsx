import React from 'react';
import { MapPin, Flag, Waves, Users, Volume2, Camera, Navigation, CheckCircle } from 'lucide-react';
import { COLOR_PALETTE } from '../data/technicalReferenceData';

export const EnvironmentSpecsViewer: React.FC = () => {
  return (
    <div id="environment-specs-viewer" className="space-y-6">
      {/* 1,200m Course Blueprint Map */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-bold text-white font-serif">
                Maspero River Course Blueprint (Sóc Trăng City)
              </h3>
              <p className="text-xs text-slate-400">
                Official 1,200-meter straight river arena between Cầu C2 and Cầu Quay.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-xs font-mono font-bold">
            CONFIRMED TRACK BLUEPRINT
          </span>
        </div>

        {/* Visual Course Layout Schematic */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Flag className="w-3.5 h-3.5" /> 0m (START PONTOON - CẦU C2)
            </span>
            <span className="text-amber-400">800m (SPRINT BURST ZONE)</span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <Camera className="w-3.5 h-3.5" /> 1,200m (FINISH TOWER - KHÁN ĐÀI)
            </span>
          </div>

          {/* Graphical River Track */}
          <div className="relative h-20 w-full rounded-lg bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border border-amber-800/40 flex flex-col justify-between p-2 overflow-hidden">
            {/* Bank Revetment Lines */}
            <div className="w-full flex items-center justify-between text-[9px] text-slate-500">
              <span>◄ NORTH BANK (CHÂU THÀNH SIDE - STEPPED PROMENADE)</span>
              <span>100K+ SPECTATORS ►</span>
            </div>

            {/* Lane Separator Buoy String */}
            <div className="w-full border-b-2 border-dashed border-sky-400/40 flex items-center justify-around text-[10px]">
              <span className="px-2 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800">
                LANE 1 (Khán đài side)
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                LANE 2 (Opposite bank)
              </span>
            </div>

            <div className="w-full flex items-center justify-between text-[9px] text-slate-500">
              <span>◄ SOUTH BANK (CENTRAL VIP GRANDSTAND & MEDIA TOWERS)</span>
              <span>FINISH REPLAY ZONE ►</span>
            </div>
          </div>
        </div>

        {/* Environmental Parameter Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[11px] block">RIVER DIMENSIONS</span>
            <div className="text-white font-bold font-mono">Length: 1,200m / 1,000m</div>
            <div className="text-slate-300 font-mono">Width: 65m - 85m</div>
            <div className="text-slate-300 font-mono">Depth: 2.5m - 4.5m tidal</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[11px] block">WATER FLUID PROPERTIES</span>
            <div className="text-amber-400 font-bold font-mono">Turbid Alluvial Mud Brown</div>
            <div className="text-slate-300 font-mono">Density: 1,018 kg/m³</div>
            <div className="text-slate-300 font-mono">Color: #85583E (High silt)</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-slate-400 font-mono text-[11px] block">SPECTATOR DENSITY</span>
            <div className="text-purple-400 font-bold font-mono">100,000 - 150,000 live</div>
            <div className="text-slate-300 font-mono">Chhai-yam Drums & Gongs</div>
            <div className="text-slate-300 font-mono">Continuous roar + vuvuzelas</div>
          </div>
        </div>
      </div>

      {/* Color Palette Spec */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white font-serif">
              Master Color Palette & Material Offsets
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-sky-950 text-sky-300 border border-sky-800 text-xs font-mono font-bold">
            CONFIRMED PALETTE
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
                <div className="text-xs font-bold text-white truncate">{color.name}</div>
                <div className="text-[10px] font-mono text-sky-400">{color.hex} • {color.rgb}</div>
                <div className="text-[10px] text-slate-400 truncate">{color.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
