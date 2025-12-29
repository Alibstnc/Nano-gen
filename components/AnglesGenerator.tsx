
import React, { useState, useRef } from 'react';
import { GeneratedImage } from '../types';
import { generateImageFromPrompt } from '../services/gemini';
import { downloadBatchAsZip, downloadSingleImage } from '../utils/download';
import { resizeImage } from '../utils/imageProcessing';
import { saveGeneratedImage } from '../services/storage';
import { 
  Upload, Download, Loader2, Sparkles, Image as ImageIcon, 
  Camera, Eye, Aperture, User, ArrowRight, X, AlertCircle
} from 'lucide-react';

const ANGLE_DEFINITIONS = [
  { id: 'front', label: 'Front View', prompt: 'Front view, facing camera directly' },
  { id: 'profile_left', label: 'Side Profile', prompt: 'Side profile view from the left' },
  { id: 'back', label: 'Back View', prompt: 'View from behind' },
  { id: 'three_quarter', label: '¾ Angle', prompt: 'Three-quarter view turned 45 degrees' },
  { id: 'low_angle', label: 'Low Angle', prompt: 'Low angle shot looking up at character' },
  { id: 'high_angle', label: 'High Angle', prompt: 'High angle shot looking down at character' },
  { id: 'close_up', label: 'Close Up', prompt: 'Close-up on face' },
  { id: 'wide', label: 'Wide Shot', prompt: 'Full body wide shot' }
];

