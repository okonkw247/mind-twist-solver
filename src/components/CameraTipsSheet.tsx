/**
 * CameraTipsSheet — 3-step onboarding sheet for the camera scanner.
 * Dismissal is persisted under "jsn_camera_tips_seen".
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TIPS = [
  {
    title: 'Focus your cube inside the grid and press Scan.',
    visual: 'grid',
  },
  {
    title: 'Use bright, even lighting. Avoid shadows on the stickers.',
    visual: 'lighting',
  },
  {
    title: 'Scan all 6 faces. Keep the same orientation each time.',
    visual: 'order',
  },
] as const;

const STORAGE_KEY = 'jsn_camera_tips_seen';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CameraTipsSheet({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const total = TIPS.length;

  const next = () => {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      try {
        localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card border-t border-border p-6 safe-bottom"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tips</h2>
              <span className="text-sm text-muted-foreground">
                {step + 1}/{total}
              </span>
            </div>

            <p className="text-center text-base font-medium mb-5">{TIPS[step].title}</p>

            <div className="mx-auto w-44 h-44 grid grid-cols-3 gap-1.5 mb-6 rounded-xl overflow-hidden">
              {SAMPLE_FACE.map((c, i) => (
                <div
                  key={i}
                  className="rounded-sm"
                  style={{ background: c, border: '1px solid rgba(0,0,0,0.4)' }}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-full py-3 rounded-xl bg-secondary/60 hover:bg-secondary text-foreground font-semibold tracking-wide uppercase text-sm"
            >
              {step === total - 1 ? 'Got it' : 'Next'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Reference colors mimicking the screenshot's tip image.
const SAMPLE_FACE = [
  '#C41E3A', '#FF5800', '#0051BA',
  '#F8F8F8', '#0051BA', '#FFD500',
  '#009E60', '#F8F8F8', '#0051BA',
];

export function shouldShowCameraTips() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  } catch {
    return true;
  }
}
