import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { Settings2, ImagePlus, X } from 'lucide-react';
import { useRef } from 'react';
import type { Settings } from '../App';

interface SettingsPanelProps {
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  activeMode: string;
}

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

export function SettingsPanel({ settings, onSettingsChange, activeMode }: SettingsPanelProps) {
  const upd = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onSettingsChange({ ...settings, [key]: value });

  const ssInputRef = useRef<HTMLInputElement>(null);
  const isReddit = activeMode === 'reddit-tts' || activeMode === 'reddit-visual';
  const isVisual = activeMode === 'reddit-visual';

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-cyan-400" />
        Settings
      </h3>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm space-y-6">

        {/* Story text */}
        {isReddit && (
          <div>
            <label className="text-sm text-gray-300 mb-2 block">
              Texte Reddit / Script{' '}
              <span className="text-gray-500">
                ({settings.storyText.trim().split(/\s+/).filter(Boolean).length} mots)
              </span>
            </label>
            <textarea
              value={settings.storyText}
              onChange={e => upd('storyText', e.target.value)}
              rows={6}
              placeholder="Colle ton histoire Reddit ou ton script ici…"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none resize-y transition-all"
            />
          </div>
        )}

        {/* Screenshot (Visual only) */}
        {isVisual && (
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Screenshot Reddit (optionnel)</label>
            <input
              ref={ssInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => upd('screenshotFile', e.target.files?.[0] ?? null)}
            />
            {settings.screenshotFile ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-cyan-500/30 rounded-xl">
                <ImagePlus className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-sm text-white flex-1 truncate">{settings.screenshotFile.name}</span>
                <button onClick={() => upd('screenshotFile', null)} className="text-gray-400 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => ssInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:border-cyan-500/50 hover:text-white transition-all text-sm"
              >
                <ImagePlus className="w-4 h-4" />
                Ajouter un screenshot
              </button>
            )}
          </div>
        )}

        {/* Aspect Ratio */}
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Aspect Ratio</label>
          <div className="grid grid-cols-2 gap-2">
            {(['9:16 Vertical', '16:9 Horizontal'] as const).map(ratio => (
              <button
                key={ratio}
                onClick={() => upd('aspectRatio', ratio)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300
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
          <label className="text-sm text-gray-300 mb-2 block">Background Fit</label>
          <div className="grid grid-cols-2 gap-2">
            {(['Zoom', 'Letterbox'] as const).map(fit => (
              <button
                key={fit}
                onClick={() => upd('backgroundFit', fit)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300
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
          <label className="text-sm text-gray-300 mb-2 block">Subtitle Neon Color</label>
          <div className="flex gap-2">
            {SUBTITLE_COLORS.map(c => (
              <button
                key={c.value}
                title={c.name}
                onClick={() => upd('subtitleColor', c.value)}
                className={`flex-1 h-12 rounded-xl transition-all duration-300 relative overflow-hidden
                  ${settings.subtitleColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f]' : ''}`}
                style={{
                  background: `linear-gradient(135deg,${c.color},${c.color}88)`,
                  boxShadow: settings.subtitleColor === c.value ? `0 0 20px ${c.color}` : 'none',
                }}
              >
                {settings.subtitleColor === c.value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <label className="text-sm text-gray-300">Font Size</label>
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

        {/* Subtitle Y Position */}
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-300">Subtitle Y Position</label>
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

        {/* Auto Reactions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label className="text-sm text-gray-300 block mb-1">Auto Reaction Inserts</label>
            <p className="text-xs text-gray-500">
              Injecte des réactions ("BRO WHAT?!", "FAAAH!") aux moments choquants.
            </p>
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

        {/* Voice (Reddit modes) */}
        {isReddit && (
          <div>
            <label className="text-sm text-gray-300 mb-2 block">Voix IA (TTS)</label>
            <select
              value={settings.voice}
              onChange={e => upd('voice', e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
            >
              {TTS_VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
        )}

        {/* Words per chunk (Reddit modes) */}
        {isReddit && (
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm text-gray-300">Mots par partie</label>
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
            <p className="text-xs text-gray-500 mt-1">
              ~{Math.max(1, Math.ceil(settings.storyText.trim().split(/\s+/).filter(Boolean).length / settings.wordsPerChunk))} partie(s) estimée(s)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
