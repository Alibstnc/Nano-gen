
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedVideo } from '../types';
import { generateVideoFromImage } from '../services/gemini';
import { Upload, Video, Play, Loader2, AlertCircle, Trash2, Download, Film, X, Image as ImageIcon } from 'lucide-react';

export const VideoGenerator: React.FC = () => {
  const [hasPaidKey, setHasPaidKey] = useState<boolean>(false);
  const [checkingKey, setCheckingKey] = useState<boolean>(true);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [globalPrompt, setGlobalPrompt] = useState<string>('');
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showQueue, setShowQueue] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    setCheckingKey(true);
    try {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasPaidKey(hasKey);
      } else {
        setHasPaidKey(false);
      }
    } catch (e) {
      console.error("Error checking API key", e);
      setHasPaidKey(false);
    } finally {
      setCheckingKey(false);
    }
  };

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      try {
        await aistudio.openSelectKey();
        await checkApiKey();
      } catch (e) {
        console.error("Error selecting key", e);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setShowQueue(true); // Auto show queue on upload
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleStartGeneration = async () => {
    if (selectedFiles.length === 0) {
      alert("Please upload at least one image.");
      setShowQueue(true);
      return;
    }

    if (!hasPaidKey && (window as any).aistudio) {
      handleSelectKey();
      return;
    }

    setShowQueue(false);
    setIsProcessing(true);
    setProgress({ current: 0, total: selectedFiles.length });

    const queue: GeneratedVideo[] = [];
    
    for (const file of selectedFiles) {
       const base64 = await convertFileToBase64(file);
       queue.push({
         id: `vid-${Date.now()}-${Math.random()}`,
         sourceImage: base64,
         prompt: globalPrompt || "Cinematic shot, subtle motion",
         status: 'pending'
       });
    }

    setVideos(prev => [...prev, ...queue]);
    setSelectedFiles([]);

    for (let i = 0; i < queue.length; i++) {
      const vid = queue[i];
      setVideos(prev => prev.map(item => item.id === vid.id ? { ...item, status: 'processing' } : item));

      try {
        const videoUrl = await generateVideoFromImage(vid.sourceImage, vid.prompt);
        setVideos(prev => prev.map(item => item.id === vid.id ? { ...item, status: 'completed', videoUrl: videoUrl } : item));
      } catch (error) {
        if (error instanceof Error && error.message.includes("Requested entity was not found")) {
            setHasPaidKey(false);
        }
        setVideos(prev => prev.map(item => item.id === vid.id ? { ...item, status: 'failed', error: error instanceof Error ? error.message : "Generation failed" } : item));
      }

      setProgress(prev => ({ ...prev, current: i + 1 }));
    }

    setIsProcessing(false);
  };

  return (
    <div className="relative min-h-[calc(100vh)] bg-zinc-950 flex flex-col pt-24">
      
      {/* Billing Warning */}
      {!checkingKey && !hasPaidKey && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-amber-950/80 border border-amber-800 rounded-xl p-4 flex items-center gap-4 backdrop-blur-md">
           <AlertCircle className="text-amber-500" size={24} />
           <div>
             <h3 className="font-semibold text-amber-200 text-sm">Paid API Key Required</h3>
             <p className="text-xs text-amber-400">Veo requires a billing-enabled project.</p>
           </div>
           <button onClick={handleSelectKey} className="px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg font-bold">Select Key</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 pb-48">
         <div className="flex items-center gap-2 mb-8">
            <h2 className="text-2xl font-bold text-zinc-100">Motion Gallery</h2>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30">Beta</span>
         </div>

         {videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500">
               <Film size={48} className="mb-4 opacity-20" />
               <p>Upload images to create motion</p>
            </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {videos.map((vid, idx) => (
               <div key={vid.id} className="bg-zinc-900 rounded-2xl overflow-hidden shadow-lg border border-zinc-800">
                  <div className="aspect-video bg-black relative">
                     {vid.status === 'completed' && vid.videoUrl ? (
                       <video src={vid.videoUrl} controls autoPlay loop muted className="w-full h-full object-cover" />
                     ) : vid.status === 'processing' ? (
                       <div className="w-full h-full flex flex-col items-center justify-center text-indigo-500 gap-2">
                         <Loader2 className="animate-spin" size={32} />
                         <span className="text-xs font-medium">Generating...</span>
                       </div>
                     ) : (
                       <div className="w-full h-full flex items-center justify-center">
                         <img src={vid.sourceImage} className="w-full h-full object-cover opacity-50 blur-sm" />
                         <div className="absolute inset-0 flex items-center justify-center text-red-400 font-bold bg-black/40">Failed</div>
                       </div>
                     )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-zinc-400 truncate">{vid.prompt}</p>
                    {vid.status === 'completed' && (
                       <a href={vid.videoUrl} download={`motion_${idx}.mp4`} className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1 font-medium">
                          <Download size={12} /> Download MP4
                       </a>
                    )}
                  </div>
               </div>
             ))}
           </div>
         )}
      </div>

      {/* Floating Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-50">
         
         {/* Upload Queue Panel */}
         {showQueue && (
            <div className="absolute bottom-full left-0 mb-4 w-full bg-zinc-900/95 backdrop-blur-xl rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in">
               <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Queue ({selectedFiles.length})</h3>
                  <button onClick={() => setShowQueue(false)}><X size={18} className="text-zinc-500 hover:text-white" /></button>
               </div>
               <div className="p-4 grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden group">
                       <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-[10px] uppercase font-bold">Image</div>
                       <button onClick={() => removeFile(idx)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"><X size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-colors">
                     <Upload size={20} />
                     <span className="text-[9px] mt-1">Add</span>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />
               </div>
            </div>
         )}

         <div className="bg-zinc-900/80 rounded-3xl p-4 shadow-2xl border border-zinc-800/50 backdrop-blur-xl bg-opacity-95 ring-1 ring-white/5">
            <div className="flex flex-col gap-3">
               <textarea 
                  value={globalPrompt}
                  onChange={(e) => setGlobalPrompt(e.target.value)}
                  placeholder="Describe motion (e.g., Pan right, zoom in)..."
                  className="w-full bg-transparent text-white placeholder-zinc-500 text-sm outline-none resize-none h-12 py-3 px-1" 
               />
               
               <div className="flex items-center justify-between gap-2">
                  <button 
                     onClick={() => setShowQueue(!showQueue)}
                     className={`h-10 px-4 rounded-full flex items-center gap-2 border transition-all ${showQueue ? 'bg-zinc-800 border-zinc-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                  >
                     <ImageIcon size={16} />
                     <span className="text-xs font-bold">Uploads</span>
                     {selectedFiles.length > 0 && <span className="bg-indigo-500 text-white text-[10px] px-1.5 rounded-full ml-1">{selectedFiles.length}</span>}
                  </button>

                  <button 
                     onClick={handleStartGeneration}
                     disabled={isProcessing || selectedFiles.length === 0}
                     className={`
                        h-10 px-6 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20
                        ${isProcessing || selectedFiles.length === 0
                           ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                           : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95'}
                     `}
                  >
                     {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} fill="currentColor" />}
                     <span>Generate</span>
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
