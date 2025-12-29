
export interface GeneratedImage {
  id: string;
  prompt: string;
  label?: string; 
  imageUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface GeneratedVideo {
  id: string;
  sourceImage: string;
  prompt?: string;
  videoUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface ImageGenerationConfig {
  aspectRatio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16' | '2:3' | '3:2' | '5:4';
  resolution: '1K' | '2K' | '4K';
  model: 'flash' | 'pro';
}

export enum AppMode {
  BATCH = 'BATCH',
  ANGLES = 'ANGLES',
  EDIT = 'EDIT',
  TYPOGRAPHY = 'TYPOGRAPHY',
  ALBUM = 'ALBUM',
  VIDEO = 'VIDEO',
  HISTORY = 'HISTORY'
}