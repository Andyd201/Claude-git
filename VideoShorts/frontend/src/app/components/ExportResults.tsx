import { Download, Copy, Check, FileText, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useRef } from 'react';
import type { Clip } from '../App';

interface ExportResultsProps {
  clips: Clip[];
  jobId: string;
  activeMode: string;
}

const PLATFORM_CAPTIONS = {
  tiktok: (title: string, transcript: string, keywords: string[]) =>
    `${title} 🎬\n\n${transcript.slice(0, 180)}${transcript.length > 180 ? '…' : ''}\n\n${['#fyp', '#foryoupage', '#viral', '#trending', '#tiktok', ...keywords.map(k => '#' + k)].slice(0, 10).join(' ')}`,
  youtube: (title: string, transcript: string, keywords: string[]) =>
    `TITRE: ${(title + ' #Shorts').slice(0, 100)}\n\n— DESCRIPTION —\n${transcript.slice(0, 400)}${transcript.length > 400 ? '…' : ''}\n\n${['#Shorts', '#YouTubeShorts', '#viral', ...keywords.map(k => '#' + k)].join('\n')}`,
  instagram: (title: string, transcript: string, keywords: string[]) =>
    `✨ ${title}\n\n${transcript.slice(0, 200)}${transcript.length > 200 ? '…' : ''}\n\n.\n.\n.\n${['#reels', '#reelsinstagram', '#viral', '#trending', ...keywords.map(k => '#' + k)].slice(0, 30).join(' ')}`,
};

function extractKeywords(text: string, max: number): string[] {
  if (!text) return [];
  const stops = new Set('the a an is in on at to for of and or but i my was he she it we they that this with be have had has did do not as so if from about get got just me you are were been by what when how its our their qui que dans les des une est pas par sur avec pour tout mais plus bien lui elle ils elles nous vous mon ton son ses mes tes aux'.split(' '));
  const freq: Record<string, number> = {};
  (text.toLowerCase().match(/\b[a-zà-ÿ]{4,}\b/g) ?? []).forEach(w => {
    if (!stops.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  });
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, max).map(e => e[0]);
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60), sc = Math.round(s % 60);
  return m > 0 ? `${m}m${sc.toString().padStart(2, '0')}s` : `${sc}s`;
}

function VideoThumbnail({ jobId, filename, label }: { jobId: string; filename: string; label: string }) {
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-2xl font-bold text-white/40">{label}</div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={`/stream/${jobId}/${filename}`}
      className="absolute inset-0 w-full h-full object-cover"
      muted
      preload="metadata"
      onError={() => setHasError(true)}
      onLoadedMetadata={() => {
        if (videoRef.current) videoRef.current.currentTime = 1;
      }}
    />
  );
}

export function ExportResults({ clips, jobId, activeMode }: ExportResultsProps) {
  const [activePlat, setActivePlat] = useState<'tiktok' | 'youtube' | 'instagram'>('tiktok');
  const [copied, setCopied] = useState<number | null>(null);
  const [zipping, setZipping] = useState(false);

  const isReddit = activeMode === 'reddit-tts' || activeMode === 'reddit-visual';
  const clipLabel = isReddit ? 'Partie' : 'Clip';
  const platTabs = ['tiktok', 'youtube', 'instagram'] as const;

  const handleCopy = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2200);
  };

  const handleDownloadAll = async () => {
    setZipping(true);
    try {
      const a = document.createElement('a');
      a.href = `/zip/${jobId}`;
      a.download = `videoshorts_${jobId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setZipping(false), 1500);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header + Download All */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {clips.length} {clipLabel}(s) générée(s)
        </h3>
        {clips.length > 1 && (
          <motion.button
            onClick={handleDownloadAll}
            disabled={zipping}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${zipping
                ? 'bg-white/5 text-gray-500 cursor-wait'
                : 'bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-500/30 text-cyan-400 hover:from-cyan-500/30 hover:to-fuchsia-500/30'
              }`}
          >
            <Package className="w-4 h-4" />
            {zipping ? 'Préparation…' : `Tout télécharger (.zip)`}
          </motion.button>
        )}
      </div>

      {/* Clips grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {clips.map((clip, idx) => (
          <motion.div
            key={clip.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition-all group"
          >
            {/* Thumbnail with actual video */}
            <div className="aspect-[9/16] bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 flex items-center justify-center relative overflow-hidden">
              <VideoThumbnail jobId={jobId} filename={clip.filename} label={`${clipLabel} #${clip.id}`} />

              <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded-lg backdrop-blur-sm z-10">
                {fmtDur(clip.duration)}
              </div>

              {/* Hover overlay with download */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                <a
                  href={`/download/${jobId}/${clip.filename}`}
                  download={clip.filename}
                  className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-all"
                  onClick={e => e.stopPropagation()}
                >
                  <Download className="w-5 h-5 text-black" />
                </a>
              </div>
            </div>

            <div className="p-4">
              <h4 className="text-sm font-medium text-white mb-1 truncate">{clip.name}</h4>
              <p className="text-xs text-gray-400 mb-1">⏱ {fmtDur(clip.duration)}</p>
              {clip.transcript && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{clip.transcript}</p>
              )}
              <div className="space-y-2">
                <a
                  href={`/download/${jobId}/${clip.filename}`}
                  download={clip.filename}
                  className="w-full px-3 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download MP4
                </a>
                <a
                  href={`/download/${jobId}/${clip.srt_filename}`}
                  download={clip.srt_filename}
                  className="w-full px-3 py-1.5 bg-white/5 text-gray-300 rounded-lg text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-3 h-3" />
                  Download SRT
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Captions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Captions générées</h3>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {platTabs.map(p => (
              <button
                key={p}
                onClick={() => setActivePlat(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                  ${activePlat === p ? 'bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {clips.map((clip, idx) => {
            const keywords = extractKeywords(clip.transcript ?? '', 6);
            const caption = PLATFORM_CAPTIONS[activePlat](clip.name, clip.transcript ?? '', keywords);
            return (
              <div key={clip.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <span className="text-sm font-medium text-white">{clipLabel} {clip.id}</span>
                  <button
                    onClick={() => handleCopy(idx, caption)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {copied === idx ? (
                      <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copié !</span></>
                    ) : (
                      <><Copy className="w-3 h-3" />Copier</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 whitespace-pre-line">{caption}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
