import { Film, Clock, Zap, TrendingUp, ArrowRight, Video, Mic, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import type { HistoryEntry } from '../App';

interface DashboardProps {
  history: HistoryEntry[];
  stats: { clipsCount: number; timeSavedH: number };
  onStartCreate: () => void;
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
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function fmtDur(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m${Math.round(s % 60)}s`;
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
}

export function Dashboard({ history, stats, onStartCreate }: DashboardProps) {
  const recent = history.slice(0, 5);
  const jobCount = history.length;

  const timeSavedLabel = stats.timeSavedH >= 1
    ? `${stats.timeSavedH.toFixed(1)}h`
    : stats.timeSavedH > 0
      ? `${Math.round(stats.timeSavedH * 60)}m`
      : '0';

  const statCards = [
    { label: 'Clips générés', value: stats.clipsCount, icon: Film, color: 'text-cyan-400', bg: 'from-cyan-500/10 to-cyan-500/5' },
    { label: 'Durée totale', value: timeSavedLabel, icon: Clock, color: 'text-fuchsia-400', bg: 'from-fuchsia-500/10 to-fuchsia-500/5' },
    { label: 'Sessions', value: jobCount, icon: TrendingUp, color: 'text-purple-400', bg: 'from-purple-500/10 to-purple-500/5' },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-purple-600 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-gray-400">Vue d'ensemble de votre activité VideoShorts.</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-gradient-to-br ${card.bg} border border-white/10 rounded-2xl p-6`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <span className="text-sm text-gray-400">{card.label}</span>
              </div>
              <div className="text-3xl font-bold text-white">{card.value}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick start */}
      {stats.clipsCount === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 border border-cyan-500/20 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-fuchsia-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Commencer à créer</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Génère ton premier short viral en quelques minutes avec l'IA.
          </p>
          <motion.button
            onClick={onStartCreate}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white rounded-xl font-semibold inline-flex items-center gap-2 shadow-lg shadow-cyan-500/30"
          >
            Créer un Short <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      )}

      {/* Recent jobs */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Sessions récentes</h2>
          <div className="space-y-3">
            {recent.map((entry, i) => {
              const Icon = MODE_ICONS[entry.mode] ?? Video;
              const gradient = MODE_COLORS[entry.mode] ?? 'from-gray-500 to-gray-600';
              return (
                <motion.div
                  key={entry.jobId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 hover:border-white/20 transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-white">{entry.modeLabel}</span>
                      <span className="text-xs text-gray-500">{fmtDate(entry.date)}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {entry.clips.length} clip{entry.clips.length !== 1 ? 's' : ''} · {fmtDur(entry.totalDuration)} généré
                    </div>
                  </div>
                  <div className="text-xs font-mono text-gray-600 shrink-0">
                    #{entry.jobId.slice(0, 6)}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {history.length > 5 && (
            <p className="text-xs text-gray-500 text-center mt-3">
              +{history.length - 5} sessions supplémentaires dans l'historique
            </p>
          )}
        </div>
      )}

      {/* CTA (if has history) */}
      {stats.clipsCount > 0 && (
        <motion.button
          onClick={onStartCreate}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 font-semibold hover:from-cyan-500/20 hover:to-fuchsia-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          Créer un nouveau Short
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
