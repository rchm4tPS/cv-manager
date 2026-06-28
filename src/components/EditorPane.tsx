/* eslint-disable react-hooks/purity */
"use client";

import React, { useState } from "react";
import { useResumeStore } from "@/store/useResumeStore";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, User, FileText, Briefcase, GraduationCap, GripVertical, Trash2, UploadCloud, FolderDot, Sparkles, Plus, Star } from "lucide-react";

const inputClass = "w-full h-9 rounded-md border border-slate-200 bg-white shadow-sm px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

function PersonalInfoForm() {
  const { resume, updatePersonalInfo } = useResumeStore();
  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="border rounded-md p-3 bg-muted/10 flex justify-between items-center cursor-pointer mb-6 hover:bg-muted/20 transition-colors">
        <span className="text-sm font-semibold text-muted-foreground">Tips and Recommendations</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 @md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Name</label>
          <input
            type="text"
            className={inputClass}
            value={resume.personalInfo.name || ""}
            onChange={(e) => updatePersonalInfo({ name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Job Title</label>
          <input
            type="text"
            className={inputClass}
            value={resume.personalInfo.jobTitle || ""}
            onChange={(e) => updatePersonalInfo({ jobTitle: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Email</label>
          <input
            type="email"
            className={inputClass}
            value={resume.personalInfo.email || ""}
            onChange={(e) => updatePersonalInfo({ email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Phone</label>
          <input
            type="text"
            className={inputClass}
            value={resume.personalInfo.phone || ""}
            onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">City</label>
          <input
            type="text"
            className={inputClass}
            value={resume.personalInfo.location || ""}
            onChange={(e) => updatePersonalInfo({ location: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">LinkedIn</label>
          <input
            type="text"
            className={inputClass}
            value={resume.personalInfo.linkedin || ""}
            onChange={(e) => updatePersonalInfo({ linkedin: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Website/Portfolio</label>
          <input
            type="text"
            className={inputClass}
            value={resume.personalInfo.website || ""}
            onChange={(e) => updatePersonalInfo({ website: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">GitHub</label>
          <input
            type="text"
            className={inputClass}
            value={resume.personalInfo.github || ""}
            onChange={(e) => updatePersonalInfo({ github: e.target.value })}
          />
        </div>
      </div>
      
      <div className="pt-4">
        <label className="text-xs font-semibold text-muted-foreground block mb-2">Profile Photo</label>
        <Button variant="outline" className="text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 flex gap-2">
          <UploadCloud className="w-4 h-4" /> Upload Photo
        </Button>
        <p className="text-[10px] text-muted-foreground mt-2">Upload a professional headshot (max 2MB)</p>
      </div>
    </div>
  );
}

function SummaryForm() {
  const { resume, updateSection, addSection } = useResumeStore();
  const summarySection = resume.sections.find(s => s.type === "summary");

  if (!summarySection || summarySection.items.length === 0) {
    return (
      <div className="space-y-4 pt-4 border-t mt-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">No professional summary found.</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30"
          onClick={() => {
            if (!summarySection) {
              addSection({
                id: `summary-${Date.now()}`,
                type: 'summary',
                title: 'Professional Summary',
                order: resume.sections.length,
                items: [{
                  id: `item-sum-${Date.now()}`,
                  title: '',
                  description: [''],
                  order: 0
                }]
              });
            } else {
              updateSection(summarySection.id, {
                items: [{
                  id: `item-sum-${Date.now()}`,
                  title: '',
                  description: [''],
                  order: 0
                }]
              });
            }
          }}
        >
          + Add Professional Summary
        </Button>
      </div>
    );
  }

  const summaryItem = summarySection.items[0];

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="border rounded-md p-3 bg-muted/10 flex justify-between items-center cursor-pointer mb-6 hover:bg-muted/20 transition-colors">
        <span className="text-sm font-semibold text-muted-foreground">Tips and Recommendations</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="space-y-2 relative">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-muted-foreground">{summarySection.title}</label>
          <div className="flex gap-2">
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-full h-8 px-4 text-xs font-semibold flex gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Write with AI
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200"
              onClick={() => updateSection(summarySection.id, { items: [] })}
              title="Remove Summary"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <textarea
          className="w-full h-32 rounded-md border border-slate-200 bg-white shadow-sm p-4 text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary leading-relaxed transition-colors"
          value={summaryItem.description[0].replace(/<[^>]+>/g, '')}
          onChange={(e) => {
            updateSection(summarySection.id, {
              items: [{ ...summaryItem, description: [e.target.value] }]
            });
          }}
        />
      </div>
    </div>
  );
}

function WorkExperienceForm() {
  const { resume, updateSection, addSection } = useResumeStore();
  const [draggedDesc, setDraggedDesc] = useState<{ itemId: string; index: number } | null>(null);
  const expSection = resume.sections.find(s => s.type === "experience");
  const addItem = () => {
    const newItem = {
      id: `exp-${Date.now()}`,
      title: 'New Role',
      subtitle: 'New Company',
      startDate: '',
      endDate: '',
      location: '',
      description: ['New responsibility'],
      order: expSection ? expSection.items.length : 0
    };
    if (expSection) updateSection(expSection.id, { items: [...expSection.items, newItem] });
  };

  if (!expSection || expSection.items.length === 0) {
    return (
      <div className="space-y-4 pt-4 border-t mt-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">No {expSection?.title || 'experience'} section found.</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30"
          onClick={() => {
            if (!expSection) {
              addSection({ id: `exp-${Date.now()}`, type: 'experience', title: 'Work Experience', order: resume.sections.length, items: [{
                id: `exp-item-${Date.now()}`, title: 'New Role', subtitle: 'New Company', startDate: '', endDate: '', location: '', description: ['New responsibility'], order: 0
              }] });
            } else {
              addItem();
            }
          }}
        >
          + Add Work Experience
        </Button>
      </div>
    );
  }

  const updateItem = (itemId: string, field: string, value: string | string[]) => {
    const newItems = expSection.items.map(item => item.id === itemId ? { ...item, [field]: value } : item);
    updateSection(expSection.id, { items: newItems });
  };

  const deleteItem = (itemId: string) => {
    updateSection(expSection.id, { items: expSection.items.filter(item => item.id !== itemId) });
  };



  const updateDesc = (itemId: string, descIndex: number, value: string) => {
    const newItems = expSection.items.map(item => {
      if (item.id === itemId) {
        const newDesc = [...item.description];
        newDesc[descIndex] = value;
        return { ...item, description: newDesc };
      }
      return item;
    });
    updateSection(expSection.id, { items: newItems });
  };

  const addDesc = (itemId: string) => {
    const newItems = expSection.items.map(item => item.id === itemId ? { ...item, description: [...item.description, 'New responsibility'] } : item);
    updateSection(expSection.id, { items: newItems });
  };

  const deleteDesc = (itemId: string, descIndex: number) => {
    const newItems = expSection.items.map(item => item.id === itemId ? { ...item, description: item.description.filter((_, i) => i !== descIndex) } : item);
    updateSection(expSection.id, { items: newItems });
  };

  const handleDescDragStart = (e: React.DragEvent, itemId: string, index: number) => {
    setDraggedDesc({ itemId, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDescDragEnter = (e: React.DragEvent, targetItemId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedDesc || draggedDesc.itemId !== targetItemId || draggedDesc.index === targetIndex) return;

    const sourceIndex = draggedDesc.index;
    const newItems = expSection.items.map(item => {
      if (item.id === targetItemId) {
        const newDesc = [...item.description];
        const [movedItem] = newDesc.splice(sourceIndex, 1);
        newDesc.splice(targetIndex, 0, movedItem);
        return { ...item, description: newDesc };
      }
      return item;
    });
    updateSection(expSection.id, { items: newItems });
    setDraggedDesc({ itemId: targetItemId, index: targetIndex });
  };

  const handleDescDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDescDragEnd = () => {
    setDraggedDesc(null);
  };

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="border rounded-md p-3 bg-muted/10 flex justify-between items-center cursor-pointer mb-6 hover:bg-muted/20 transition-colors">
        <span className="text-sm font-semibold text-muted-foreground">Tips and Recommendations</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30" onClick={addItem}>
        + Add Work Experience
      </Button>

      {expSection.items.map((item) => (
        <div key={item.id} className="border rounded-md p-6 bg-muted/5 shadow-sm space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-muted-foreground">Company</label>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => deleteItem(item.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          </div>
          <input
            type="text"
            className={inputClass}
            value={item.subtitle || ""}
            onChange={(e) => updateItem(item.id, 'subtitle', e.target.value)}
          />

          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Role</label>
              <input type="text" className={inputClass} value={item.title} onChange={(e) => updateItem(item.id, 'title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <input type="text" className={inputClass} value={item.location || ""} onChange={(e) => updateItem(item.id, 'location', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
              <input type="text" className={inputClass} value={item.startDate || ""} onChange={(e) => updateItem(item.id, 'startDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">End Date</label>
              <input type="text" className={inputClass} value={item.endDate || ""} onChange={(e) => updateItem(item.id, 'endDate', e.target.value)} />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label className="text-sm font-semibold text-foreground">Responsibilities:</label>
              <div className="flex gap-2">
                <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-full h-8 px-4 text-xs font-semibold flex gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Write with AI
                </Button>
              </div>
            </div>

            <div className={`mt-2 space-y-2 p-2 -mx-2 rounded-xl transition-colors duration-300 ${draggedDesc?.itemId === item.id ? 'bg-slate-200/60 shadow-inner' : 'bg-transparent'}`}>
              {item.description.map((desc, dIdx) => {
                const isDragging = draggedDesc?.itemId === item.id && draggedDesc?.index === dIdx;
                return (
                <div 
                  key={dIdx} 
                  draggable
                  onDragStart={(e) => handleDescDragStart(e, item.id, dIdx)}
                  onDragEnter={(e) => handleDescDragEnter(e, item.id, dIdx)}
                  onDragOver={handleDescDragOver}
                  onDragEnd={handleDescDragEnd}
                  className={`flex gap-2 items-start border rounded-md p-3 transition-all cursor-move ${
                    isDragging ? 'opacity-50 border-dashed border-blue-500 bg-blue-50 scale-[0.98]' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                  }`}
                >
                  <textarea 
                    className="text-sm flex-1 leading-relaxed text-slate-700 bg-transparent resize-none outline-none h-20 cursor-text" 
                    value={desc.replace(/<[^>]+>/g, '')} 
                    onChange={(e) => updateDesc(item.id, dIdx, e.target.value)}
                  />
                  <div className="flex flex-col gap-1 shrink-0 items-center justify-center h-full">
                    <Button variant="ghost" size="icon" className="w-6 h-6"><Sparkles className="w-3 h-3 text-blue-500" /></Button>
                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => deleteDesc(item.id, dIdx)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    <div className="w-6 h-6 flex items-center justify-center"><GripVertical className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" /></div>
                  </div>
                </div>
              )})}
            </div>
            <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30 mt-2" onClick={() => addDesc(item.id)}>+ Add Description</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProjectExperienceForm() {
  const { resume, updateSection, addSection } = useResumeStore();
  const [draggedDesc, setDraggedDesc] = useState<{ itemId: string; index: number } | null>(null);
  const projSection = resume.sections.find(s => s.type === "projects");
  const addItem = () => {
    const newItem = {
      id: `proj-${Date.now()}`,
      title: 'New Project',
      subtitle: 'New Roles in Project',
      startDate: '',
      endDate: '',
      location: '',
      description: ['Project detail'],
      order: projSection ? projSection.items.length : 0
    };
    if (projSection) updateSection(projSection.id, { items: [...projSection.items, newItem] });
  };

  if (!projSection || projSection.items.length === 0) {
    return (
      <div className="space-y-4 pt-4 border-t mt-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">No {projSection?.title || 'projects'} section found.</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30"
          onClick={() => {
            if (!projSection) {
              addSection({ id: `proj-${Date.now()}`, type: 'projects', title: 'Projects', order: resume.sections.length, items: [{
                id: `proj-item-${Date.now()}`, title: 'New Project', subtitle: 'New Roles in Project', startDate: '', endDate: '', location: '', description: ['New project detail'], order: 0
              }] });
            } else {
              addItem();
            }
          }}
        >
          + Add Project Experience
        </Button>
      </div>
    );
  }

  const updateItem = (itemId: string, field: string, value: string | string[]) => {
    const newItems = projSection.items.map(item => item.id === itemId ? { ...item, [field]: value } : item);
    updateSection(projSection.id, { items: newItems });
  };

  const deleteItem = (itemId: string) => {
    updateSection(projSection.id, { items: projSection.items.filter(item => item.id !== itemId) });
  };

  const updateDesc = (itemId: string, descIndex: number, value: string) => {
    const newItems = projSection.items.map(item => {
      if (item.id === itemId) {
        const newDesc = [...item.description];
        newDesc[descIndex] = value;
        return { ...item, description: newDesc };
      }
      return item;
    });
    updateSection(projSection.id, { items: newItems });
  };

  const addDesc = (itemId: string) => {
    const newItems = projSection.items.map(item => item.id === itemId ? { ...item, description: [...item.description, 'New detail'] } : item);
    updateSection(projSection.id, { items: newItems });
  };

  const deleteDesc = (itemId: string, descIndex: number) => {
    const newItems = projSection.items.map(item => item.id === itemId ? { ...item, description: item.description.filter((_, i) => i !== descIndex) } : item);
    updateSection(projSection.id, { items: newItems });
  };

  const handleDescDragStart = (e: React.DragEvent, itemId: string, index: number) => {
    setDraggedDesc({ itemId, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDescDragEnter = (e: React.DragEvent, targetItemId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedDesc || draggedDesc.itemId !== targetItemId || draggedDesc.index === targetIndex) return;

    const sourceIndex = draggedDesc.index;
    const newItems = projSection.items.map(item => {
      if (item.id === targetItemId) {
        const newDesc = [...item.description];
        const [movedItem] = newDesc.splice(sourceIndex, 1);
        newDesc.splice(targetIndex, 0, movedItem);
        return { ...item, description: newDesc };
      }
      return item;
    });
    updateSection(projSection.id, { items: newItems });
    setDraggedDesc({ itemId: targetItemId, index: targetIndex });
  };

  const handleDescDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDescDragEnd = () => {
    setDraggedDesc(null);
  };

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="border rounded-md p-3 bg-muted/10 flex justify-between items-center cursor-pointer mb-6 hover:bg-muted/20 transition-colors">
        <span className="text-sm font-semibold text-muted-foreground">Tips and Recommendations</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30" onClick={addItem}>
        + Add Project Experience
      </Button>

      {projSection.items.map((item) => (
        <div key={item.id} className="border rounded-md p-6 bg-muted/5 shadow-sm space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-muted-foreground">Project Name / Title</label>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => deleteItem(item.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
          </div>
          <input type="text" className={inputClass} value={item.title} onChange={(e) => updateItem(item.id, 'title', e.target.value)} />

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Role / Position</label>
            <input type="text" className={inputClass} value={item.subtitle || ""} onChange={(e) => updateItem(item.id, 'subtitle', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Location</label>
            <input type="text" className={inputClass} value={item.location || ""} onChange={(e) => updateItem(item.id, 'location', e.target.value)} />
          </div>

          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
              <input type="text" className={inputClass} value={item.startDate || ""} onChange={(e) => updateItem(item.id, 'startDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">End Date</label>
              <input type="text" className={inputClass} value={item.endDate || ""} onChange={(e) => updateItem(item.id, 'endDate', e.target.value)} />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label className="text-sm font-semibold text-foreground">Project Descriptions:</label>
            </div>

            <div className={`mt-2 space-y-2 p-2 -mx-2 rounded-xl transition-colors duration-300 ${draggedDesc?.itemId === item.id ? 'bg-slate-200/60 shadow-inner' : 'bg-transparent'}`}>
              {item.description.map((desc, dIdx) => {
                const isDragging = draggedDesc?.itemId === item.id && draggedDesc?.index === dIdx;
                return (
                <div 
                  key={dIdx} 
                  draggable
                  onDragStart={(e) => handleDescDragStart(e, item.id, dIdx)}
                  onDragEnter={(e) => handleDescDragEnter(e, item.id, dIdx)}
                  onDragOver={handleDescDragOver}
                  onDragEnd={handleDescDragEnd}
                  className={`flex gap-2 items-start border rounded-md p-3 transition-all cursor-move ${
                    isDragging ? 'opacity-50 border-dashed border-blue-500 bg-blue-50 scale-[0.98]' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                  }`}
                >
                  <textarea 
                    className="text-sm flex-1 leading-relaxed text-slate-700 bg-transparent resize-none outline-none h-16 cursor-text" 
                    value={desc.replace(/<[^>]+>/g, '')} 
                    onChange={(e) => updateDesc(item.id, dIdx, e.target.value)}
                  />
                  <div className="flex flex-col gap-1 shrink-0 items-center justify-center h-full">
                    <Button variant="ghost" size="icon" className="w-6 h-6"><Sparkles className="w-3 h-3 text-blue-500" /></Button>
                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => deleteDesc(item.id, dIdx)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    <div className="w-6 h-6 flex items-center justify-center"><GripVertical className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" /></div>
                  </div>
                </div>
              )})}
            </div>
            <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30 mt-2" onClick={() => addDesc(item.id)}>+ Add Description</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function EducationForm() {
  const { resume, updateSection, addSection } = useResumeStore();
  const eduSection = resume.sections.find(s => s.type === "education");
  const addItem = () => {
    const newItem = {
      id: `edu-${Date.now()}`,
      title: 'New Degree',
      subtitle: 'New University',
      startDate: '',
      endDate: '',
      location: '',
      description: [''],
      order: eduSection ? eduSection.items.length : 0
    };
    if (eduSection) updateSection(eduSection.id, { items: [...eduSection.items, newItem] });
  };

  if (!eduSection || eduSection.items.length === 0) {
    return (
      <div className="space-y-4 pt-4 border-t mt-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">No {eduSection?.title || 'education'} section found.</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30"
          onClick={() => {
            if (!eduSection) {
              addSection({ id: `edu-${Date.now()}`, type: 'education', title: 'Education', order: resume.sections.length, items: [{
                id: `edu-item-${Date.now()}`, title: 'New Degree', subtitle: 'New University', startDate: '', endDate: '', location: '', description: [''], order: 0
              }] });
            } else {
              addItem();
            }
          }}
        >
          + Add Education
        </Button>
      </div>
    );
  }

  const updateItem = (itemId: string, field: string, value: string | string[]) => {
    const newItems = eduSection.items.map(item => item.id === itemId ? { ...item, [field]: value } : item);
    updateSection(eduSection.id, { items: newItems });
  };

  const deleteItem = (itemId: string) => {
    updateSection(eduSection.id, { items: eduSection.items.filter(item => item.id !== itemId) });
  };



  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="border rounded-md p-3 bg-muted/10 flex justify-between items-center cursor-pointer mb-6 hover:bg-muted/20 transition-colors">
        <span className="text-sm font-semibold text-muted-foreground">Tips and Recommendations</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30" onClick={addItem}>
        + Add Education
      </Button>

      {eduSection.items.map((item) => (
        <div key={item.id} className="border rounded-md p-6 bg-muted/5 shadow-sm space-y-4 mt-6 relative">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 w-6 h-6" onClick={() => deleteItem(item.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
          
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">University</label>
              <input type="text" className={inputClass} value={item.subtitle || ""} onChange={(e) => updateItem(item.id, 'subtitle', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <input type="text" className={inputClass} value={item.location || ""} onChange={(e) => updateItem(item.id, 'location', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Degree</label>
              <input type="text" className={inputClass} value={item.title || ""} onChange={(e) => updateItem(item.id, 'title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Graduation Date</label>
              <input type="text" className={inputClass} value={item.endDate || ""} onChange={(e) => updateItem(item.id, 'endDate', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Additional Information</label>
            <textarea 
              className="w-full h-24 rounded-md border border-slate-200 bg-white shadow-sm p-3 text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              value={item.description.join("\n")}
              onChange={(e) => updateItem(item.id, 'description', [e.target.value])}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkillsForm() {
  const { resume, updateSection, addSection } = useResumeStore();
  const skillsSection = resume.sections.find(s => s.type === "skills");
  const addItem = () => {
    const newItem = {
      id: `skill-${Date.now()}`,
      title: 'Category',
      description: ['Skill 1, Skill 2'],
      order: skillsSection ? skillsSection.items.length : 0
    };
    if (skillsSection) updateSection(skillsSection.id, { items: [...skillsSection.items, newItem] });
  };

  if (!skillsSection || skillsSection.items.length === 0) {
    return (
      <div className="space-y-4 pt-4 border-t mt-4 text-center">
        <p className="text-sm text-muted-foreground mb-4">No {skillsSection?.title || 'skills'} section found.</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30"
          onClick={() => {
            if (!skillsSection) {
              addSection({ id: `skills-${Date.now()}`, type: 'skills', title: 'Skills', order: resume.sections.length, items: [{
                id: `skill-item-${Date.now()}`, title: 'Category', description: ['Skill 1, Skill 2'], order: 0
              }] });
            } else {
              addItem();
            }
          }}
        >
          + Add Skills
        </Button>
      </div>
    );
  }

  const updateItem = (itemId: string, field: string, value: string | string[]) => {
    const newItems = skillsSection.items.map(item => item.id === itemId ? { ...item, [field]: value } : item);
    updateSection(skillsSection.id, { items: newItems });
  };

  const deleteItem = (itemId: string) => {
    updateSection(skillsSection.id, { items: skillsSection.items.filter(item => item.id !== itemId) });
  };

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="border rounded-md p-3 bg-muted/10 flex justify-between items-center cursor-pointer mb-6 hover:bg-muted/20 transition-colors">
        <span className="text-sm font-semibold text-muted-foreground">Tips and Recommendations</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </div>

      <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30" onClick={addItem}>
        + Add Skill Category
      </Button>

      <div className="space-y-6">
        {skillsSection.items.map((item, index) => (
          <div key={item.id} className="p-5 border rounded-lg bg-slate-50/50 space-y-4 relative group">
            
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-slate-700">Category {index + 1}</h4>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteItem(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Category Name</label>
              <input type="text" className={inputClass} value={item.title || ""} onChange={(e) => updateItem(item.id, 'title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Skills (comma separated)</label>
              <textarea 
                className="w-full h-20 rounded-md border border-slate-200 bg-white shadow-sm p-3 text-sm resize-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                value={item.description.join(", ")}
                onChange={(e) => updateItem(item.id, 'description', e.target.value.split(",").map(s => s.trim()))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomSectionForm({ sectionId }: { sectionId: string }) {
  const { resume, updateSection, deleteSection } = useResumeStore();
  const [draggedDesc, setDraggedDesc] = useState<{ itemId: string; index: number } | null>(null);
  const section = resume.sections.find(s => s.id === sectionId);
  
  if (!section) return null;

  const addItem = () => {
    const newItem = {
      id: `custom-item-${Date.now()}`,
      title: 'New Item',
      subtitle: '',
      startDate: '',
      endDate: '',
      location: '',
      description: ['Item detail'],
      order: section.items.length
    };
    updateSection(section.id, { items: [...section.items, newItem] });
  };

  const updateItem = (itemId: string, field: string, value: string | string[]) => {
    const newItems = section.items.map(item => item.id === itemId ? { ...item, [field]: value } : item);
    updateSection(section.id, { items: newItems });
  };

  const deleteItem = (itemId: string) => {
    updateSection(section.id, { items: section.items.filter(item => item.id !== itemId) });
  };

  const updateDesc = (itemId: string, descIndex: number, value: string) => {
    const newItems = section.items.map(item => {
      if (item.id === itemId) {
        const newDesc = [...item.description];
        newDesc[descIndex] = value;
        return { ...item, description: newDesc };
      }
      return item;
    });
    updateSection(section.id, { items: newItems });
  };

  const addDesc = (itemId: string) => {
    const newItems = section.items.map(item => item.id === itemId ? { ...item, description: [...item.description, 'New detail'] } : item);
    updateSection(section.id, { items: newItems });
  };

  const deleteDesc = (itemId: string, descIndex: number) => {
    const newItems = section.items.map(item => item.id === itemId ? { ...item, description: item.description.filter((_, i) => i !== descIndex) } : item);
    updateSection(section.id, { items: newItems });
  };

  const handleDescDragStart = (e: React.DragEvent, itemId: string, index: number) => {
    setDraggedDesc({ itemId, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDescDragEnter = (e: React.DragEvent, targetItemId: string, targetIndex: number) => {
    e.preventDefault();
    if (!draggedDesc || draggedDesc.itemId !== targetItemId || draggedDesc.index === targetIndex) return;

    const sourceIndex = draggedDesc.index;
    const newItems = section.items.map(item => {
      if (item.id === targetItemId) {
        const newDesc = [...item.description];
        const [movedItem] = newDesc.splice(sourceIndex, 1);
        newDesc.splice(targetIndex, 0, movedItem);
        return { ...item, description: newDesc };
      }
      return item;
    });
    updateSection(section.id, { items: newItems });
    setDraggedDesc({ itemId: targetItemId, index: targetIndex });
  };

  const handleDescDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDescDragEnd = () => {
    setDraggedDesc(null);
  };

  return (
    <div className="space-y-4 pt-4 border-t mt-4">
      <div className="space-y-1.5 mb-6">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-muted-foreground">Section Title</label>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteSection(section.id)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Section
          </Button>
        </div>
        <input 
          type="text" 
          className={inputClass} 
          value={section.title} 
          onChange={(e) => updateSection(section.id, { title: e.target.value })} 
        />
      </div>
      {section.items.length === 0 ? (
        <div className="space-y-4 pt-4 border-t mt-4 text-center">
          <p className="text-sm text-muted-foreground mb-4">No {section.title || 'custom'} section found.</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30"
            onClick={addItem}
          >
            + Add Item
          </Button>
        </div>
      ) : (
        <>
          <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30" onClick={addItem}>
            + Add Item
          </Button>
          {section.items.map((item) => (
            <div key={item.id} className="border rounded-md p-6 bg-muted/5 shadow-sm space-y-4 mt-6">
              <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-muted-foreground">Item Name (e.g. Certificate Name)</label>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => deleteItem(item.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          </div>
          <input
            type="text"
            className={inputClass}
            value={item.title || ""}
            onChange={(e) => updateItem(item.id, 'title', e.target.value)}
          />

          <div className="grid grid-cols-1 @md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Subtitle (e.g. Issuer)</label>
              <input type="text" className={inputClass} value={item.subtitle || ""} onChange={(e) => updateItem(item.id, 'subtitle', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <input type="text" className={inputClass} value={item.location || ""} onChange={(e) => updateItem(item.id, 'location', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
              <input type="text" className={inputClass} value={item.startDate || ""} onChange={(e) => updateItem(item.id, 'startDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">End Date</label>
              <input type="text" className={inputClass} value={item.endDate || ""} onChange={(e) => updateItem(item.id, 'endDate', e.target.value)} />
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <label className="text-sm font-semibold text-foreground">Description:</label>
            </div>
            <div className={`mt-2 space-y-2 p-2 -mx-2 rounded-xl transition-colors duration-300 ${draggedDesc?.itemId === item.id ? 'bg-slate-200/60 shadow-inner' : 'bg-transparent'}`}>
              {item.description.map((desc, dIdx) => {
                const isDragging = draggedDesc?.itemId === item.id && draggedDesc?.index === dIdx;
                return (
                <div 
                  key={dIdx} 
                  draggable
                  onDragStart={(e) => handleDescDragStart(e, item.id, dIdx)}
                  onDragEnter={(e) => handleDescDragEnter(e, item.id, dIdx)}
                  onDragOver={handleDescDragOver}
                  onDragEnd={handleDescDragEnd}
                  className={`flex gap-2 items-start border rounded-md p-3 transition-all cursor-move ${
                    isDragging ? 'opacity-50 border-dashed border-blue-500 bg-blue-50 scale-[0.98]' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'
                  }`}
                >
                  <textarea 
                    className="text-sm flex-1 leading-relaxed text-slate-700 bg-transparent resize-none outline-none h-20 cursor-text" 
                    value={desc.replace(/<[^>]+>/g, '')} 
                    onChange={(e) => updateDesc(item.id, dIdx, e.target.value)}
                  />
                  <div className="flex flex-col gap-1 shrink-0 items-center justify-center h-full">
                    <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => deleteDesc(item.id, dIdx)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                    <div className="w-6 h-6 flex items-center justify-center"><GripVertical className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" /></div>
                  </div>
                </div>
              )})}
            </div>
            <Button variant="outline" size="sm" className="rounded-full px-4 text-xs font-semibold border-muted-foreground/30 mt-2" onClick={() => addDesc(item.id)}>+ Add Detail</Button>
          </div>
        </div>
      ))}
      </>
      )}
    </div>
  );
}

export const SECTION_ICONS: Record<string, React.ElementType> = {
  experience: Briefcase,
  education: GraduationCap,
  skills: Sparkles,
  projects: FolderDot,
  summary: FileText,
  custom: Star
};

export function EditorPane() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["personal", "summary", "experience", "education", "projects"]));
  const { resume, addSection } = useResumeStore();

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedSections(newExpanded);
  };

  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);

  const renderSectionForm = (section: { type: string; id: string }) => {
    switch (section.type) {
      case "summary": return <SummaryForm />;
      case "experience": return <WorkExperienceForm />;
      case "projects": return <ProjectExperienceForm />;
      case "education": return <EducationForm />;
      case "skills": return <SkillsForm />;
      case "custom": return <CustomSectionForm sectionId={section.id} />;
      default: return null;
    }
  };

  const handleAddCustomSection = () => {
    const id = `custom-${Date.now()}`;
    addSection({
      id,
      type: 'custom',
      title: 'Custom Section',
      order: resume.sections.length,
      items: [{
        id: `item-${Date.now()}`,
        title: 'Certification / Role',
        subtitle: 'Issuer / Organization',
        startDate: '',
        endDate: '',
        location: '',
        description: ['Detail here...'],
        order: 0
      }]
    });
    const newExpanded = new Set(expandedSections);
    newExpanded.add(id);
    setExpandedSections(newExpanded);
  };

  return (
    <aside className="w-full h-full min-h-0 bg-muted/5 p-8 overflow-y-auto space-y-4">
      
      {/* Personal Info Accordion */}
      <div className="bg-background border rounded-lg shadow-sm overflow-hidden">
        <div 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleSection("personal")}
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">Personal Information</h2>
          </div>
          {expandedSections.has("personal") ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className={`grid transition-all duration-300 ease-in-out ${expandedSections.has("personal") ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="px-6 pb-6"><PersonalInfoForm /></div>
          </div>
        </div>
      </div>

      {/* Dynamic Sections */}
      {sortedSections.map(section => {
        const Icon = SECTION_ICONS[section.type] || Star;
        return (
          <div key={section.id} className="bg-background border rounded-lg shadow-sm overflow-hidden">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">{section.title}</h2>
              </div>
              {expandedSections.has(section.id) ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div className={`grid transition-all duration-300 ease-in-out ${expandedSections.has(section.id) ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <div className="px-6 pb-6">
                   {renderSectionForm(section)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="pt-6">
        <Button 
          variant="outline" 
          className="w-full border-dashed border-2 py-6 text-muted-foreground hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 bg-transparent transition-all" 
          onClick={handleAddCustomSection}
        >
          <Plus className="w-5 h-5 mr-2" /> Add Custom Section
        </Button>
      </div>

    </aside>
  );
}
