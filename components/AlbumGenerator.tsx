
import React, { useState, useRef, useEffect } from 'react';
import { GeneratedImage, ImageGenerationConfig } from '../types';
import { generateImageFromPrompt } from '../services/gemini';
import { downloadSingleImage } from '../utils/download';
import { resizeImage } from '../utils/imageProcessing';
import { saveGeneratedImage } from '../services/storage';
import { 
  Download, Loader2, Disc, Music, Palette, Smile, Sparkles, X, 
  Settings2, Zap, Cpu, Key, Ratio, Camera, Upload, Trash2, Heart, 
  Flame, Moon, Sun, Ghost, Layers
} from 'lucide-react';

// Fix: Defined History component before usage in EMOTIONS to prevent block-scoped variable hoisting error.
const History = ({ size }: { size: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;

const EMOTIONS = [
  { id: 'nostalgic', label: 'Nostalgic', icon: <History size={14} />, prompt: 'melancholic, grainy film, vintage hues, emotional depth' },
  { id: 'energetic', label: 'Energetic', icon: <Flame size={14} />, prompt: 'high energy, vibrant, dynamic motion, powerful contrast' },
  { id: 'dark', label: 'Dark', icon: <Moon size={14} />, prompt: 'brooding, cinematic shadows, mysterious, noir aesthetic' },
  { id: 'ethereal', label: 'Ethereal', icon: <Sun size={14} />, prompt: 'dreamy, soft focus, angelic light, surreal textures' },
  { id: 'aggressive', label: 'Aggressive', icon: <Zap size={14} />, prompt: 'distorted, gritty, industrial, raw power' },
  { id: 'minimal', label: 'Minimalist', icon: <Layers size={14} />, prompt: 'clean, negative space, structured, modern simplicity' },
];

const GENRES = [
  'Techno', 'Heavy Metal', 'Lofi Hip-Hop', 'Vaporwave', 'Jazz', 
  'Classical', 'Indie Rock', 'Synthwave', 'Psychedelic', 'Pop'
];

const TONES = [
  { name: 'Monochrome', colors: ['#000', '#333', '#fff'], prompt: 'Black and white photography style, high contrast.' },
  { name: 'Cyberpunk', colors: ['#f0f', '#0ff', '#30f'], prompt: 'Neon pink and blue palette, futuristic urban glow.' },
  { name: 'Earthly', colors: ['#4b3621', '#8b4513', '#556b2f'], prompt: 'Deep browns, forest greens, natural organic tones.' },
  { name: 'Vibrant', colors: ['#ff0', '#f00', '#0f0'], prompt: 'Explosive saturated colors, pop art influence.' },
  { name: 'Pastel', colors: ['#ffb7ce', '#b0e0e6', '#fffacd'], prompt: 'Soft dream-like pastels, gentle saturation.' },
];

export const AlbumGenerator: React.FC = () => {
  const [albumTitle, setAlbumTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState(EMOTIONS[0].id);
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [selectedTone, setSelectedTone] = useState(TONES[0].name);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  
  const [engine, setEngine] = useState<'flash' | 'pro'>('pro');
  const [resolution, setResolution] = useState<ImageGenerationConfig['resolution']>('1K');
  const [aspectRatio, setAspectRatio] = useState<ImageGenerationConfig['aspectRatio']>('1:1');
  const [hasProKey, setHasProKey] = useState(false);
  
  const [result, setResult] = useState<GeneratedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasProKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const resized = await resizeImage(event.target.result as string, 512, 512, 0.7);
          setLogoImage(resized);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (engine === 'pro' && !hasProKey) {
      const aistudio = (window as any).aistudio;
      if (aistudio) await aistudio.openSelectKey();
      setHasProKey(true);
      return;
    }

    setIsProcessing(true);
    setResult(null);

    const emotionPrompt = EMOTIONS.find(e => e.id === selectedEmotion)?.prompt;
    const tonePrompt = TONES.find(t => t.name === selectedTone)?.prompt;

    let finalPrompt = `Professional Album Cover Art: Titled "${albumTitle}". Artist: "${artistName}". `;
    finalPrompt += `Genre: ${selectedGenre}. Emotion: ${emotionPrompt}. Tone: ${tonePrompt}. `;
    finalPrompt += `[ARTISTIC DIRECTION]: High-end commercial cover art, 8k resolution, artistic masterpiece. `;
    
    if (logoImage) {
      finalPrompt += `[BRANDING INTEGRATION]: Incorporate the style and essence of the uploaded artist logo into the visual composition. `;
    }

    try {
      const imageUrl = await generateImageFromPrompt(
        finalPrompt,
        { aspectRatio, resolution, model: engine },
        logoImage ? [logoImage] : undefined
      );

      const newResult: GeneratedImage = {
        id: `album-${Date.now()}`,
        prompt: finalPrompt,
        label: albumTitle || 'album_art',
        status: 'completed',
        imageUrl
      };

      setResult(newResult);
      await saveGeneratedImage(newResult, 'ALBUM');
    } catch (error) {
      console.error(error);
      alert("Generation failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 pt-24 pb-48 flex flex-col items-center">
      <div className="w-full max-w-6xl px-8 flex flex-col lg:flex-row gap-12">
        
        {/* Left: Preview Area */}
        <div className="flex-1 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter uppercase">
                <Disc className="text-lime-500 animate-spin-slow" /> Studio Album Forge
              </h2>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-[0.4em] font-black">Professional Cover Production</p>
            </div>
            {result?.imageUrl && (
              <button onClick={() => downloadSingleImage(result.imageUrl!, `${result.label}.png`)} className="bg-zinc-100 text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <Download size={14} /> Export Master
              </button>
            )}
          </div>

          <div className="aspect-square w-full bg-zinc-900 rounded-[48px] border border-white/5 relative overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] flex items-center justify-center group">
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:32px_32px] opacity-20"></div>
            
            {isProcessing ? (
              <div className="flex flex-col items-center gap-6 z-10">
                <div className="relative">
                  <Loader2 className="animate-spin text-lime-400" size={64} />
                  <div className="absolute inset-0 blur-3xl bg-lime-400/20 animate-pulse"></div>
                </div>
                <div className="text-center">
                  <span className="text-xl font-black text-lime-400 uppercase tracking-[0.2em] block">Rendering Master</span>
                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2 block">Calibrating Style DNA...</span>
                </div>
              </div>
            ) : result?.imageUrl ? (
              <img src={result.imageUrl} className="w-full h-full object-cover animate-in fade-in duration-1000" />
            ) : (
              <div className="flex flex-col items-center text-zinc-700 gap-4">
                <Music size={80} className="opacity-20" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em]">System Awaiting Directives</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Controls Area */}
        <div className="w-full lg:w-96 space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 space-y-8 shadow-2xl">
            {/* Branding */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">01 Branding</h3>
              <div className="space-y-3">
                <input 
                  value={albumTitle} 
                  onChange={(e) => setAlbumTitle(e.target.value)} 
                  placeholder="Album Title" 
                  className="w-full bg-zinc-950 border border-white/5 text-white text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:border-lime-500/30 transition-all shadow-inner" 
                />
                <input 
                  value={artistName} 
                  onChange={(e) => setArtistName(e.target.value)} 
                  placeholder="Artist Name" 
                  className="w-full bg-zinc-950 border border-white/5 text-white text-sm font-bold rounded-2xl px-6 py-4 outline-none focus:border-lime-500/30 transition-all shadow-inner" 
                />
              </div>
            </div>

            {/* Feeling */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">02 Emotional Signature</h3>
              <div className="grid grid-cols-2 gap-2">
                {EMOTIONS.map(e => (
                  <button 
                    key={e.id} 
                    onClick={() => setSelectedEmotion(e.id)} 
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${selectedEmotion === e.id ? 'bg-lime-400 border-lime-400 text-black shadow-xl shadow-lime-400/20' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:text-white'}`}
                  >
                    {e.icon} {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">03 Logo DNA</h3>
              <div 
                onClick={() => logoInputRef.current?.click()}
                className={`w-full aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${logoImage ? 'border-lime-400/50 bg-lime-400/5' : 'border-zinc-800 hover:border-zinc-700'}`}
              >
                {logoImage ? (
                  <div className="relative w-full h-full p-4 flex items-center justify-center">
                    <img src={logoImage} className="max-w-full max-h-full object-contain" />
                    <button onClick={(e) => { e.stopPropagation(); setLogoImage(null); }} className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"><X size={12} /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} className="text-zinc-700" />
                    <span className="text-[9px] font-black text-zinc-600 uppercase mt-2">Import PNG Logo</span>
                  </>
                )}
              </div>
              <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
            </div>

            {/* Tone */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">04 Color Palette</h3>
              <div className="flex flex-col gap-2">
                {TONES.map(t => (
                  <button 
                    key={t.name} 
                    onClick={() => setSelectedTone(t.name)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${selectedTone === t.name ? 'bg-white border-white text-black' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:text-white'}`}
                  >
                    <span className="text-[10px] font-black uppercase">{t.name}</span>
                    <div className="flex gap-1">
                      {t.colors.map(c => <div key={c} className="w-3 h-3 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: c }}></div>)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Console */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-50">
        {showConfig && (
          <div className="absolute bottom-full left-0 mb-6 w-full bg-zinc-900/98 backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] overflow-hidden animate-in slide-in-from-bottom-12 duration-300 p-10 flex gap-12">
            <div className="flex-1 space-y-6">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Production Engine</h4>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setEngine('flash')} className={`flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all ${engine === 'flash' ? 'bg-lime-400 border-lime-400 text-black shadow-xl shadow-lime-400/20' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}>
                  <Zap size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Fast Draft</span>
                </button>
                <button onClick={() => setEngine('pro')} className={`flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all ${engine === 'pro' ? 'bg-white border-white text-black shadow-xl shadow-white/10' : 'bg-zinc-900 border-white/5 text-zinc-600'}`}>
                  <Cpu size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Banana Pro</span>
                </button>
              </div>
            </div>
            <div className="w-64 space-y-6">
              <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Aspect & Res</h4>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {['1:1', '16:9', '4:3', '9:16'].map(r => (
                    <button key={r} onClick={() => setAspectRatio(r as any)} className={`py-3 rounded-xl border text-[10px] font-black transition-all ${aspectRatio === r ? 'bg-zinc-100 text-black border-zinc-100' : 'bg-zinc-950 border-white/5 text-zinc-500'}`}>{r}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                   {['1K', '2K'].map(res => (
                    <button key={res} onClick={() => setResolution(res as any)} className={`flex-1 py-3 rounded-xl border text-[10px] font-black transition-all ${resolution === res ? 'bg-zinc-100 text-black border-zinc-100' : 'bg-zinc-950 border-white/5 text-zinc-500'}`}>{res}</button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setShowConfig(false)} className="self-start p-4 text-zinc-500 hover:text-white transition-colors"><X size={24} /></button>
          </div>
        )}

        <div className="bg-zinc-900/90 rounded-[48px] p-6 shadow-2xl border border-white/10 backdrop-blur-3xl ring-1 ring-white/10 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <button onClick={() => setShowConfig(!showConfig)} className={`h-16 px-10 rounded-full flex items-center gap-4 border transition-all shadow-2xl ${showConfig ? 'bg-white border-white text-black' : 'bg-zinc-950 border-white/5 text-zinc-500 hover:text-white hover:bg-zinc-900'}`}>
              <Settings2 size={24} />
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">Studio Logic</span>
            </button>
            <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
            <div className="hidden sm:flex items-center gap-4">
               <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Active Genre</span>
               <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="bg-transparent text-white text-[11px] font-black uppercase outline-none cursor-pointer hover:text-lime-400 transition-colors appearance-none">
                  {GENRES.map(g => <option key={g} value={g} className="bg-zinc-900">{g}</option>)}
               </select>
            </div>
          </div>

          <button 
            onClick={handleGenerate} 
            disabled={isProcessing} 
            className={`h-16 px-16 rounded-full font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-5 transition-all shadow-[0_20px_50px_-10px_rgba(163,230,53,0.4)] ${isProcessing ? 'bg-zinc-800 text-zinc-700 cursor-not-allowed' : 'bg-lime-400 hover:bg-lime-500 text-black active:scale-95'}`}
          >
            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} fill="currentColor" />}
            <span>Initialize Cover</span>
          </button>
        </div>
      </div>
    </div>
  );
};
