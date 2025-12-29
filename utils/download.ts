
import JSZip from 'jszip';
// @ts-ignore
import saveAs from 'file-saver';
import { GeneratedImage } from '../types';

export const downloadSingleImage = (dataUrl: string, filename: string) => {
  saveAs(dataUrl, filename);
};

export const downloadBatchAsZip = async (images: GeneratedImage[], zipFilename: string = 'images.zip') => {
  const zip = new JSZip();
  const folder = zip.folder("generated-images");

  if (!folder) return;

  let count = 0;
  
  images.forEach((img, index) => {
    if (img.status === 'completed' && img.imageUrl) {
      // Remove data URL prefix to get raw base64
      const base64Data = img.imageUrl.split(',')[1];
      
      // Prioritize label (exact text) over the full prompt
      const sourceText = img.label || img.prompt;
      const cleanName = sourceText.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      const fileName = `${cleanName || 'image_' + (index + 1)}.png`;
      
      folder.file(fileName, base64Data, { base64: true });
      count++;
    }
  });

  if (count === 0) {
    alert("No completed images to download.");
    return;
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, zipFilename);
};
