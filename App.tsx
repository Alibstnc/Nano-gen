
import React, { useState } from 'react';
import { Header } from './components/Header';
import { BatchGenerator } from './components/BatchGenerator';
import { TypographyGenerator } from './components/TypographyGenerator';
import { AlbumGenerator } from './components/AlbumGenerator';
import { ImageEditor } from './components/ImageEditor';
import { VideoGenerator } from './components/VideoGenerator';
import { AnglesGenerator } from './components/AnglesGenerator';
import { HistoryGallery } from './components/HistoryGallery';
import { AppMode } from './types';

function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.BATCH);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100">
      <Header currentMode={mode} setMode={setMode} />
      
      <main className="flex-grow relative z-0">
        {mode === AppMode.BATCH && <BatchGenerator />}
        {mode === AppMode.ANGLES && <AnglesGenerator />}
        {mode === AppMode.TYPOGRAPHY && <TypographyGenerator />}
        {mode === AppMode.ALBUM && <AlbumGenerator />}
        {mode === AppMode.EDIT && <ImageEditor />}
        {mode === AppMode.VIDEO && <VideoGenerator />}
        {mode === AppMode.HISTORY && <HistoryGallery />}
      </main>
    </div>
  );
}

export default App;