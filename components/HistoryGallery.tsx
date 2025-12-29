
import React, { useEffect, useState } from 'react';
import { getAllImages, deleteImage, clearDatabase } from '../services/storage';
import { downloadSingleImage } from '../utils/download';
import { GeneratedImage } from '../types';
import { Download, Trash2, History, AlertCircle, Calendar, Tag, Search, X } from 'lucide-react';

export const HistoryGallery: React.FC = () => {
  const [images, setImages] = useState<(GeneratedImage & { timestamp?: number; mode?: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewedImage, setViewedImage] = useState<(GeneratedImage & { timestamp?: number }) | null>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const stored = await getAllImages();
      setImages(stored);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this image?")) {
      await deleteImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
      if (viewedImage?.id === id) setViewedImage(null);
    }
  };

  const handleClearAll = async () => {
    if (confirm("WARNING: This will delete ALL saved images. This action cannot be undone.")) {
      await clearDatabase();
      setImages([]);
    }
  };

  const filteredImages = images.filter(img => 
    img.prompt.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (img.mode && img.mode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (ts?: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="relative min-h-[calc(100vh)] bg-zinc-950 flex flex-col pt-24 text-zinc-100">
      
      {/* Modal Viewer */}
      {viewedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
           <div className="bg-zinc-900 rounded-3xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-zinc-800">
              <div className="flex justify-between items-center p-4 border-b border-zinc-800">
                <div className="flex flex-col">
                  <h3 className="font-semibold text-zinc-100">Image Details</h3>
                  <span className="text-xs text-zinc-500">{formatDate(viewedImage.timestamp)}</span>
                </div>
                <button onClick={() => setViewedImage(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                 <div className="flex-1 p-6 flex items-center justify-center bg-zinc-950/50">
                    {viewedImage.imageUrl && (
                      <img src={viewedImage.imageUrl} alt="Full view" className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded-lg" />
                    )}
                 </div>
                 <div className="w-full md:w-80 border-l border-zinc-800 bg-zinc-900 p-6 flex flex-col gap-4">
                    <div>
                       <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Prompt Used</h4>
                       <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-sm text-zinc-300 leading-relaxed max-h-60 overflow-y-auto">
                         {viewedImage.prompt}
                       </div>
                    </div>
                    <div className="mt-auto pt-4 space-y-3">
                       <button 
                         onClick={() => downloadSingleImage(viewedImage.imageUrl!, `history_${viewedImage.id}.png`)}
                         className="w-full py-3 bg-lime-400 hover:bg-lime-500 text-black rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                       >
                         <Download size={18} /> Download
                       </button>
                       <button 
                         onClick={(e) => handleDelete(viewedImage.id, e)}
                         className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                       >
                         <Trash2 size={18} /> Delete
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
           <div>
              <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                 <History className="text-lime-500" />
                 Saved Generations
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                 Your generated images are stored locally in your browser.
              </p>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                 <input 
                   type="text" 
                   placeholder="Search prompts..." 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-white placeholder-zinc-500 outline-none focus:border-lime-500 w-64"
                 />
              </div>
              {images.length > 0 && (
                 <button 
                   onClick={handleClearAll}
                   className="px-4 py-2 bg-red-900/20 border border-red-900/50 text-red-400 hover:bg-red-900/40 rounded-full text-xs font-bold transition-colors"
                 >
                   Clear All
                 </button>
              )}
           </div>
        </div>

        {isLoading ? (
           <div className="flex justify-center py-20 text-zinc-500">Loading history...</div>
        ) : filteredImages.length === 0 ? (
           <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500">
              <div className="w-24 h-24 bg-zinc-900 rounded-3xl shadow-sm flex items-center justify-center mb-6 border border-zinc-800">
                 <History size={48} className="text-zinc-700" />
              </div>
              <p className="text-xl font-semibold text-zinc-300 mb-2">No history found</p>
              <p className="text-zinc-500">Generated images will automatically appear here.</p>
           </div>
        ) : (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredImages.map((img) => (
                 <div 
                   key={img.id} 
                   onClick={() => setViewedImage(img)}
                   className="group relative bg-zinc-900 rounded-2xl overflow-hidden shadow-lg border border-zinc-800 aspect-square cursor-pointer hover:border-zinc-600 transition-all"
                 >
                    {img.imageUrl ? (
                       <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                          <AlertCircle size={24} />
                       </div>
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                       <button 
                         onClick={(e) => { e.stopPropagation(); downloadSingleImage(img.imageUrl!, `saved_${img.id}.png`); }}
                         className="bg-lime-400 hover:bg-lime-500 text-black p-3 rounded-full transition-transform hover:scale-110"
                       >
                          <Download size={20} />
                       </button>
                       <button 
                         onClick={(e) => handleDelete(img.id, e)}
                         className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-3 rounded-full transition-colors"
                       >
                          <Trash2 size={20} />
                       </button>
                    </div>

                    {/* Metadata Badges */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-end pointer-events-none">
                       {img.mode && (
                         <span className="text-[9px] font-bold bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700 uppercase">
                           {img.mode}
                         </span>
                       )}
                       <span className="text-[9px] text-zinc-400 font-mono">
                         {new Date(img.timestamp || 0).toLocaleDateString()}
                       </span>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
};
