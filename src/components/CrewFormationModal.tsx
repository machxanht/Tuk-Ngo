import React, { useState } from 'react';
import { Users, Shield, CheckCircle2, Award, ChevronRight, X, Filter, Info, Crosshair, ArrowRight, UserCheck } from 'lucide-react';

export interface CrewMemberData {
  id: string;
  stationNumber: number;
  roleType: 'BOW_LEADER' | 'MID_LEADER' | 'PORT_ROWER' | 'STARBOARD_ROWER' | 'STEERSMAN';
  roleCategory: 'CHỈ HUY' | 'TỔ NHỊP MŨI' | 'TỔ LỰC GIỮA' | 'TỔ BƠI ĐUÔI' | 'TỔ LÁI';
  roleNameVi: string;
  roleNameEn: string;
  pairNumber?: number; // 1 to 25
  thwartNumber?: number; // 1 to 25
  side: 'TRÁI (PORT)' | 'PHẢI (STARBOARD)' | 'GIỮA (CENTER)';
  xPositionM: number;
  zPositionM: number;
  yPositionM: number;
  paddleType: string;
  paddleSide: 'Mạn Trái' | 'Mạn Phải' | 'Dầm Mũi Ngắn' | 'Dầm Lái 3.1m' | 'Không dùng dầm';
  stance: string;
  duties: string;
  confidence: 'CONFIRMED';
}

