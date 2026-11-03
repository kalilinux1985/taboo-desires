// Builds the blurred public preview for locked photos and videos in the browser,
// so the original file never has to be exposed to make a teaser.

const PREVIEW_WIDTH = 480;
// Shrinking to a tiny image and scaling back up gives a strong blur in every browser
const TINY_WIDTH = 14;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = URL.createObjectURL(file);
  });
}

function loadVideoFrame(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 2);
    };
    video.onseeked = () => resolve(video);
    video.onerror = () => reject(new Error("Could not read video"));
    video.src = URL.createObjectURL(file);
  });
}

function blurToBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const ratio = height / width || 1;
  const tiny = document.createElement("canvas");
  tiny.width = TINY_WIDTH;
  tiny.height = Math.max(1, Math.round(TINY_WIDTH * ratio));
  tiny.getContext("2d")?.drawImage(source, 0, 0, tiny.width, tiny.height);

  const out = document.createElement("canvas");
  out.width = PREVIEW_WIDTH;
  out.height = Math.round(PREVIEW_WIDTH * ratio);
  const ctx = out.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas unavailable"));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tiny, 0, 0, out.width, out.height);

  return new Promise((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error("Preview failed"))), "image/jpeg", 0.8),
  );
}

export async function makeBlurredPreview(file: File): Promise<Blob> {
  if (file.type.startsWith("video/")) {
    const video = await loadVideoFrame(file);
    const blob = await blurToBlob(video, video.videoWidth, video.videoHeight);
    URL.revokeObjectURL(video.src);
    return blob;
  }
  const img = await loadImage(file);
  const blob = await blurToBlob(img, img.naturalWidth, img.naturalHeight);
  URL.revokeObjectURL(img.src);
  return blob;
}
