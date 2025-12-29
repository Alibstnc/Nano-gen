
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageProcessing';
import { Check, X, ZoomIn, Sun, Contrast, RotateCw, RefreshCw, Smartphone, Monitor, Square, Maximize, Crop } from 'lucide-react';

interface ReferenceImageEditorProps {
  imageUrl: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
}

export const ReferenceImageEditor: React.FC<ReferenceImageEditorProps> = ({ imageUrl, onSave, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1); // Default to square
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(
        imageUrl, 
        croppedAreaPixels, 
        rotation, 
        brightness, 
        contrast
      );
      onSave(croppedImage);
    } catch (e) {
      console.error(e);
      alert("Failed to crop image");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Edit Reference Image</h3>
            <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
              Crop, Rotate & Adjust
            </span>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-200 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            style={{
               containerStyle: {
                 filter: `brightness(${brightness}%) contrast(${contrast}%)`
               }
            }}
          />
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Top Row: Basic Transform */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Transform</span>
                  <button 
                    onClick={() => { setRotation(0); setZoom(1); }}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Reset
                  </button>
               </div>
               
               {/* Zoom */}
               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-500">
                   <span className="flex items-center gap-1"><ZoomIn size={12} /> Zoom</span>
                   <span>{zoom.toFixed(1)}x</span>
                 </div>
                 <input
                   type="range"
                   value={zoom}
                   min={1}
                   max={3}
                   step={0.1}
                   onChange={(e) => setZoom(Number(e.target.value))}
                   className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
               </div>

               {/* Rotation */}
               <div className="space-y-1">
                 <div className="flex justify-between text-xs text-slate-500">
                   <span className="flex items-center gap-1"><RotateCw size={12} /> Rotation</span>
                   <span>{rotation}°</span>
                 </div>
                 <input
                   type="range"
                   value={rotation}
                   min={0}
                   max={360}
                   step={1}
                   onChange={(e) => setRotation(Number(e.target.value))}
                   className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                 />
               </div>
            </div>

            {/* Middle Row: Adjustments */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Color Correction</span>
                  <button 
                    onClick={() => { setBrightness(100); setContrast(100); }}
                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Reset
                  </button>
               </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Sun size={12} /> Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    value={brightness}
                    min={50}
                    max={150}
                    step={1}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Contrast size={12} /> Contrast</span>
                    <span>{contrast}%</span>
                  </div>
                  <input
                    type="range"
                    value={contrast}
                    min={50}
                    max={150}
                    step={1}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* Aspect Ratio Buttons */}
              <div className="pt-2">
                 <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Crop Aspect</span>
                 <div className="flex gap-2">
                   <button
                     onClick={() => setAspect(1)}
                     className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${aspect === 1 ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                   >
                     <Square size={14} /> 1:1
                   </button>
                   <button
                     onClick={() => setAspect(4/3)}
                     className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${aspect === 4/3 ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                   >
                     <Monitor size={14} /> 4:3
                   </button>
                   <button
                     onClick={() => setAspect(16/9)}
                     className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${aspect === 16/9 ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                   >
                     <Smartphone size={14} className="rotate-90" /> 16:9
                   </button>
                    <button
                     onClick={() => setAspect(undefined)}
                     className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition-all ${aspect === undefined ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                   >
                     <Crop size={14} /> Free
                   </button>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
            <button
              onClick={onCancel}
              className="px-6 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-8 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 hover:-translate-y-0.5"
            >
              <Check size={18} />
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
