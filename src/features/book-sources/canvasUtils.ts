/** Draws a decoded bitmap into a canvas at its full intrinsic resolution. */
export function drawBitmap(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap | HTMLImageElement,
): { width: number; height: number } {
  const width = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width;
  const height = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D コンテキストを取得できません');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { width, height };
}