export const AnglesGenerator: React.FC = () => {
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<string>('');
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          // Resize to 512x512 and 0.6 quality - drastically reduces payload size
          // This is critical for preventing 500 errors on complex image-to-image tasks
          const resized = await resizeImage(event.target.result as string, 512, 512, 0.6);
          setReferenceImage(resized);
          setResults([]);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!referenceImage) {
      alert("Please upload a character reference image first.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    // Initialize placeholders
    const placeholders: GeneratedImage[] = ANGLE_DEFINITIONS.map((def, idx) => ({
      id: `angle-${idx}`,
      prompt: def.label,
      status: 'pending'
    }));
    setResults(placeholders);

    // Process sequentially (one by one) to avoid 500 Internal Errors and Rate Limits
    for (let i = 0; i < ANGLE_DEFINITIONS.length; i++) {
      const def = ANGLE_DEFINITIONS[i];
      
      // Update status to processing
      setResults(prev => prev.map((img, idx) => idx === i ? { ...img, status: 'processing' } : img));

      // Simplified prompt to reduce model complexity
      const prompt = `Character reference provided. ${def.prompt}. ${userContext ? `Environment: ${userContext}` : 'Simple background'}.`;

      let success = false;
      let attempts = 0;
      const maxAttempts = 3;

      // Retry logic for stability
      while (!success && attempts < maxAttempts) {
        try {
          // Aggressive backoff for retries: 4s, 8s, 16s...
          if (attempts > 0) {
             const delay = 4000 * Math.pow(2, attempts);
             console.log(`Retrying ${def.label} in ${delay}ms...`);
             await new Promise(r => setTimeout(r, delay));
          }

          // Added missing model property to conform to ImageGenerationConfig
          const imageUrl = await generateImageFromPrompt(
            prompt, 
            { aspectRatio: '3:4', resolution: '1K', model: 'flash' }, 
            [referenceImage]
          );
          
          const completedImage: GeneratedImage = { ...results[i], status: 'completed', imageUrl: imageUrl, prompt: def.label };
          
          setResults(prev => prev.map((img, idx) => 
            idx === i ? completedImage : img
          ));
          
          // Save to local DB
          await saveGeneratedImage(completedImage, 'ANGLES');
          
          success = true;

        } catch (error) {
          console.error(`Attempt ${attempts + 1} failed for ${def.label}:`, error);
          attempts++;
          
          if (attempts >= maxAttempts) {
            setResults(prev => prev.map((img, idx) => 
              idx === i ? { ...img, status: 'failed', error: "Server busy, try again." } : img
            ));
          }
        }
      }

      setProgress(i + 1);
      
      // Mandatory cool-down between requests to prevent internal server overload
      // Only wait if it's not the last one
      if (i < ANGLE_DEFINITIONS.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
      }
    }

    setIsProcessing(false);
  };

  const completedImages = results.filter(r => r.status === 'completed');

  return (
    <div className="relative min-h-[calc(100vh)] bg-zinc-950 flex flex-col pt-24">
       <div className="flex-1 w-full max-w-7xl mx-auto px-4 pb-48">
          
          {/* Header Area */}
          <div className="flex items-center justify-between mb-8">
             <div>
                <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                   <Aperture className="text-lime-500" />
                   Multi-Angle Generator
                </h2>
                <p className="text-zinc-500 text-sm mt-1">Generate 8 distinct camera angles from a single photo.</p>
             </div>
             {completedImages.length > 0 && (
                <button
                   onClick={() => downloadBatchAsZip(results, 'character_angles.zip')}
                   className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-full text-sm font-medium transition-colors"
                >
                   <Download size={16} />
                   Download All
                </button>
             )}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
             
             {/* Left Column: Input */}
             <div className="w-full lg:w-1/3 flex flex-col gap-6">
                
                {/* Reference Uploader */}
                <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-xl">
                   <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2">
                      <User size={14} /> Character Source
                   </h3>
                   
                   <div className="aspect-[3/4] w-full bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-800 relative overflow-hidden group">
                      {referenceImage ? (
                         <>
                           <img src={referenceImage} className="w-full h-full object-cover" alt="Reference" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                              <button onClick={() => fileInputRef.current?.click()} className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold">Change Image</button>
                              <button onClick={() => { setReferenceImage(null); setResults([]); }} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-full text-xs font-bold border border-red-500/50">Remove</button>
                           </div>
                         </>
                      ) : (
                         <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 hover:text-lime-400 hover:bg-zinc-900 transition-all"
                         >
                            <div className="p-4 bg-zinc-900 rounded-full mb-3 shadow-inner">
                               <Camera size={32} />
                            </div>
                            <span className="font-bold text-sm">Upload Photo</span>
                            <span className="text-[10px] opacity-60 mt-1">Full body or half body preferred</span>
                         </button>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                   </div>

                   {/* Prompt Input */}
                   <div className="mt-6">
                      <label className="text-xs font-bold text-zinc-500 uppercase block mb-2">Context / Environment</label>
                      <textarea
                         value={userContext}
                         onChange={(e) => setUserContext(e.target.value)}
                         placeholder="e.g. Cyberpunk city street at night, neon lights..."
                         className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-lime-500 resize-none"
                      />
                   </div>

                   {/* Generate Button */}
                   <button
                      onClick={handleGenerate}
                      disabled={isProcessing || !referenceImage}
                      className={`w-full mt-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                         ${isProcessing || !referenceImage
                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            : 'bg-lime-400 hover:bg-lime-500 text-black shadow-lg shadow-lime-900/20 hover:scale-[1.02] active:scale-[0.98]'
                         }
                      `}
                   >
                      {isProcessing ? <Loader2 className="animate-spin" /> : <Sparkles size={18} fill="currentColor" />}
                      Generate 8 Angles
                   </button>
                </div>
             </div>

             {/* Right Column: Output Grid */}
             <div className="flex-1">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {/* If empty state */}
                   {results.length === 0 && (
                      Array(8).fill(0).map((_, i) => (
                         <div key={i} className="aspect-[3/4] bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex flex-col items-center justify-center text-zinc-700">
                            <span className="text-xs font-bold mb-2">{ANGLE_DEFINITIONS[i].label}</span>
                            <div className="w-8 h-8 rounded-full border border-dashed border-zinc-700"></div>
                         </div>
                      ))
                   )}

                   {/* Results */}
                   {results.map((img, idx) => (
                      <div key={idx} className="group relative aspect-[3/4] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-lg">
                         
                         {/* Header Label */}
                         <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-3 z-20 pointer-events-none">
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{ANGLE_DEFINITIONS[idx].label}</span>
                         </div>

                         {img.status === 'completed' && img.imageUrl ? (
                            <>
                               <img src={img.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={img.prompt} />
                               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-30">
                                  <button onClick={() => downloadSingleImage(img.imageUrl!, `${ANGLE_DEFINITIONS[idx].id}.png`)} className="bg-lime-400 text-black p-2 rounded-full hover:scale-110 transition-transform">
                                     <Download size={18} />
                                  </button>
                               </div>
                            </>
                         ) : img.status === 'processing' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 relative z-10">
                               <Loader2 className="animate-spin text-lime-500 mb-2" size={24} />
                               <span className="text-[10px] text-zinc-500 font-medium animate-pulse">Generating...</span>
                            </div>
                         ) : img.status === 'failed' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-2 text-center">
                               <AlertCircle className="text-red-500 mb-2" size={20} />
                               <span className="text-[10px] text-red-400/80 leading-tight">Failed</span>
                            </div>
                         ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                               <span className="text-[10px] text-zinc-600">Pending</span>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};
