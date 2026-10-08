import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import logoImg from '../assets/images/doher_logo_1790309001039.jpg';

export const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const scrollToSection = (hash: string) => {
    setIsMenuOpen(false);
    if (!hash) {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const navLinks = [
    { name: 'Home', hash: '' },
    { name: 'Categories', hash: '#categories' },
    { name: 'Explore', hash: '#explore' },
  ];

  return (
    <header className="sticky top-0 z-[5000] w-full border-b border-white/5 bg-brand-bg/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Zone 1: Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full border border-brand-gold/30 p-1 flex items-center justify-center overflow-hidden bg-black">
             <img 
               src={logoImg} 
               alt="DOHER Logo" 
               className="w-full h-full object-contain group-hover:scale-110 transition-transform"
             />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tighter text-white">DOHER</span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-brand-gold">AI GALLERY</span>
          </div>
        </Link>

        {/* Zone 2: Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button 
              key={link.name} 
              onClick={() => scrollToSection(link.hash)}
              className="text-sm font-bold text-gray-400 hover:text-brand-gold transition-colors tracking-wide cursor-pointer"
            >
              {link.name}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <Link 
                to="/admin" 
                className="hidden sm:flex items-center gap-2 text-xs font-bold text-brand-gold hover:text-brand-gold-light"
              >
                <User className="w-4 h-4" />
                ADMIN PANEL
              </Link>
              <button 
                onClick={handleLogout}
                className="outline-button py-1.5 px-4 text-xs flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu (Overlay) */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-brand-panel border-b border-white/5 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <button 
                  key={link.name} 
                  onClick={() => scrollToSection(link.hash)}
                  className="text-left text-lg font-bold text-gray-300 hover:text-brand-gold cursor-pointer"
                >
                  {link.name}
                </button>
              ))}
              {user && (
                <Link 
                  to="/admin" 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg font-bold text-brand-gold"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

import { AnimatePresence, motion } from 'motion/react';
