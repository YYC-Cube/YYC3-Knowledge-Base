/**
 * @description YYC³ 多模态类型定义
 * @module @yyc3/core/types/multimodal
 */

export type MultimodalType = 'image' | 'audio' | 'document' | 'video';

export type ImageFormat = 'png' | 'jpeg' | 'gif' | 'webp' | 'bmp';

export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'aac' | 'm4a';

export type DocumentFormat = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'txt' | 'md' | 'html';

export type VideoFormat = 'mp4' | 'webm' | 'avi' | 'mov' | 'mkv';

export interface MultimodalInput {
  type: MultimodalType;
  data: string | Buffer;
  format?: string;
  metadata?: Record<string, unknown>;
}

export interface ImageInput extends MultimodalInput {
  type: 'image';
  format: ImageFormat;
  width?: number;
  height?: number;
}

export interface AudioInput extends MultimodalInput {
  type: 'audio';
  format: AudioFormat;
  duration?: number;
  sampleRate?: number;
  channels?: number;
}

export interface DocumentInput extends MultimodalInput {
  type: 'document';
  format: DocumentFormat;
  pageCount?: number;
  language?: string;
}

export interface VideoInput extends MultimodalInput {
  type: 'video';
  format: VideoFormat;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
}

export interface ImageAnalysisOptions {
  tasks?: ImageAnalysisTask[];
  detail?: 'low' | 'high' | 'auto';
  maxTokens?: number;
}

export type ImageAnalysisTask =
  | 'caption'
  | 'ocr'
  | 'object_detection'
  | 'face_detection'
  | 'classification'
  | 'similarity';

export interface AudioAnalysisOptions {
  tasks?: AudioAnalysisTask[];
  language?: string;
  model?: string;
}

export type AudioAnalysisTask =
  | 'transcription'
  | 'translation'
  | 'speaker_diarization'
  | 'sentiment_analysis'
  | 'keyword_extraction';

export interface DocumentAnalysisOptions {
  tasks?: DocumentAnalysisTask[];
  language?: string;
  extractImages?: boolean;
}

export type DocumentAnalysisTask =
  | 'text_extraction'
  | 'summarization'
  | 'entity_extraction'
  | 'table_extraction'
  | 'structure_analysis';

export interface MultimodalAnalysisResult {
  type: MultimodalType;
  tasks: Array<{
    task: string;
    result: unknown;
    confidence?: number;
  }>;
  metadata: Record<string, unknown>;
}
