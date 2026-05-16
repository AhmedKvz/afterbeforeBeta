// Shared motion presets — keep all animations feeling like one product.

export const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.25 },
};

export const stagger = (delay = 0.06) => ({
  animate: {
    transition: {
      staggerChildren: delay,
    },
  },
});

export const popIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 22 },
};
