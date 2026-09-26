// Shrink photos in the browser before upload. Phone photos are often 3–8 MB; this keeps uploads fast on
// slow connections, avoids the 5 MB server limit, and saves database space (photos are stored in MongoDB).

const MAX_SIDE = 1600; // px, longest edge
const QUALITY = 0.85;
const SKIP_BELOW_BYTES = 700 * 1024; // small images are uploaded as-is

/** Returns a smaller JPEG File, or the original file if it is already small or can't be decoded. */
export async function shrinkImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file); // respects EXIF orientation in modern browsers
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
    bitmap.close?.();
    return file;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // JPEG has no transparency; flatten PNGs onto white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob || blob.size >= file.size) return file;
  const name = `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`;
  return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
}
