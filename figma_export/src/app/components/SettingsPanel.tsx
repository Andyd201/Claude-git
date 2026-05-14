import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { Settings2 } from 'lucide-react';

interface SettingsPanelProps {
  settings: {
    aspectRatio: string;
    backgroundFit: string;
    subtitleColor: string;
    fontSize: number;
    subtitleYPosition: number;
    autoReactions: boolean;
    voice: string;
    redditCardStyle: boolean;
  };
  onSettingsChange: (settings: any) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const updateSetting = (key: string, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const subtitleColors = [
    { name: 'Magenta', value: 'magenta', color: 'rgb(236, 72, 153)' },
    { name: 'Cyan', value: 'cyan', color: 'rgb(6, 182, 212)' },
    { name: 'Green', value: 'green', color: 'rgb(34, 197, 94)' },
    { name: 'Yellow', value: 'yellow', color: 'rgb(234, 179, 8)' },
    { name: 'Purple', value: 'purple', color: 'rgb(168, 85, 247)' },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-cyan-400" />
        Settings
      </h3>

      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-sm space-y-6">
        {/* Aspect Ratio */}
        <div>
          <label className="text-sm text-gray-300 mb-2 block">Aspect Ratio</label>
          <div className="grid grid-cols-2 gap-2">
            {['9:16 Vertical', '16:9 Horizontal'].map((ratio) => (
              <button
                key={ratio}
                onClick={() => updateSetting('aspectRatio', ratio)}
                className={`
                  px-4 py-2.5 rounded-xl font-medium transition-all duration-300
                  ${settings.aspectRatio === ratio
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                `}
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
            {['Zoom', 'Letterbox'].map((fit) => (
              <button
                key={fit}
                onClick={() => updateSetting('backgroundFit', fit)}
                className={`
                  px-4 py-2.5 rounded-xl font-medium transition-all duration-300
                  ${settings.backgroundFit === fit
                    ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }
                `}
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
            {subtitleColors.map((color) => (
              <button
                key={color.value}
                onClick={() => updateSetting('subtitleColor', color.value)}
                className={`
                  flex-1 h-12 rounded-xl transition-all duration-300 relative overflow-hidden
                  ${settings.subtitleColor === color.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f]' : ''}
                `}
                style={{
                  background: `linear-gradient(135deg, ${color.color}, ${color.color}88)`,
                  boxShadow: settings.subtitleColor === color.value ? `0 0 20px ${color.color}` : 'none'
                }}
              >
                {settings.subtitleColor === color.value && (
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
            onValueChange={([value]) => updateSetting('fontSize', value)}
            max={72}
            min={24}
            step={2}
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
            onValueChange={([value]) => updateSetting('subtitleYPosition', value)}
            max={90}
            min={10}
            step={5}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="bg-white/10 relative grow rounded-full h-2">
              <Slider.Range className="absolute bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-full h-full" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-white shadow-lg shadow-cyan-500/50 rounded-full hover:scale-110 transition-transform focus:outline-none" />
          </Slider.Root>
        </div>

        {/* Auto Reactions */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="text-sm text-gray-300 block mb-1">Auto Reaction Inserts</label>
            <p className="text-xs text-gray-500">
              Automatically inject meme reactions like "BRO WHAT?!", "FAAAH!", "NO WAY" during shocking moments.
            </p>
          </div>
          <Switch.Root
            checked={settings.autoReactions}
            onCheckedChange={(checked) => updateSetting('autoReactions', checked)}
            className={`
              w-11 h-6 rounded-full relative transition-colors duration-300
              ${settings.autoReactions ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600' : 'bg-white/10'}
            `}
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-300 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px] shadow-lg" />
          </Switch.Root>
        </div>

        {/* Voice Selection */}
        <div>
          <label className="text-sm text-gray-300 mb-2 block">AI Voice (TTS Mode)</label>
          <select
            value={settings.voice}
            onChange={(e) => updateSetting('voice', e.target.value)}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
          >
            <option value="male-deep">Male - Deep Voice</option>
            <option value="male-casual">Male - Casual</option>
            <option value="female-professional">Female - Professional</option>
            <option value="female-energetic">Female - Energetic</option>
            <option value="narrator">Narrator - Documentary</option>
          </select>
        </div>

        {/* Reddit Card Style */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Reddit Card Style (Visual Mode)</label>
          <Switch.Root
            checked={settings.redditCardStyle}
            onCheckedChange={(checked) => updateSetting('redditCardStyle', checked)}
            className={`
              w-11 h-6 rounded-full relative transition-colors duration-300
              ${settings.redditCardStyle ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600' : 'bg-white/10'}
            `}
          >
            <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-300 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px] shadow-lg" />
          </Switch.Root>
        </div>
      </div>
    </div>
  );
}
