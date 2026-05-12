import { motion } from 'motion/react';
import { Sparkles, Wand2, Scissors, Type } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  currentStep: string;
}

export function LoadingScreen({ progress, currentStep }: LoadingScreenProps) {
  const steps = [
    { icon: Scissors, label: 'Detecting viral moments', progress: 25 },
    { icon: Wand2, label: 'Transcribing with AI', progress: 50 },
    { icon: Type, label: 'Generating neon subtitles', progress: 75 },
    { icon: Sparkles, label: 'Rendering final clips', progress: 100 },
  ];

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] z-50 flex items-center justify-center">
      <div className="max-w-md w-full px-8">
        {/* Central Animation */}
        <div className="mb-12 flex justify-center">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-cyan-500/50"
          >
            <Sparkles className="w-12 h-12 text-white" />
          </motion.div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-400">Generating shorts...</span>
            <span className="text-sm font-semibold text-cyan-400">{progress}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-full shadow-lg shadow-cyan-500/50"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = progress >= step.progress - 25 && progress < step.progress;
            const isCompleted = progress >= step.progress;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-center gap-4 p-4 rounded-xl transition-all duration-300
                  ${isActive ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-white/5 border border-transparent'}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                  ${isCompleted
                    ? 'bg-gradient-to-br from-cyan-500 to-fuchsia-600 shadow-lg shadow-cyan-500/30'
                    : isActive
                      ? 'bg-cyan-500/20 border border-cyan-500/30'
                      : 'bg-white/5'
                  }
                `}>
                  {isCompleted ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-600'}`} />
                  )}
                </div>

                <span className={`
                  text-sm font-medium transition-colors
                  ${isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600'}
                `}>
                  {step.label}
                </span>

                {isActive && (
                  <motion.div
                    className="ml-auto"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Status Message */}
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-gray-500 mt-8"
        >
          {currentStep}
        </motion.p>
      </div>
    </div>
  );
}
