import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { VideoUpload } from './components/VideoUpload';
import { ModeSelector } from './components/ModeSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoPreview } from './components/VideoPreview';
import { ExportResults } from './components/ExportResults';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const [activeSection, setActiveSection] = useState('create');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMode, setSelectedMode] = useState('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const [settings, setSettings] = useState({
    aspectRatio: '9:16 Vertical',
    backgroundFit: 'Zoom',
    subtitleColor: 'cyan',
    fontSize: 48,
    subtitleYPosition: 70,
    autoReactions: true,
    voice: 'male-deep',
    redditCardStyle: true,
  });

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setShowResults(false);

    // Simulate AI generation process
    const steps = [
      { progress: 25, label: 'Analyzing video content...' },
      { progress: 50, label: 'Transcribing audio with AI...' },
      { progress: 75, label: 'Creating neon subtitles...' },
      { progress: 100, label: 'Rendering final clips...' },
    ];

    let currentStepIndex = 0;

    const interval = setInterval(() => {
      if (currentStepIndex < steps.length) {
        setGenerationProgress(steps[currentStepIndex].progress);
        setCurrentStep(steps[currentStepIndex].label);
        currentStepIndex++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsGenerating(false);
          setShowResults(true);
        }, 500);
      }
    }, 1500);
  };

  return (
    <div className="dark w-screen h-screen bg-[#0a0a0f] text-white flex overflow-hidden">
      {/* Loading Screen */}
      {isGenerating && (
        <LoadingScreen progress={generationProgress} currentStep={currentStep} />
      )}

      {/* Sidebar */}
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      {/* Main Workspace */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8 space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
              Create Viral Shorts
            </h1>
            <p className="text-lg text-gray-400 mb-6">
              Generate TikTok, Shorts & Reels automatically with AI subtitles.
            </p>

            <motion.button
              onClick={handleGenerate}
              disabled={!selectedFile || isGenerating}
              whileHover={{ scale: selectedFile ? 1.05 : 1 }}
              whileTap={{ scale: selectedFile ? 0.95 : 1 }}
              className={`
                px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 inline-flex items-center gap-3
                ${selectedFile
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-2xl shadow-cyan-500/50 hover:shadow-3xl hover:shadow-cyan-500/70'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }
              `}
            >
              <Sparkles className="w-6 h-6" />
              Generate Shorts
            </motion.button>
          </motion.div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Input & Settings */}
            <div className="lg:col-span-2 space-y-8">
              {/* Video Upload */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <VideoUpload onVideoSelect={setSelectedFile} />
              </motion.div>

              {/* Mode Selector */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ModeSelector selectedMode={selectedMode} onModeSelect={setSelectedMode} />
              </motion.div>

              {/* Settings Panel */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <SettingsPanel settings={settings} onSettingsChange={setSettings} />
              </motion.div>

              {/* Export Results */}
              {showResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ExportResults />
                </motion.div>
              )}
            </div>

            {/* Right Column - Preview */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="sticky top-8"
              >
                <VideoPreview
                  subtitleColor={settings.subtitleColor}
                  fontSize={settings.fontSize}
                  subtitleYPosition={settings.subtitleYPosition}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}