import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check } from 'lucide-react';
import { getStoredPlaceholderValues, savePlaceholderValues, replacePlaceholders } from '../lib/placeholder';

interface PlaceholderModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  placeholders: string[];
  onCopy: (finalPrompt: string) => void;
}

export const PlaceholderModal: React.FC<PlaceholderModalProps> = ({
  isOpen,
  onClose,
  promptText,
  placeholders,
  onCopy
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredPlaceholderValues();
      const initialValues: Record<string, string> = {};
      placeholders.forEach(p => {
        initialValues[p] = stored[p] || '';
      });
      setValues(initialValues);
      setCopied(false);
    }
  }, [isOpen, placeholders]);

  const handleInputChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCopy = () => {
    const finalPrompt = replacePlaceholders(promptText, values);
    savePlaceholderValues(values);
    onCopy(finalPrompt);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md glass-card p-6 border-brand-gold/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold gold-text">Personalize Prompt</h3>
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-full text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              This prompt contains placeholders. Enter values to customize it.
            </p>

            <div className="space-y-4 mb-8">
              {placeholders.map(placeholder => (
                <div key={placeholder}>
                  <label className="block text-xs font-bold text-brand-gold uppercase mb-1 ml-1">
                    {placeholder}
                  </label>
                  <input
                    type="text"
                    value={values[placeholder] || ''}
                    onChange={(e) => handleInputChange(placeholder, e.target.value)}
                    placeholder={`Enter value for ${placeholder}...`}
                    className="input-field"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="gold-button w-full flex items-center justify-center gap-2 py-3"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Prompt Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Final Prompt
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
