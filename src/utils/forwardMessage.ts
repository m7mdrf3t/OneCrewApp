/**
 * Helpers for forwarding Stream Chat messages (text + image attachments).
 */

export const isMessageForwarded = (message: any): boolean =>
  message?.is_forwarded === true ||
  message?.forwarded === true ||
  message?.forwarded_message === true;

export type ForwardableImageAttachment = {
  type: 'image';
  image_url: string;
  asset_url?: string;
  thumb_url?: string;
  original_width?: number;
  original_height?: number;
  fallback?: string;
};

const IMAGE_MIME_PREFIX = 'image/';

const pickImageUrl = (att: Record<string, unknown>): string | undefined => {
  const url =
    (att.image_url as string) ||
    (att.asset_url as string) ||
    (att.thumb_url as string);
  return typeof url === 'string' && url.length > 0 ? url : undefined;
};

const mapToForwardImageAttachment = (
  att: Record<string, unknown>,
): ForwardableImageAttachment | null => {
  const imageUrl = pickImageUrl(att);
  if (!imageUrl) return null;

  return {
    type: 'image',
    image_url: imageUrl,
    asset_url: (att.asset_url as string) || imageUrl,
    thumb_url: (att.thumb_url as string) || imageUrl,
    ...(typeof att.original_width === 'number' ? { original_width: att.original_width } : {}),
    ...(typeof att.original_height === 'number' ? { original_height: att.original_height } : {}),
    ...(typeof att.fallback === 'string' ? { fallback: att.fallback } : {}),
  };
};

const isImageFileAttachment = (att: Record<string, unknown>): boolean => {
  if (att.type !== 'file') return false;
  const mime = att.mime_type as string | undefined;
  return typeof mime === 'string' && mime.startsWith(IMAGE_MIME_PREFIX);
};

/** Collect image attachments to re-send when forwarding. */
export const getForwardImageAttachments = (message: any): ForwardableImageAttachment[] => {
  if (!message) return [];

  const seen = new Set<string>();
  const result: ForwardableImageAttachment[] = [];

  const add = (mapped: ForwardableImageAttachment | null) => {
    if (!mapped) return;
    const key = mapped.image_url;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(mapped);
  };

  const rawAttachments = Array.isArray(message.attachments) ? message.attachments : [];

  for (const raw of rawAttachments) {
    if (!raw || typeof raw !== 'object') continue;
    const att = raw as Record<string, unknown>;

    if (att.type === 'image' || isImageFileAttachment(att)) {
      add(mapToForwardImageAttachment(att));
      continue;
    }

    if (att.type === 'gallery' && Array.isArray(att.images)) {
      for (const img of att.images) {
        if (img && typeof img === 'object') {
          add(mapToForwardImageAttachment({ type: 'image', ...img }));
        }
      }
    }
  }

  const galleryImages = Array.isArray(message.images) ? message.images : [];
  for (const img of galleryImages) {
    if (img && typeof img === 'object') {
      add(mapToForwardImageAttachment(img as Record<string, unknown>));
    }
  }

  return result;
};

export const isMessageForwardable = (message: any): boolean => {
  if (!message) return false;
  if (typeof message.text === 'string' && message.text.trim().length > 0) return true;
  return getForwardImageAttachments(message).length > 0;
};

export type ForwardMessagePayload = {
  text?: string;
  attachments?: ForwardableImageAttachment[];
  is_forwarded: boolean;
  forwarded_message_id?: string;
  forwarded_from_user_id?: string;
};

export const buildForwardMessagePayload = (message: any): ForwardMessagePayload | null => {
  if (!message) return null;

  const text = typeof message.text === 'string' ? message.text.trim() : '';
  const attachments = getForwardImageAttachments(message);

  if (!text && attachments.length === 0) return null;

  return {
    ...(text ? { text } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
    is_forwarded: true,
    forwarded_message_id: message.id,
    forwarded_from_user_id: message.user?.id,
  };
};

export const getForwardPreviewLabel = (message: any): string => {
  const text = typeof message?.text === 'string' ? message.text.trim() : '';
  const imageCount = getForwardImageAttachments(message).length;

  if (text && imageCount > 0) {
    return imageCount === 1 ? `${text} · 1 photo` : `${text} · ${imageCount} photos`;
  }
  if (text) return text;
  if (imageCount === 1) return 'Photo';
  if (imageCount > 1) return `${imageCount} photos`;
  return '';
};

export const getForwardPreviewImageUrl = (message: any): string | null => {
  const attachments = getForwardImageAttachments(message);
  return attachments[0]?.thumb_url || attachments[0]?.image_url || null;
};
