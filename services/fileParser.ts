
import { DocumentPage, FileData, TextItem } from "../types";
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.mjs`;

export const parseFile = async (file: File): Promise<FileData> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let pages: DocumentPage[] = [];

  if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        
        // 1. 渲染页面快照以保留排版、图片
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport }).promise;
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);

        // 2. 提取带坐标的文本
        const textContent = await page.getTextContent();
        const textItems: TextItem[] = textContent.items.map((item: any) => ({
          str: item.str,
          transform: item.transform,
          width: item.width,
          height: item.height
        }));

        const pageText = textItems.map(item => item.str).join(' ').replace(/\s+/g, ' ').trim();
        
        pages.push({
          pageNumber: i,
          content: pageText,
          image: imageUrl,
          viewport: { width: viewport.width, height: viewport.height },
          textItems: textItems
        });
      } catch (err) {
        console.warn(`Error processing page ${i}`, err);
      }
    }
  } else {
    // 文本格式回退处理
    const fullText = await file.text();
    pages = splitTextIntoPages(fullText);
  }

  return {
    name: file.name,
    type: extension || 'unknown',
    pages
  };
};

const splitTextIntoPages = (text: string): DocumentPage[] => {
  const pages: DocumentPage[] = [];
  const paragraphs = text.split(/\n\s*\n/);
  let pageNum = 1;
  for (const para of paragraphs) {
    if (para.trim()) {
      pages.push({ pageNumber: pageNum++, content: para.trim() });
    }
  }
  return pages;
};
