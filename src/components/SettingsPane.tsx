/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, react/no-unescaped-entities */
"use client";

import React, { useState, useEffect } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { GripVertical, User, FileText, Briefcase, FolderGit2, GraduationCap, Wrench, Pencil, Check, ChevronDown, Star } from "lucide-react";
import { Section } from "@/types/resume";

const SECTION_ICONS: Record<string, React.FC<any>> = {
  experience: Briefcase,
  education: GraduationCap,
  skills: Wrench,
  projects: FolderGit2,
  summary: FileText,
  custom: Star,
};

function ReorderSections() {
  const { resume, reorderSections, updateSection, pendingChanges } = useResumeStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (pendingChanges) {
      e.preventDefault();
      return;
    }
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const sourceIdx = sortedSections.findIndex(s => s.id === draggedId);
    const targetIdx = sortedSections.findIndex(s => s.id === targetId);

    const newSections = sortedSections.map(s => ({ ...s }));
    const item = newSections.splice(sourceIdx, 1)[0];
    newSections.splice(targetIdx, 0, item);

    newSections.forEach((s, i) => s.order = i);
    reorderSections(newSections);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const startEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const saveEdit = (id: string) => {
    if (editTitle.trim()) {
      updateSection(id, { title: editTitle.trim() });
    }
    setEditingId(null);
  };

  if (!isMounted) return null;

  return (
    <div className="relative space-y-4 mb-10">
      <div className={pendingChanges ? "opacity-50 pointer-events-none select-none" : ""}>
        <div className="flex items-center gap-2 mb-2">
        <GripVertical className="w-4 h-4 text-blue-600" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reorder Sections</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Personal Information stays at top. Drag to reorder, click edit to rename.</p>

      <div className="border border-slate-200 rounded-md p-3 bg-white shadow-sm flex items-center gap-3">
        <div className="p-1 -ml-1">
          <GripVertical className="w-4 h-4 text-slate-300" />
        </div>
        <User className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-slate-700 flex-1">PERSONAL INFORMATION</span>
        <span className="text-xs text-muted-foreground">Fixed</span>
      </div>

      <div className={`mt-2 space-y-2 p-2 -mx-2 rounded-xl transition-colors duration-300 ${draggedId ? 'bg-slate-200/60 shadow-inner' : 'bg-transparent'}`}>
        {sortedSections.map((section) => {
          const Icon = SECTION_ICONS[section.type] || FileText;
          const isEditing = editingId === section.id;
          const isDragging = draggedId === section.id;

          return (
            <div
              key={section.id}
              draggable={!pendingChanges}
              onDragStart={(e) => handleDragStart(e, section.id)}
              onDragEnter={(e) => handleDragEnter(e, section.id)}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              className={`border rounded-md p-3 flex items-center gap-3 group transition-all cursor-move ${isDragging ? 'opacity-80 border-dashed border-blue-500 bg-blue-50 scale-[0.98]' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                }`}
            >
              <div className="p-1 -ml-1">
                {!pendingChanges && <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />}
              </div>
              <Icon className="w-4 h-4 text-blue-600" />

              {isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    className="flex-1 h-7 px-2 text-sm border border-blue-300 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(section.id)}
                    onBlur={() => saveEdit(section.id)}
                  />
                  <button onMouseDown={(e) => { e.preventDefault(); saveEdit(section.id); }} className="p-1 hover:bg-slate-100 rounded text-green-600">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-700 flex-1 uppercase tracking-wide truncate">{section.title}</span>
                  <button onClick={() => startEdit(section.id, section.title)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded transition-all text-muted-foreground shrink-0 cursor-pointer bg-white">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
      {pendingChanges && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/20 backdrop-blur-[1px] pointer-events-auto">
          <div className="bg-white/95 backdrop-blur shadow-2xl border-2 border-blue-200 rounded-xl p-4 text-center max-w-[250px] shadow-blue-500/20 animate-in fade-in zoom-in duration-300">
            <h3 className="text-sm font-bold text-slate-800 mb-1">Review AI Suggestions</h3>
            <p className="text-[10px] text-slate-600">Please accept or discard suggestions first.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full h-9 rounded-md border border-slate-200 bg-white shadow-sm px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

export function SettingsPane() {
  const { resume, updateSettings, pendingChanges } = useResumeStore();
  const settings = resume.settings;
  const typography = settings.typography;

  return (
    <aside className="w-full h-full min-h-0 bg-muted/5 p-8 overflow-y-auto space-y-8">
      <ReorderSections />

      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <GripVertical className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">EDIT DOCUMENT LAYOUT</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Adjust document layout settings.</p>

        {/* Document Layout Box */}
        <div className="border rounded-md bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground bg-muted/80 border-b border-slate-100">
            Document Layout
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Page Size</label>
              <select
                className={inputClass}
                value={settings.pageSize || "Letter"}
                onChange={(e) => updateSettings({ pageSize: e.target.value as any })}
              >
                <option value="Letter">Letter (8.5" x 11")</option>
                <option value="A4">A4 (8.27" x 11.69")</option>
                <option value="Legal">Legal (8.5" x 14")</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Item Layout</label>
              <select
                className={inputClass}
                value={settings.itemLayout || "inline"}
                onChange={(e) => updateSettings({ itemLayout: e.target.value as "inline" | "separateRow" })}
              >
                <option value="inline">Inline (Company, Location on Line 1)</option>
                <option value="separateRow">Separate Row (Company on Line 1, Role on Line 2)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Body Text Alignment</label>
              <select
                className={inputClass}
                value={typography.textAlign || "left"}
                onChange={(e) => updateSettings({ typography: { ...typography, textAlign: e.target.value as "left" | "justify" } })}
              >
                <option value="left">Left Aligned</option>
                <option value="justify">Justified</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Photo Position</label>
              <select
                className={inputClass}
                value={settings.photoPosition || "right"}
                onChange={(e) => updateSettings({ photoPosition: e.target.value as "left" | "right" })}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
        </div>

        {/* Spacing & Margins Box */}
        <div className="border rounded-md bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground bg-muted/80 border-b border-slate-100">
            Spacing & Margins
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-col gap-2 pb-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                  checked={settings.showRulers !== false}
                  onChange={(e) => updateSettings({ showRulers: e.target.checked })}
                />
                Show Rulers
              </label>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-primary focus:ring-primary"
                  checked={settings.linkOppositeMargins || false}
                  onChange={(e) => updateSettings({ linkOppositeMargins: e.target.checked })}
                />
                Link Opposite Margins
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Top (in)</label>
                <input
                  type="number"
                  step="0.125"
                  min="0.125"
                  max="1"
                  className={inputClass}
                  value={settings.margin.top}
                  onChange={(e) => {
                    const val = Math.max(0.125, Math.min(1, parseFloat(e.target.value) || 1));
                    const updates: any = { top: val };
                    if (settings.linkOppositeMargins) updates.bottom = val;
                    updateSettings({ margin: { ...settings.margin, ...updates } });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Bottom (in)</label>
                <input
                  type="number"
                  step="0.125"
                  min="0.125"
                  max="1"
                  className={inputClass}
                  value={settings.margin.bottom}
                  onChange={(e) => {
                    const val = Math.max(0.125, Math.min(1, parseFloat(e.target.value) || 1));
                    const updates: any = { bottom: val };
                    if (settings.linkOppositeMargins) updates.top = val;
                    updateSettings({ margin: { ...settings.margin, ...updates } });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Left (in)</label>
                <input
                  type="number"
                  step="0.125"
                  min="0.125"
                  max="1"
                  className={inputClass}
                  value={settings.margin.left}
                  onChange={(e) => {
                    const val = Math.max(0.125, Math.min(1, parseFloat(e.target.value) || 1));
                    const updates: any = { left: val };
                    if (settings.linkOppositeMargins) updates.right = val;
                    updateSettings({ margin: { ...settings.margin, ...updates } });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Right (in)</label>
                <input
                  type="number"
                  step="0.125"
                  min="0.125"
                  max="1"
                  className={inputClass}
                  value={settings.margin.right}
                  onChange={(e) => {
                    const val = Math.max(0.125, Math.min(1, parseFloat(e.target.value) || 1));
                    const updates: any = { right: val };
                    if (settings.linkOppositeMargins) updates.left = val;
                    updateSettings({ margin: { ...settings.margin, ...updates } });
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Typography Box */}
        <div className="border rounded-md bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground bg-muted/80 border-b border-slate-100">
            Typography
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Font Family</label>
              <select
                className={inputClass}
                value={typography.fontFamily}
                onChange={(e) => updateSettings({ typography: { ...typography, fontFamily: e.target.value } })}
              >
                <option value="'Times New Roman', Times, serif">Times New Roman</option>
                <option value="Arial, Helvetica, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Courier New', Courier, monospace">Courier New</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Title Font Size (px)</label>
              <input
                type="number"
                className={inputClass}
                value={typography.titleSize || 28}
                onChange={(e) => updateSettings({ typography: { ...typography, titleSize: parseInt(e.target.value) || 28 } })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Heading Font Size (px)</label>
              <input
                type="number"
                className={inputClass}
                value={typography.headingSize || 14}
                onChange={(e) => updateSettings({ typography: { ...typography, headingSize: parseInt(e.target.value) || 14 } })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Body Font Size (px)</label>
              <input
                type="number"
                className={inputClass}
                value={typography.bodySize || 13}
                onChange={(e) => updateSettings({ typography: { ...typography, bodySize: parseInt(e.target.value) || 13 } })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Body Line Height</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="2"
                className={inputClass}
                value={typography.lineHeight || 1.5}
                onChange={(e) => updateSettings({ typography: { ...typography, lineHeight: Math.min(2, Math.max(1, parseFloat(e.target.value) || 1.5)) } })}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
