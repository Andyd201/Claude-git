import { Download, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

export function ExportResults() {
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);

  const mockClips = [
    {
      id: 1,
      thumbnail: 'Clip #1',
      duration: '0:15',
      size: '12.4 MB',
      title: 'Viral Moment - Opening Hook'
    },
    {
      id: 2,
      thumbnail: 'Clip #2',
      duration: '0:22',
      size: '18.7 MB',
      title: 'Best Part - Reaction'
    },
    {
      id: 3,
      thumbnail: 'Clip #3',
      duration: '0:18',
      size: '15.2 MB',
      title: 'Closing Statement'
    }
  ];

  const captions = {
    tiktok: "🔥 YOU WON'T BELIEVE THIS! 😱\n\n#fyp #viral #trending #storytime #reddit #shorts #foryou #mindblown",
    youtube: "The craziest story you'll hear today! 🤯\n\n#Shorts #Viral #Story #MustWatch",
    instagram: "Wait for it... 😳💥\n\n#reels #viral #trending #story #mustwatch #insane"
  };

  const handleCopy = (platform: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCaption(platform);
    setTimeout(() => setCopiedCaption(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">Generated Clips</h3>

        <div className="grid grid-cols-3 gap-4">
          {mockClips.map((clip, index) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-cyan-500/30 transition-all group"
            >
              {/* Thumbnail */}
              <div className="aspect-[9/16] bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center relative overflow-hidden">
                <div className="text-2xl font-bold text-white/50">{clip.thumbnail}</div>
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded-lg backdrop-blur-sm">
                  {clip.duration}
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Download className="w-5 h-5 text-black" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="text-sm font-medium text-white mb-2 truncate">{clip.title}</h4>
                <p className="text-xs text-gray-400 mb-3">{clip.size}</p>

                {/* Actions */}
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    Download MP4
                  </button>
                  <button className="w-full px-3 py-1.5 bg-white/5 text-gray-300 rounded-lg text-xs hover:bg-white/10 transition-all">
                    Download SRT
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Captions */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">Auto-Generated Captions</h3>

        <div className="space-y-3">
          {Object.entries(captions).map(([platform, text]) => (
            <div
              key={platform}
              className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-white capitalize">{platform}</span>
                <button
                  onClick={() => handleCopy(platform, text)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-xs transition-all flex items-center gap-1.5"
                >
                  {copiedCaption === platform ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-400 whitespace-pre-line">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
