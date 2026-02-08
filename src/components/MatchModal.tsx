import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Instagram } from 'lucide-react';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendWave: () => void;
  matchedProfile: {
    displayName: string;
    avatarUrl: string;
  } | null;
  currentUserAvatar?: string;
}

export const MatchModal = ({
  isOpen,
  onClose,
  onSendWave,
  matchedProfile,
  currentUserAvatar,
}: MatchModalProps) => {
  if (!matchedProfile) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="glass-card p-8 max-w-sm w-full text-center relative"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-6 h-6" />
            </button>
            
            {/* Title */}
            <motion.h2
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="text-3xl font-bold gradient-text mb-6"
            >
              ✨ IT'S A MATCH! ✨
            </motion.h2>
            
            {/* Avatars */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <img
                  src={currentUserAvatar || '/placeholder.svg'}
                  alt="You"
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                />
              </motion.div>
              
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="text-4xl"
              >
                💜
              </motion.div>
              
              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <img
                  src={matchedProfile.avatarUrl || '/placeholder.svg'}
                  alt={matchedProfile.displayName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-secondary"
                />
              </motion.div>
            </div>
            
            <p className="text-muted-foreground mb-8">
              You and <span className="text-foreground font-semibold">{matchedProfile.displayName}</span> liked each other!
            </p>
            
            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={onSendWave}
                className="w-full btn-gradient flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Send Wave 👋
              </button>
              
              <button
                onClick={onClose}
                className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep Swiping
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
