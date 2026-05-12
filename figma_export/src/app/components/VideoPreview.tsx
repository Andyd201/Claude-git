import { Play, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoPreviewProps {
  subtitleColor: string;
  fontSize: number;
  subtitleYPosition: number;
}

export function VideoPreview({ subtitleColor, fontSize, subtitleYPosition }: VideoPreviewProps) {
  const colorMap: Record<string, string> = {
    magenta: 'rgb(236, 72, 153)',
    cyan: 'rgb(6, 182, 212)',
    green: 'rgb(34, 197, 94)',
    yellow: 'rgb(234, 179, 8)',
    purple: 'rgb(168, 85, 247)',
  };

  const currentColor = colorMap[subtitleColor] || colorMap.cyan;

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4">Live Preview</h3>

      <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[9/16] max-w-sm mx-auto">
        {/* Mock Video Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-cyan-900/30">
          {/* Simulated gameplay background */}
          <div className="absolute inset-0 opacity-40">
            <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
              {[...Array(9)].map((_, i) => (
                <motion.div
                  key={i}
                  className="border border-white/5"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Subtitle Preview */}
        <div
          className="absolute left-0 right-0 px-6 text-center"
          style={{ top: `${subtitleYPosition}%` }}
        >
          <motion.div
            animate={{
              textShadow: [
                `0 0 10px ${currentColor}, 0 0 20px ${currentColor}, 0 0 30px ${currentColor}`,
                `0 0 20px ${currentColor}, 0 0 30px ${currentColor}, 0 0 40px ${currentColor}`,
                `0 0 10px ${currentColor}, 0 0 20px ${currentColor}, 0 0 30px ${currentColor}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="font-black uppercase tracking-tight"
            style={{
              fontSize: `${fontSize * 0.5}px`,
              color: currentColor,
              WebkitTextStroke: '1px rgba(0,0,0,0.8)',
            }}
          >
            THIS IS CRAZY!
          </motion.div>
        </div>

        {/* Reddit Card Mock (if applicable) */}
        <div className="absolute top-8 left-6 right-6 bg-[#1a1a1b] rounded-2xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-orange-500" />
            <span className="text-xs text-gray-300">r/stories</span>
          </div>
          <p className="text-sm text-white font-medium">
            You won't believe what happened next...
          </p>
        </div>

        {/* Controls Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] hover:bg-black/40 transition-all group cursor-pointer">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl group-hover:bg-white transition-all"
          >
            <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
          </motion.button>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '45%' }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>

          {/* Time & Volume */}
          <div className="flex items-center justify-between text-xs text-white">
            <span>0:08 / 0:15</span>
            <Volume2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Preview updates in real-time as you adjust settings
        </p>
      </div>
    </div>
  );
}
