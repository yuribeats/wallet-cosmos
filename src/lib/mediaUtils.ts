export function resolveUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://nftstorage.link/ipfs/');
  }
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/');
  }
  return url;
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.ogv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];
const HTML_EXTENSIONS = ['.html', '.htm'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.tiff'];

export function detectMediaType(
  animationUrl?: string | null,
  imageUrl?: string | null
): 'image' | 'video' | 'audio' | 'html' | 'text' | 'unknown' {
  if (animationUrl) {
    const lower = animationUrl.toLowerCase().split('?')[0];
    if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'video';
    if (AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'audio';
    if (HTML_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'html';
    if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'image';
    // Any animation_url without recognized extension defaults to video
    return 'video';
  }
  if (imageUrl) {
    const lower = imageUrl.toLowerCase().split('?')[0];
    if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'video';
    return 'image';
  }
  return 'text';
}

export function resolveMedia(rawMetadata?: Record<string, unknown>, image?: {
  cachedUrl?: string | null;
  originalUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
  // Check multiple animation URI field names used by different contracts
  const animationUrl = (
    rawMetadata?.animation_url ||
    rawMetadata?.animation ||
    rawMetadata?.video ||
    rawMetadata?.video_url
  ) as string | undefined;
  const metadataImage = rawMetadata?.image as string | undefined;

  const resolvedImage = resolveUrl(image?.cachedUrl) || resolveUrl(image?.originalUrl) || resolveUrl(metadataImage);
  const resolvedThumbnail = resolveUrl(image?.thumbnailUrl) || resolvedImage;
  const resolvedAnimation = resolveUrl(animationUrl);

  const mediaType = detectMediaType(resolvedAnimation, resolvedImage);

  return {
    image: resolvedImage,
    thumbnail: resolvedThumbnail,
    video: mediaType === 'video' ? (resolvedAnimation || resolvedImage) : undefined,
    audio: mediaType === 'audio' ? resolvedAnimation : undefined,
    mediaType,
  };
}
