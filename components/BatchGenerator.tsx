
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedImage, ImageGenerationConfig } from '../types';
import { generateImageFromPrompt } from '../services/gemini';
import { downloadBatchAsZip, downloadSingleImage } from '../utils/download';
import { removeWhiteBackground, resizeImage } from '../utils/imageProcessing';
import { ReferenceImageEditor } from './ReferenceImageEditor';
import { saveGeneratedImage } from '../services/storage';
import { 
  Download, Play, Loader2, AlertCircle, X, Upload, 
  UserSquare2, Edit2, Eye, Sparkles, Settings2, Image as ImageIcon,
  Check, Layers, Ratio, ShieldCheck, Trash2, Cpu, Zap, Key, Palette
} from 'lucide-react';

type BackgroundType = 'None' | 'Studio Color' | 'Gradient' | 'Pattern' | 'Artistic';

const STUDIO_COLORS = [
  { name: 'Studio White', hex: '#FFFFFF', prompt: 'PURE SOLID FLAT WHITE (#FFFFFF) BACKGROUND. NO SHADOWS, NO GLOWS.' },
  { name: 'Infinity Black', hex: '#000000', prompt: 'PURE SOLID DEEP BLACK (#000000) BACKGROUND. TOTAL DARKNESS, NO LIGHT SPILL.' },
  { name: 'Chroma Green', hex: '#00FF00', prompt: 'PURE FLAT CHROMA KEY GREEN (#00FF00) BACKGROUND. UNIFORM SATURATION, NO SHADOWS, OPTIMIZED FOR COMPOSITING.' },
  { name: 'Chroma Blue', hex: '#0000FF', prompt: 'PURE FLAT CHROMA KEY BLUE (#0000FF) BACKGROUND. UNIFORM SATURATION, NO SHADOWS, OPTIMIZED FOR COMPOSITING.' },
  { name: 'Neutral Grey', hex: '#808080', prompt: 'SOLID NEUTRAL MID-GREY (#808080) BACKGROUND. FLAT LIGHTING.' },
];

const LIGHTING_OPTIONS = [
  'None', 'Cinematic Studio', 'Golden Hour', 'Dramatic Noir', 'Cyberpunk Neon', 
  'Soft Natural Portait', 'High-Key Commercial', 'Rim Lighting', 'Mystical Glow'
];

const ASPECT_RATIOS: ImageGenerationConfig['aspectRatio'][] = [
  '1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '5:4'
];

