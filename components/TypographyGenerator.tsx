
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedImage, ImageGenerationConfig } from '../types';
import { generateImageFromPrompt } from '../services/gemini';
import { downloadBatchAsZip, downloadSingleImage } from '../utils/download';
import { removeWhiteBackground, resizeImage } from '../utils/imageProcessing';
import { saveGeneratedImage } from '../services/storage';
import { 
  Download, Loader2, Type, Images, Eye, Sparkles, X, 
  Zap, Settings2, Check, Ratio, Square, RotateCw, Trash2, Cpu, Key, Palette, Camera
} from 'lucide-react';

type BackgroundType = 'None' | 'Studio Color' | 'Gradient' | 'Pattern' | 'Artistic';

const STUDIO_COLORS = [
  { name: 'Studio White', hex: '#FFFFFF', prompt: 'PURE SOLID FLAT WHITE (#FFFFFF) BACKGROUND. NO SHADOWS, NO GLOWS.' },
  { name: 'Infinity Black', hex: '#000000', prompt: 'PURE SOLID DEEP BLACK (#000000) BACKGROUND. TOTAL DARKNESS, NO LIGHT SPILL.' },
  { name: 'Chroma Green', hex: '#00FF00', prompt: 'PURE FLAT CHROMA KEY GREEN (#00FF00) BACKGROUND. UNIFORM SATURATION, NO SHADOWS, OPTIMIZED FOR COMPOSITING.' },
  { name: 'Chroma Blue', hex: '#0000FF', prompt: 'PURE FLAT CHROMA KEY BLUE (#0000FF) BACKGROUND. UNIFORM SATURATION, NO SHADOWS, OPTIMIZED FOR COMPOSITING.' },
  { name: 'Neutral Grey', hex: '#808080', prompt: 'SOLID NEUTRAL MID-GREY (#808080) BACKGROUND. FLAT LIGHTING.' },
];

/**
 * Technical lighting rig mappings for the Pro engine.
 * These descriptors force consistency in high-end models.
 */
const LIGHTING_TECHNICAL_MAP: Record<string, string> = {
  'None': 'Neutral daylight environment lighting.',
  'Cinematic Glass': 'Professional studio rim lighting, focus on refractive caustic highlights and internal glass glow, Octane render style.',
  'Neon Flare': 'High-contrast cyberpunk neon lighting, dual-tone color spill, atmospheric fog, volumetrics.',
  'Volumetric Fog': 'Cinematic god rays through thick volumetric fog, dramatic chiaroscuro lighting.',
  'Studio Product': 'Commercial Phase One studio lighting, softbox diffusion from 3 points, perfectly even shadows.',
  'Natural Window': 'Soft diffused morning sunlight through a large window, organic shadows, high dynamic range.',
  'Soft Pastel': 'Dreamy low-contrast soft lighting, high-key pastel color science, ethereal glow.',
  'Cyberpunk City Glow': 'Vibrant nighttime city ambient lighting, multiple point-light sources in pink and blue.',
  'Golden Hour Ray': 'Warm horizontal golden hour sun rays, long shadows, high-temperature color grading.'
};

// Fix: Define missing LIGHTING_OPTIONS to resolve reference error in UI rendering
const LIGHTING_OPTIONS = Object.keys(LIGHTING_TECHNICAL_MAP);

interface FontDef {
  name: string;
  category: string;
}

const FONT_LIBRARY: FontDef[] = [
  { name: 'Impact', category: 'Display' },
  { name: 'Inter Tight', category: 'Sans' },
  { name: 'Montserrat Black', category: 'Sans' },
  { name: 'Playfair Display', category: 'Serif' },
  { name: 'Pacifico', category: 'Handwriting' },
  { name: 'Bebas Neue', category: 'Display' },
  { name: 'Brush Script MT', category: 'Handwriting' },
];

