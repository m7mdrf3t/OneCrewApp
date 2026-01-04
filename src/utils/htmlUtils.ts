/**
 * Strips HTML tags from a string and returns plain text
 * @param html - HTML string to strip
 * @returns Plain text without HTML tags
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  
  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  // Clean up multiple spaces and newlines
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

/**
 * Strips HTML tags and limits the text to a certain length
 * @param html - HTML string to strip
 * @param maxLength - Maximum length of the returned text
 * @param suffix - Suffix to add if text is truncated (default: '...')
 * @returns Plain text without HTML tags, truncated if needed
 */
export const stripHtmlTagsAndTruncate = (
  html: string,
  maxLength: number,
  suffix: string = '...'
): string => {
  const text = stripHtmlTags(html);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + suffix;
};


