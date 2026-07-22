import { useState, useLayoutEffect, useRef } from 'react';

export interface PaginationElement {
  id: string;
  type?: string; 
  keepWithNext?: boolean; 
  content: React.ReactNode;
}

export interface UsePaginationOptions {
  elements: PaginationElement[];
  maxAvailableHeightPx: number;
  zoom?: number;
}

export function usePagination({
  elements,
  maxAvailableHeightPx,
  zoom = 1,
}: UsePaginationOptions) {
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});
  const measureContainerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!measureContainerRef.current) return;
    
    const measureHeights = () => {
      const heights: Record<string, number> = {};
      let changed = false;
      const nodes = measureContainerRef.current!.querySelectorAll('[data-measure-id]');
      nodes.forEach(node => {
        const id = node.getAttribute('data-measure-id')!;
        const rect = node.getBoundingClientRect();
        // The rect height is visually scaled by zoom, so we divide by zoom to get the true CSS pixel height
        const h = rect.height / zoom;
        if (Math.abs((itemHeights[id] || 0) - h) > 0.5) changed = true;
        heights[id] = h;
      });
      if (changed) {
        setItemHeights(heights);
      }
    };

    measureHeights();

    // Use ResizeObserver to catch font loading or any other layout shifts
    const observer = new ResizeObserver(() => {
      measureHeights();
    });
    observer.observe(measureContainerRef.current);

    // Also observe all document fonts
    if ('fonts' in document) {
      (document as any).fonts.ready.then(() => {
        measureHeights();
      });
    }

    return () => observer.disconnect();
  }); // Run every render to match previous behavior, or we can add specific deps if we want to optimize

  const pages: React.ReactNode[][] = [[]];
  let currentHeight = 0;
  
  elements.forEach((el, index) => {
    const h = itemHeights[el.id] || 0;
    
    let requiredHeight = h;
    if ((el.type === 'section-title' || el.keepWithNext) && index + 1 < elements.length) {
       requiredHeight += itemHeights[elements[index + 1].id] || 0;
    }

    if (currentHeight + requiredHeight > maxAvailableHeightPx && pages[pages.length - 1].length > 0) {
      if (el.type === 'gap') {
        // Skip gap if it causes a page break
        pages.push([]);
        currentHeight = 0;
      } else {
        pages.push([el.content]);
        currentHeight = h;
      }
    } else {
      if (currentHeight === 0 && el.type === 'gap') {
        // Skip gap if it's the very first element on a new page
      } else {
        pages[pages.length - 1].push(el.content);
        currentHeight += h;
      }
    }
  });

  return {
    pages,
    measureContainerRef,
    itemHeights,
  };
}
