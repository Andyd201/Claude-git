import { useState } from 'react';
import { Download, ChevronDown, ChevronUp, Trash2, Video, Mic, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { HistoryEntry, Clip } from '../App';

interface HistoryProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
}

const MODE_ICONS: Record<string, typeof Video> = {
  'normal': Video,
  'reddit-tts': Mic,
  'reddit-visual': FileText,
};

const MODE_COLORS: Record<string, string> = {
  'normal': 'from-blue-500 to-cyan-500',
  'reddit-tts': 'from-fuchsia-500 to-pink-500',
  'reddit-visual': 'from-purple-500 to-indigo-500',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDur(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m${(Math.round(s % 60)).toString().padStart(2, '0')}s`;
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60).toString().padStart(2, '0')}m`;
}

function ClipRow({ clip, jobId }: { clip: Clip; jobId: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <span className="text-xs text-gray-400">#{clip.id}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{clip.name}</div>
        {clip.transcript && (
          <div className="text-xs text-gray-500 truncate">{clip.transcript.slice(0, 80)}{clip.transcript.length > 80 ? '…' : ''}</div>
        )}
      </div>
      <span className="text-xs text-gray-500 shrink-0">{fmtDur(clip.duration)}</span>
      <a
        href={`/download/${jobId}/${clip.filename}`}
        download={clip.filename}
        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-cyan-500/20 flex items-center justify-center transition-all shrink-0"
        title="Télécharger"
      >
        <Download className="w-3.5 h-3.5 text-gray-400 hover:text-cyan-400" />
      </a>
    </div>
  );
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = MODE_ICONS[entry.mode] ?? Video;
  const gradient = MODE_COLORS[entry.mode] ?? 'from-gray-500 to-gray-600';

  return (
    <motion.div
      layout
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
    >
      {/* Header row */}
      <button
        className="w-full flex items-center gap-4 p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-white">{entry.modeLabel}</span>
            <span className="text-[10px] px-2 py-0.5 bg-white/10 text-gray-400 rounded-full">
              {entry.clips.length} clip{entry.clips.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {fmtDate(entry.date)}
            </span>
            <span>{fmtDur(entry.totalDuration)} généré</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {entry.clips.length > 0 && (
            <a
              href={`/zip/${entry.jobId}`}
              download={`videoshorts_${entry.jobId.slice(0, 8)}.zip`}
              className="px-3 py-1.5 bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 rounded-lg text-xs transition-all flex items-center gap-1.5"
              onClick={e => e.stopPropagation()}
            >
              <Download className="w-3 h-3" />
              ZIP
            </a>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded clips list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 px-4 pb-4 overflow-hidden"
          >
            <div className="pt-3">
              {entry.clips.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">
                  Les fichiers de cette session ne sont plus disponibles.
                </p>
              ) : (
                entry.clips.map(clip => (
                  <ClipRow key={clip.id} clip={clip} jobId={entry.jobId} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function History({ history, onClearHistory }: HistoryProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const totalClips = history.reduce((s, e) => s + e.clips.length, 0);
  const totalDur = history.reduce((s, e) => s + e.totalDuration, 0);

  if (history.length === 0) {
    return (
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
            Historique
          </h1>
        </motion.div>
        <div className="text-center py-20 text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg mb-1">Aucune session pour l'instant</p>
          <p className="text-sm">Tes générations apparaîtront ici après la première utilisation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
            Historique
          </h1>
          <p className="text-gray-400">
            {history.length} session{history.length > 1 ? 's' : ''} · {totalClips} clip{totalClips > 1 ? 's' : ''} · {fmtDur(totalDur)} généré
          </p>
        </div>

        <div>
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 rounded-lg transition-all"
              >
                Annuler
              </button>
              <button
                onClick={() => { onClearHistory(); setConfirmClear(false); }}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-all"
              >
                Confirmer
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Effacer l'historique
            </button>
          )}
        </div>
      </motion.div>

      {/* Sessions list */}
      <div className="space-y-3">
        {history.map((entry, i) => (
          <motion.div
            key={entry.jobId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <HistoryCard entry={entry} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
