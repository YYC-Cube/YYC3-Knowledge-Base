export const VIDEO_IDS = {
  REPOMIX_DEMO: '0a3eKNTBtxg',
} as const;

export type VideoId = (typeof VIDEO_IDS)[keyof typeof VIDEO_IDS];
