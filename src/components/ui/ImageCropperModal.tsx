import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point, MediaSize } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  X,
  LoaderCircle,
  Crop,
} from "lucide-react";
import { getCroppedImg } from "../../utils/cropImage";

interface ImageCropperModalProps {
  imageSrc: string;
  fileName?: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

/**
 * Mathematically restricts crop displacement so the rounded square crop mask
 * NEVER leaves the actual rotated image body, eliminating black borders.
 */
function clampCropToRotatedImage(
  crop: Point,
  zoom: number,
  rotation: number,
  mediaSize: { width: number; height: number } | null,
  cropSize: { width: number; height: number } | null,
): Point {
  if (!mediaSize || !cropSize) return crop;

  const S = cropSize.width;
  const Weff = mediaSize.width * zoom;
  const Heff = mediaSize.height * zoom;

  // Rotation angle in radians
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // For a square of size S x S, its projection onto the image's rotated local axes:
  const extentX = (S / 2) * (Math.abs(cos) + Math.abs(sin));
  const extentY = (S / 2) * (Math.abs(sin) + Math.abs(cos));

  // Maximum allowed displacement in the image's own local axes
  const maxX = Math.max(0, Weff / 2 - extentX);
  const maxY = Math.max(0, Heff / 2 - extentY);

  // Screen vector from crop to image center
  const dx = -crop.x;
  const dy = -crop.y;

  // Transform screen displacement into image local coordinates
  const localX = dx * cos + dy * sin;
  const localY = -dx * sin + dy * cos;

  // Clamp within safe image boundaries
  const clampedLocalX = Math.max(-maxX, Math.min(maxX, localX));
  const clampedLocalY = Math.max(-maxY, Math.min(maxY, localY));

  // Transform back into screen coordinates
  const safeDx = clampedLocalX * cos - clampedLocalY * sin;
  const safeDy = clampedLocalX * sin + clampedLocalY * cos;

  return {
    x: -safeDx,
    y: -safeDy,
  };
}

/**
 * ImageCropperModal Component
 *
 * Provides an interactive cropping interface for user-uploaded profile pictures:
 * - Rounded square crop mask (rounded-2xl / rounded-3xl).
 * - Dedicated "Alaphelyzetbe állítás" button to reset zoom, rotation, and position back to default.
 * - Two-finger touch gestures: simultaneous zoom and rotation.
 * - Geometric clamping: strictly prevented from ever leaving the rotated image.
 * - Dedicated bidirectional rotation slider (-180° to +180° with 0° center and 5° step buttons).
 * - Exports crisp 512x512 WEBP avatar.
 */
export default function ImageCropperModal({
  imageSrc,
  fileName = "avatar.webp",
  onCropComplete,
  onCancel,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [fixedCropSize, setFixedCropSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Helper to calculate minimum zoom needed at an angle so the square corners stay inside the image
  const getMinZoomForRotation = (
    rot: number,
    mSize: MediaSize | null,
    cSize: { width: number; height: number } | null,
  ) => {
    if (!mSize || !cSize) return 1;
    const rad = (rot * Math.PI) / 180;
    const extent =
      (cSize.width / 2) * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
    const minDim = Math.min(mSize.width, mSize.height);
    return Math.max(1, Number(((extent * 2) / minDim).toFixed(2)));
  };

  // Check if any crop settings have been altered from default
  const isModified =
    zoom !== 1 || rotation !== 0 || crop.x !== 0 || crop.y !== 0;

  // Reset zoom, rotation and position back to initial baseline
  const handleResetAll = () => {
    setZoom(1);
    setRotation(0);
    setCrop({ x: 0, y: 0 });
  };

  const handleMediaLoaded = (media: MediaSize) => {
    setMediaSize(media);
    const maxSquare = Math.min(media.width, media.height);
    setFixedCropSize((prev) => {
      if (!prev) {
        const defaultSize = Math.floor(maxSquare * 0.85);
        return { width: defaultSize, height: defaultSize };
      }
      const safeSize = Math.min(prev.width, maxSquare);
      return { width: safeSize, height: safeSize };
    });
  };

  const handleCropSizeChange = (newSize: { width: number; height: number }) => {
    if (!fixedCropSize) {
      if (mediaSize) {
        const maxSquare = Math.min(mediaSize.width, mediaSize.height);
        const safeSize = Math.min(newSize.width, maxSquare);
        setFixedCropSize({ width: safeSize, height: safeSize });
      } else {
        setFixedCropSize(newSize);
      }
    }
  };

  const handleCropChange = (newCrop: Point) => {
    const safeCrop = clampCropToRotatedImage(
      newCrop,
      zoom,
      rotation,
      mediaSize,
      fixedCropSize,
    );
    setCrop(safeCrop);
  };

  const handleZoomChange = (newZoom: number) => {
    const minZoom = getMinZoomForRotation(rotation, mediaSize, fixedCropSize);
    const safeZoom = Math.max(newZoom, minZoom);
    setZoom(safeZoom);
    setCrop((prev) =>
      clampCropToRotatedImage(
        prev,
        safeZoom,
        rotation,
        mediaSize,
        fixedCropSize,
      ),
    );
  };

  // Normalize rotation between -180° and +180° and clamp position immediately
  const handleRotationChange = (newRotation: number) => {
    let normalized = Math.round(newRotation);
    while (normalized > 180) normalized -= 360;
    while (normalized < -180) normalized += 360;
    setRotation(normalized);

    const minZoom = getMinZoomForRotation(normalized, mediaSize, fixedCropSize);
    const safeZoom = Math.max(zoom, minZoom);
    if (safeZoom !== zoom) {
      setZoom(safeZoom);
    }

    setCrop((prev) =>
      clampCropToRotatedImage(
        prev,
        safeZoom,
        normalized,
        mediaSize,
        fixedCropSize,
      ),
    );
  };

  const handleCropComplete = useCallback(
    (_croppedArea: Area, currentCroppedAreaPixels: Area) => {
      setCroppedAreaPixels(currentCroppedAreaPixels);
    },
    [],
  );

  const handleApply = async () => {
    if (!croppedAreaPixels) return;

    try {
      setIsProcessing(true);
      const croppedFile = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        512,
        fileName,
      );
      onCropComplete(croppedFile);
    } catch (err) {
      console.error("Hiba a kép vágása során:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      onClick={isProcessing ? undefined : onCancel}
      className="fixed inset-0 z-60 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-[backdropFadeIn_0.2s_ease-out]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-[modalPopIn_0.25s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2.5 sm:px-6 sm:pt-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Profilkép beállítása
              </h3>
              <p className="text-xs text-slate-500">
                Mozgass, forgass, méretezz
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            aria-label="Bezárás"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Viewport - Rounded square mask */}
        <div className="px-4 sm:px-6">
          <div className="relative w-full h-64 sm:h-80 bg-slate-950 rounded-2xl overflow-hidden select-none">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              minZoom={getMinZoomForRotation(
                rotation,
                mediaSize,
                fixedCropSize,
              )}
              aspect={1}
              cropShape="rect"
              cropSize={fixedCropSize || undefined}
              showGrid={false}
              restrictPosition={false}
              style={{
                cropAreaStyle: {
                  borderRadius: "1.5rem",
                },
              }}
              classes={{
                cropAreaClassName: "!rounded-2xl sm:!rounded-3xl",
              }}
              onCropChange={handleCropChange}
              onZoomChange={handleZoomChange}
              onRotationChange={handleRotationChange}
              onCropSizeChange={handleCropSizeChange}
              onCropComplete={handleCropComplete}
              onMediaLoaded={handleMediaLoaded}
            />
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="px-5 py-3 sm:px-6 space-y-3">
          {/* Zoom Slider Control */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleZoomChange(
                    Math.max(1, Number((zoom - 0.15).toFixed(2))),
                  )
                }
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                title="Kicsinyítés"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.02}
                value={zoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <button
                type="button"
                onClick={() =>
                  handleZoomChange(
                    Math.min(3, Number((zoom + 0.15).toFixed(2))),
                  )
                }
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                title="Nagyítás"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              {/* Vertical Divider */}
              <div className="h-5 w-px bg-slate-200 shrink-0 mx-0.5" />

              {/* Aligned Current Value */}
              <span className="w-12 text-right text-xs font-semibold text-slate-700 font-mono shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>

          {/* Rotation Slider Control */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleRotationChange(Math.max(-180, rotation - 5))
                }
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                title="Forgatás balra 5 fokkal (-5°)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => handleRotationChange(Number(e.target.value))}
                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <button
                type="button"
                onClick={() =>
                  handleRotationChange(Math.min(180, rotation + 5))
                }
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors shrink-0"
                title="Forgatás jobbra 5 fokkal (+5°)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Vertical Divider */}
              <div className="h-5 w-px bg-slate-200 shrink-0 mx-0.5" />

              {/* Aligned Current Value */}
              <span className="w-12 text-right text-xs font-semibold font-mono shrink-0 text-slate-700">
                {rotation > 0 ? `+${rotation}°` : `${rotation}°`}
              </span>
            </div>

            {/* Reset to defaults button */}
            <div className="flex justify-center pt-0.5">
              <button
                type="button"
                onClick={handleResetAll}
                disabled={!isModified}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  isModified
                    ? "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                    : "text-slate-300 bg-slate-50 cursor-not-allowed"
                }`}
              >
                <span>Vissza alaphelyzetbe</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl transition-colors"
            >
              Mégse
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing || !croppedAreaPixels}
              className="flex-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-medium text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Feldolgozás...</span>
                </>
              ) : (
                <>
                  <span>Alkalmazás</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
