import { Video, Mic, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface ModeSelectorProps {
  selectedMode: string;
  onModeSelect: (mode: string) => void;
}

export function ModeSelector({ selectedMode, onModeSelect }: ModeSelectorProps) {
  const modes = [
    {
      id: 'normal',
      title: 'Normal Mode',
      icon: Video,
      description: 'Upload a long video (podcast, stream, interview...). The app detects silences, auto-cuts viral moments, transcribes them with AI and burns animated neon subtitles.',
      gradient: 'from-blue-500 to-cyan-500',
      glowColor: 'cyan'
    },
    {
      id: 'reddit-tts',
      title: 'Reddit TTS Mode',
      icon: Mic,
      description: 'Paste a Reddit story or script. The app generates an AI voiceover, syncs subtitles word-by-word and creates short-form content automatically.',
      gradient: 'from-fuchsia-500 to-pink-500',
      glowColor: 'fuchsia'
    },
    {
      id: 'reddit-visual',
      title: 'Reddit Visual Mode',
      icon: FileText,
      description: 'Creates animated Reddit-style story videos with progressive text reveal, synced subtitles and gameplay background footage.',
      gradient: 'from-purple-500 to-indigo-500',
      glowColor: 'purple'
    }
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4">Generation Mode</h3>

      <div className="grid grid-cols-3 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <motion.button
              key={mode.id}
              onClick={() => onModeSelect(mode.id)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-6 rounded-2xl border-2 text-left transition-all duration-300 group
                ${isSelected
                  ? `border-${mode.glowColor}-500 bg-${mode.glowColor}-500/10 shadow-2xl shadow-${mode.glowColor}-500/30`
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }
              `}
              style={{
                borderColor: isSelected ? `rgb(6 182 212)` : undefined,
                backgroundColor: isSelected ? `rgba(6, 182, 212, 0.1)` : undefined,
                boxShadow: isSelected ? `0 25px 50px -12px rgba(6, 182, 212, 0.3)` : undefined
              }}
            >
              {/* Icon */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300
                ${isSelected
                  ? `bg-gradient-to-br ${mode.gradient} shadow-lg`
                  : 'bg-white/5 group-hover:bg-white/10'
                }
              `}>
                <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
              </div>

              {/* Title */}
              <h4 className={`font-semibold mb-2 transition-colors ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                {mode.title}
              </h4>

              {/* Description */}
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                {mode.description}
              </p>

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/50"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
