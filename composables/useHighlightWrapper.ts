/**
 * Composable for finding and wrapping highlighted words with SVG overlay
 */
export const useHighlightWrapper = () => {
  /**
   * Find consecutive words matching the highlight text and wrap them in a container
   * @param textElement - The parent element containing split words
   * @param highlightWords - Array of words to find and highlight
   * @param svgSrc - Path to the SVG image to use as overlay
   * @returns The wrapper element or null if no match found
   */
  const createHighlightWrapper = (
    textElement: HTMLElement,
    highlightWords: string[],
    svgSrc: string = "/images/selection.svg"
  ): HTMLElement | null => {
    if (!textElement) return null;

    const words = Array.from(
      textElement.querySelectorAll(".split-word")
    ) as HTMLElement[];

    if (words.length === 0) return null;

    // Find consecutive words that match the highlight text
    let matchedWords: HTMLElement[] = [];
    for (let i = 0; i < words.length; i++) {
      let match = true;
      const potentialHighlightWords: HTMLElement[] = [];

      for (let j = 0; j < highlightWords.length; j++) {
        if (i + j >= words.length) {
          match = false;
          break;
        }

        // Get the word text and remove punctuation for comparison
        const wordText =
          words[i + j].textContent?.trim().replace(/[,;.!?]/g, "") || "";

        if (wordText !== highlightWords[j]) {
          match = false;
          break;
        }
        potentialHighlightWords.push(words[i + j]);
      }

      if (match && potentialHighlightWords.length === highlightWords.length) {
        matchedWords = potentialHighlightWords;
        break;
      }
    }

    // Wrap highlighted words in a container span
    if (matchedWords.length > 0) {
      const wrapper = document.createElement("span");
      wrapper.className = "selection-highlight relative";

      // Create the SVG image element
      const svgImg = document.createElement("img");
      svgImg.src = svgSrc;
      svgImg.className = "selection-svg absolute -z-1";
      svgImg.style.top = "50%";
      svgImg.style.left = "-5px";
      svgImg.style.transform = "translateY(-50%)";
      svgImg.setAttribute("aria-hidden", "true");

      // Insert wrapper before first highlighted word
      const firstWord = matchedWords[0];
      firstWord.parentNode?.insertBefore(wrapper, firstWord);

      // Add the SVG image as first child
      wrapper.appendChild(svgImg);

      // Move all highlighted words into the wrapper, preserving spaces
      matchedWords.forEach((word, index) => {
        wrapper.appendChild(word);
        // Add space after each word except the last one
        if (index < matchedWords.length - 1) {
          wrapper.appendChild(document.createTextNode(" "));
        }
      });

      return wrapper;
    }

    return null;
  };

  return {
    createHighlightWrapper,
  };
};