export const BatchGenerator: React.FC = () => {
  const [inputPrompts, setInputPrompts] = useState<string>('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [aspectRatio, setAspectRatio] = useState<ImageGenerationConfig['aspectRatio']>('3:4');
  const [resolution, setResolution] = useState<ImageGenerationConfig['resolution']>('1K');
  const [engine, setEngine] = useState<'flash' | 'pro'>('flash');
  const [hasProKey, setHasProKey] = useState(false);

  const [showContextPanel, setShowContextPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'reference' | 'style' | 'engine'>('reference');

  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [maintainFaceConsistency, setMaintainFaceConsistency] = useState<boolean>(true);
  const [styleStrength, setStyleStrength] = useState<number>(85);
  const [lightingType, setLightingType] = useState<string>('None');
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('None');
  const [selectedStudioColor, setSelectedStudioColor] = useState<string | null>(null);
  const [backgroundValue, setBackgroundValue] = useState<string>('');
  const [isTransparent, setIsTransparent] = useState<boolean>(false);
  const [preserveBackground, setPreserveBackground] = useState<boolean>(false);
  
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [viewedImage, setViewedImage] = useState<GeneratedImage | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const hasKey = await aistudio.hasSelectedApiKey();
      setHasProKey(hasKey);
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      setHasProKey(true);
    }
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      for (const file of files) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            const resized = await resizeImage(event.target.result as string, 800, 800, 0.7);
            setReferenceImages(prev => [...prev, resized]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getBackgroundPrompt = () => {
    if (preserveBackground) return '';
    if (isTransparent) return STUDIO_COLORS[0].prompt; // Default to white for better cutout logic
    
    if (backgroundType === 'Studio Color' && selectedStudioColor) {
      const studio = STUDIO_COLORS.find(c => c.hex === selectedStudioColor);
      return studio ? studio.prompt : '';
    }

    if (backgroundType === 'None') return '';
    if (!backgroundValue.trim()) return '';

    switch (backgroundType) {
      case 'Gradient': return `on a ${backgroundValue} gradient background`;
      case 'Pattern': return `on a background pattern of ${backgroundValue}`;
      case 'Artistic': return `on a creative background featuring ${backgroundValue}`;
      default: return '';
    }
  };

  const handleStartBatch = async () => {
    const lines = inputPrompts.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    if (engine === 'pro' && !hasProKey) {
      handleSelectKey();
      return;
    }

    setIsProcessing(true);
    setShowContextPanel(false);
    setProgress({ current: 0, total: lines.length });

    const newImages: GeneratedImage[] = lines.map((p, i) => ({
      id: `batch-${Date.now()}-${i}`,
      prompt: p,
      label: `img_${i + 1}`,
      status: 'pending'
    }));

    setImages(prev => [...newImages, ...prev]);

    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      setImages(prev => prev.map(item => item.id === img.id ? { ...item, status: 'processing' } : item));

      try {
        let finalPrompt = img.prompt;
        const bgPrompt = getBackgroundPrompt();

        if (lightingType !== 'None') finalPrompt += `, ${lightingType.toLowerCase()} style`;
        if (bgPrompt) finalPrompt += `, ${bgPrompt}`;

        if (referenceImages.length > 0) {
           finalPrompt += `\n\n[STYLE]: Extract visual DNA from references with ${styleStrength}% weight.`;
           if (maintainFaceConsistency) finalPrompt += " Match identity precisely.";
        }

        let base64Data = await generateImageFromPrompt(
          finalPrompt, 
          { aspectRatio, resolution, model: engine }, 
          referenceImages,
          (preserveBackground && referenceImages.length > 0) ? referenceImages[0] : null
        );

        if (isTransparent && !preserveBackground) {
          base64Data = await removeWhiteBackground(base64Data, 12); 
        }

        const completed = { ...img, status: 'completed' as const, imageUrl: base64Data };
        setImages(prev => prev.map(item => item.id === img.id ? completed : item));
        await saveGeneratedImage(completed, 'BATCH');
      } catch (error) {
        setImages(prev => prev.map(item => item.id === img.id ? { ...item, status: 'failed', error: "Error" } : item));
      }
      setProgress(prev => ({ ...prev, current: i + 1 }));
      await new Promise(r => setTimeout(r, 600));
    }
    setIsProcessing(false);
  };

  return (
    <div className="relative min-h-[calc(100vh)] bg-zinc-950 flex flex-col pt-24 overflow-x-hidden">
      {editingImageIndex !== null && (
        <ReferenceImageEditor imageUrl={referenceImages[editingImageIndex]} onSave={(img) => {
            setReferenceImages(prev => { const n = [...prev]; n[editingImageIndex] = img; return n; });
            setEditingImageIndex(null);
        }} onCancel={() => setEditingImageIndex(null)} />
      )}
      
      {viewedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
           <div className="bg-zinc-900 rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-800">
              <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                <h3 className="font-semibold text-zinc-100 flex items-center gap-2"><ImageIcon size={18} className="text-lime-400" /> Professional View</h3>
                <button onClick={() => setViewedImage(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 <div className="flex-1 p-6 flex items-center justify-center bg-zinc-950/50">
                    <img src={viewedImage.imageUrl} className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded-lg" />
                 </div>
                 <div className="w-full md:w-80 border-l border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-4">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Master Prompt</h4>
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 font-mono leading-relaxed max-h-60 overflow-y-auto">{viewedImage.prompt}</div>
                    <button onClick={() => downloadSingleImage(viewedImage.imageUrl!, `${viewedImage.label}.png`)} className="w-full py-3 bg-lime-400 hover:bg-lime-500 text-black rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 mt-auto"><Download size={18} /> Export Resource</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex-1 w-full max-w-[1920px] mx-auto px-8 py-4 pb-48">
         <div className="flex justify-between items-end mb-10">
            <div>
               <h2 className="text-3xl font-black text-zinc-100 flex items-center gap-3 tracking-tighter">
                  <Sparkles className="text-lime-500" fill="currentColor" />
                  Studio Batch Production
               </h2>
               <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-[0.4em] font-black">Powered by Nano Banana {engine === 'pro' ? 'Pro' : 'Standard'}</p>
            </div>
            {images.filter(i => i.status === 'completed').length > 0 && (
              <button onClick={() => downloadBatchAsZip(images, 'nano_production_export.zip')} className="flex items-center gap-3 px-8 py-3 bg-zinc-100 text-black rounded-full text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-lime-400/10"><Download size={16} /> Export Master Pack</button>
            )}
         </div>

         {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500 animate-in fade-in zoom-in duration-700">
               <div className="w-40 h-40 bg-zinc-900/50 rounded-[40px] shadow-2xl flex items-center justify-center mb-10 border border-white/5 backdrop-blur-md relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <ImageIcon size={64} className="text-zinc-800 group-hover:text-zinc-600 transition-colors" />
               </div>
               <p className="text-2xl font-black text-zinc-200 mb-2 uppercase tracking-tight">System Ready</p>
               <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest max-w-sm text-center leading-loose">Queue up to 53 professional prompts. Configure Style DNA to maintain absolute identity lock.</p>
            </div>
         ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
               {images.map((img, idx) => (
                  <div key={img.id} className="group relative bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/5 aspect-[3/4] transition-all hover:border-lime-500/50 hover:shadow-lime-500/5">
                     <div className="absolute top-3 left-3 z-20 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[8px] font-black text-white uppercase border border-white/5">S{idx + 1}</div>
                     {img.status === 'completed' && img.imageUrl ? (
                        <>
                           <img src={img.imageUrl} className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110" />
                           <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center z-20 backdrop-blur-[2px] gap-3">
                              <button onClick={() => setViewedImage(img)} className="bg-white/10 hover:bg-white text-white hover:text-black p-4 rounded-full backdrop-blur-md transition-all scale-90 group-hover:scale-100"><Eye size={22} /></button>
                              <span className="text-[9px] font-black text-white uppercase tracking-widest">{img.label}</span>
                           </div>
                        </>
                     ) : img.status === 'processing' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center relative z-10 bg-zinc-950/40 backdrop-blur-xl">
                           <Loader2 className="animate-spin text-lime-400 mb-4" size={40} />
                           <span className="text-[9px] font-black text-lime-400 uppercase tracking-[0.3em] animate-pulse">Rendering</span>
                        </div>
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-950/50">
                           <span className="text-[9px] text-zinc-700 font-black uppercase tracking-widest">Queued</span>
                        </div>
                     )}
                  </div>
               ))}
            </div>
         )}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50">
         {showContextPanel && (
            <div className="absolute bottom-full left-0 mb-6 w-full bg-zinc-900/98 backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden animate-in slide-in-from-bottom-12 duration-300">
               <div className="flex border-b border-white/5 bg-zinc-950/20">
                  <button onClick={() => setActiveTab('reference')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'reference' ? 'bg-zinc-800/50 text-lime-400' : 'text-zinc-600 hover:text-zinc-400'}`}>01 Style DNA</button>
                  <button onClick={() => setActiveTab('style')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'style' ? 'bg-zinc-800/50 text-lime-400' : 'text-zinc-600 hover:text-zinc-400'}`}>02 Studio Aesthetics</button>
                  <button onClick={() => setActiveTab('engine')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'engine' ? 'bg-zinc-800/50 text-lime-400' : 'text-zinc-600 hover:text-zinc-400'}`}>03 Rendering Engine</button>
                  <button onClick={() => setShowContextPanel(false)} className="px-8 border-l border-white/5 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
               </div>
               
               <div className="p-10 max-h-[500px] overflow-y-auto">
                  {activeTab === 'reference' && (
                     <div className="space-y-10">
                        <div className="flex items-center justify-between bg-lime-400/5 border border-lime-400/20 p-6 rounded-[28px]">
                           <div className="flex items-center gap-5">
                              <div className="bg-lime-400 p-3 rounded-2xl text-black shadow-xl shadow-lime-400/20"><ShieldCheck size={28} /></div>
                              <div>
                                 <div className="text-base font-black text-white uppercase tracking-tight">Identity Synchronization</div>
                                 <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Consistency engine for high-volume packs</div>
                              </div>
                           </div>
                           <div className="flex gap-6">
                              <div className="flex flex-col items-center">
                                 <span className="text-[9px] font-black text-zinc-600 uppercase mb-2">Face Lock</span>
                                 <button onClick={() => setMaintainFaceConsistency(!maintainFaceConsistency)} className={`w-14 h-7 rounded-full relative transition-all ${maintainFaceConsistency ? 'bg-lime-400' : 'bg-zinc-800'}`}>
                                    <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${maintainFaceConsistency ? 'translate-x-7' : 'translate-x-0'}`} />
                                 </button>
                              </div>
                              <div className="flex flex-col items-center">
                                 <span className="text-[9px] font-black text-zinc-600 uppercase mb-2">Scene Lock</span>
                                 <button onClick={() => setPreserveBackground(!preserveBackground)} className={`w-14 h-7 rounded-full relative transition-all ${preserveBackground ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                                    <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${preserveBackground ? 'translate-x-7' : 'translate-x-0'}`} />
                                 </button>
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-12">
                           <div className="space-y-5">
                              <div className="flex justify-between items-end">
                                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">DNA Strength</span>
                                 <span className="text-2xl font-black text-lime-400">{styleStrength}%</span>
                              </div>
                              <input type="range" min="0" max="100" value={styleStrength} onChange={(e) => setStyleStrength(parseInt(e.target.value))} className="w-full h-2.5 bg-zinc-800 accent-lime-400 rounded-full appearance-none cursor-pointer" />
                           </div>
                           <div className="grid grid-cols-5 gap-3">
                              {referenceImages.map((img, idx) => (
                                 <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/5 bg-zinc-950 shadow-2xl">
                                    <img src={img} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                       <button onClick={() => setEditingImageIndex(idx)} className="p-2 bg-white text-black rounded-lg"><Edit2 size={14} /></button>
                                       <button onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== idx))} className="p-2 bg-red-500 text-white rounded-lg"><X size={14} /></button>
                                    </div>
                                 </div>
                              ))}
                              {referenceImages.length < 15 && (
                                 <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 hover:text-lime-400 transition-all hover:bg-zinc-900 shadow-inner">
                                    <Upload size={24} />
                                    <span className="text-[8px] font-black mt-1 uppercase">Import DNA</span>
                                 </button>
                              )}
                           </div>
                           <input type="file" ref={fileInputRef} onChange={handleReferenceUpload} multiple className="hidden" />
                        </div>
                     </div>
                  )}

                  {activeTab === 'style' && (
                     <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Master Lighting Controls</label>
                           <div className="grid grid-cols-3 gap-3">
                              {LIGHTING_OPTIONS.map(opt => (
                                 <button key={opt} onClick={() => setLightingType(opt)} className={`px-4 py-4 rounded-2xl border text-[9px] font-black uppercase text-left transition-all ${lightingType === opt ? 'bg-lime-400 border-lime-400 text-black shadow-xl shadow-lime-400/20' : 'bg-zinc-950 border-white/5 text-zinc-600 hover:border-zinc-700'}`}>{opt}</button>
                              ))}
                           </div>
                        </div>
                        <div className="space-y-6">
                           <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Environment Output</label>
                           <div className="bg-zinc-950 p-8 rounded-[32px] border border-white/5 space-y-6 shadow-inner">
                              <div className="flex items-center justify-between border-b border-white/5 pb-6">
                                 <div>
                                    <div className="text-xs font-black text-white uppercase">Pure Alpha Mode (PNG)</div>
                                    <div className="text-[9px] text-zinc-600 font-bold uppercase mt-1">Clean cutouts for design assets</div>
                                 </div>
                                 <button onClick={() => setIsTransparent(!isTransparent)} className={`w-14 h-7 rounded-full relative transition-all ${isTransparent ? 'bg-lime-400' : 'bg-zinc-800'}`}>
                                    <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isTransparent ? 'translate-x-7' : 'translate-x-0'}`} />
                                 </button>
                              </div>
                              <div className={isTransparent || preserveBackground ? 'opacity-20 pointer-events-none' : ''}>
                                 <div className="flex flex-col gap-4">
                                    <select value={backgroundType} onChange={(e) => setBackgroundType(e.target.value as BackgroundType)} className="w-full bg-zinc-900 border border-white/5 text-white text-[11px] font-black uppercase rounded-2xl px-5 py-4 outline-none appearance-none">
                                       <option value="None">Adaptive Environment</option>
                                       <option value="Studio Color">Chroma & Studio Backdrops</option>
                                       <option value="Gradient">Atmospheric Gradient</option>
                                       <option value="Pattern">Graphic Pattern Base</option>
                                    </select>
                                    
                                    {backgroundType === 'Studio Color' && (
                                       <div className="flex flex-wrap gap-3 p-3 bg-zinc-900 rounded-2xl border border-white/5">
                                          {STUDIO_COLORS.map(color => (
                                             <button
                                                key={color.hex}
                                                onClick={() => setSelectedStudioColor(color.hex)}
                                                className={`group flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${selectedStudioColor === color.hex ? 'bg-white border-white text-black' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:text-white'}`}
                                             >
                                                <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color.hex }}></div>
                                                <span className="text-[9px] font-black uppercase tracking-tighter">{color.name}</span>
                                             </button>
                                          ))}
                                       </div>
                                    )}

                                    {backgroundType !== 'None' && backgroundType !== 'Studio Color' && (
                                       <input value={backgroundValue} onChange={(e) => setBackgroundValue(e.target.value)} placeholder="e.g. Deep Neon Blue, Cyberpunk City..." className="w-full bg-zinc-900 border border-white/5 text-white text-[11px] font-black rounded-2xl px-5 py-4 outline-none focus:border-lime-500" />
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {activeTab === 'engine' && (
                     <div className="grid grid-cols-2 gap-16">
                        <div className="space-y-8">
                           <div className="bg-zinc-950 p-8 rounded-[32px] border border-white/5 shadow-inner">
                              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Model Architecture</h4>
                              <div className="grid grid-cols-2 gap-4">
                                 <button onClick={() => setEngine('flash')} className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${engine === 'flash' ? 'bg-lime-400 border-lime-400 text-black shadow-xl shadow-lime-400/20' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}>
                                    <Zap size={24} />
                                    <span className="text-[10px] font-black uppercase">Standard (Fast)</span>
                                 </button>
                                 <button onClick={() => setEngine('pro')} className={`flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all ${engine === 'pro' ? 'bg-white border-white text-black shadow-xl shadow-white/10' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}>
                                    <Cpu size={24} />
                                    <span className="text-[10px] font-black uppercase">Banana Pro (HQ)</span>
                                 </button>
                              </div>
                           </div>
                        </div>
                        <div className="space-y-6">
                           <div className="bg-zinc-950 p-8 rounded-[32px] border border-white/5 shadow-inner flex flex-col justify-center h-full">
                              {engine === 'pro' && !hasProKey ? (
                                 <div className="text-center">
                                    <Key className="text-amber-500 mx-auto mb-4" size={32} />
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Key Required for Pro</h4>
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase mb-6 leading-relaxed">Nano Banana Pro requires manual API key verification via AI Studio.</p>
                                    <button onClick={handleSelectKey} className="px-8 py-3 bg-amber-600 text-white text-[10px] font-black uppercase rounded-full shadow-xl shadow-amber-900/20 hover:scale-105 active:scale-95 transition-all">Select Master Key</button>
                                 </div>
                              ) : (
                                 <div className="text-center">
                                    <div className="bg-lime-400/10 text-lime-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                       <Ratio size={32} />
                                    </div>
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Production Output</h4>
                                    <div className="flex justify-center gap-2 mt-4">
                                       {['1K', '2K'].map(res => (
                                          <button key={res} onClick={() => setResolution(res as any)} className={`px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${resolution === res ? 'bg-white text-black border-white' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}>{res}</button>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}

         <div className="bg-zinc-900/90 rounded-[48px] p-6 shadow-2xl border border-white/5 backdrop-blur-3xl ring-1 ring-white/10 flex flex-col gap-6">
            <div className="flex gap-6">
               <div className="relative flex-1">
                  <textarea 
                     value={inputPrompts} 
                     onChange={(e) => setInputPrompts(e.target.value)} 
                     placeholder="Paste batch prompts (1 to 53)..." 
                     className="w-full bg-zinc-950/50 border border-white/5 text-white placeholder-zinc-700 text-[13px] outline-none resize-none h-24 rounded-[32px] py-6 px-8 focus:border-lime-500/30 transition-all font-bold scrollbar-hide" 
                  />
                  <div className="absolute top-6 right-8 pointer-events-none">
                     <div className="bg-black/40 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md flex items-center gap-2">
                        <span className="text-[9px] font-black text-zinc-500 uppercase">Load</span>
                        <span className={`text-[10px] font-black ${inputPrompts.split('\n').filter(l => l.trim()).length >= 53 ? 'text-lime-400' : 'text-white'}`}>{inputPrompts.split('\n').filter(l => l.trim()).length}</span>
                     </div>
                  </div>
               </div>
               
               <div className="flex flex-col justify-between py-1 w-72">
                  <button onClick={() => setShowContextPanel(!showContextPanel)} className={`h-14 px-8 rounded-full flex items-center gap-4 border transition-all shadow-xl ${showContextPanel ? 'bg-white border-white text-black' : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white'}`}>
                     <Settings2 size={20} /> <span className="text-[11px] font-black uppercase tracking-[0.2em]">Studio Config</span>
                     {referenceImages.length > 0 && <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(163,230,53,1)]"></div>}
                  </button>
                  <button onClick={handleStartBatch} disabled={isProcessing} className={`h-14 px-10 rounded-full font-black text-[11px] uppercase tracking-[0.3em] flex items-center gap-4 transition-all shadow-[0_20px_40px_-10px_rgba(163,230,53,0.3)] ${isProcessing ? 'bg-zinc-800 text-zinc-600' : 'bg-lime-400 hover:bg-lime-500 text-black active:scale-95'}`}>
                     {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                     <span>Execute 53 Pack</span>
                  </button>
               </div>
            </div>

            <div className="flex items-center justify-between px-4">
               <div className="flex items-center gap-8">
                  <div className="flex items-center gap-4">
                     <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Master Ratio</span>
                     <div className="flex bg-zinc-950 p-1 rounded-full border border-white/5">
                        {ASPECT_RATIOS.slice(0, 5).map(ratio => (
                           <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-5 py-2 rounded-full text-[9px] font-black transition-all ${aspectRatio === ratio ? 'bg-zinc-100 text-black shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}>{ratio}</button>
                        ))}
                     </div>
                  </div>
                  <div className="h-5 w-px bg-white/10"></div>
                  <div className="flex items-center gap-4">
                     <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Active Engine</span>
                     <div className="flex items-center gap-2 bg-zinc-950 px-4 py-2 rounded-full border border-white/5">
                        <div className={`w-2 h-2 rounded-full ${engine === 'pro' ? 'bg-white animate-pulse' : 'bg-lime-400'}`}></div>
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{engine === 'pro' ? 'Banana Pro' : 'Nano Flash'}</span>
                     </div>
                  </div>
               </div>
               
               {isProcessing && (
                  <div className="flex items-center gap-6">
                     <div className="w-64 h-2 bg-zinc-950 rounded-full border border-white/5 overflow-hidden">
                        <div className="h-full bg-lime-400 transition-all duration-700 shadow-[0_0_20px_rgba(163,230,53,0.5)]" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                     </div>
                     <span className="text-[11px] font-black text-white tabular-nums tracking-tighter">{Math.round((progress.current / progress.total) * 100)}% Complete</span>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};
