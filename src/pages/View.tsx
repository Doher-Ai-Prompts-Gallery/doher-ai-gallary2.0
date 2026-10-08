import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, retryFirebaseOperation } from '../lib/firebase';
import { Prompt } from '../types';
import { useApp } from '../context/AppContext';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, Calendar, Tag, Eye, Check, WifiOff, RefreshCcw } from 'lucide-react';
import { detectPlaceholders } from '../lib/placeholder';
import { PlaceholderModal } from '../components/PlaceholderModal';

export const View: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setLoading, setRetryAction } = useApp();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const docSnap = await retryFirebaseOperation(() => getDoc(doc(db, 'prompts', id)));
      if (docSnap.exists()) {
        setPrompt({ id: docSnap.id, ...docSnap.data() } as Prompt);
      } else {
        console.error("Prompt not found");
        navigate('/');
      }
    } catch (err: any) {
      console.error("Error fetching prompt:", err);
      setError(err?.message?.includes('offline') ? 'You are currently offline. Please check your connection.' : 'Unable to connect to the gallery.');
      setRetryAction(() => fetchPrompt());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompt();
  }, [id]);

  const handleCopy = () => {
    if (!prompt) return;
    const placeholders = detectPlaceholders(prompt.prompt);
    if (placeholders.length > 0) {
      setIsPlaceholderModalOpen(true);
    } else {
      navigator.clipboard.writeText(prompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-gold font-bold mb-8 transition-colors group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Back to Gallery
      </Link>

      {error && (
        <div className="glass-card p-6 mb-8 border-yellow-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WifiOff className="text-yellow-500 w-6 h-6" />
            <p className="text-gray-300 font-medium">{error}</p>
          </div>
          <button 
            onClick={fetchPrompt}
            className="gold-button py-2 px-6 text-sm flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
      )}

      {prompt && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-full">
          {/* Left: Full Image Viewer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card flex items-center justify-center bg-black/40 border-brand-gold/10 w-full min-h-[300px] max-h-[80vh] relative"
          >
            {prompt.imageUrl ? (
              <img 
                src={prompt.imageUrl} 
                alt={prompt.title} 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-brand-panel flex items-center justify-center italic text-gray-600 min-h-[300px]">
                No image available
              </div>
            )}
          </motion.div>

          {/* Right: Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-full w-full max-w-full"
          >
            <div className="mb-6">
               <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 break-words">
                 {prompt.title}
               </h1>
               
               <div className="flex flex-wrap items-center gap-3 mb-6">
                 <span className="bg-brand-gold/10 text-brand-gold text-xs font-black px-3 py-1 rounded border border-brand-gold/20 uppercase tracking-widest whitespace-nowrap">
                   {prompt.categoryName}
                 </span>
                 <div className="flex items-center gap-1.5 text-gray-400 text-sm font-bold bg-white/5 px-3 py-1 rounded border border-white/5 whitespace-nowrap">
                   <Eye className="w-4 h-4 text-brand-gold" />
                   <span>
                     {prompt.useCustomViews ? prompt.customViews : (prompt.views || 0).toLocaleString()} Views
                   </span>
                 </div>
               </div>
            </div>

            <div className="glass-card p-6 md:p-8 border-brand-gold/5 bg-white/[0.02] flex-grow flex flex-col w-full max-w-full">
              <h3 className="text-sm font-black text-brand-gold uppercase tracking-[0.2em] mb-4 flex items-center gap-2 shrink-0">
                Prompt
              </h3>
              <div className="text-base md:text-xl text-gray-300 leading-relaxed font-medium whitespace-pre-wrap flex-grow overflow-wrap-anywhere break-words mb-8">
                {prompt.prompt}
              </div>
              
              <div className="mt-auto shrink-0">
                <button
                  onClick={handleCopy}
                  className="gold-button w-full flex items-center justify-center gap-3 py-4 text-lg"
                >
                  {copied ? (
                    <>
                      <Check className="w-6 h-6" />
                      Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="w-6 h-6" />
                      Copy Prompt
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-3 text-gray-500 bg-white/5 p-3 rounded-xl border border-white/5">
                <Tag className="w-5 h-5 text-brand-gold shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 truncate">Category</p>
                  <p className="text-sm font-bold text-gray-300 truncate">{prompt.categoryName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-500 bg-white/5 p-3 rounded-xl border border-white/5">
                <Calendar className="w-5 h-5 text-brand-gold shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 truncate">Created At</p>
                  <p className="text-sm font-bold text-gray-300 truncate">
                    {prompt.createdAt?.toDate ? prompt.createdAt.toDate().toLocaleDateString() : 'Recent'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {prompt && (
        <PlaceholderModal
          isOpen={isPlaceholderModalOpen}
          onClose={() => setIsPlaceholderModalOpen(false)}
          promptText={prompt.prompt}
          placeholders={detectPlaceholders(prompt.prompt)}
          onCopy={(final) => {
            navigator.clipboard.writeText(final);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        />
      )}
    </div>
  );
};
