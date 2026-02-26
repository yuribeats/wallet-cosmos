export function resolveUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/');
  }
  return url;
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.ogv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];
const HTML_EXTENSIONS = ['.html', '.htm'];

export function detectMediaType(
  animationUrl?: string | null,
  imageUrl?: string | null
): 'image' | 'video' | 'audio' | 'html' | 'text' | 'unknown' {
  if (animationUrl) {
    const lower = animationUrl.toLowerCase().split('?')[0];
    if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'video';
    if (AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'audio';
    if (HTML_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'html';
    // If animation_url exists but no recognized extension, assume video
    if (lower.includes('video') || lower.includes('.mp4')) return 'video';
  }
  if (imageUrl) return 'image';
  return 'text';
}

export function resolveMedia(rawMetadata?: Record<string, unknown>, image?: {
  cachedUrl?: string | null;
  originalUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
  const animationUrl = rawMetadata?.animation_url as string | undefined;
  const metadataImage = rawMetadata?.image as string | undefined;

  const resolvedImage = resolveUrl(image?.cachedUrl) || resolveUrl(image?.originalUrl) || resolveUrl(metadataImage);
  const resolvedThumbnail = resolveUrl(image?.thumbnailUrl) || resolvedImage;
  const resolvedAnimation = resolveUrl(animationUrl);

  const mediaType = detectMediaType(resolvedAnimation, resolvedImage);

  return {
    image: resolvedImage,
    thumbnail: resolvedThumbnail,
    video: mediaType === 'video' ? resolvedAnimation : undefined,
    audio: mediaType === 'audio' ? resolvedAnimation : undefined,
    mediaType,
  };
}
