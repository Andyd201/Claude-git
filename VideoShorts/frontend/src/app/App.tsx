import { useState, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { VideoUpload } from './components/VideoUpload';
import { ModeSelector } from './components/ModeSelector';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoPreview } from './components/VideoPreview';
import { ExportResults } from './components/ExportResults';
import { LoadingScreen } from './components/LoadingScreen';

export interface Clip {
  id: number;
  name: string;
  duration: number;
  start: number;
  end: number;
  filename: string;
  srt_filename: string;
  transcript: string;
}

export interface Settings {
  aspectRatio: '9:16 Vertical' | '16:9 Horizontal';
  backgroundFit: 'Zoom' | 'Letterbox';
  subtitleColor: string;
  fontSize: number;
  subtitleYPosition: number;
  autoReactions: boolean;
  voice: string;
  wordsPerChunk: number;
  storyText: string;
  screenshotFile: File | null;
}

const COLOR_HEX: Record<string, string> = {
  magenta: '#FF00FF',
  cyan: '#00FFFF',
  green: '#22C55E',
  yellow: '#EAB308',
  purple: '#A855F7',
};

export default function App() {
  const [activeSection, setActiveSection] = useState('create');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMode, setSelectedMode] = useState('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [clips, setClips] = useState<Clip[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [settings, setSettings] = useState<Settings>({
    aspectRatio: '9:16 Vertical',
    backgroundFit: 'Zoom',
    subtitleColor: 'cyan',
    fontSize: 48,
    subtitleYPosition: 70,
    autoReactions: true,
    voice: 'fr-FR-HenriNeural',
    wordsPerChunk: 160,
    storyText: '',
    screenshotFile: null,
  });

  const stopPoll = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const cleanupJob = (id: string) => fetch(`/cleanup/${id}`, { method: 'POST' }).catch(() => {});

  const canGenerate = !!selectedFile && (
    (selectedMode === 'reddit-tts' || selectedMode === 'reddit-visual')
      ? settings.storyText.trim().length > 20
      : true
  );

  const handleGenerate = async () => {
    if (!canGenerate || !selectedFile) return;
    if (jobId) cleanupJob(jobId);
    stopPoll();
    setError(null);
    setShowResults(false);
    setClips([]);
    setIsGenerating(true);
    setGenerationProgress(0);
    setCurrentStep('Upload de la vidéo…');

    const flaskMode =
      selectedMode === 'reddit-tts'     ? 'reddit' :
      selectedMode === 'reddit-visual'  ? 'reddit_visual' :
      'normal';

    const fd = new FormData();
    fd.append('video', selectedFile);
    fd.append('mode', flaskMode);
    fd.append('vertical', settings.aspectRatio === '9:16 Vertical' ? 'true' : 'false');
    fd.append('zoom', settings.backgroundFit === 'Zoom' ? 'true' : 'false');
    fd.append('font_size', String(settings.fontSize));
    fd.append('sub_y_pct', String(settings.subtitleYPosition));
    fd.append('neon_color', COLOR_HEX[settings.subtitleColor] ?? '#FF00FF');
    fd.append('inject_reactions', String(settings.autoReactions));

    if (flaskMode !== 'normal') {
      fd.append('story_text', settings.storyText);
      fd.append('tts_voice', settings.voice);
      fd.append('words_per_chunk', String(settings.wordsPerChunk));
    }
    if (flaskMode === 'reddit_visual' && settings.screenshotFile) {
      fd.append('screenshot', settings.screenshotFile);
    }

    try {
      const res = await fetch('/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newJobId = data.job_id as string;
      setJobId(newJobId);

      pollRef.current = setInterval(async () => {
        try {
          const s = await fetch(`/status/${newJobId}`).then(r => r.json());
          setGenerationProgress(s.progress ?? 0);
          setCurrentStep(s.step ?? '…');
          if (s.clips?.length) setClips(s.clips);
          if (s.status === 'done') {
            stopPoll(); setIsGenerating(false); setShowResults(true);
          } else if (s.status === 'error') {
            stopPoll(); setIsGenerating(false); setError(s.error ?? 'Erreur inconnue');
          }
        } catch { /* keep polling on hiccup */ }
      }, 1200);
    } catch (err: unknown) {
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  return (
    <div className="dark w-screen h-screen bg-[#0a0a0f] text-white flex overflow-hidden">
      {isGenerating && <LoadingScreen progress={generationProgress} currentStep={currentStep} />}

      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-8 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
              Create Viral Shorts
            </h1>
            <p className="text-lg text-gray-400 mb-6">
              Generate TikTok, Shorts & Reels automatically with AI subtitles.
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm max-w-lg mx-auto">
                ❌ {error}
              </div>
            )}

            <motion.button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              whileHover={{ scale: canGenerate ? 1.05 : 1 }}
              whileTap={{ scale: canGenerate ? 0.95 : 1 }}
              className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 inline-flex items-center gap-3
                ${canGenerate
                  ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white shadow-2xl shadow-cyan-500/50 hover:shadow-3xl hover:shadow-cyan-500/70'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
                }`}
            >
              <Sparkles className="w-6 h-6" />
              {isGenerating ? 'Génération en cours…' : 'Generate Shorts'}
            </motion.button>
          </motion.div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <VideoUpload onVideoSelect={setSelectedFile} />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <ModeSelector selectedMode={selectedMode} onModeSelect={setSelectedMode} />
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                <SettingsPanel settings={settings} onSettingsChange={setSettings} activeMode={selectedMode} />
              </motion.div>

              {showResults && jobId && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <ExportResults clips={clips} jobId={jobId} activeMode={selectedMode} />
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-1">
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="sticky top-8">
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
