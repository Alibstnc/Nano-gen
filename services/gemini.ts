
import { GoogleGenAI } from "@google/genai";
import { ImageGenerationConfig } from "../types";

// Helper to get a fresh AI instance with the current key
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const IMAGE_MODEL_FLASH = 'gemini-2.5-flash-image';
const IMAGE_MODEL_PRO = 'gemini-3-pro-image-preview';
const VIDEO_MODEL_NAME = 'veo-3.1-fast-generate-preview';

/**
 * Enhanced prompt construction for professional consistency.
 * The Pro model requires more rigid technical directives.
 */
const buildProfessionalPrompt = (prompt: string, modelType: 'flash' | 'pro', hasReferences: boolean): string => {
  if (modelType === 'flash') return prompt;

  // Pro Model Technical Directive
  const technicalHeader = "[MASTER PRODUCTION DIRECTIVE]: Generate with absolute high-fidelity 8k resolution. Maintain 100% shader and material parity across the sequence.";
  const dnaDirective = hasReferences 
    ? "\n[STYLE DNA LOCK]: Extract precisely the material shaders, specular roughness, and color science from the attached reference images. Do not deviate from this visual identity."
    : "";
  
  return `${technicalHeader}${dnaDirective}\n\n[SCENE DESCRIPTION]: ${prompt}\n\n[FINAL QUALITY]: Commercial studio photography, extremely detailed textures, sharp edges.`;
};

export const generateImageFromPrompt = async (
  prompt: string,
  config: ImageGenerationConfig,
  referenceImages?: string[],
  targetImage?: string | null,
): Promise<string> => {
  try {
    const ai = getAI();
    const parts: any[] = [];
    const isPro = config.model === 'pro';

    // 1. Reference Images (Style DNA Source) - Essential for Pro model consistency
    if (referenceImages && referenceImages.length > 0) {
      for (const img of referenceImages) {
        const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }
    }

    // 2. Pose/Scene context (Target Image)
    if (targetImage) {
        const match = targetImage.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
            parts.push({
                inlineData: {
                    mimeType: match[1],
                    data: match[2],
                },
            });
        }
    }

    // 3. Technical Prompt Injection
    const finalPromptText = buildProfessionalPrompt(prompt, config.model, (referenceImages?.length || 0) > 0);
    parts.push({ text: finalPromptText });

    const modelName = isPro ? IMAGE_MODEL_PRO : IMAGE_MODEL_FLASH;
    
    // Build image config
    const imageConfig: any = {
      aspectRatio: config.aspectRatio,
    };

    // Pro model supports explicit imageSize (1K, 2K, 4K)
    if (isPro) {
      imageConfig.imageSize = config.resolution;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: imageConfig,
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate) {
        if (candidate.finishReason === 'SAFETY') {
            throw new Error("Safety Block: Content may violate safety guidelines.");
        }
        if (candidate.finishReason !== 'STOP' && candidate.finishReason) {
            throw new Error(`Generation Stopped: ${candidate.finishReason}`);
        }
    }

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("Empty response from AI engine.");
  } catch (error) {
    console.error("Critical Generation Error:", error);
    throw error;
  }
};

export const editImageWithPrompt = async (
  base64Image: string,
  prompt: string,
  mimeType: string = 'image/png'
): Promise<string> => {
  try {
    const ai = getAI();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_FLASH,
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("Edit failed: No image data returned.");
  } catch (error) {
    throw error;
  }
};

export const generateVideoFromImage = async (
  base64Image: string,
  prompt: string = "Animate this image"
): Promise<string> => {
  try {
    const ai = getAI();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL_NAME,
      prompt: prompt,
      image: {
        imageBytes: cleanBase64,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
      throw new Error((operation.error.message as unknown as string) || "Video Generation failed.");
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob() as Blob;
    return URL.createObjectURL(blob);
  } catch (error) {
    throw error;
  }
};
