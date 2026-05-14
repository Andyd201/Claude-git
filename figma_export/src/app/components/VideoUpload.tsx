import { Upload, Video, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

interface VideoUploadProps {
  onVideoSelect: (file: File | null) => void;
}

export function VideoUpload({ onVideoSelect }: VideoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'video/mp4' || file.type === 'video/quicktime')) {
      setSelectedFile(file);
      onVideoSelect(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onVideoSelect(file);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    onVideoSelect(null);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Video className="w-4 h-4 text-cyan-400" />
        Video Input
      </h3>

      {!selectedFile ? (
        <motion.div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
          className={`
            relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300
            ${isDragging
              ? 'border-cyan-500 bg-cyan-500/10 shadow-2xl shadow-cyan-500/20'
              : 'border-white/10 bg-white/5 hover:border-cyan-500/50 hover:bg-white/10'
            }
          `}
        >
          <input
            type="file"
            accept="video/mp4,video/quicktime"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center border border-cyan-500/30">
              <Upload className="w-8 h-8 text-cyan-400" />
            </div>

            <div>
              <p className="text-lg font-semibold text-white mb-1">
                Drop your background video here
              </p>
              <p className="text-sm text-gray-400">
                Support MP4/MOV • Max 2GB
              </p>
            </div>

            <button className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all duration-300">
              Browse Files
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/5 rounded-3xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-500/10"
        >
          <button
            onClick={handleRemove}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-32 h-20 rounded-xl bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center border border-cyan-500/30">
              <Video className="w-8 h-8 text-cyan-400" />
            </div>

            <div className="flex-1">
              <p className="text-white font-medium mb-1">{selectedFile.name}</p>
              <p className="text-sm text-gray-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>

              {/* Mock Timeline */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Timeline Preview</span>
                  <span>00:00 / 15:32</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-gradient-to-r from-cyan-500 to-fuchsia-600 rounded-full shadow-lg shadow-cyan-500/50" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
