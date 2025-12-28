
export interface BilingualSentence {
  src: string;
  tgt: string;
  rect?: { left: number; top: number; width: number; height: number }; // 坐标信息
}

export interface TextItem {
  str: string;
  transform: number[]; // PDF.js 的变换矩阵
  width: number;
  height: number;
}

export interface DocumentPage {
  pageNumber: number;
  content: string;
  sentences?: BilingualSentence[];
  image?: string; // 页面快照
  viewport?: { width: number; height: number };
  textItems?: TextItem[]; // 原始文本项及其版面位置
}

export interface FileData {
  name: string;
  type: string;
  pages: DocumentPage[];
}

export interface FileHistoryItem {
  id: string;
  name: string;
  type: string;
  uploadTime: number;
  lastReadTime: number;
  lastPage: number;
  totalPages: number;
}

export interface AppState {
  currentFile: FileData | null;
  currentPageIndex: number;
  isLoading: boolean;
  isTranslating: boolean;
  error: string | null;
  history: FileHistoryItem[];
  view: 'upload' | 'reader';
}
