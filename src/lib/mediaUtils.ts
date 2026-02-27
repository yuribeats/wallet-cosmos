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

type MediaType = 'image' | 'video' | 'audio' | 'html' | 'text' | 'unknown';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.ogv'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];
const HTML_EXTENSIONS = ['.html', '.htm'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.tiff'];

const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-msvideo'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/x-wav'];
const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif', 'image/bmp', 'image/tiff'];
const HTML_MIMES = ['text/html', 'application/xhtml+xml'];

function mimeToMediaType(mime: string): MediaType | null {
  const lower = mime.toLowerCase().split(';')[0].trim();
  if (VIDEO_MIMES.some((m) => lower === m) || lower.startsWith('video/')) return 'video';
  if (AUDIO_MIMES.some((m) => lower === m) || lower.startsWith('audio/')) return 'audio';
  if (IMAGE_MIMES.some((m) => lower === m) || lower.startsWith('image/')) return 'image';
  if (HTML_MIMES.some((m) => lower === m)) return 'html';
  return null;
}

function detectByExtension(url: string): MediaType | null {
  const lower = url.toLowerCase().split('?')[0];
  if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'video';
  if (AUDIO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'audio';
  if (HTML_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'html';
  if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'image';
  return null;
}

function detectFromMetadata(rawMetadata?: Record<string, unknown>): MediaType | null {
  if (!rawMetadata) return null;
  const mime = (
    rawMetadata.mime_type ||
    rawMetadata.mimeType ||
    rawMetadata.content_type ||
    rawMetadata.contentType ||
    rawMetadata.mimetype
  ) as string | undefined;
  if (mime) return mimeToMediaType(mime);

  const props = rawMetadata.properties as Record<string, unknown> | undefined;
  if (props) {
    const propMime = (props.mime_type || props.mimeType || props.content_type) as string | undefined;
    if (propMime) return mimeToMediaType(propMime);
  }
  return null;
}

async function sniffContentType(url: string): Promise<MediaType | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    const ct = res.headers.get('content-type');
    if (ct) return mimeToMediaType(ct);
  } catch { /* sniff is best-effort */ }
  return null;
}

export function detectMediaType(
  animationUrl?: string | null,
  imageUrl?: string | null
): MediaType {
  if (animationUrl) {
    const ext = detectByExtension(animationUrl);
    if (ext) return ext;
    return 'video';
  }
  if (imageUrl) {
    const ext = detectByExtension(imageUrl);
    if (ext) return ext;
    return 'image';
  }
  return 'text';
}

export async function resolveMedia(rawMetadata?: Record<string, unknown>, image?: {
  cachedUrl?: string | null;
  originalUrl?: string | null;
  thumbnailUrl?: string | null;
}) {
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

  let mediaType: MediaType;

  const urlToCheck = resolvedAnimation || resolvedImage;
  const extType = urlToCheck ? detectByExtension(urlToCheck) : null;

  if (extType) {
    mediaType = extType;
  } else {
    const metaType = detectFromMetadata(rawMetadata);
    if (metaType) {
      mediaType = metaType;
    } else if (urlToCheck) {
      const sniffed = await sniffContentType(urlToCheck);
      if (sniffed) {
        mediaType = sniffed;
      } else {
        mediaType = resolvedAnimation ? 'video' : resolvedImage ? 'image' : 'text';
      }
    } else {
      mediaType = 'text';
    }
  }

  return {
    image: resolvedImage,
    thumbnail: resolvedThumbnail,
    video: mediaType === 'video' ? (resolvedAnimation || resolvedImage) : undefined,
    audio: mediaType === 'audio' ? resolvedAnimation : undefined,
    mediaType,
  };
}
