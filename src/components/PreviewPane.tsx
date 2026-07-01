/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useResumeStore } from "@/store/useResumeStore";
import { supabaseApi } from "@/lib/supabase-api";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Underline, GripVertical, Trash2, Check, Sparkles } from "lucide-react";
import { Rulers } from "./Ruler";
import { useToast } from "@/hooks/use-toast";

function FloatingToolbar() {
  const [toolbarPos, setToolbarPos] = useState<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      // Use setTimeout to ensure the selection isn't cleared before we check it
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim() !== "" && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = document.getElementById('preview-container');
          if (container && container.contains(range.commonAncestorContainer)) {
            const rect = range.getBoundingClientRect();
            setToolbarPos({
              x: rect.left + rect.width / 2,
              y: rect.top - 50,
            });
          } else {
            setToolbarPos(null);
          }
        } else {
          setToolbarPos(null);
        }
      }, 0);
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const formatText = (command: string) => {
    document.execCommand(command, false);
  };

  if (!toolbarPos) return null;

  return (
    <div 
      className="fixed bg-white border shadow-lg rounded-md px-2 py-1 flex gap-1 z-50 transition-all"
      style={{ left: toolbarPos.x, top: toolbarPos.y, transform: "translateX(-50%)" }}
    >
      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); formatText("bold"); }}><Bold className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); formatText("italic"); }}><Italic className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); formatText("underline"); }}><Underline className="w-4 h-4" /></Button>
    </div>
  );
}

