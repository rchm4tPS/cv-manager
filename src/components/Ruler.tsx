/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { useResumeStore } from "@/store/useResumeStore";

const INCH_TO_PX = 96;
const MIN_MARGIN = 0.125;

export function Rulers({ zoom = 1 }: { zoom?: number }) {
  const { resume, updateSettings } = useResumeStore();
  const margin = resume.settings.margin;
  const pageSize = resume.settings.pageSize || 'Letter';
  const [dragging, setDragging] = React.useState<'left' | 'right' | 'top' | 'bottom' | null>(null);

  const wInches = pageSize === 'A4' ? 8.27 : 8.5;
  const hInches = pageSize === 'A4' ? 11.69 : pageSize === 'Legal' ? 14 : 11;
  const maxW = Math.floor(wInches);
  const maxH = Math.floor(hInches);

  const handleDrag = (e: React.MouseEvent, type: 'left' | 'right' | 'top' | 'bottom') => {
    e.preventDefault();
    setDragging(type);
    const startX = e.clientX;
    const startY = e.clientY;
    const startMargin = margin[type];

    const onMouseMove = (moveEvent: MouseEvent) => {
      let deltaPx = 0;
      if (type === 'left') deltaPx = (moveEvent.clientX - startX) / zoom;
      if (type === 'right') deltaPx = (startX - moveEvent.clientX) / zoom; // moving mouse left increases right margin
      if (type === 'top') deltaPx = (moveEvent.clientY - startY) / zoom;
      if (type === 'bottom') deltaPx = (startY - moveEvent.clientY) / zoom; // moving mouse up increases bottom margin

      let newMargin = startMargin + deltaPx / INCH_TO_PX;
      newMargin = Math.round(newMargin / 0.125) * 0.125;
      newMargin = Math.max(MIN_MARGIN, newMargin); // constrain to minimum
      
      const updates: any = { [type]: newMargin };
      if (resume.settings.linkOppositeMargins) {
        if (type === 'left') updates.right = newMargin;
        if (type === 'right') updates.left = newMargin;
        if (type === 'top') updates.bottom = newMargin;
        if (type === 'bottom') updates.top = newMargin;
      }

      updateSettings({ margin: { ...margin, ...updates } });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
      setDragging(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = type === 'left' || type === 'right' ? 'col-resize' : 'row-resize';
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 print:hidden">
      {/* Horizontal Ruler (Top) */}
      <div 
        className="absolute top-[-28px] left-0 right-0 h-[24px] bg-white border border-slate-300 rounded-t-sm shadow-sm"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent 11px, #94a3b8 11px, #94a3b8 12px)`,
          backgroundSize: '12px 100%'
        }}
      >
        {/* Inch Numbers */}
        {Array.from({ length: maxW }).map((_, i) => (
          <div 
            key={i} 
            className="absolute text-[10px] text-slate-500 font-medium select-none pointer-events-none" 
            style={{ 
              left: `${(i + 1) * INCH_TO_PX}px`, 
              top: '-16px', 
              transform: 'translateX(-50%)',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            {i + 1}
          </div>
        ))}

        {/* Left Margin Shadow Area */}
        <div className="absolute top-0 bottom-0 left-0 bg-slate-400/20" style={{ width: `${margin.left}in` }} />
        {/* Right Margin Shadow Area */}
        <div className="absolute top-0 bottom-0 right-0 bg-slate-400/20" style={{ width: `${margin.right}in` }} />
        
        {/* Left Handle */}
        <div 
          className="absolute top-0 bottom-0 w-[14px] cursor-col-resize flex flex-col items-center justify-end z-10 -ml-[7px] pointer-events-auto"
          style={{ left: `${margin.left}in` }}
          onMouseDown={(e) => handleDrag(e, 'left')}
        >
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600 drop-shadow-md" />
          <div className="w-[2px] h-[16px] bg-blue-600" />
          {dragging === 'left' && (
            <div className="absolute top-full mt-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-50">
              {margin.left.toFixed(3).replace(/\.?0+$/, '')}&quot;
            </div>
          )}
        </div>

        {/* Right Handle */}
        <div 
          className="absolute top-0 bottom-0 w-[14px] cursor-col-resize flex flex-col items-center justify-end z-10 -mr-[7px] pointer-events-auto"
          style={{ right: `${margin.right}in` }}
          onMouseDown={(e) => handleDrag(e, 'right')}
        >
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600 drop-shadow-md" />
          <div className="w-[2px] h-[16px] bg-blue-600" />
          {dragging === 'right' && (
            <div className="absolute top-full mt-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-50">
              {margin.right.toFixed(3).replace(/\.?0+$/, '')}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Vertical Ruler (Left) */}
      <div 
        className="absolute left-[-28px] top-0 bottom-0 w-[24px] bg-white border border-slate-300 rounded-l-sm shadow-sm"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 11px, #94a3b8 11px, #94a3b8 12px)`,
          backgroundSize: '100% 12px'
        }}
      >
        {/* Inch Numbers */}
        {Array.from({ length: maxH }).map((_, i) => (
          <div 
            key={i} 
            className="absolute text-[10px] text-slate-500 font-medium select-none pointer-events-none leading-none" 
            style={{ 
              top: `${(i + 1) * INCH_TO_PX}px`, 
              left: '-12px',
              transform: 'translateY(-50%)',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            {i + 1}
          </div>
        ))}

        {/* Top Margin Shadow Area */}
        <div className="absolute top-0 left-0 right-0 bg-slate-400/20" style={{ height: `${margin.top}in` }} />
        {/* Bottom Margin Shadow Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-400/20" style={{ height: `${margin.bottom}in` }} />

        {/* Top Handle */}
        <div 
          className="absolute left-0 right-0 h-[14px] cursor-row-resize flex flex-row items-center justify-end z-10 -mt-[7px] pointer-events-auto"
          style={{ top: `${margin.top}in` }}
          onMouseDown={(e) => handleDrag(e, 'top')}
        >
          <div className="w-[16px] h-[2px] bg-blue-600" />
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-blue-600 drop-shadow-md" />
          {dragging === 'top' && (
            <div className="absolute right-full mr-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-50">
              {margin.top.toFixed(3).replace(/\.?0+$/, '')}&quot;
            </div>
          )}
        </div>

        {/* Bottom Handle */}
        <div 
          className="absolute left-0 right-0 h-[14px] cursor-row-resize flex flex-row items-center justify-end z-10 -mb-[7px] pointer-events-auto"
          style={{ bottom: `${margin.bottom}in` }}
          onMouseDown={(e) => handleDrag(e, 'bottom')}
        >
          <div className="w-[16px] h-[2px] bg-blue-600" />
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-blue-600 drop-shadow-md" />
          {dragging === 'bottom' && (
            <div className="absolute right-full mr-1 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap z-50">
              {margin.bottom.toFixed(3).replace(/\.?0+$/, '')}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Guide Lines */}
      {(dragging === 'left' || (dragging === 'right' && resume.settings.linkOppositeMargins)) && <div className="absolute top-0 bottom-0 border-l border-dashed border-blue-500 z-50 pointer-events-none" style={{ left: `${margin.left}in` }} />}
      {(dragging === 'right' || (dragging === 'left' && resume.settings.linkOppositeMargins)) && <div className="absolute top-0 bottom-0 border-r border-dashed border-blue-500 z-50 pointer-events-none" style={{ right: `${margin.right}in` }} />}
      {(dragging === 'top' || (dragging === 'bottom' && resume.settings.linkOppositeMargins)) && <div className="absolute left-0 right-0 border-t border-dashed border-blue-500 z-50 pointer-events-none" style={{ top: `${margin.top}in` }} />}
      {(dragging === 'bottom' || (dragging === 'top' && resume.settings.linkOppositeMargins)) && <div className="absolute left-0 right-0 border-b border-dashed border-blue-500 z-50 pointer-events-none" style={{ bottom: `${margin.bottom}in` }} />}
    </div>
  );
}
