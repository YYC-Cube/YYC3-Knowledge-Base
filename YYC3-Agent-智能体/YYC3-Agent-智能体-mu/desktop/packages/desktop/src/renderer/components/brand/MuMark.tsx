import React, { useId } from 'react';
import classNames from 'classnames';
import { MU_GLYPH_PATH, MU_GLYPH_STROKE, MU_TILE_STOPS } from './glyph';
import styles from './Brand.module.css';

export type MuMarkProps = {
  /** Edge length in px. */
  size?: number;
  /** `tile`: the gradient tile with a white glyph. `glyph`: the glyph alone, painted with the gradient. */
  variant?: 'tile' | 'glyph';
  /** A soft halo behind the mark, for hero placements (empty state, startup gate). */
  halo?: boolean;
  /** Accessible name. Without it the mark is decorative and hidden from assistive technology. */
  title?: string;
  className?: string;
};

/**
 * The mu brand mark, drawn as SVG so it stays crisp from 16 px up and needs no image request.
 * Colours are fixed brand colours on purpose: the mark looks the same in every theme.
 */
const MuMark: React.FC<MuMarkProps> = ({ size = 32, variant = 'tile', halo = false, title, className }) => {
  const gradientId = `mu-mark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const tile = variant === 'tile';
  return (
    <span
      className={classNames(styles.mark, halo && styles.halo, className)}
      style={{ width: size, height: size }}
      data-testid='mu-mark'
    >
      <svg
        width={size}
        height={size}
        viewBox='0 0 100 100'
        fill='none'
        role={title ? 'img' : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : true}
        focusable='false'
      >
        <defs>
          <linearGradient id={gradientId} x1='0' y1='0' x2='100' y2='100' gradientUnits='userSpaceOnUse'>
            <stop offset='0' stopColor={MU_TILE_STOPS[0]} />
            <stop offset='0.5' stopColor={MU_TILE_STOPS[1]} />
            <stop offset='1' stopColor={MU_TILE_STOPS[2]} />
          </linearGradient>
        </defs>
        {tile && <rect width='100' height='100' rx='27' fill={`url(#${gradientId})`} />}
        <path
          d={MU_GLYPH_PATH}
          stroke={tile ? '#FFFFFF' : `url(#${gradientId})`}
          strokeWidth={tile ? MU_GLYPH_STROKE : MU_GLYPH_STROKE + 1.4}
          strokeLinecap='round'
          strokeLinejoin='round'
          // The glyph alone is grown to fill the box the tile would have taken.
          transform={tile ? undefined : 'translate(50.6 53.2) scale(1.62) translate(-50.6 -53.2)'}
        />
      </svg>
    </span>
  );
};

export default MuMark;
