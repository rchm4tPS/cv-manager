import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ResizablePaneProps {
  id: string; // Used for local storage key
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number | (() => number); 
  minZoomWidth?: number;
  children: React.ReactNode;
  className?: string;
}

export const ResizablePane: React.FC<ResizablePaneProps> = ({
  id,
  defaultWidth,
  minWidth = 250,
  maxWidth,
  minZoomWidth = 400,
  children,
  className
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedWidth = localStorage.getItem(id);
    if (savedWidth) {
      setWidth(parseInt(savedWidth, 10));
    }
  }, [id]);

  const handleDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    // We must capture the current state width directly
    const startWidth = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startWidth + (moveEvent.clientX - startX);
      
      const maxW = typeof maxWidth === 'function' ? maxWidth() : (maxWidth || 800);
      
      newWidth = Math.max(minWidth, Math.min(newWidth, maxW));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      
      // Save directly to localStorage using the latest state value
      setWidth(finalWidth => {
        localStorage.setItem(id, finalWidth.toString());
        return finalWidth;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  return (
    <div 
      className={cn("flex flex-col relative bg-white border-r z-10 shrink-0 overflow-hidden @container", className)} 
      style={{ width: isMounted ? width : defaultWidth }}
    >
      <div 
        className="flex flex-col h-full"
        style={{
          width: isMounted && width < minZoomWidth ? minZoomWidth : '100%',
          zoom: isMounted && width < minZoomWidth ? width / minZoomWidth : 1
        }}
      >
        {children}
      </div>

      {/* Drag Handle */}
      <div 
        className="absolute right-[-4px] top-0 bottom-0 w-[8px] cursor-col-resize hover:bg-blue-500/50 transition-colors z-50 group flex items-center justify-center"
        onMouseDown={handleDrag}
      >
        <div className="w-[2px] h-8 bg-slate-300 group-hover:bg-blue-600 rounded-full" />
      </div>
    </div>
  );
};