// Generate the authentic 55-athlete roster conforming to Tum Núp 2 2024
export const GENERATE_55_CREW_ROSTER = (): CrewMemberData[] => {
  const list: CrewMemberData[] = [];
  const BOAT_LENGTH = 30.20;
  const BOAT_MAX_BEAM = 1.16;
  const FLARE_ANGLE = 0.22;

  // 1. Bow Leader (Chỉ huy mũi - 1 VĐV)
  list.push({
    id: 'crew-01-bow-leader',
    stationNumber: 1,
    roleType: 'BOW_LEADER',
    roleCategory: 'CHỈ HUY',
    roleNameVi: 'Chỉ huy đầu mũi (Múa dầm dẫn nhịp)',
    roleNameEn: 'Bow Rhythm Conductor',
    side: 'GIỮA (CENTER)',
    xPositionM: 13.60,
    zPositionM: 0.0,
    yPositionM: 1.15,
    paddleType: 'Dầm lễ hội mũi ngắn (1.10m)',
    paddleSide: 'Dầm Mũi Ngắn',
    stance: 'Quỳ rướn thấp trên mũi vút, giữ thăng bằng động',
    duties: 'Phất dầm dẫn nhịp thị giác cho các cặp bơi đầu, truyền lửa khí thế và điều phối nhịp khi xuất phát/nước rút.',
    confidence: 'CONFIRMED',
  });

  // 2. 50 Paired Rowers (25 Pairs) - Ordered Bow (Cặp 1) to Stern (Cặp 25)
  for (let pair = 1; pair <= 25; pair++) {
    // k = 24 down to 0 so pair 1 is near bow (u ~ 0.82) and pair 25 is near stern (u ~ 0.14)
    const u = 0.82 - ((pair - 1) / 24) * 0.68;
    const x = Number(((u - 0.5) * BOAT_LENGTH).toFixed(2));
    const localBeam = Number((BOAT_MAX_BEAM * Math.pow(Math.sin(u * Math.PI), 1.25)).toFixed(2));
    const halfB = localBeam / 2;
    const flareRatio = Math.min(1.0, (localBeam / BOAT_MAX_BEAM) * 1.2);
    const zGunwale = Number((halfB * (1.0 + flareRatio * FLARE_ANGLE)).toFixed(2));
    const lateralAthleteZ = Number((halfB * 0.48).toFixed(2));

    let category: 'TỔ NHỊP MŨI' | 'TỔ LỰC GIỮA' | 'TỔ BƠI ĐUÔI' = 'TỔ LỰC GIỮA';
    if (pair <= 5) category = 'TỔ NHỊP MŨI';
    else if (pair >= 22) category = 'TỔ BƠI ĐUÔI';

    // Port Rower (Mạn Trái)
    const portStation = 1 + (pair - 1) * 2 + 1; // 2, 4, 6...
    list.push({
      id: `crew-p${pair}-port`,
      stationNumber: portStation,
      roleType: 'PORT_ROWER',
      roleCategory: category,
      roleNameVi: `Tay bơi Cặp ${pair < 10 ? '0' + pair : pair} — Mạn Trái`,
      roleNameEn: `Row ${pair} Port Rower`,
      pairNumber: pair,
      thwartNumber: pair,
      side: 'TRÁI (PORT)',
      xPositionM: x,
      zPositionM: -lateralAthleteZ,
      yPositionM: 0.50,
      paddleType: 'Dầm bơi lá muỗng tiêu chuẩn (1.30m)',
      paddleSide: 'Mạn Trái',
      stance: 'Ngồi đòn ngang mạn trái, gập lưng 28° rướn người, chân trái đạp chốt giậm',
      duties: `Kéo dầm mạn trái tì nẹp be (Z = -${zGunwale}m), đồng bộ nhịp với bạn chèo mạn phải và toàn đội.`,
      confidence: 'CONFIRMED',
    });

    // Starboard Rower (Mạn Phải)
    const stbdStation = 1 + (pair - 1) * 2 + 2; // 3, 5, 7...
    list.push({
      id: `crew-p${pair}-stbd`,
      stationNumber: stbdStation,
      roleType: 'STARBOARD_ROWER',
      roleCategory: category,
      roleNameVi: `Tay bơi Cặp ${pair < 10 ? '0' + pair : pair} — Mạn Phải`,
      roleNameEn: `Row ${pair} Starboard Rower`,
      pairNumber: pair,
      thwartNumber: pair,
      side: 'PHẢI (STARBOARD)',
      xPositionM: x,
      zPositionM: lateralAthleteZ,
      yPositionM: 0.50,
      paddleType: 'Dầm bơi lá muỗng tiêu chuẩn (1.30m)',
      paddleSide: 'Mạn Phải',
      stance: 'Ngồi đòn ngang mạn phải, gập lưng 28° rướn người, chân phải đạp chốt giậm',
      duties: `Kéo dầm mạn phải tì nẹp be (Z = +${zGunwale}m), đối xứng lực đẩy với bạn chèo mạn trái.`,
      confidence: 'CONFIRMED',
    });
  }

  // 3. Central Whistle Commander (Chỉ huy còi giữa - 1 VĐV)
  list.push({
    id: 'crew-52-mid-leader',
    stationNumber: 52,
    roleType: 'MID_LEADER',
    roleCategory: 'CHỈ HUY',
    roleNameVi: 'Chỉ huy giữa ghe (Thổi còi & Nhún Kềm)',
    roleNameEn: 'Midship Whistle Master',
    side: 'GIỮA (CENTER)',
    xPositionM: 0.0,
    zPositionM: 0.0,
    yPositionM: 0.85,
    paddleType: 'Không dùng dầm (Cầm còi & Dây néo Kềm)',
    paddleSide: 'Không dùng dầm',
    stance: 'Đứng trụ vững trên bệ Kềm giữa (Trụ Kềm 03, X = 0.0m)',
    duties: 'Thổi còi điều tiết tần số nhịp (95-125 SPM), hô khẩu lệnh tăng tốc, dậm nhún thân ghe kích hoạt độ nảy đàn hồi của cây Kềm.',
    confidence: 'CONFIRMED',
  });

  // 4. 3 Steersmen (Tổ lái đuôi - 3 VĐV)
  list.push({
    id: 'crew-53-steersman-1',
    stationNumber: 53,
    roleType: 'STEERSMAN',
    roleCategory: 'TỔ LÁI',
    roleNameVi: 'Tài công 1 (Lái trước mạn Phải)',
    roleNameEn: 'Aft Lead Steersman (Starboard)',
    side: 'PHẢI (STARBOARD)',
    xPositionM: -11.80,
    zPositionM: 0.14,
    yPositionM: 1.02,
    paddleType: 'Dầm lái đuôi gỗ sao nặng (3.10m)',
    paddleSide: 'Dầm Lái 3.1m',
    stance: 'Đứng trụ chân so le mạn phải sàn đuôi',
    duties: 'Điều khiển dầm lái 3.10m bẻ hướng và triệt tiêu dao động lắc ngang khi nước rút.',
    confidence: 'CONFIRMED',
  });

  list.push({
    id: 'crew-54-steersman-2',
    stationNumber: 54,
    roleType: 'STEERSMAN',
    roleCategory: 'TỔ LÁI',
    roleNameVi: 'Tài công 2 (Lái giữa mạn Trái)',
    roleNameEn: 'Aft Mid Steersman (Port)',
    side: 'TRÁI (PORT)',
    xPositionM: -12.60,
    zPositionM: -0.14,
    yPositionM: 1.14,
    paddleType: 'Dầm lái đuôi gỗ sao nặng (3.10m)',
    paddleSide: 'Dầm Lái 3.1m',
    stance: 'Đứng trụ chân so le mạn trái sàn đuôi',
    duties: 'Phối hợp với tài công 1 và 3 giữ đường đua thẳng trên sông Maspéro.',
    confidence: 'CONFIRMED',
  });

  list.push({
    id: 'crew-55-steersman-3',
    stationNumber: 55,
    roleType: 'STEERSMAN',
    roleCategory: 'TỔ LÁI',
    roleNameVi: 'Tài công chính (Lái chót chóp đuôi)',
    roleNameEn: 'Chief Steersman (Stern Tip)',
    side: 'GIỮA (CENTER)',
    xPositionM: -13.50,
    zPositionM: 0.0,
    yPositionM: 1.28,
    paddleType: 'Dầm lái đuôi gỗ sao nặng (3.10m)',
    paddleSide: 'Dầm Lái 3.1m',
    stance: 'Đứng vững vị trí cao nhất trên chóp đuôi vút (+1.52m)',
    duties: 'Quan sát tổng thể hướng đi, giữ thăng bằng động cho đuôi ghe và khóa luồng lướt sóng.',
    confidence: 'CONFIRMED',
  });

  return list;
};

