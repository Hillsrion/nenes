/**
 * Text utility functions for splitting and manipulating text content
 */

/**
 * Extract the first word from a text line
 */
const getFirstWord = (line: string): string => {
  const words = line.trim().split(/\s+/);
  return words.length > 0 ? words[0] : "";
};

/**
 * Extract all words except the first one from a text line
 */
const getRemainingWords = (line: string): string => {
  const words = line.trim().split(/\s+/);
  return words.length > 1 ? words.slice(1).join(" ") : "";
};

/**
 * Composable that provides text utility functions
 */
export const useTextUtils = () => {
  return {
    getFirstWord,
    getRemainingWords,
  };
};
