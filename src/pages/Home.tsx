import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, retryFirebaseOperation } from '../lib/firebase';
import { Prompt, Category } from '../types';
import { GalleryCard } from '../components/GalleryCard';
import { PlaceholderModal } from '../components/PlaceholderModal';
import { useApp } from '../context/AppContext';
import { Search, Filter, ArrowRight, WifiOff, RefreshCcw } from 'lucide-react';
import { detectPlaceholders } from '../lib/placeholder';

export const Home: React.FC = () => {
  const { setLoading, setRetryAction } = useApp();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaceholderModalOpen, setIsPlaceholderModalOpen] = useState(false);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Categories
      const catSnapshot = await retryFirebaseOperation(() => getDocs(collection(db, 'categories')));
      const catList = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(catList);

      // Fetch Published Prompts - Simplify query to avoid composite index requirements
      const promptQuery = query(
        collection(db, 'prompts'),
        where('published', '==', true)
      );
      
      const promptSnapshot = await retryFirebaseOperation(() => getDocs(promptQuery));
      let promptList = promptSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
      
      // Sort in memory to avoid needing a composite index
      promptList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setPrompts(promptList);
    } catch (err: any) {
      console.error("Error fetching home data:", err);
      setError(err?.message?.includes('offline') ? 'You are currently offline. Showing cached data if available.' : 'Failed to connect to the gallery.');
      setRetryAction(() => fetchData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyRequest = (prompt: Prompt) => {
    const placeholders = detectPlaceholders(prompt.prompt);
    if (placeholders.length > 0) {
      setActivePrompt(prompt);
      setIsPlaceholderModalOpen(true);
    } else {
      navigator.clipboard.writeText(prompt.prompt);
      // Optional: show a simple toast or alert
      alert('Prompt copied to clipboard!');
    }
  };

  const filteredPrompts = prompts.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/20 via-brand-bg/60 to-brand-bg z-10" />
          <img 
            src="/src/assets/images/doher_logo_1790309001039.jpg" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-20 blur-sm scale-110"
          />
        </div>

        <div className="container mx-auto px-4 relative z-20 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-black mb-6 tracking-tighter"
          >
            Turn Your <span className="gold-text">Imagination</span><br />
            Into Reality
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto mb-10 text-lg md:text-xl leading-relaxed"
          >
            Discover stunning AI-generated images and get inspired by creative prompts. 
            Simply copy the prompt and use it in your favorite AI image generator.
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="max-w-xl mx-auto relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search stunning prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-panel/50 backdrop-blur-md border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand-gold transition-all shadow-2xl"
            />
          </motion.div>
        </div>
      </section>

      {/* Categories & Filter Section */}
      <section id="categories" className="container mx-auto px-4 mb-12">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Filter className="text-brand-gold w-6 h-6" />
              Explore by <span className="text-brand-gold">Category</span>
            </h2>
          </div>

          <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition-all ${
                selectedCategory === 'all' 
                ? 'bg-brand-gold text-black' 
                : 'bg-brand-panel text-gray-400 border border-white/5 hover:border-brand-gold/30'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-6 py-2 rounded-full font-bold transition-all ${
                  selectedCategory === cat.id 
                  ? 'bg-brand-gold text-black' 
                  : 'bg-brand-panel text-gray-400 border border-white/5 hover:border-brand-gold/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section id="explore" className="container mx-auto px-4">
        {error && (
          <div className="glass-card p-6 mb-8 border-yellow-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <WifiOff className="text-yellow-500 w-5 h-5" />
              </div>
              <p className="text-gray-300 font-medium">{error}</p>
            </div>
            <button 
              onClick={fetchData}
              className="gold-button py-2 px-6 text-sm flex items-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Try Reconnecting
            </button>
          </div>
        )}

        {filteredPrompts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredPrompts.map(prompt => (
              <GalleryCard 
                key={prompt.id} 
                prompt={prompt} 
                onCopyRequest={handleCopyRequest}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card py-20 text-center">
            <p className="text-xl text-gray-500 italic">No prompts found matching your criteria.</p>
          </div>
        )}
      </section>

      {/* Footer Branding */}
      <footer className="container mx-auto px-4 mt-32 py-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
        <div className="flex flex-col items-center md:items-start leading-none shrink-0">
          <span className="text-3xl font-black tracking-tighter text-white">DOHER</span>
          <span className="text-[10px] font-bold tracking-[0.4em] text-brand-gold">AI GALLERY</span>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8 md:gap-12 text-[10px] sm:text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest">
          <span className="hover:text-brand-gold cursor-pointer transition-colors whitespace-nowrap">Imagine</span>
          <span className="text-brand-gold opacity-50 hidden sm:inline">·</span>
          <span className="hover:text-brand-gold cursor-pointer transition-colors whitespace-nowrap">Copy</span>
          <span className="text-brand-gold opacity-50 hidden sm:inline">·</span>
          <span className="hover:text-brand-gold cursor-pointer transition-colors whitespace-nowrap">Create</span>
        </div>
        <p className="text-gray-600 text-[10px] font-medium shrink-0">© 2026 DOHER. All rights reserved.</p>
      </footer>

      {activePrompt && (
        <PlaceholderModal
          isOpen={isPlaceholderModalOpen}
          onClose={() => setIsPlaceholderModalOpen(false)}
          promptText={activePrompt.prompt}
          placeholders={detectPlaceholders(activePrompt.prompt)}
          onCopy={(final) => {
            navigator.clipboard.writeText(final);
            alert('Customized prompt copied!');
          }}
        />
      )}
    </div>
  );
};

import { motion } from 'motion/react';
