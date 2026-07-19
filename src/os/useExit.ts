import { useCallback, useRef, useState } from 'react';

/** True kad je korisnik tražio manje pokreta — JS animacije (spin, exit
 *  tajmeri) moraju ovo da poštuju same; CSS guard ih ne pokriva. */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Overlay izlaz: 150ms suptilnija animacija pre unmount-a (ulaz je 200ms —
 *  izlaz uvek tiši). Pod reduced-motion zatvara odmah. */
export const useExit = (onClose: () => void, ms = 150) => {
  const [closing, setClosing] = useState(false);
  const fired = useRef(false);
  const close = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
    window.setTimeout(onClose, ms);
  }, [onClose, ms]);
  return { closing, close };
};
