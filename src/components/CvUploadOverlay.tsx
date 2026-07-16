"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Upload, X, FileText, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Resume, Section, ResumeItem } from '@/types/resume';

const AutoResizeTextarea = ({ value, onChange, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={className}
      rows={1}
      {...props}
    />
  );
};

interface CvUploadOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (resumeData: Partial<Resume>, filename: string) => void;
}

export function CvUploadOverlay({ open, onOpenChange, onSuccess }: CvUploadOverlayProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [parsedData, setParsedData] = useState<Partial<Resume> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setFile(null);
      setRawText('');
      setParsedData(null);
      setError(null);
      setIsProcessing(false);
    } else {
      // Cancel any ongoing requests if closed
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [open]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onOpenChange(false);
  };

  const handleFileUpload = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are supported.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setStep(2);
    setIsProcessing(true);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to parse PDF');
      
      const data = await response.json();
      setRawText(data.text);
      setIsProcessing(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Error parsing PDF');
      setIsProcessing(false);
    }
  };

  const handleExtractAI = async () => {
    setStep(3);
    setIsProcessing(true);
    setError(null);
    
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/extract-cv-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Failed to extract data with AI');
      
      const resData = await response.json();
      if (!resData.success) throw new Error(resData.error || 'AI Extraction failed');
      
      setParsedData(resData.data);
      setStep(4);
      setIsProcessing(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Error extracting data');
      setIsProcessing(false);
      setStep(2); // Go back to raw text step so they can retry
    }
  };

  const updatePersonalInfo = (field: keyof NonNullable<Resume['personalInfo']>, value: string) => {
    setParsedData(prev => prev ? {
      ...prev,
      personalInfo: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(prev.personalInfo || {} as any),
        [field]: value
      }
    } : null);
  };

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    setParsedData(prev => {
      if (!prev || !prev.sections) return prev;
      const newSections = [...prev.sections];
      newSections[sectionIndex] = { ...newSections[sectionIndex], title };
      return { ...prev, sections: newSections };
    });
  };

  const updateItemField = (sectionIndex: number, itemIndex: number, field: keyof ResumeItem, value: string) => {
    setParsedData(prev => {
      if (!prev || !prev.sections) return prev;
      const newSections = [...prev.sections];
      const newItems = [...(newSections[sectionIndex].items || [])];
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
      newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems };
      return { ...prev, sections: newSections };
    });
  };

  const updateItemDescription = (sectionIndex: number, itemIndex: number, descIndex: number, value: string) => {
    setParsedData(prev => {
      if (!prev || !prev.sections) return prev;
      const newSections = [...prev.sections];
      const newItems = [...(newSections[sectionIndex].items || [])];
      const newDesc = [...(newItems[itemIndex].description || [])];
      newDesc[descIndex] = value;
      newItems[itemIndex] = { ...newItems[itemIndex], description: newDesc };
      newSections[sectionIndex] = { ...newSections[sectionIndex], items: newItems };
      return { ...prev, sections: newSections };
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden z-50 flex flex-col outline-none data-[starting-style]:scale-95 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-all duration-200">
          
          <div className="flex items-center justify-between border-b px-6 py-4 bg-slate-50/50">
            <Dialog.Title className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              AI Resume Import
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between mb-8 relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 -z-10" />
              {[
                { num: 1, label: 'Upload' },
                { num: 2, label: 'Parse' },
                { num: 3, label: 'AI Extract' },
                { num: 4, label: 'Review' }
              ].map((s) => (
                <div key={s.num} className="flex flex-col items-center gap-2 bg-white px-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${step > s.num ? 'bg-emerald-100 text-emerald-600' : step === s.num ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                    {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-xs font-medium ${step >= s.num ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* Step 1: Upload */}
            {step === 1 && (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors group relative">
                <input 
                  type="file" 
                  accept="application/pdf"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Select your PDF Resume</h3>
                <p className="text-sm text-slate-500 text-center max-w-sm">
                  Drag and drop your existing CV in PDF format here, or click to browse.
                </p>
              </div>
            )}

            {/* Step 2: Parse text */}
            {step === 2 && (
              <div className="flex flex-col h-full min-h-[300px]">
                {isProcessing ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                    <p className="font-medium text-slate-700">Extracting text from PDF...</p>
                    <p className="text-sm mt-2 max-w-xs text-center">This takes just a moment. We&apos;re pulling all the raw text from your document.</p>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-3 text-slate-700">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold">Raw Text Extracted</h3>
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-4 overflow-y-auto text-sm text-slate-600 font-mono whitespace-pre-wrap max-h-[300px]">
                      {rawText}
                    </div>
                    <p className="text-xs text-slate-500 mt-3">
                      Please review the extracted text. If it looks correct, we can proceed to categorize it with AI.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: AI Extracting */}
            {step === 3 && (
              <div className="flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                  <div className="relative bg-white p-4 rounded-full shadow-lg border border-slate-100">
                    <Sparkles className="w-10 h-10 text-blue-500 animate-pulse" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg text-slate-800 mb-2">AI is structuring your data...</h3>
                <p className="text-sm text-center max-w-sm">
                  Our AI model is carefully reading your CV and categorizing your experience, education, and skills.
                </p>
              </div>
            )}

            {/* Step 4: Review Data */}
            {step === 4 && parsedData && (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-2 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold">AI Extraction Complete</h3>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm px-4 py-2.5 rounded-lg mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span><strong>Tip:</strong> Click any text below to edit the AI&apos;s extraction before generating your CV.</span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6 max-h-[400px]">
                  {/* Personal Info */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Personal Info</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 block mb-1">Name</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.name || ''} onChange={(e) => updatePersonalInfo('name', e.target.value)} placeholder="Name" />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Job Title</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.jobTitle || ''} onChange={(e) => updatePersonalInfo('jobTitle', e.target.value)} placeholder="Job Title" />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Email</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.email || ''} onChange={(e) => updatePersonalInfo('email', e.target.value)} placeholder="Email" />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Phone</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.phone || ''} onChange={(e) => updatePersonalInfo('phone', e.target.value)} placeholder="Phone" />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Location</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.location || ''} onChange={(e) => updatePersonalInfo('location', e.target.value)} placeholder="Location" />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">LinkedIn</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.linkedin || ''} onChange={(e) => updatePersonalInfo('linkedin', e.target.value)} placeholder="LinkedIn URL" />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Website</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.website || ''} onChange={(e) => updatePersonalInfo('website', e.target.value)} placeholder="Website URL" />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">GitHub</span>
                        <input className="w-full text-slate-800 font-medium bg-transparent border-b border-slate-200 focus:border-blue-500 focus:outline-none py-1" value={parsedData.personalInfo?.github || ''} onChange={(e) => updatePersonalInfo('github', e.target.value)} placeholder="GitHub URL" />
                      </div>
                    </div>
                  </div>

                  {/* Sections */}
                  {parsedData.sections?.map((section: Section, sectionIndex: number) => (
                    <div key={section.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-start gap-4">
                        <AutoResizeTextarea className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:text-slate-700 w-full max-w-[300px] resize-none overflow-hidden" value={section.title} onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)} />
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize shrink-0 mt-0.5">{section.type}</span>
                      </h4>
                      <div className="space-y-4">
                        {section.items?.map((item: ResumeItem, itemIndex: number) => (
                          <div key={item.id} className="text-sm border-l-2 border-slate-100 pl-3">
                            <input className="font-semibold text-slate-800 bg-transparent w-full focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-500 py-0.5" value={item.title} onChange={(e) => updateItemField(sectionIndex, itemIndex, 'title', e.target.value)} placeholder="Title" />
                            <input className="text-slate-600 bg-transparent w-full focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-500 py-0.5" value={item.subtitle || ''} onChange={(e) => updateItemField(sectionIndex, itemIndex, 'subtitle', e.target.value)} placeholder="Subtitle" />
                            
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                              <input className="bg-transparent w-24 focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-500 py-0.5" value={item.startDate || ''} onChange={(e) => updateItemField(sectionIndex, itemIndex, 'startDate', e.target.value)} placeholder="Start Date" />
                              <span>-</span>
                              <input className="bg-transparent w-24 focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-500 py-0.5" value={item.endDate || ''} onChange={(e) => updateItemField(sectionIndex, itemIndex, 'endDate', e.target.value)} placeholder="End Date" />
                            </div>
                            {item.description && item.description.length > 0 && (
                              section.type === 'summary' ? (
                                <div className="mt-2 text-slate-600 space-y-2">
                                  {item.description.map((desc: string, descIndex: number) => (
                                    <AutoResizeTextarea key={descIndex} className="w-full bg-transparent resize-none focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-500 py-0.5 overflow-hidden" value={desc} onChange={(e) => updateItemDescription(sectionIndex, itemIndex, descIndex, e.target.value)} />
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-2 text-slate-600 space-y-2">
                                  {item.description.map((desc: string, descIndex: number) => (
                                    <div key={descIndex} className="flex gap-3 items-start">
                                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></div>
                                      <AutoResizeTextarea className="w-full bg-transparent resize-none focus:outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-500 py-0.5 overflow-hidden" value={desc} onChange={(e) => updateItemDescription(sectionIndex, itemIndex, descIndex, e.target.value)} />
                                    </div>
                                  ))}
                                </div>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4 bg-slate-50 flex items-center justify-between">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            
            {step === 2 && !isProcessing && (
              <Button onClick={handleExtractAI}>
                Extract Data with AI
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {step === 4 && parsedData && (
              <Button onClick={() => onSuccess(parsedData as Partial<Resume>, file?.name || 'Imported Resume')} className="bg-blue-600 hover:bg-blue-700 text-white">
                Generate New CV
                <FileText className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
