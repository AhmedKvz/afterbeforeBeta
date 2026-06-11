import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { richGradient, glowBlob, GRAIN_OVERLAY } from '@/lib/gradients';

interface GradientImgProps {
  /** Real image url. If empty / placeholder, the hued gradient is shown instead. */
  src?: string | null;
  /** Hue 0–360 for the fallback gradient. */
  hue?: number;
  /** Optional monospace label shown over the gradient (e.g. venue name). */
  label?: string;
  alt?: string;
  className?: string;
  /** Extra classes for the <img> (e.g. group-hover scale). */
  imgClassName?: string;
  children?: ReactNode;
}

const isReal = (src?: string | null) => !!src && !src.includes('placeholder');

/**
 * GradientImg — port of the prototype's GradientImg (data.jsx).
 * Shows a real image when available, otherwise the signature deep hued
 * oklch gradient + grain + glow blob, so cards look like the prototype
 * even with no uploaded photo.
 */
export const GradientImg = ({
  src,
  hue = 280,
  label,
  alt = '',
  className,
  imgClassName,
  children,
}: GradientImgProps) => {
  const real = isReal(src);

  return (
    <div
      className={cn('overflow-hidden', className)}
      style={{
        contain: 'paint',
        ...(!real ? { background: richGradient(hue) } : {}),
      }}
    >
      {real ? (
        <img
          src={src!}
          alt={alt}
          draggable={false}
          loading="lazy"
          decoding="async"
          className={cn('absolute inset-0 w-full h-full object-cover', imgClassName)}
        />
      ) : (
        <>
          {/* diagonal grain — cheap, no blend mode */}
          <div
            className="absolute inset-0"
            style={{ opacity: 0.08, background: GRAIN_OVERLAY }}
          />
          {/* lights blob — soft radial, no blur filter */}
          <div
            className="absolute"
            style={{
              top: '-20%',
              right: '-10%',
              width: '70%',
              height: '70%',
              background: glowBlob(hue),
              opacity: 0.55,
            }}
          />
          {label && (
            <span
              className="absolute bottom-2 right-3 font-mono uppercase tracking-wide"
              style={{ fontSize: 10, color: 'hsl(var(--text-faint))' }}
            >
              {label}
            </span>
          )}
        </>
      )}
      {children}
    </div>
  );
};
