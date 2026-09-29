export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the bounding area of a rotated rectangle.
 */
export function calculateRotatedSize(
  width: number,
  height: number,
  rotation: number,
) {
  const rotRad = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * Crops and rotates an image using an HTML5 Canvas, returning an optimized JPEG File object.
 * Uses direct transformation matrix on the 512x512 target canvas to avoid allocating
 * multi-megapixel intermediate canvases in memory, ensuring instantaneous crop and export.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  targetSize = 512,
  fileName = "cropped_avatar.jpg",
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Nem sikerült létrehozni a Canvas 2D környezetet.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (rotation === 0) {
    // Fast path: direct crop without rotation or transformation
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      targetSize,
      targetSize,
    );
  } else {
    // Rotated path: direct transformation into the target canvas
    // Eliminates the need for a huge intermediate bounding-box canvas
    const { width: bBoxWidth, height: bBoxHeight } = calculateRotatedSize(
      image.width,
      image.height,
      rotation,
    );

    const scale = targetSize / pixelCrop.width;
    const cropCenterX = pixelCrop.x + pixelCrop.width / 2;
    const cropCenterY = pixelCrop.y + pixelCrop.height / 2;
    const rotRad = getRadianAngle(rotation);

    ctx.save();
    // 1. Move origin to canvas center
    ctx.translate(targetSize / 2, targetSize / 2);
    // 2. Scale up so crop rectangle fills the canvas
    ctx.scale(scale, scale);
    // 3. Shift by crop center relative to rotated bounding box center
    ctx.translate(bBoxWidth / 2 - cropCenterX, bBoxHeight / 2 - cropCenterY);
    // 4. Rotate by specified angle around image center
    ctx.rotate(rotRad);
    // 5. Shift by image center
    ctx.translate(-image.width / 2, -image.height / 2);
    // 6. Draw original image directly
    ctx.drawImage(image, 0, 0);
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob sikertelen."));
          return;
        }
        const cleanBaseName = fileName
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9_-]/g, "_");
        const croppedFile = new File([blob], `${cleanBaseName}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        resolve(croppedFile);
      },
      "image/jpeg",
      0.9,
    );
  });
}
