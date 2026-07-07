"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Upload, X, FileText, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Resume, Section, ResumeItem } from '@/types/resume';

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
                <div className="flex items-center gap-2 mb-4 text-slate-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold">AI Extraction Complete</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[400px]">
                  {/* Personal Info */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Personal Info</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500 block mb-1">Name</span>
                        <span className="font-medium text-slate-800">{parsedData.personalInfo?.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Job Title</span>
                        <span className="font-medium text-slate-800">{parsedData.personalInfo?.jobTitle || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Email</span>
                        <span className="font-medium text-slate-800">{parsedData.personalInfo?.email || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Phone</span>
                        <span className="font-medium text-slate-800">{parsedData.personalInfo?.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Location</span>
                        <span className="font-medium text-slate-800">{parsedData.personalInfo?.location || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">LinkedIn</span>
                        <span className="font-medium text-slate-800 break-all">{parsedData.personalInfo?.linkedin || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">Website</span>
                        <span className="font-medium text-slate-800 break-all">{parsedData.personalInfo?.website || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-1">GitHub</span>
                        <span className="font-medium text-slate-800 break-all">{parsedData.personalInfo?.github || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sections */}
                  {parsedData.sections?.map((section: Section) => (
                    <div key={section.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2 flex justify-between items-center">
                        {section.title}
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">{section.type}</span>
                      </h4>
                      <div className="space-y-4">
                        {section.items?.map((item: ResumeItem) => (
                          <div key={item.id} className="text-sm">
                            <div className="font-semibold text-slate-800">{item.title}</div>
                            {item.subtitle && <div className="text-slate-600">{item.subtitle}</div>}
                            {(item.startDate || item.endDate) && (
                              <div className="text-xs text-slate-400 mt-0.5">
                                {item.startDate || '?'} - {item.endDate || '?'}
                              </div>
                            )}
                            {item.description && item.description.length > 0 && (
                              <ul className="list-disc pl-4 mt-2 text-slate-600 space-y-1">
                                {item.description.map((desc: string, i: number) => (
                                  <li key={i}>{desc}</li>
                                ))}
                              </ul>
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