interface CrewFormationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStation?: (stationNumber: number) => void;
}

export const CrewFormationModal: React.FC<CrewFormationModalProps> = ({
  isOpen,
  onClose,
  onSelectStation,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'COMMAND' | 'PORT' | 'STARBOARD' | 'STEER'>('ALL');
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('crew-01-bow-leader');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const roster = GENERATE_55_CREW_ROSTER();

  const filteredRoster = roster.filter((member) => {
    let matchesFilter = true;
    if (selectedFilter === 'COMMAND') {
      matchesFilter = member.roleType === 'BOW_LEADER' || member.roleType === 'MID_LEADER';
    } else if (selectedFilter === 'PORT') {
      matchesFilter = member.roleType === 'PORT_ROWER';
    } else if (selectedFilter === 'STARBOARD') {
      matchesFilter = member.roleType === 'STARBOARD_ROWER';
    } else if (selectedFilter === 'STEER') {
      matchesFilter = member.roleType === 'STEERSMAN';
    }

    const matchesSearch =
      searchQuery === '' ||
      member.roleNameVi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.roleCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.stationNumber.toString().includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  const selectedAthlete = roster.find((m) => m.id === selectedAthleteId) || roster[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn font-sans">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-serif">
                  SƠ ĐỒ ĐỘI HÌNH 55 VẬN ĐỘNG VIÊN — GHE NGO TUM NÚP 2 (2024)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/50">
                  ĐÃ KHÓA CẤU TRÚC
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                55 VĐV chính thức: 1 Chỉ huy mũi + 1 Chỉ huy còi + 50 Tay bơi (25 cặp đối xứng) + 3 Tài công lái đuôi
              </p>
            </div>
          </div>
          <button
            id="btn-close-crew-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 text-xs font-mono">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block">TỔNG BIÊN CHẾ</span>
            <strong className="text-white text-sm">55 VĐV</strong>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-amber-400 block">CHỈ HUY NHỊP</span>
            <strong className="text-amber-300 text-sm">2 Người (Mũi + Giữa)</strong>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-sky-400 block">MẠN TRÁI (PORT)</span>
            <strong className="text-sky-300 text-sm">25 Tay bơi</strong>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-emerald-400 block">MẠN PHẢI (STBD)</span>
            <strong className="text-emerald-300 text-sm">25 Tay bơi</strong>
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-rose-400 block">TỔ LÁI ĐUÔI</span>
            <strong className="text-rose-300 text-sm">3 Tài công (Dầm 3.1m)</strong>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Filterable List & 2D Seat Map (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                <button
                  id="btn-filter-all"
                  onClick={() => setSelectedFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedFilter === 'ALL'
                      ? 'bg-slate-800 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tất cả (55)
                </button>
                <button
                  id="btn-filter-command"
                  onClick={() => setSelectedFilter('COMMAND')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedFilter === 'COMMAND'
                      ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Chỉ huy (2)
                </button>
                <button
                  id="btn-filter-port"
                  onClick={() => setSelectedFilter('PORT')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedFilter === 'PORT'
                      ? 'bg-sky-950 text-sky-300 border border-sky-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mạn Trái (25)
                </button>
                <button
                  id="btn-filter-stbd"
                  onClick={() => setSelectedFilter('STARBOARD')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedFilter === 'STARBOARD'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Mạn Phải (25)
                </button>
                <button
                  id="btn-filter-steer"
                  onClick={() => setSelectedFilter('STEER')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    selectedFilter === 'STEER'
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tổ Lái (3)
                </button>
              </div>

              <input
                type="text"
                placeholder="Tìm vị trí / số ghế..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44 font-mono"
              />
            </div>

            {/* Visual 2D Boat Seat Map Schematic */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">SƠ ĐỒ BỐ TRÍ THỰC ĐỊA TRÊN THÂN GHE (30.20M):</span>
                <span className="text-slate-500 text-[11px]">Mũi (+15m) ─── Tim (0m) ─── Đuôi (-15m)</span>
              </div>

              {/* Schematic Map Container */}
              <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800/80 overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-[620px] py-2 px-1 justify-between text-center font-mono text-[10px]">
                  {/* Bow Leader */}
                  <button
                    onClick={() => setSelectedAthleteId('crew-01-bow-leader')}
                    className={`px-2 py-1.5 rounded-lg border flex flex-col items-center gap-0.5 transition shrink-0 ${
                      selectedAthleteId === 'crew-01-bow-leader'
                        ? 'bg-amber-950 text-amber-300 border-amber-400 ring-2 ring-amber-500/50 font-bold'
                        : 'bg-amber-950/40 text-amber-400 border-amber-700/50 hover:bg-amber-950'
                    }`}
                  >
                    <span>MŨI</span>
                    <span className="text-[9px] text-amber-200">#01</span>
                  </button>

                  {/* 25 Paired Rows (Showing samples or all 25 rows compactly) */}
                  <div className="flex items-center gap-1 flex-1 px-1">
                    {Array.from({ length: 25 }, (_, i) => i + 1).map((pair) => {
                      const portMember = roster.find((m) => m.pairNumber === pair && m.side === 'TRÁI (PORT)');
                      const stbdMember = roster.find((m) => m.pairNumber === pair && m.side === 'PHẢI (STARBOARD)');
                      const isMid = pair === 13;
                      const isSelected =
                        selectedAthlete.pairNumber === pair ||
                        selectedAthleteId === portMember?.id ||
                        selectedAthleteId === stbdMember?.id;

                      return (
                        <div
                          key={pair}
                          className={`flex flex-col gap-0.5 p-0.5 rounded border transition cursor-pointer shrink-0 ${
                            isSelected
                              ? 'bg-sky-950/90 border-sky-400 ring-1 ring-sky-400'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-600'
                          }`}
                          onClick={() => portMember && setSelectedAthleteId(portMember.id)}
                          title={`Cặp bơi ${pair}: Trái (#${portMember?.stationNumber}) & Phải (#${stbdMember?.stationNumber})`}
                        >
                          {/* Port dot */}
                          <div
                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-bold ${
                              selectedAthleteId === portMember?.id
                                ? 'bg-sky-400 text-slate-950'
                                : 'bg-sky-900/60 text-sky-300'
                            }`}
                          >
                            T
                          </div>
                          {/* Pair number */}
                          <span className="text-[8px] text-slate-400 leading-none py-0.5">
                            {pair}
                          </span>
                          {/* Starboard dot */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              stbdMember && setSelectedAthleteId(stbdMember.id);
                            }}
                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[8px] font-bold ${
                              selectedAthleteId === stbdMember?.id
                                ? 'bg-emerald-400 text-slate-950'
                                : 'bg-emerald-900/60 text-emerald-300'
                            }`}
                          >
                            P
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mid Conductor Marker */}
                  <button
                    onClick={() => setSelectedAthleteId('crew-52-mid-leader')}
                    className={`px-2 py-1.5 rounded-lg border flex flex-col items-center gap-0.5 transition shrink-0 ${
                      selectedAthleteId === 'crew-52-mid-leader'
                        ? 'bg-amber-950 text-amber-300 border-amber-400 ring-2 ring-amber-500/50 font-bold'
                        : 'bg-amber-950/40 text-amber-400 border-amber-700/50 hover:bg-amber-950'
                    }`}
                  >
                    <span>GIỮA</span>
                    <span className="text-[9px] text-amber-200">#52</span>
                  </button>

                  {/* 3 Steersmen */}
                  <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-slate-800">
                    {[53, 54, 55].map((stNum) => {
                      const steersman = roster.find((m) => m.stationNumber === stNum);
                      return (
                        <button
                          key={stNum}
                          onClick={() => steersman && setSelectedAthleteId(steersman.id)}
                          className={`px-1.5 py-1.5 rounded-lg border flex flex-col items-center gap-0.5 transition ${
                            selectedAthleteId === steersman?.id
                              ? 'bg-rose-950 text-rose-300 border-rose-400 ring-1 ring-rose-400 font-bold'
                              : 'bg-rose-950/40 text-rose-400 border-rose-700/50 hover:bg-rose-950'
                          }`}
                        >
                          <span>L{stNum - 52}</span>
                          <span className="text-[8px] text-rose-300">#{stNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Athlete Cards Grid */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredRoster.map((athlete) => {
                const isSelected = athlete.id === selectedAthleteId;
                let badgeClass = 'bg-slate-800 text-slate-300';
                if (athlete.roleType === 'BOW_LEADER' || athlete.roleType === 'MID_LEADER') {
                  badgeClass = 'bg-amber-950 text-amber-300 border border-amber-700/50';
                } else if (athlete.roleType === 'PORT_ROWER') {
                  badgeClass = 'bg-sky-950 text-sky-300 border border-sky-700/50';
                } else if (athlete.roleType === 'STARBOARD_ROWER') {
                  badgeClass = 'bg-emerald-950 text-emerald-300 border border-emerald-700/50';
                } else if (athlete.roleType === 'STEERSMAN') {
                  badgeClass = 'bg-rose-950 text-rose-300 border border-rose-700/50';
                }

                return (
                  <div
                    key={athlete.id}
                    id={`card-${athlete.id}`}
                    onClick={() => {
                      setSelectedAthleteId(athlete.id);
                      if (onSelectStation) onSelectStation(athlete.stationNumber);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-500 shadow-md ring-1 ring-sky-500/40'
                        : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center font-mono font-bold text-white text-xs shrink-0">
                        {athlete.stationNumber < 10 ? '0' + athlete.stationNumber : athlete.stationNumber}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate flex items-center gap-1.5">
                          <span>{athlete.roleNameVi}</span>
                          <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${badgeClass}`}>
                            {athlete.roleCategory}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          Tọa độ X: <span className="text-white">{athlete.xPositionM > 0 ? `+${athlete.xPositionM}` : athlete.xPositionM}m</span> | {athlete.paddleSide}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                        XÁC THỰC
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Athlete Detail Dossier (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-white text-xs font-mono">
                    HỒ SƠ VỊ TRÍ #{selectedAthlete.stationNumber < 10 ? '0' + selectedAthlete.stationNumber : selectedAthlete.stationNumber}
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-700/50">
                  {selectedAthlete.roleCategory}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-white font-serif">{selectedAthlete.roleNameVi}</div>
                <div className="text-xs text-slate-400 font-mono">{selectedAthlete.roleNameEn}</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between pb-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Vị trí mạn:</span>
                  <strong className="text-white">{selectedAthlete.side}</strong>
                </div>
                <div className="flex justify-between pb-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Tọa độ không gian (X, Y, Z):</span>
                  <strong className="text-sky-400">({selectedAthlete.xPositionM}m, {selectedAthlete.yPositionM}m, {selectedAthlete.zPositionM}m)</strong>
                </div>
                {selectedAthlete.pairNumber && (
                  <div className="flex justify-between pb-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Băng đòn ngồi số:</span>
                    <strong className="text-emerald-400">Đòn #{selectedAthlete.thwartNumber} / 25</strong>
                  </div>
                )}
                <div className="flex justify-between pb-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Trang bị dầm:</span>
                  <strong className="text-amber-300">{selectedAthlete.paddleType}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phía tì dầm bơi:</span>
                  <strong className="text-purple-300">{selectedAthlete.paddleSide}</strong>
                </div>
              </div>

              {/* Stance & Biomechanical Form */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-mono text-slate-400 font-bold block">TƯ THẾ & ĐIỂM TÌ LỰC (STANCE):</span>
                <p className="p-2.5 rounded-lg bg-slate-900/80 text-slate-300 leading-relaxed border border-slate-800 text-[11px]">
                  {selectedAthlete.stance}
                </p>
              </div>

              {/* Responsibilities & Racing Duties */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] font-mono text-slate-400 font-bold block">NHIỆM VỤ ĐUA (DUTIES):</span>
                <p className="p-2.5 rounded-lg bg-slate-900/80 text-slate-300 leading-relaxed border border-slate-800 text-[11px]">
                  {selectedAthlete.duties}
                </p>
              </div>

              {/* Reference Audit Check */}
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-600/40 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px]">Đối chiếu Ghe Ngo Tum Núp 2 (2024)</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold">[XÁC NHẬN]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Biên chế xác lập theo hồ sơ thi đấu giải Oóc Om Bóc — Sóc Trăng 2024
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition shadow"
          >
            Đóng sơ đồ
          </button>
        </div>
      </div>
    </div>
  );
};
