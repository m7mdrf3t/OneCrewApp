export type TextDirection = 'rtl' | 'ltr';

const ARABIC_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ARABIC_WORD_REGEX = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF0-9_]*)/g;
const LATIN_CHAR_REGEX = /[A-Za-z]/;
const LATIN_WORD_REGEX = /([A-Za-z][A-Za-z0-9@#&+./:_\-()%']*)/g;

const LRI = '\u2066';
const RLI = '\u2067';
const PDI = '\u2069';

export const getTextDirection = (text?: string | null): TextDirection => {
  if (!text) return 'ltr';

  const arabicMatches = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || [];
  const latinMatches = text.match(/[A-Za-z]/g) || [];

  if (arabicMatches.length === 0 && latinMatches.length === 0) {
    return 'ltr';
  }

  if (arabicMatches.length === latinMatches.length) {
    for (const char of text) {
      if (ARABIC_CHAR_REGEX.test(char)) return 'rtl';
      if (LATIN_CHAR_REGEX.test(char)) return 'ltr';
    }
  }

  return arabicMatches.length > latinMatches.length ? 'rtl' : 'ltr';
};

export const isolateBidiText = (text?: string | null): string => {
  if (!text) return '';

  const hasArabic = ARABIC_CHAR_REGEX.test(text);
  const hasLatin = LATIN_CHAR_REGEX.test(text);

  if (!hasArabic || !hasLatin) {
    return text;
  }

  const direction = getTextDirection(text);

  if (direction === 'rtl') {
    return text.replace(LATIN_WORD_REGEX, `${LRI}$1${PDI}`);
  }

  return text.replace(ARABIC_WORD_REGEX, `${RLI}$1${PDI}`);
};

export const isolateBidiTextInHtml = (html?: string | null): string => {
  if (!html) return '';

  return html.replace(/>([^<]+)</g, (_match, textContent: string) => {
    return `>${isolateBidiText(textContent)}<`;
  });
};