export const TypographyGenerator: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [stylePrompt, setStylePrompt] = useState<string>('');
  const [selectedFont, setSelectedFont] = useState<string>('Impact');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [styleStrength, setStyleStrength] = useState<number>(90);
  const [preserveBackground, setPreserveBackground] = useState<boolean>(false);
  const [isTransparent, setIsTransparent] = useState<boolean>(false);
  const [lightingType, setLightingType] = useState<string>('None');
  const [backgroundType, setBackgroundType] = useState<BackgroundType>('None');
  const [selectedStudioColor, setSelectedStudioColor] = useState<string | null>(null);
  const [backgroundValue, setBackgroundValue] = useState<string>('');
  const [engine, setEngine] = useState<'flash' | 'pro'>('flash');
  const [hasProKey, setHasProKey] = useState(false);
  
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<ImageGenerationConfig['aspectRatio']>('16:9');
  const [resolution, setResolution] = useState<ImageGenerationConfig['resolution']>('1K');
  const [showContextPanel, setShowContextPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'font' | 'aesthetics' | 'engine'>('font');
  const refImageInputRef = useRef<HTMLInputElement>(null);

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

  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const resized = await resizeImage(event.target.result as string, 800, 800, 0.75);
          setReferenceImage(resized);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getBackgroundPrompt = () => {
    if (preserveBackground) return ''; 
    if (isTransparent) return STUDIO_COLORS[0].prompt;
    
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

  const handleStartGeneration = async () => {
    const lines = inputText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
    if (lines.length === 0) return;

    if (engine === 'pro' && !hasProKey) {
      handleSelectKey();
      return;
    }

    setShowContextPanel(false);
    const newImages: GeneratedImage[] = lines.map((text, i) => {
      // Production Typography Directives
      let finalPrompt = `Production Typography: Generate the word "${text}" centered in a professional ${selectedFont} font.`;
      
      if (stylePrompt) {
        finalPrompt += ` [MATERIAL IDENTITY]: Render text with ${stylePrompt} material.`;
      }

      // Add Technical Lighting Rig
      const lightingDirective = LIGHTING_TECHNICAL_MAP[lightingType] || LIGHTING_TECHNICAL_MAP['None'];
      finalPrompt += ` [LIGHTING RIG]: ${lightingDirective}`;
      
      const bgPrompt = getBackgroundPrompt();
      if (!preserveBackground) {
        if (bgPrompt) finalPrompt += ` [ENVIRONMENT]: ${bgPrompt}`;
      } else {
        finalPrompt += " [ENVIRONMENT LOCK]: Do not modify background. Retain exact reference image scene.";
      }

      if (referenceImage) {
        finalPrompt += ` [STYLE DNA LOCK]: Inherit 100% of material textures, shader properties, and color palette from the reference images at ${styleStrength}% intensity. Maintain absolute batch consistency.`;
      }

      return { id: `type-${Date.now()}-${i}`, prompt: finalPrompt, label: text.replace(/[^a-z0-9]/gi, '_'), status: 'pending' };
    });

    setImages(prev => [...newImages, ...prev]);
    setIsProcessing(true);

    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i];
      setImages(prev => prev.map(item => item.id === img.id ? { ...item, status: 'processing' } : item));

      try {
        let base64Data = await generateImageFromPrompt(
          img.prompt, 
          { aspectRatio, resolution, model: engine },
          referenceImage ? [referenceImage] : undefined,
          preserveBackground ? referenceImage : null
        );

        if (isTransparent && !preserveBackground) {
          base64Data = await removeWhiteBackground(base64Data, 12); 
        }
        
        const completed = { ...img, status: 'completed' as const, imageUrl: base64Data };
        setImages(prev => prev.map(item => item.id === img.id ? completed : item));
        await saveGeneratedImage(completed, 'TYPOGRAPHY');
      } catch (error) {
        setImages(prev => prev.map(item => item.id === img.id ? { ...item, status: 'failed', error: "Error" } : item));
      }
      await new Promise(r => setTimeout(r, 600));
    }
    setIsProcessing(false);
  };

  return (
    <div className="relative min-h-[calc(100vh)] bg-zinc-950 flex flex-col pt-24 overflow-x-hidden">
      {/* Side Control Center */}
      <div className="hidden lg:flex fixed left-8 top-32 bottom-12 w-80 bg-zinc-900/80 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 flex-col gap-6 z-40 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-3"><Type size={16} className="text-pink-500" /> Batch Typo Pack</h3>
           <span className="bg-pink-500/10 text-pink-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border border-pink-500/20">53 Max</span>
        </div>
        <textarea 
           value={inputText} 
           onChange={(e) => setInputText(e.target.value)} 
           placeholder="Paste words (1-53)..." 
           className="flex-1 w-full bg-zinc-950/50 border border-white/5 rounded-3xl p-6 text-sm text-white placeholder-zinc-800 outline-none focus:border-pink-500/30 transition-all font-bold scrollbar-hide resize-none shadow-inner" 
        />
        <div className="bg-zinc-950 p-5 rounded-3xl border border-white/5">
           <div className="text-[9px] font-black text-zinc-600 uppercase mb-3 tracking-widest">Master Production Font</div>
           <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className="w-full bg-zinc-900 border border-white/5 text-zinc-300 text-[11px] font-black uppercase rounded-2xl px-5 py-4 outline-none hover:bg-zinc-800 transition-colors appearance-none">
              {FONT_LIBRARY.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
           </select>
        </div>
      </div>

      <div className="flex-1 w-full max-w-[1800px] mx-auto px-8 pb-48 lg:pl-96">
         {/* Live Preview Display */}
         <div className="w-full h-[400px] bg-zinc-900 rounded-[48px] border border-white/5 relative overflow-hidden flex items-center justify-center mb-16 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] group">
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-transparent"></div>
            <span className="text-7xl lg:text-9xl text-zinc-100 font-black drop-shadow-[0_24px_60px_rgba(0,0,0,0.8)] z-10 select-none transition-all group-hover:scale-110 tracking-tighter">
               {inputText.split('\n')[0] || "PRO"}
            </span>
            <div className="absolute bottom-10 right-12 text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] opacity-40">Pro Branding Production Engine</div>
         </div>

         <div className="flex justify-between items-end mb-10">
            <div>
               <h2 className="text-3xl font-black text-zinc-100 flex items-center gap-4 tracking-tighter uppercase">
                  <Palette className="text-pink-500" size={32} />
                  Production Rendering
               </h2>
               <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-[0.4em] font-black">Nano Banana {engine === 'pro' ? 'Pro Engine (HQ Consistency)' : 'Standard Engine'}</p>
            </div>
            {images.filter(i => i.status === 'completed').length > 0 && (
              <button onClick={() => downloadBatchAsZip(images, 'typography_master_pack.zip')} className="flex items-center gap-3 px-8 py-3 bg-zinc-100 text-black rounded-full text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl"><Download size={16} /> Export Final Pack</button>
            )}
         </div>

         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 animate-in fade-in duration-1000">
           {images.map((img) => (
             <div key={img.id} className="group relative bg-zinc-900 rounded-[40px] overflow-hidden border border-white/5 aspect-square shadow-2xl transition-all hover:border-pink-500/30 hover:scale-[1.02]">
                <div className="absolute inset-0 z-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
                {img.status === 'completed' && img.imageUrl ? (
                   <>
                    <img src={img.imageUrl} className="w-full h-full object-contain p-8 relative z-10 transition-transform duration-700 group-hover:scale-125" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4 z-20 backdrop-blur-[4px]">
                       <button onClick={() => downloadSingleImage(img.imageUrl!, `${img.label}.png`)} className="bg-white text-black p-5 rounded-full hover:scale-110 transition-transform shadow-2xl"><Download size={24} /></button>
                       <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{img.label}</span>
                    </div>
                   </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center relative z-10 p-6">
                    {img.status === 'processing' ? (
                       <div className="relative">
                          <Loader2 className="animate-spin text-pink-500" size={40} />
                          <div className="absolute inset-0 blur-2xl bg-pink-500/30 animate-pulse"></div>
                       </div>
                    ) : <span className="text-[9px] text-zinc-800 font-black uppercase tracking-widest">Queued</span>}
                  </div>
                )}
             </div>
           ))}
         </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-50 lg:pl-80">
         {showContextPanel && (
            <div className="absolute bottom-full left-0 mb-6 w-full bg-zinc-900/98 backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden animate-in slide-in-from-bottom-12 duration-300">
               <div className="flex border-b border-white/5 bg-zinc-950/20">
                  <button onClick={() => setActiveTab('font')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'font' ? 'bg-zinc-800/50 text-pink-500' : 'text-zinc-600 hover:text-zinc-400'}`}>01 Aesthetics</button>
                  <button onClick={() => setActiveTab('aesthetics')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'aesthetics' ? 'bg-zinc-800/50 text-pink-500' : 'text-zinc-600 hover:text-zinc-400'}`}>02 Environment</button>
                  <button onClick={() => setActiveTab('engine')} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'engine' ? 'bg-zinc-800/50 text-pink-500' : 'text-zinc-600 hover:text-zinc-400'}`}>03 Rendering</button>
                  <button onClick={() => setShowContextPanel(false)} className="px-10 border-l border-white/5 text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
               </div>
               
               <div className="p-12 space-y-12">
                  {activeTab === 'font' && (
                    <div className="space-y-10">
                      <div className="grid grid-cols-2 gap-12">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Technical Material Signature</label>
                          <input value={stylePrompt} onChange={(e) => setStylePrompt(e.target.value)} placeholder="e.g. Liquid Silver, Brushed Carbon, Polymeric Glass..." className="w-full bg-zinc-950 border border-white/5 text-white text-[11px] font-black uppercase rounded-2xl px-6 py-5 outline-none focus:border-pink-500/30 transition-all shadow-inner" />
                        </div>
                        <div className="space-y-6">
                           <div className="flex justify-between items-end">
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">DNA Strength Influence</span>
                              <span className="text-3xl font-black text-pink-500">{styleStrength}%</span>
                           </div>
                           <input type="range" min="0" max="100" value={styleStrength} onChange={(e) => setStyleStrength(parseInt(e.target.value))} className="w-full h-2.5 bg-zinc-800 accent-pink-500 rounded-full appearance-none cursor-pointer" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-12">
                         <div className="space-y-4">
                            <label className="text-[10px] font-black text-zinc-500 uppercase block mb-4 flex items-center gap-2"><Camera size={14} /> Studio Lighting Rig</label>
                            <div className="grid grid-cols-3 gap-3">
                               {LIGHTING_OPTIONS.map(opt => (
                                  <button key={opt} onClick={() => setLightingType(opt)} className={`px-2 py-4 rounded-2xl border text-[9px] font-black uppercase transition-all ${lightingType === opt ? 'bg-pink-500 border-pink-500 text-white shadow-xl shadow-pink-500/10' : 'bg-zinc-950 border-white/5 text-zinc-600 hover:text-zinc-400'}`}>{opt}</button>
                               ))}
                            </div>
                         </div>
                         <div className="flex flex-col justify-end gap-4">
                            <button onClick={() => refImageInputRef.current?.click()} className={`w-full py-5 border rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl ${referenceImage ? 'bg-pink-500/10 border-pink-500/30 text-pink-500' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:bg-zinc-900'}`}>{referenceImage ? 'Style DNA Locked' : 'Import DNA Source'}</button>
                            {referenceImage && <button onClick={() => setReferenceImage(null)} className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center hover:underline">Unlink Style Source</button>}
                         </div>
                      </div>
                      <input type="file" ref={refImageInputRef} onChange={handleReferenceImageUpload} className="hidden" />
                    </div>
                  )}

                  {activeTab === 'aesthetics' && (
                    <div className="grid grid-cols-2 gap-16 items-center">
                       <div className="bg-zinc-950 p-10 rounded-[40px] border border-white/5 shadow-inner space-y-8">
                          <div className="flex items-center justify-between">
                             <div>
                                <div className="text-base font-black text-white uppercase tracking-tight">Cutout Master (PNG)</div>
                                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">Export high-precision branding assets</div>
                             </div>
                             <button onClick={() => setIsTransparent(!isTransparent)} className={`w-16 h-8 rounded-full relative transition-all shadow-2xl ${isTransparent ? 'bg-pink-500' : 'bg-zinc-800'}`}>
                                <span className={`absolute top-1.5 left-1.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${isTransparent ? 'translate-x-8' : 'translate-x-0'}`} />
                             </button>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-8">
                             <div>
                                <div className="text-base font-black text-white uppercase tracking-tight">Environment Lock</div>
                                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-1">Render text within reference scene</div>
                             </div>
                             <button onClick={() => setPreserveBackground(!preserveBackground)} className={`w-16 h-8 rounded-full relative transition-all shadow-2xl ${preserveBackground ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                                <span className={`absolute top-1.5 left-1.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${preserveBackground ? 'translate-x-8' : 'translate-x-0'}`} />
                             </button>
                          </div>
                       </div>
                       <div className="space-y-8">
                          <div className={preserveBackground || isTransparent ? 'opacity-20 grayscale pointer-events-none' : ''}>
                             <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Master Backplate Control</label>
                             <div className="flex flex-col gap-4">
                                <select value={backgroundType} onChange={(e) => setBackgroundType(e.target.value as BackgroundType)} className="w-full bg-zinc-950 border border-white/5 text-white text-[11px] font-black uppercase rounded-2xl px-6 py-5 outline-none focus:border-pink-500/30 appearance-none">
                                   <option value="None">AI Ambient Analysis</option>
                                   <option value="Studio Color">Studio & Chroma Palette</option>
                                   <option value="Gradient">Professional Gradient</option>
                                   <option value="Pattern">Vector Graphics Asset</option>
                                </select>
                                
                                {backgroundType === 'Studio Color' && (
                                   <div className="flex flex-wrap gap-3 p-4 bg-zinc-950 rounded-3xl border border-white/5">
                                      {STUDIO_COLORS.map(color => (
                                         <button
                                            key={color.hex}
                                            onClick={() => setSelectedStudioColor(color.hex)}
                                            className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all ${selectedStudioColor === color.hex ? 'bg-white border-white text-black' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-white'}`}
                                         >
                                            <div className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: color.hex }}></div>
                                            <span className="text-[10px] font-black uppercase tracking-tighter">{color.name}</span>
                                         </button>
                                      ))}
                                   </div>
                                )}

                                {backgroundType !== 'None' && backgroundType !== 'Studio Color' && (
                                   <input value={backgroundValue} onChange={(e) => setBackgroundValue(e.target.value)} placeholder="e.g. Deep Cosmic Purple..." className="w-full mt-4 bg-zinc-950 border border-white/5 text-white text-[11px] font-black rounded-2xl px-6 py-5 outline-none focus:border-pink-500 shadow-inner" />
                                )}
                             </div>
                          </div>
                          <div className="flex gap-4">
                             {['16:9', '1:1', '4:3'].map(ratio => (
                                <button key={ratio} onClick={() => setAspectRatio(ratio as any)} className={`flex-1 py-4 rounded-2xl border text-[10px] font-black transition-all ${aspectRatio === ratio ? 'bg-white border-white text-black shadow-2xl' : 'bg-zinc-950 border-white/5 text-zinc-600 hover:text-zinc-400'}`}>{ratio}</button>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'engine' && (
                     <div className="grid grid-cols-2 gap-16">
                        <div className="bg-zinc-950 p-10 rounded-[40px] border border-white/5 shadow-inner">
                           <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2"><Cpu size={14} /> Production Engine</h4>
                           <div className="grid grid-cols-2 gap-6">
                              <button onClick={() => setEngine('flash')} className={`flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all ${engine === 'flash' ? 'bg-pink-500 border-pink-500 text-white shadow-xl shadow-pink-500/20' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}>
                                 <Zap size={32} />
                                 <span className="text-[10px] font-black uppercase">Standard Mode</span>
                              </button>
                              <button onClick={() => setEngine('pro')} className={`flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all ${engine === 'pro' ? 'bg-white border-white text-black shadow-xl shadow-white/10' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}>
                                 <Cpu size={32} />
                                 <span className="text-[10px] font-black uppercase">Banana Pro Mode</span>
                              </button>
                           </div>
                        </div>
                        <div className="bg-zinc-950 p-10 rounded-[40px] border border-white/5 shadow-inner flex flex-col justify-center text-center">
                           {engine === 'pro' && !hasProKey ? (
                              <>
                                 <Key className="text-amber-500 mx-auto mb-6" size={48} />
                                 <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-3">API Authentication Key Required</h4>
                                 <p className="text-[9px] text-zinc-500 font-bold uppercase mb-8 leading-relaxed">Nano Banana Pro requires manual authentication via AI Studio Master Key.</p>
                                 <button onClick={handleSelectKey} className="px-10 py-4 bg-amber-600 text-white text-[11px] font-black uppercase rounded-full shadow-2xl hover:scale-105 transition-all">Authenticate Engine</button>
                              </>
                           ) : (
                              <>
                                 <div className="bg-pink-500/10 text-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                    <Sparkles size={40} />
                                 </div>
                                 <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Calibration Ready</h4>
                                 <div className="flex justify-center gap-3 mt-6">
                                    {['1K', '2K', '4K'].map(res => (
                                       <button key={res} onClick={() => setResolution(res as any)} className={`px-6 py-3 rounded-xl border text-[10px] font-black transition-all ${resolution === res ? 'bg-white border-white text-black shadow-xl' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:text-zinc-300'}`}>{res}</button>
                                    ))}
                                 </div>
                              </>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}

         <div className="bg-zinc-900/90 rounded-[48px] p-5 shadow-2xl border border-white/10 backdrop-blur-3xl ring-1 ring-white/10 flex items-center justify-between gap-6">
            <button onClick={() => setShowContextPanel(!showContextPanel)} className={`h-16 px-10 rounded-full flex items-center gap-4 border transition-all shadow-2xl ${showContextPanel ? 'bg-white border-white text-black' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
               <Settings2 size={24} />
               <span className="text-[11px] font-black uppercase tracking-[0.3em]">Studio Aesthetics Console</span>
            </button>
            <button onClick={handleStartGeneration} disabled={isProcessing} className={`h-16 px-14 rounded-full font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-5 transition-all shadow-[0_20px_50px_-10px_rgba(236,72,153,0.4)] ${isProcessing ? 'bg-zinc-800 text-zinc-700 cursor-not-allowed' : 'bg-pink-500 hover:bg-pink-600 text-white active:scale-95'}`}>
               {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} fill="currentColor" />}
               <span>Execute {inputText.split('\n').filter(l => l.trim()).length || 53} Pack</span>
            </button>
         </div>
      </div>
    </div>
  );
};
