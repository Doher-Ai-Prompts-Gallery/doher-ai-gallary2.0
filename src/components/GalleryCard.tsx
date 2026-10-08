import React from 'react';
import { motion } from 'motion/react';
import { Copy, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Prompt } from '../types';
import { detectPlaceholders } from '../lib/placeholder';

interface GalleryCardProps {
  prompt: Prompt;
  onCopyRequest: (prompt: Prompt) => void;
}

export const GalleryCard: React.FC<GalleryCardProps> = ({ prompt, onCopyRequest }) => {
  const placeholders = detectPlaceholders(prompt.prompt);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card group hover:border-brand-gold/30 transition-all duration-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {prompt.imageUrl ? (
          <img 
            src={prompt.imageUrl} 
            alt={prompt.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-brand-bg flex items-center justify-center">
            <span className="text-gray-600 italic">No image</span>
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span className="bg-black/60 backdrop-blur-md text-brand-gold text-[10px] font-bold px-2 py-1 rounded border border-brand-gold/20 uppercase tracking-widest">
            {prompt.categoryName}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-white mb-4 line-clamp-1 group-hover:text-brand-gold transition-colors">
          {prompt.title}
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onCopyRequest(prompt)}
            className="gold-button py-2 px-0 text-xs flex items-center justify-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
          <Link
            to={`/view/${prompt.id}`}
            className="outline-button py-2 px-0 text-xs flex items-center justify-center gap-2"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
