import * as THREE from 'three';

export type PatternPreset = 'TUM_NUP_2_2024' | 'KHMER_ROYAL_GOLD' | 'RACING_CRIMSON' | 'CUSTOM';

export interface BoatMaterialConfig {
  preset: PatternPreset;
  // Hull Materials
  hullColor: string;
  hullRoughness: number;
  hullMetalness: number;
  gunwaleColor: string;
  sheerTrimColor: string;
  keelColor: string;
  showPatterns: boolean;

  // Paddle Materials
  paddleShaftColor: string;
  paddleBladeColor: string;
  paddleTipColor: string;

  // Crew Materials
  jerseyColor: string;
  jerseyStripeColor: string;
  headbandColor: string;
  shortsColor: string;
  skinTone: string;

  // Sacred Prow/Stern Accents
  prowCapColor: string;
  tasselColor: string;
}

export const MATERIAL_PRESETS: Record<PatternPreset, BoatMaterialConfig> = {
  TUM_NUP_2_2024: {
    preset: 'TUM_NUP_2_2024',
    hullColor: '#0a0f1d', // Charcoal Indigo / Obsidian Black
    hullRoughness: 0.25,
    hullMetalness: 0.15,
    gunwaleColor: '#f59e0b', // Khmer Gold Gunwale
    sheerTrimColor: '#ef4444', // Crimson sacred racing stripe
    keelColor: '#92400e', // Sao wood keel tone
    showPatterns: true,

    paddleShaftColor: '#d97706', // Polished sao hardwood
    paddleBladeColor: '#dc2626', // Team Red blade (CONFIRMED from 2024 Video)
    paddleTipColor: '#fbbf24', // Gold tip

    jerseyColor: '#1e40af', // Royal Blue (CONFIRMED from 2024 Livestream)
    jerseyStripeColor: '#f59e0b', // Gold Accent
    headbandColor: '#ef4444', // Red Sacred Headband
    shortsColor: '#0f172a',
    skinTone: '#c68642',

    prowCapColor: '#dc2626',
    tasselColor: '#0f172a',
  },
  KHMER_ROYAL_GOLD: {
    preset: 'KHMER_ROYAL_GOLD',
    hullColor: '#b45309', // Polished Teak & Gold
    hullRoughness: 0.2,
    hullMetalness: 0.4,
    gunwaleColor: '#fbbf24', // Bright Gold
    sheerTrimColor: '#dc2626',
    keelColor: '#78350f',
    showPatterns: true,

    paddleShaftColor: '#b45309',
    paddleBladeColor: '#f59e0b', // Golden Blade
    paddleTipColor: '#ffffff',

    jerseyColor: '#f59e0b', // Golden Team Jersey
    jerseyStripeColor: '#dc2626',
    headbandColor: '#fbbf24',
    shortsColor: '#1e293b',
    skinTone: '#c68642',

    prowCapColor: '#f59e0b',
    tasselColor: '#fbbf24',
  },
  RACING_CRIMSON: {
    preset: 'RACING_CRIMSON',
    hullColor: '#7f1d1d', // Dark Crimson
    hullRoughness: 0.3,
    hullMetalness: 0.2,
    gunwaleColor: '#fbbf24',
    sheerTrimColor: '#ffffff',
    keelColor: '#450a0a',
    showPatterns: true,

    paddleShaftColor: '#92400e',
    paddleBladeColor: '#ef4444',
    paddleTipColor: '#fbbf24',

    jerseyColor: '#dc2626', // Red Jersey
    jerseyStripeColor: '#ffffff',
    headbandColor: '#fbbf24',
    shortsColor: '#0f172a',
    skinTone: '#c68642',

    prowCapColor: '#ef4444',
    tasselColor: '#000000',
  },
  CUSTOM: {
    preset: 'CUSTOM',
    hullColor: '#090d16',
    hullRoughness: 0.3,
    hullMetalness: 0.2,
    gunwaleColor: '#f59e0b',
    sheerTrimColor: '#ef4444',
    keelColor: '#92400e',
    showPatterns: true,

    paddleShaftColor: '#d97706',
    paddleBladeColor: '#dc2626',
    paddleTipColor: '#fbbf24',

    jerseyColor: '#1e40af',
    jerseyStripeColor: '#f59e0b',
    headbandColor: '#ef4444',
    shortsColor: '#0f172a',
    skinTone: '#c68642',

    prowCapColor: '#dc2626',
    tasselColor: '#0f172a',
  },
};

export function getDefaultMaterialConfig(): BoatMaterialConfig {
  return { ...MATERIAL_PRESETS.TUM_NUP_2_2024 };
}
