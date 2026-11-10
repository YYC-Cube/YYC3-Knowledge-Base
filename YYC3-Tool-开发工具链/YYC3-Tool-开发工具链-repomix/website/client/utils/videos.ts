import { VIDEO_IDS } from '../constants/videos';

// For use in markdown files via script setup
export { VIDEO_IDS };

// Helper function for easier access
export const getVideoId = (key: keyof typeof VIDEO_IDS): string => {
  return VIDEO_IDS[key];
};