function SpacingGap({ property, value, isSpacingMode, asLi, zoom = 1 }: { property: keyof NonNullable<import('@/types/resume').DocumentSettings['spacing']>, value: number, isSpacingMode: boolean, asLi?: boolean, zoom?: number }) {
  const updateSettings = useResumeStore(s => s.updateSettings);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number, y: number } | null>(null);

  const handleMouseMoveLocal = (e: React.MouseEvent) => {
    if (!isDragging) {
      setMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setMousePos(null);
    }
  };

  useEffect(() => {
    if (!isSpacingMode) {
      setMousePos(null);
    }
  }, [isSpacingMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSpacingMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = (e.clientY - startY) / zoom;
      const newValue = Math.max(0, startValue + deltaY);
      const defaultSpacing = { nameGap: 12, headerGap: 16, sectionGap: 16, titleGap: 8, itemGap: 12, lineGap: 4, bulletGap: 4 };
      const currentSpacing = useResumeStore.getState().resume.settings.spacing || {};
      updateSettings({ spacing: { ...defaultSpacing, ...currentSpacing, [property]: newValue } as any });
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setMousePos(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, startY, startValue, property, updateSettings]);

  const colors: Record<string, { bg: string, hover: string, border: string, line: string, textBg: string }> = {
    sectionGap: { bg: 'bg-violet-500/20', hover: 'hover:bg-violet-500/40', border: 'border-violet-400', line: 'border-violet-500', textBg: 'bg-violet-600' },
    headerGap: { bg: 'bg-fuchsia-500/20', hover: 'hover:bg-fuchsia-500/40', border: 'border-fuchsia-400', line: 'border-fuchsia-500', textBg: 'bg-fuchsia-600' },
    nameGap: { bg: 'bg-emerald-500/20', hover: 'hover:bg-emerald-500/40', border: 'border-emerald-400', line: 'border-emerald-500', textBg: 'bg-emerald-600' },
    titleGap: { bg: 'bg-orange-500/20', hover: 'hover:bg-orange-500/40', border: 'border-orange-400', line: 'border-orange-500', textBg: 'bg-orange-600' },
    itemGap: { bg: 'bg-blue-500/20', hover: 'hover:bg-blue-500/40', border: 'border-blue-400', line: 'border-blue-500', textBg: 'bg-blue-600' },
    lineGap: { bg: 'bg-rose-500/20', hover: 'hover:bg-rose-500/40', border: 'border-rose-400', line: 'border-rose-500', textBg: 'bg-rose-600' },
    bulletGap: { bg: 'bg-teal-500/20', hover: 'hover:bg-teal-500/40', border: 'border-teal-400', line: 'border-teal-500', textBg: 'bg-teal-600' },
  };
  const theme = colors[property as string] || colors.itemGap;

  if (!isSpacingMode && !isDragging) {
    if (asLi) return <li style={{ height: value, listStyleType: 'none', lineHeight: 0, fontSize: 0, margin: 0, padding: 0 }} aria-hidden="true" />;
    return <div style={{ height: value, lineHeight: 0, fontSize: 0 }} aria-hidden="true" />;
  }

  const content = (
    <div className="print:hidden" style={{ height: value, position: 'relative', width: '100%', lineHeight: 0, fontSize: 0 }}>
      <div 
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 cursor-ns-resize z-50 flex items-center justify-center ${isDragging ? theme.hover : theme.bg + ' ' + theme.hover} ${value > 0 ? `border-y ${theme.border} border-dashed` : `bg-transparent border-t-2 ${theme.line}`} transition-colors`}
        style={{ height: Math.max(value, 4), lineHeight: 0, fontSize: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveLocal}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseMoveLocal}
      >
        {mousePos && typeof document !== 'undefined' && createPortal(
          <span 
            className={`${theme.textBg} text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap fixed pointer-events-none z-[100]`}
            style={{ left: mousePos.x + 15, top: mousePos.y + 15, lineHeight: 'normal' }}
          >
            {Math.round(value)}px
          </span>,
          document.body
        )}
      </div>
    </div>
  );

  return asLi ? <li style={{ listStyleType: 'none', margin: 0, padding: 0 }}>{content}</li> : content;
}

export function PreviewPane({ showRuler }: { showRuler?: boolean }) {
  const { 
    resume, 
    updateSection, 
    updatePersonalInfo, 
    pendingChanges, 
    chatMessages, 
    setChatMessages,
    showOriginal,
    setShowOriginal,
    recordSuggestionDecision,
    acceptAiChanges,
    discardAiChanges
  } = useResumeStore();
  const { toast } = useToast();
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});
  const [zoom, setZoom] = useState(1);
  const [isSpacingMode, setIsSpacingMode] = useState(false);
  const measureContainerRef = React.useRef<HTMLDivElement>(null);
  const printRef = React.useRef<HTMLDivElement>(null);
  const pageSize = resume.settings.pageSize || 'Letter';
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `@page { size: ${pageSize === 'A4' ? 'A4' : pageSize === 'Legal' ? 'Legal' : 'Letter'}; margin: 0mm; }`
  });

  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const handleAccept = () => {
    acceptAiChanges();
    toast({ title: "Changes Accepted", description: "Your resume has been updated." });
  };

  const handleDiscard = () => {
    discardAiChanges();
    toast({ title: "Changes Discarded", description: "The resume has been reverted." });
  };

  useEffect(() => {
    async function loadPhoto() {
      if (resume.personalInfo.photoUrl) {
        if (resume.personalInfo.photoUrl.startsWith('avatars/')) {
          const url = await supabaseApi.getProfilePhotoUrl(resume.personalInfo.photoUrl);
          setPhotoDataUrl(url);
        } else {
          setPhotoDataUrl(resume.personalInfo.photoUrl);
        }
      } else {
        setPhotoDataUrl(null);
      }
    }
    loadPhoto();
  }, [resume.personalInfo.photoUrl]);

  useEffect(() => {
    const handlePrintEvent = () => {
      handlePrint();
    };
    window.addEventListener('print-resume', handlePrintEvent);
    return () => window.removeEventListener('print-resume', handlePrintEvent);
  }, [handlePrint]);

  useEffect(() => {
    const isTyping = (e: Event) => {
      const active = document.activeElement as HTMLElement;
      if (active && (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return true;
      }
      const target = e.target as HTMLElement | null;
      if (!target) return false;
      if (target.nodeType === 3) return target.parentElement?.isContentEditable || false;
      return target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e)) {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Alt' || e.key === 'Control') setIsSpacingMode(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.key === 'Control') setIsSpacingMode(false);
    };
    const handlePaste = (e: ClipboardEvent) => {
      if (isTyping(e)) {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain');
        if (text) document.execCommand('insertText', false, text);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });
    window.addEventListener('paste', handlePaste, { capture: true });
    
    const handleBlur = () => setIsSpacingMode(false);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
      window.removeEventListener('paste', handlePaste, { capture: true });
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('cv_zoom');
    if (saved) setZoom(parseFloat(saved));
  }, []);

  const handleZoom = (newZoom: number | ((z: number) => number)) => {
    setZoom(z => {
      const v = typeof newZoom === 'function' ? newZoom(z) : newZoom;
      localStorage.setItem('cv_zoom', v.toString());
      return v;
    });
  };

  const [draggedItem, setDraggedItem] = useState<{ sectionId: string; index: number } | null>(null);
  const [draggableItem, setDraggableItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, sectionId: string, index: number) => {
    setDraggedItem({ sectionId, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetSectionId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.sectionId !== targetSectionId || draggedItem.index === targetIndex) return;

    const section = resume.sections.find(s => s.id === targetSectionId);
    if (!section) return;

    const newItems = [...section.items];
    const sourceIndex = draggedItem.index;
    const [movedItem] = newItems.splice(sourceIndex, 1);
    newItems.splice(targetIndex, 0, movedItem);

    updateSection(targetSectionId, { items: newItems });
    setDraggedItem({ sectionId: targetSectionId, index: targetIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggableItem(null);
  };

  const handleDescBlur = (sectionId: string, itemId: string, descIndex: number, e: React.FocusEvent<HTMLElement>) => {
    if (pendingChanges) return;
    const section = resume.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newItems = section.items.map(item => {
      if (item.id === itemId) {
        const newDesc = [...item.description];
        newDesc[descIndex] = e.currentTarget.innerHTML;
        return { ...item, description: newDesc };
      }
      return item;
    });
    
    updateSection(sectionId, { items: newItems });
  };

  const handleItemBlur = (sectionId: string, itemId: string, field: string, e: React.FocusEvent<HTMLElement>) => {
    if (pendingChanges) return;
    const section = resume.sections.find(s => s.id === sectionId);
    if (!section) return;
    const newItems = section.items.map(item => item.id === itemId ? { ...item, [field]: e.currentTarget.textContent || '' } : item);
    updateSection(sectionId, { items: newItems });
  };

  const handleSectionTitleBlur = (sectionId: string, e: React.FocusEvent<HTMLElement>) => {
    if (pendingChanges) return;
    updateSection(sectionId, { title: e.currentTarget.textContent || '' });
  };

  const handlePersonalInfoBlur = (field: keyof typeof resume.personalInfo, e: React.FocusEvent<HTMLElement>) => {
    if (pendingChanges) return;
    updatePersonalInfo({ [field]: e.currentTarget.textContent || '' });
  };



  const isEditable = !pendingChanges;
  const editableClass = isEditable ? "hover:outline-dashed hover:outline-1 hover:outline-slate-300 hover:bg-slate-50/50 cursor-text rounded-sm transition-colors inline-block min-w-[20px]" : "inline-block min-w-[20px]";
  const editableListClass = isEditable ? "hover:outline-dashed hover:outline-1 hover:outline-slate-300 hover:bg-slate-50/50 cursor-text rounded-sm transition-colors" : "";

  const displayResume = (pendingChanges && !showOriginal) ? { ...resume, ...pendingChanges } : resume;
  const { personalInfo, settings } = displayResume;
  
  const isPersonalInfoChanged = !showOriginal && pendingChanges?.personalInfo && 
    JSON.stringify(pendingChanges.personalInfo) !== JSON.stringify(resume.personalInfo);

  const getFieldHighlight = (field: keyof typeof resume.personalInfo) => {
    if (showOriginal || !pendingChanges?.personalInfo) return '';
    const originalValue = resume.personalInfo[field];
    const newValue = pendingChanges.personalInfo[field];
    if (newValue !== undefined && newValue !== originalValue) {
      return 'bg-green-200 text-green-900 rounded-sm outline outline-1 outline-green-400 px-0.5 transition-colors';
    }
    return '';
  };

  const typography = {
    fontFamily: settings.typography?.fontFamily || "'Times New Roman', Times, serif",
    titleSize: settings.typography?.titleSize || 28,
    headingSize: settings.typography?.headingSize || 14,
    bodySize: settings.typography?.bodySize || 13,
    lineHeight: settings.typography?.lineHeight || 1.5,
    textAlign: settings.typography?.textAlign || 'left',
  };

  const defaultSpacing = { nameGap: 12, headerGap: 16, sectionGap: 16, titleGap: 8, itemGap: 12, lineGap: 4, bulletGap: 4 };
  const spacing = { ...defaultSpacing, ...(settings.spacing || {}) };

  const contactItems: React.ReactNode[] = [];
  if (personalInfo.email) contactItems.push(<span key="email" className={`${editableClass} ${getFieldHighlight('email')}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handlePersonalInfoBlur('email', e)}>{personalInfo.email}</span>);
  if (personalInfo.phone) contactItems.push(<span key="phone" className={`${editableClass} ${getFieldHighlight('phone')}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handlePersonalInfoBlur('phone', e)}>{personalInfo.phone}</span>);
  if (personalInfo.location) contactItems.push(<span key="loc" className={`${editableClass} ${getFieldHighlight('location')}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handlePersonalInfoBlur('location', e)}>{personalInfo.location}</span>);
  if (personalInfo.linkedin) contactItems.push(<a key="lin" href={personalInfo.linkedin.startsWith('http') ? personalInfo.linkedin : `https://${personalInfo.linkedin}`} target="_blank" rel="noopener noreferrer" className={`text-blue-600 hover:underline ${getFieldHighlight('linkedin')}`}>LinkedIn</a>);
  if (personalInfo.website) contactItems.push(<a key="web" href={personalInfo.website.startsWith('http') ? personalInfo.website : `https://${personalInfo.website}`} target="_blank" rel="noopener noreferrer" className={`text-blue-600 hover:underline ${getFieldHighlight('website')}`}>Portfolio</a>);
  if (personalInfo.github) contactItems.push(<a key="git" href={personalInfo.github.startsWith('http') ? personalInfo.github : `https://${personalInfo.github}`} target="_blank" rel="noopener noreferrer" className={`text-blue-600 hover:underline ${getFieldHighlight('github')}`}>GitHub</a>);

  const wInches = pageSize === 'A4' ? 8.27 : 8.5;
  const hInches = pageSize === 'A4' ? 11.69 : pageSize === 'Legal' ? 14 : 11;
  const maxAvailableHeightPx = (hInches - settings.margin.top - settings.margin.bottom) * 96;

  // Build the flat list of elements
  const elements: { id: string; type: string; content: React.ReactNode }[] = [];

  const hasPersonalInfo = personalInfo.name || contactItems.length > 0 || photoDataUrl;

  if (hasPersonalInfo) {
    const isPhotoLeft = settings.photoPosition === 'left';
    const textAlignmentClass = photoDataUrl ? (isPhotoLeft ? 'text-right' : 'text-left') : 'text-center';
    const flexAlignmentClass = photoDataUrl ? (isPhotoLeft ? 'justify-end' : 'justify-start') : 'justify-center';
    
    const highlightClass = isPersonalInfoChanged ? 'bg-green-100/50 outline outline-1 outline-green-400 rounded-md p-1 transition-all' : '';
    
    elements.push({
      id: 'personal-info',
      type: 'header',
      content: (
        <div key="header" data-measure-id="personal-info" className={`w-full`}>
          <div className={`flex items-start justify-between w-full ${isPhotoLeft ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex-1 ${textAlignmentClass}`}>
              <h1 
                className={`font-bold uppercase tracking-wider text-black block w-full hover:outline-dashed hover:outline-1 hover:outline-slate-300 hover:bg-slate-50/50 cursor-text rounded-sm transition-colors ${textAlignmentClass}`} 
                style={{ fontSize: `${typography.titleSize}px` }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    const firstSpan = e.currentTarget.querySelector('span');
                    if (firstSpan) firstSpan.focus();
                  }
                }}
              >
                <span className={`outline-none min-w-[20px] inline-block ${getFieldHighlight('name')}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handlePersonalInfoBlur('name', e)}>
                  {personalInfo.name}
                </span>
              </h1>
              <SpacingGap zoom={zoom} property="nameGap" value={spacing.nameGap} isSpacingMode={isSpacingMode} />
              <div className={`text-black flex items-center gap-1.5 flex-wrap ${flexAlignmentClass}`} style={{ fontSize: `${typography.bodySize}px` }}>
                {contactItems.map((item, index) => (
                  <React.Fragment key={index}>
                    {item}
                    {index < contactItems.length - 1 && <span className="text-gray-400">|</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
            {photoDataUrl && (
              <div className={`${isPhotoLeft ? 'mr-6' : 'ml-6'} shrink-0 relative group`}>
                <button 
                  onClick={() => {
                    if (resume.personalInfo.photoUrl?.startsWith('avatars/')) {
                      supabaseApi.deleteProfilePhoto(resume.personalInfo.photoUrl).catch(console.error);
                    }
                    updatePersonalInfo({ photoUrl: undefined });
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden shadow-sm"
                  title="Remove photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={photoDataUrl} 
                  alt="Profile" 
                  className="w-24 h-24 object-cover rounded-md" 
                  onLoad={() => {
                    // Force a re-measure now that the image is loaded
                    setItemHeights(prev => ({...prev}));
                  }}
                />
              </div>
            )}
          </div>
          <div className="mt-4 border-b-2 border-black w-full" />
          <SpacingGap zoom={zoom} property="headerGap" value={spacing.headerGap} isSpacingMode={isSpacingMode} />
        </div>
      )
    });
  }

  const sortedSections = [...displayResume.sections].sort((a, b) => a.order - b.order);
  let isFirstSection = true;
  sortedSections.forEach(section => {
    if (section.items.length === 0) return;

    const originalSection = resume.sections.find(s => s.id === section.id);
    const isSectionChanged = pendingChanges?.sections && 
      JSON.stringify(section) !== JSON.stringify(originalSection);
    // We only use sectionHighlightClass for summary since it's a single item block
    const sectionHighlightClass = isSectionChanged ? 'bg-green-100/50 outline outline-1 outline-green-400 rounded-md p-1 transition-all' : '';

    elements.push({
      id: `section-title-${section.id}`,
      type: 'section-title',
      content: (
        <div key={`section-title-wrapper-${section.id}`} data-measure-id={`section-title-${section.id}`}>
          {!isFirstSection && <SpacingGap zoom={zoom} property="sectionGap" value={spacing.sectionGap} isSpacingMode={isSpacingMode} />}
          <h2 className="font-bold uppercase tracking-widest text-black border-b border-black pb-1" style={{ fontSize: `${typography.headingSize}px` }}>
            <span className={`${editableClass} block w-full`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleSectionTitleBlur(section.id, e)}>
              {section.title}
            </span>
          </h2>
          <SpacingGap zoom={zoom} property="titleGap" value={spacing.titleGap} isSpacingMode={isSpacingMode} />
        </div>
      )
    });
    isFirstSection = false;

    if (section.type === "summary") {
      elements.push({
        id: `item-${section.items[0].id}`,
        type: 'item',
        content: (
          <p key={`item-${section.items[0].id}`} data-measure-id={`item-${section.items[0].id}`} className={`text-black ${sectionHighlightClass}`} style={{ fontSize: `${typography.bodySize}px`, lineHeight: typography.lineHeight, textAlign: typography.textAlign || 'left' }}>
            <span 
              className={`${editableClass} block w-full`}
              contentEditable={isEditable} 
              suppressContentEditableWarning 
              onBlur={(e) => handleDescBlur(section.id, section.items[0].id, 0, e)}
              dangerouslySetInnerHTML={{ __html: section.items[0].description[0] || '' }} 
            />
          </p>
        )
      });
      return;
    }

    section.items.forEach((item, index) => {
      const originalItem = originalSection?.items.find(i => i.id === item.id);
      const isNewItem = pendingChanges?.sections && !originalItem;
      const highlightStr = 'bg-green-100/50 outline outline-1 outline-green-400 rounded-sm transition-all';
      
      const itemHighlightClass = isNewItem ? highlightStr : '';

      const line1Field = section.type === 'projects' ? 'title' : (item.subtitle ? 'subtitle' : 'title');
      const line2Field = section.type === 'projects' ? 'subtitle' : (item.subtitle ? 'title' : 'subtitle');
      
      const line1Highlight = (pendingChanges?.sections && !isNewItem && item[line1Field] !== originalItem?.[line1Field]) ? highlightStr : '';
      const line2Highlight = (pendingChanges?.sections && !isNewItem && item[line2Field] !== originalItem?.[line2Field]) ? highlightStr : '';
      const locationHighlight = (pendingChanges?.sections && !isNewItem && item.location !== originalItem?.location) ? highlightStr : '';
      const dateHighlight = (pendingChanges?.sections && !isNewItem && (item.startDate !== originalItem?.startDate || item.endDate !== originalItem?.endDate)) ? highlightStr : '';
      const isDescChanged = (i: number) => pendingChanges?.sections && !isNewItem && item.description[i] !== originalItem?.description[i];

      elements.push({
        id: `item-${item.id}`,
        type: 'item',
        content: (
          <div 
            key={`item-${item.id}`} 
            data-measure-id={`item-${item.id}`} 
            className={`group relative transition-colors duration-300 ${draggedItem?.sectionId === section.id && draggedItem?.index === index ? 'opacity-50 bg-slate-50/50 outline-dashed outline-2 outline-blue-400 rounded-sm outline-offset-4' : ''} ${itemHighlightClass}`}
            draggable={draggableItem === item.id}
            onDragStart={(e) => handleDragStart(e, section.id, index)}
            onDragEnter={(e) => handleDragEnter(e, section.id, index)}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div 
              className="absolute -left-8 top-1 opacity-0 group-hover:opacity-100 cursor-move transition-opacity p-1"
              onMouseEnter={() => setDraggableItem(item.id)}
              onMouseLeave={() => setDraggableItem(null)}
            >
              <GripVertical className="w-4 h-4 text-slate-300 hover:text-slate-500" />
            </div>
            {(() => {
              const line1Text = section.type === 'projects' ? item.title : (item.subtitle || item.title);
              
              const line2Text = section.type === 'projects' ? item.subtitle : (item.subtitle ? item.title : '');

              const descArray = Array.isArray(item.description) ? item.description : (typeof item.description === 'string' ? [item.description] : []);
              const validDesc = descArray.map((desc, i) => ({ desc: String(desc || ''), i })).filter(({ desc }) => desc.replace(/<[^>]*>?/gm, '').trim() !== '');
              const hasHeader = line1Text || line2Text || item.location || item.startDate || item.endDate;

              return (
                <>
                  {settings.itemLayout === 'separateRow' ? (
                    <>
                      {(line1Text || item.location) && (
                        <div className="flex justify-between items-baseline text-black">
                          <span className={`font-bold ${editableClass} flex-1 mr-4 ${line1Highlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, line1Field, e)} style={{ fontSize: `${typography.headingSize}px` }}>
                            {line1Text}
                          </span>
                          <span className="font-bold shrink-0 text-right text-black" style={{ fontSize: `${typography.headingSize}px` }}>
                            {item.location ? <span className={`${editableClass} ${locationHighlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, 'location', e)}>{item.location}</span> : null}
                          </span>
                        </div>
                      )}
                      {(line2Text || item.startDate || item.endDate) && (
                        <>
                          {(line1Text || item.location) && <SpacingGap zoom={zoom} property="lineGap" value={spacing.lineGap} isSpacingMode={isSpacingMode} />}
                          <div className="flex justify-between items-baseline text-black">
                            <div className={`italic ${editableClass} flex-1 mr-4 ${line2Highlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, line2Field, e)} style={{ fontSize: `${typography.bodySize}px` }}>
                              {line2Text}
                            </div>
                            <span className="italic shrink-0 text-right text-black" style={{ fontSize: `${typography.bodySize}px` }}>
                              {item.startDate ? <span className={`${editableClass} ${dateHighlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, 'startDate', e)}>{item.startDate}</span> : null}
                              {item.startDate && item.endDate ? ' – ' : ''}
                              {item.endDate ? <span className={`${editableClass} ${dateHighlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, 'endDate', e)}>{item.endDate}</span> : null}
                            </span>
                          </div>
                        </>
                      )}
                    </>
            ) : (
                    <>
                      {(line1Text || item.location || item.startDate || item.endDate) && (
                        <div className="flex justify-between items-baseline text-black">
                          <span className={`font-bold ${editableClass} flex-1 mr-4 ${line1Highlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, line1Field, e)} style={{ fontSize: `${typography.headingSize}px` }}>
                            {line1Text}
                          </span>
                          <span className="italic text-gray-700 shrink-0 text-right" style={{ fontSize: `${typography.bodySize}px` }}>
                            {item.location ? <span className={`${editableClass} ${locationHighlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, 'location', e)}>{item.location}</span> : null}
                            {item.location && (item.startDate || item.endDate) ? ' | ' : ''}
                            {item.startDate ? <span className={`${editableClass} ${dateHighlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, 'startDate', e)}>{item.startDate}</span> : null}
                            {item.startDate && item.endDate ? ' – ' : ''}
                            {item.endDate ? <span className={`${editableClass} ${dateHighlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, 'endDate', e)}>{item.endDate}</span> : null}
                          </span>
                        </div>
                      )}
                      {line2Text && (
                        <>
                          {(line1Text || item.location || item.startDate || item.endDate) && <SpacingGap zoom={zoom} property="lineGap" value={spacing.lineGap} isSpacingMode={isSpacingMode} />}
                          <div className={`italic text-black ${editableClass} block w-full ${line2Highlight}`} contentEditable={isEditable} suppressContentEditableWarning onBlur={(e) => handleItemBlur(section.id, item.id, line2Field, e)} style={{ fontSize: `${typography.bodySize}px` }}>
                            {line2Text}
                          </div>
                        </>
                      )}
                    </>
                  )}
                  {validDesc.length > 0 && (
                    <>
                      {hasHeader && <SpacingGap zoom={zoom} property="lineGap" value={spacing.lineGap} isSpacingMode={isSpacingMode} />}
                      {section.type === 'skills' ? (
                        <div className={`text-black ${pendingChanges?.sections && !isNewItem && item.description.join(',') !== originalItem?.description?.join(',') ? highlightStr + ' p-1 inline-block' : ''}`} style={{ fontSize: `${typography.bodySize}px`, lineHeight: typography.lineHeight, textAlign: typography.textAlign || 'left' }}>
                          {validDesc.map(({ desc, i }, idx) => (
                            <React.Fragment key={i}>
                              <span 
                                className={`${isEditable ? 'hover:outline-dashed hover:outline-1 hover:outline-slate-300 hover:bg-slate-50/50 cursor-text rounded-sm transition-colors inline' : 'inline'}`}
                                contentEditable={isEditable} 
                                suppressContentEditableWarning 
                                onBlur={(e) => handleDescBlur(section.id, item.id, i, e)}
                                dangerouslySetInnerHTML={{ __html: desc }} 
                              />
                              {idx < validDesc.length - 1 && <span>, </span>}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <ul className="list-disc list-outside ml-5 text-black" style={{ fontSize: `${typography.bodySize}px`, lineHeight: typography.lineHeight, textAlign: typography.textAlign || 'left' }}>
                          {validDesc.map(({ desc, i }, idx) => (
                            <React.Fragment key={i}>
                              <li 
                                className={`${editableListClass} ${isDescChanged(i) ? highlightStr : ''}`}
                                contentEditable={isEditable} 
                                suppressContentEditableWarning 
                                onBlur={(e) => handleDescBlur(section.id, item.id, i, e)}
                                dangerouslySetInnerHTML={{ __html: desc }} 
                              />
                              {idx < validDesc.length - 1 && <SpacingGap zoom={zoom} property="bulletGap" value={spacing.bulletGap} isSpacingMode={isSpacingMode} asLi />}
                            </React.Fragment>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </>
              );
            })()}
            {index < section.items.length - 1 && <SpacingGap zoom={zoom} property="itemGap" value={spacing.itemGap} isSpacingMode={isSpacingMode} />}
          </div>
        )
      });
    });
  });

  if (elements.length === 0) {
    elements.push({
      id: 'empty-state',
      type: 'empty',
      content: (
        <div key="empty" data-measure-id="empty" className="flex items-center justify-center h-64 text-slate-400 italic" style={{ fontSize: '1.25rem' }}>
          Your CV is empty. Add sections from the editor to see a preview.
        </div>
      )
    });
  }

  React.useLayoutEffect(() => {
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
      document.fonts.ready.then(() => {
        measureHeights();
      });
    }

    return () => observer.disconnect();
  });

  const pages: React.ReactNode[][] = [[]];
  let currentHeight = 0;
  
  elements.forEach((el, index) => {
    const h = itemHeights[el.id] || 0;
    
    // Check for orphan section title
    let requiredHeight = h;
    if (el.type === 'section-title' && index + 1 < elements.length) {
       requiredHeight += itemHeights[elements[index + 1].id] || 0;
    }

    if (currentHeight + requiredHeight > maxAvailableHeightPx && pages[pages.length - 1].length > 0) {
      pages.push([el.content]);
      currentHeight = h;
    } else {
      pages[pages.length - 1].push(el.content);
      currentHeight += h;
    }
  });

  const [currentPageNum, setCurrentPageNum] = useState(1);
  const handleContainerScroll = (e: React.UIEvent<HTMLElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    // Account for zoom and gaps. 
    const pageHeightPx = (maxAvailableHeightPx + (settings.margin.top + settings.margin.bottom)*96) * zoom;
    const paddingAndGapOffset = (64 * zoom) + (96 * zoom); // pt-16, gap-24
    
    // Roughly estimate which page is primarily in view
    const pageIndex = Math.max(0, Math.floor((scrollTop + (pageHeightPx/2)) / (pageHeightPx + paddingAndGapOffset)));
    setCurrentPageNum(Math.min(pages.length, pageIndex + 1));
  };

  return (
    <section className="flex-1 h-full bg-muted overflow-y-auto flex flex-col items-center relative" id="preview-container" onScroll={handleContainerScroll}>
      {/* Zoom Controls (Sticky Top) */}
      <div className="sticky top-0 w-full z-[999] pointer-events-none" style={{ height: 0 }}>
        <div 
          className={`absolute pointer-events-auto bg-white/90 backdrop-blur-sm border border-slate-200 shadow-sm rounded-full px-4 py-1.5 flex items-center gap-4 text-slate-700 transition-all ${
            showRuler ? "top-4 left-4" : "top-4 left-1/2 -translate-x-1/2"
          }`}
        >
          <button 
            onClick={() => handleZoom(z => Math.max(0.5, z - 0.1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 font-bold text-lg leading-none transition-colors"
          >
            -
          </button>
          <span className="text-xs font-bold w-10 text-center select-none tracking-wider">{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => handleZoom(z => Math.min(2, z + 0.1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-200 font-bold text-lg leading-none transition-colors"
          >
            +
          </button>
        </div>
      </div>



      <div className="pt-16 pb-16 px-8 flex flex-col items-center w-full">
        <FloatingToolbar />

      {/* Hidden Measure Layer */}
      <div 
        ref={measureContainerRef}
        className="absolute opacity-0 pointer-events-none bg-white"
        style={{
          width: pageSize === 'A4' ? '8.27in' : pageSize === 'Legal' ? '8.5in' : '8.5in',
          paddingLeft: `${settings.margin.left}in`,
          paddingRight: `${settings.margin.right}in`,
          fontFamily: typography.fontFamily,
          lineHeight: typography.lineHeight,
          zoom: zoom
        }}
      >
        {elements.map(el => el.content)}
      </div>

      <div className="transition-all" style={{ zoom }}>
        <div className="flex flex-col gap-24 print:gap-0 pb-16 print:pb-0" ref={printRef}>
          {pages.map((pageContent, pageIndex) => (
            <div 
              key={pageIndex}
              className="bg-white shadow-xl relative shrink-0"
              style={{
                width: pageSize === 'A4' ? '8.27in' : pageSize === 'Legal' ? '8.5in' : '8.5in',
                height: pageSize === 'A4' ? '11.69in' : pageSize === 'Legal' ? '14in' : '11in',
                paddingTop: `${settings.margin.top}in`,
                paddingBottom: `${settings.margin.bottom}in`,
                paddingLeft: `${settings.margin.left}in`,
                paddingRight: `${settings.margin.right}in`,
                fontFamily: typography.fontFamily,
                lineHeight: typography.lineHeight
              }}
            >
              {showRuler && settings.showRulers !== false && <Rulers zoom={zoom} />}
              {pageContent}
            </div>
          ))}
        </div>
      </div>
      </div>

      <div className="fixed bottom-6 right-8 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl z-50 pointer-events-none transition-all">
        Page {currentPageNum} of {pages.length}
      </div>

      {/* Changes Controls (Sticky Bottom) */}
      <div className="sticky bottom-8 w-full z-[999] pointer-events-none flex justify-center pb-6 mt-4">
        {pendingChanges && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm border-2 border-blue-200 shadow-xl shadow-blue-500/10 rounded-full px-4 py-2 flex items-center gap-4 transition-all w-max mx-auto shrink-0 h-fit">
            <div className="flex items-center bg-slate-100 rounded-full p-1 shrink-0">
              <button 
                onClick={() => setShowOriginal(true)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${showOriginal ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Original
              </button>
              <button 
                onClick={() => setShowOriginal(false)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 shrink-0 ${!showOriginal ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Fix
              </button>
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />
            <button 
              onClick={handleDiscard}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            >
              Discard
            </button>
            <button 
              onClick={handleAccept}
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1 shrink-0"
            >
              <Check className="w-4 h-4" /> Accept
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
