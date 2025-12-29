
import React, { useState, useRef } from 'react';
import { editImageWithPrompt } from '../services/gemini';
import { Upload, Wand2, Download, ArrowRight, Loader2, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { downloadSingleImage } from '../utils/download';

export const ImageEditor: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSourceImage(event.target?.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!sourceImage || !prompt) return;
    setIsProcessing(true);
    try {
      const result = await editImageWithPrompt(sourceImage, prompt);
      setResultImage(result);
    } catch (error) {
      alert("Failed to edit image: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh)] bg-zinc-950 flex flex-col pt-24">
       
       <div className="flex-1 w-full max-w-7xl mx-auto px-4 pb-48 flex flex-col items-center justify-center">
          
          {/* Canvas Area */}
          <div className="w-full h-[60vh] flex gap-4 md:gap-8 items-center justify-center">
             
             {/* Source Image */}
             <div className="flex-1 h-full bg-zinc-900 rounded-3xl border border-zinc-800 relative flex items-center justify-center overflow-hidden group">
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]"></div>
                {sourceImage ? (
                   <>
                     <img src={sourceImage} className="max-w-full max-h-full object-contain relative z-10" />
                     <button onClick={() => setSourceImage(null)} className="absolute top-4 right-4 z-20 bg-zinc-800/80 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-red-500/80 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                     </button>
                   </>
                ) : (
                   <div onClick={() => fileInputRef.current?.click()} className="relative z-10 flex flex-col items-center justify-center text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
                      <Upload size={48} className="mb-2 opacity-50" />
                      <span className="font-bold">Upload Source</span>
                   </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
             </div>

             {/* Arrow */}
             <ArrowRight className="text-zinc-700 flex-shrink-0" size={32} />

             {/* Result Image */}
             <div className="flex-1 h-full bg-zinc-900 rounded-3xl border border-zinc-800 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]"></div>
                {isProcessing ? (
                   <div className="flex flex-col items-center gap-3 text-purple-500 relative z-10">
                      <Loader2 className="animate-spin" size={32} />
                      <span className="text-xs font-bold animate-pulse">Processing...</span>
                   </div>
                ) : resultImage ? (
                   <>
                     <img src={resultImage} className="max-w-full max-h-full object-contain relative z-10" />
                     <button onClick={() => downloadSingleImage(resultImage!, 'edited.png')} className="absolute bottom-4 right-4 z-20 bg-purple-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-purple-700 shadow-lg shadow-purple-900/20 flex items-center gap-2">
                        <Download size={14} /> Download
                     </button>
                   </>
                ) : (
                   <div className="relative z-10 text-zinc-700 font-bold uppercase tracking-wider text-xs">Result</div>
                )}
             </div>
          </div>

       </div>

       {/* Floating Dock */}
       <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-3xl z-50">
         <div className="bg-zinc-900/80 rounded-3xl p-4 shadow-2xl border border-zinc-800/50 backdrop-blur-xl bg-opacity-95 ring-1 ring-white/5">
            <div className="flex flex-col gap-3">
               <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={sourceImage ? "Describe changes (e.g. 'Make it snowy', 'Add sunglasses')..." : "Upload an image first..."}
                  disabled={!sourceImage}
                  className="w-full bg-transparent text-white placeholder-zinc-500 text-sm outline-none resize-none h-12 py-3 px-1 disabled:opacity-50" 
               />
               
               <div className="flex items-center justify-between gap-2">
                  <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="h-10 px-4 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center gap-2 transition-all"
                  >
                     <ImageIcon size={16} />
                     <span className="text-xs font-bold">{sourceImage ? 'Change' : 'Upload'}</span>
                  </button>

                  <button 
                     onClick={handleEdit}
                     disabled={isProcessing || !sourceImage || !prompt}
                     className={`
                        h-10 px-6 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20
                        ${isProcessing || !sourceImage || !prompt
                           ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                           : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105 active:scale-95'}
                     `}
                  >
                     {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} fill="currentColor" />}
                     <span>Edit Image</span>
                  </button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};
