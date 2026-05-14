import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { Settings2, Trash2, Info, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { Settings } from '../App';

interface SettingsPageProps {
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onClearHistory: () => void;
  historyCount: number;
}

const DEFAULT_SETTINGS: Settings = {
  aspectRatio: '9:16 Vertical',
  backgroundFit: 'Zoom',
  subtitleColor: 'cyan',
  fontSize: 48,
  subtitleYPosition: 70,
  autoReactions: true,
  muteVideo: false,
  voice: 'fr-FR-HenriNeural',
  wordsPerChunk: 160,
  storyText: '',
  screenshotFile: null,
};

const SUBTITLE_COLORS = [
  { name: 'Magenta', value: 'magenta', color: 'rgb(255,0,255)' },
  { name: 'Cyan',    value: 'cyan',    color: 'rgb(0,255,255)' },
  { name: 'Green',   value: 'green',   color: 'rgb(34,197,94)' },
  { name: 'Yellow',  value: 'yellow',  color: 'rgb(234,179,8)' },
  { name: 'Purple',  value: 'purple',  color: 'rgb(168,85,247)' },
];

const TTS_VOICES = [
  { label: 'Henri (FR masculin)',  value: 'fr-FR-HenriNeural' },
  { label: 'Denise (FR féminin)', value: 'fr-FR-DeniseNeural' },
  { label: 'Guy (EN masculin)',    value: 'en-US-GuyNeural' },
  { label: 'Aria (EN féminin)',    value: 'en-US-AriaNeural' },
  { label: 'Davis (EN deep)',      value: 'en-US-DavisNeural' },
  { label: 'Tony (EN casual)',     value: 'en-US-TonyNeural' },
  { label: 'Sonia (EN UK)',        value: 'en-GB-SoniaNeural' },
];

export function SettingsPage({ settings, onSettingsChange, onClearHistory, historyCount }: SettingsPageProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const upd = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  const handleReset = () => {
    onSettingsChange({ ...DEFAULT_SETTINGS, storyText: settings.storyText, screenshotFile: settings.screenshotFile });
    setResetDone(true);
    setTimeout(() => setResetDone(false), 2000);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">{title}</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-400">Préférences par défaut pour toutes les générations. Sauvegardées automatiquement.</p>
      </motion.div>

      {/* Default appearance */}
      <Section title="Apparence par défaut">
        {/* Aspect Ratio */}
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Aspect Ratio par défaut</label>
          <div className="grid grid-cols-2 gap-2">
            {(['9:16 Vertical', '16:9 Horizontal'] as const).map(ratio => (
              <button
                key={ratio}
                onClick={() => upd('aspectRatio', ratio)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm
                  ${settings.aspectRatio === ratio
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Background Fit */}
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Ajustement fond par défaut</label>
          <div className="grid grid-cols-2 gap-2">
            {(['Zoom', 'Letterbox'] as const).map(fit => (
              <button
                key={fit}
                onClick={() => upd('backgroundFit', fit)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm
                  ${settings.backgroundFit === fit
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle Color */}
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Couleur des sous-titres</label>
          <div className="flex gap-2">
            {SUBTITLE_COLORS.map(c => (
              <button
                key={c.value}
                title={c.name}
                onClick={() => upd('subtitleColor', c.value)}
                className={`flex-1 h-10 rounded-xl transition-all duration-300 relative overflow-hidden
                  ${settings.subtitleColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f]' : ''}`}
                style={{
                  background: `linear-gradient(135deg,${c.color},${c.color}88)`,
                  boxShadow: settings.subtitleColor === c.value ? `0 0 16px ${c.color}` : 'none',
                }}
              >
                {settings.subtitleColor === c.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Taille de police</label>
            <span className="text-sm text-cyan-400 font-medium">{settings.fontSize}px</span>
          </div>
          <Slider.Root
            value={[settings.fontSize]}
            onValueChange={([v]) => upd('fontSize', v)}
            max={72} min={20} step={2}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-white/10 relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white shadow-lg shadow-cyan-500/50 rounded-full hover:scale-110 transition-transform focus:outline-none" />
          </Slider.Root>
        </div>

        {/* Subtitle Y */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Position Y sous-titres</label>
            <span className="text-sm text-cyan-400 font-medium">{settings.subtitleYPosition}%</span>
          </div>
          <Slider.Root
            value={[settings.subtitleYPosition]}
            onValueChange={([v]) => upd('subtitleYPosition', v)}
            max={95} min={5} step={5}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-white/10 relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white shadow-lg shadow-cyan-500/50 rounded-full hover:scale-110 transition-transform focus:outline-none" />
          </Slider.Root>
        </div>
      </Section>

      {/* TTS defaults */}
      <Section title="Voix IA par défaut">
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Voix TTS par défaut (Reddit modes)</label>
          <select
            value={settings.voice}
            onChange={e => upd('voice', e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
          >
            {TTS_VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Mots par partie (Reddit)</label>
            <span className="text-sm text-cyan-400 font-medium">{settings.wordsPerChunk}</span>
          </div>
          <Slider.Root
            value={[settings.wordsPerChunk]}
            onValueChange={([v]) => upd('wordsPerChunk', v)}
            max={300} min={50} step={10}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-white/10 relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white shadow-lg shadow-cyan-500/50 rounded-full hover:scale-110 transition-transform focus:outline-none" />
          </Slider.Root>
        </div>
      </Section>

      {/* Behaviour */}
      <Section title="Comportement">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm text-gray-300 block mb-1">Auto Reaction Inserts</label>
            <p className="text-xs text-gray-500">Injecte des réactions aux moments choquants.</p>
          </div>
          <Switch.Root
            checked={settings.autoReactions}
            onCheckedChange={v => upd('autoReactions', v)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-300 shrink-0
              ${settings.autoReactions ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600' : 'bg-white/10'}`}
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-300 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px] shadow-lg" />
          </Switch.Root>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm text-gray-300 block mb-1">Mute Original Audio</label>
            <p className="text-xs text-gray-500">Mode Normal : supprime l'audio original.</p>
          </div>
          <Switch.Root
            checked={settings.muteVideo}
            onCheckedChange={v => upd('muteVideo', v)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-300 shrink-0
              ${settings.muteVideo ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600' : 'bg-white/10'}`}
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-300 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px] shadow-lg" />
          </Switch.Root>
        </div>
      </Section>

      {/* Storage */}
      <Section title="Stockage local">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-300 mb-0.5">Historique des sessions</div>
            <div className="text-xs text-gray-500">{historyCount} session{historyCount !== 1 ? 's' : ''} enregistrée{historyCount !== 1 ? 's' : ''} dans le navigateur</div>
          </div>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 text-xs text-gray-400 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                Annuler
              </button>
              <button
                onClick={() => { onClearHistory(); setConfirmClear(false); }}
                className="px-3 py-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all"
              >
                Effacer
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={historyCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Effacer l'historique
            </button>
          )}
        </div>
      </Section>

      {/* Reset + About */}
      <Section title="À propos">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm text-white font-medium mb-0.5">VideoShorts v1.6</div>
            <div className="text-xs text-gray-500">
              Outil local de génération de shorts viraux avec Whisper AI, Edge-TTS et FFmpeg.
              Toutes les données restent sur votre machine.
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            {resetDone ? '✓ Paramètres réinitialisés' : 'Réinitialiser les paramètres par défaut'}
          </button>
        </div>
      </Section>
    </div>
  );
}
