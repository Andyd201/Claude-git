import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoPreviewProps {
  subtitleColor: string;
  fontSize: number;
  subtitleYPosition: number;
  selectedFile?: File | null;
  activeMode?: string;
}

const SAMPLE_TEXTS: Record<string, string> = {
  'normal': 'THIS IS CRAZY!',
  'reddit-tts': 'You won\'t believe this...',
  'reddit-visual': 'Reddit story reveals all',
};

export function VideoPreview({
  subtitleColor,
  fontSize,
  subtitleYPosition,
  selectedFile,
  activeMode = 'normal',
}: VideoPreviewProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const colorMap: Record<string, string> = {
    magenta: 'rgb(255,0,255)',
    cyan: 'rgb(6,182,212)',
    green: 'rgb(34,197,94)',
    yellow: 'rgb(234,179,8)',
    purple: 'rgb(168,85,247)',
  };
  const currentColor = colorMap[subtitleColor] || colorMap.cyan;
  const sampleText = SAMPLE_TEXTS[activeMode] ?? 'THIS IS CRAZY!';
  const isRedditVisual = activeMode === 'reddit-visual';

  // Create / revoke object URL for uploaded file
  useEffect(() => {
    if (!selectedFile) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);
    setIsPlaying(false);
    setProgress(0);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Sync play/pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.play().catch(() => setIsPlaying(false));
    else v.pause();
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60), sc = Math.floor(s % 60);
    return `${m}:${sc.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-4">Live Preview</h3>

      <div className="relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[9/16] max-w-sm mx-auto">

        {/* Real video or animated mock */}
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            muted={isMuted}
            loop
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-cyan-900/30">
            <div className="absolute inset-0 opacity-40">
              <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
                {[...Array(9)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="border border-white/5"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-600 text-xs text-center px-4">
                Upload a video<br />to preview it here
              </p>
            </div>
          </div>
        )}

        {/* Reddit Card Mock (visual mode only, no real video) */}
        {isRedditVisual && !videoUrl && (
          <div className="absolute top-8 left-4 right-4 bg-[#0d0d1a]/90 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded-full" style={{ background: currentColor }} />
              <span className="text-xs text-gray-400">r/reddit · histoire</span>
            </div>
            <div className="space-y-2">
              {['You won\'t believe...', 'what happened next', 'in this story'].map((t, i) => (
                <div
                  key={i}
                  className={`text-xs px-2 py-1 rounded ${i === 1 ? 'text-white font-bold' : 'text-gray-500'}`}
                  style={i === 1 ? {
                    background: `${currentColor}20`,
                    borderLeft: `3px solid ${currentColor}`,
                  } : {}}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subtitle overlay */}
        <div
          className="absolute left-0 right-0 px-6 text-center pointer-events-none z-10"
          style={{ top: `${subtitleYPosition}%`, transform: 'translateY(-50%)' }}
        >
          <motion.div
            animate={{
              textShadow: [
                `0 0 10px ${currentColor}, 0 0 20px ${currentColor}`,
                `0 0 20px ${currentColor}, 0 0 35px ${currentColor}`,
                `0 0 10px ${currentColor}, 0 0 20px ${currentColor}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="font-black uppercase tracking-tight"
            style={{
              fontSize: `${Math.max(10, fontSize * 0.38)}px`,
              color: 'white',
              WebkitTextStroke: `1px ${currentColor}`,
              paintOrder: 'stroke fill',
            }}
          >
            {sampleText}
          </motion.div>
        </div>

        {/* Play/Pause overlay (only when video loaded) */}
        {videoUrl ? (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-all group cursor-pointer z-20"
            onClick={() => setIsPlaying(p => !p)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {isPlaying
                ? <Pause className="w-6 h-6 text-black" fill="currentColor" />
                : <Play className="w-6 h-6 text-black ml-1" fill="currentColor" />
              }
            </motion.div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-20">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-16 h-16 rounded-full bg-white/20 border border-white/30 flex items-center justify-center"
            >
              <Play className="w-8 h-8 text-white/50 ml-1" />
            </motion.div>
          </div>
        )}

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-30">
          {/* Seekbar */}
          <div
            className="h-1 bg-white/20 rounded-full overflow-hidden mb-3 cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${videoUrl ? progress : 45}%`,
                background: videoUrl
                  ? `linear-gradient(90deg, ${currentColor}, ${currentColor}bb)`
                  : 'white',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-white">
            <span>
              {videoUrl && videoRef.current
                ? `${fmt(videoRef.current.currentTime)} / ${fmt(duration)}`
                : '0:08 / 0:15'}
            </span>
            {videoUrl && (
              <button
                onClick={() => {
                  setIsMuted(m => !m);
                  if (videoRef.current) videoRef.current.muted = !isMuted;
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          {videoUrl
            ? 'Your uploaded video — subtitle preview is live'
            : 'Preview updates in real-time as you adjust settings'}
        </p>
      </div>
    </div>
  );
}
