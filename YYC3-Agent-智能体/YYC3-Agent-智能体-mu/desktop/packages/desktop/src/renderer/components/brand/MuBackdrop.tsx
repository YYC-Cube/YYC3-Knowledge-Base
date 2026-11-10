import React, { useId } from 'react';
import classNames from 'classnames';
import { MU_GLYPH_PATH } from './glyph';
import styles from './Brand.module.css';

export type MuBackdropProps = {
  /** The page is on its way to a conversation: the glyph fades out, and a conversation starts without it. */
  leaving?: boolean;
  className?: string;
};

/** A little lighter than the icon's stroke: at this size a heavy stroke turns the bowl into a blob. */
const STROKE = 8.6;
/** The edge is the rim of a slightly wider stroke: about one pixel at the sizes it is drawn. */
const EDGE = 0.55;
/** The glyph's box in the icon's 100x100 space, with room for the round caps. */
const VIEW_BOX = '28 25 45 56';

/**
 * The home page's backdrop: the mu glyph, large and faint, behind the greeting, a touch of pale pink fading
 * towards the text. Decorative only. Its colours come from Brand.module.css, per theme.
 */
const MuBackdrop: React.FC<MuBackdropProps> = ({ leaving = false, className }) => {
  const id = `mu-backdrop-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <span
      className={classNames(styles.backdrop, leaving && styles.backdropLeaving, className)}
      data-testid='mu-backdrop'
      data-state={leaving ? 'leaving' : 'shown'}
      aria-hidden='true'
    >
      <svg viewBox={VIEW_BOX} fill='none' focusable='false' preserveAspectRatio='xMidYMid meet'>
        <defs>
          {/* Faded towards the greeting, but never gone: the descender is what makes it a μ and not a u. */}
          <linearGradient id={`${id}-fill`} x1='0' y1='25' x2='0' y2='81' gradientUnits='userSpaceOnUse'>
            <stop offset='0' className={styles.backdropFillTop} />
            <stop offset='1' className={styles.backdropFillBottom} />
          </linearGradient>
          <linearGradient id={`${id}-edge`} x1='0' y1='25' x2='0' y2='81' gradientUnits='userSpaceOnUse'>
            <stop offset='0' className={styles.backdropEdgeTop} />
            <stop offset='1' className={styles.backdropEdgeBottom} />
          </linearGradient>
          <mask id={`${id}-rim`} maskUnits='userSpaceOnUse' x='28' y='25' width='45' height='56'>
            <path
              d={MU_GLYPH_PATH}
              stroke='#fff'
              strokeWidth={STROKE + EDGE * 2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
            <path d={MU_GLYPH_PATH} stroke='#000' strokeWidth={STROKE} strokeLinecap='round' strokeLinejoin='round' />
          </mask>
        </defs>
        <path
          d={MU_GLYPH_PATH}
          stroke={`url(#${id}-fill)`}
          strokeWidth={STROKE}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <rect x='28' y='25' width='45' height='56' fill={`url(#${id}-edge)`} mask={`url(#${id}-rim)`} />
      </svg>
    </span>
  );
};

export default MuBackdrop;
