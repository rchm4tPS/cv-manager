"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";
import { Loader2, X, Send, Check, Trash2, RefreshCw, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AiChatPane() {
  const { 
    resume, 
    activeAnalysisStep,
    pendingChanges,
    setPendingChanges,
    chatMessages,
    setChatMessages,
    setIsChatOpen,
    activeSuggestionIdForChat,
    setActiveSuggestionIdForChat,
    pendingAiMessage,
    setPendingAiMessage,
    acceptAiChanges,
    discardAiChanges
  } = useResumeStore();
  
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);



  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessing]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const executeAiRequest = async (historyToUse: any[]) => {
    setIsProcessing(true);
    try {
      // Find the last index of a divider
      const lastDividerIndex = historyToUse.map(m => m.type).lastIndexOf('divider');
      const contextToSend = lastDividerIndex >= 0 ? historyToUse.slice(lastDividerIndex + 1) : historyToUse;

      const res = await fetch('/api/chat-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          messages: contextToSend, // Send clean context
          stepId: activeAnalysisStep
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiMsg: any = { role: "ai", text: data.data.reply, thought: data.data.thought };
        if (data.data.proposedChanges && Object.keys(data.data.proposedChanges).length > 0) {
          aiMsg.status = 'pending';
          setPendingChanges(data.data.proposedChanges);
          toast({
            title: "Changes Proposed",
            description: "Review the green highlights in the preview pane.",
          });
        }
        
        // Mark any previous 'pending' messages in this conversation as 'superseded' 
        // so we don't have dangling loaders.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedHistory = historyToUse.map((m: any) => 
          m.status === 'pending' ? { ...m, status: 'superseded' } : m
        );
        
        setChatMessages([...updatedHistory, aiMsg]);
      } else {
        throw new Error(data.error || "Failed to get AI response");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setChatMessages([...historyToUse, { role: "ai", text: "Sorry, I encountered an error while trying to process your request.", isError: true, timestamp: Date.now() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const textToSend = typeof overrideMessage === 'string' ? overrideMessage : input;
    if (!textToSend.trim() || isProcessing) return;

    const newMessages = [...chatMessages, { role: "user" as const, text: textToSend }];
    setChatMessages(newMessages);
    if (!overrideMessage || typeof overrideMessage !== 'string') {
      setInput("");
    }
    
    executeAiRequest(newMessages);
  };

  useEffect(() => {
    if (pendingAiMessage) {
      const msg = pendingAiMessage;
      setPendingAiMessage(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleSend(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiMessage]);

  const handleRetry = () => {
    if (isProcessing) return;
    const historyWithoutErrors = chatMessages.filter(m => !m.isError);
    setChatMessages(historyWithoutErrors);
    executeAiRequest(historyWithoutErrors);
  };

  const handleAccept = () => {
    acceptAiChanges();
    toast({ title: "Changes Accepted", description: "Your resume has been updated." });
  };

  const handleDiscard = () => {
    discardAiChanges();
    toast({ title: "Changes Discarded", description: "The resume has been reverted." });
  };

  return (
    <div className="flex flex-col h-full bg-white border-r w-full shrink-0 relative">
      <div className="flex items-center justify-between p-4 border-b h-[60px]">
        <span className="font-semibold text-slate-700">AI Fix</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => {
            if (pendingChanges) discardAiChanges();
            if (activeSuggestionIdForChat) setActiveSuggestionIdForChat(null);
            setIsChatOpen(false);
          }}
        >
          <X className="w-4 h-4 mr-2" />
          Close Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {chatMessages.map((msg, index) => (
          <div key={index}>
            {msg.type === 'divider' ? (
              <div className="flex items-center justify-center my-6">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs text-slate-400 font-medium px-4 uppercase tracking-wider">{msg.text}</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
            ) : (
            <div className={`w-fit max-w-[85%] rounded-2xl p-4 ${
              msg.role === "user" 
                ? "bg-blue-600 text-white shadow-sm ml-auto rounded-tr-sm" 
                : "bg-slate-100 text-slate-800 mr-auto rounded-tl-sm border border-slate-200/60"
            }`}>
              {msg.thought && msg.role === 'ai' && (
                <details className="mb-3 border-b border-slate-200/60 pb-2 cursor-pointer text-xs group">
                  <summary className="font-semibold text-slate-500 mb-1 outline-none list-none flex items-center gap-1 group-open:text-slate-600 select-none">
                    <ChevronRight className="w-3 h-3 text-slate-400 transition-transform duration-200 group-open:rotate-90" />
                    AI Reasoning
                  </summary>
                  <div className="grid grid-rows-[0fr] group-open:grid-rows-[1fr] transition-[grid-template-rows] duration-200 ease-out">
                    <div className="overflow-hidden">
                      <p className="text-slate-600 italic mt-1 leading-relaxed pl-3 border-l-2 border-slate-200 opacity-0 group-open:opacity-100 transition-opacity duration-300 delay-100">
                        {msg.thought}
                      </p>
                    </div>
                  </div>
                </details>
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
              {msg.role === 'ai' && msg.status && (
                <div className={`mt-3 pt-2 border-t text-xs font-semibold flex items-center gap-1 ${
                  msg.status === 'accepted' ? 'text-green-600' :
                  msg.status === 'rejected' ? 'text-red-600' :
                  msg.status === 'superseded' ? 'text-slate-500' :
                  'text-amber-600'
                }`}>
                  {msg.status === 'accepted' && <Check className="w-3 h-3" />}
                  {msg.status === 'rejected' && <X className="w-3 h-3" />}
                  {msg.status === 'superseded' && <X className="w-3 h-3 opacity-50" />}
                  {msg.status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {msg.status === 'superseded' ? 'Suggestion overridden' : `Suggestion ${msg.status}`}
                </div>
              )}
              {msg.isError && msg.timestamp && (
                (() => {
                  const timeElapsed = Math.floor((now - msg.timestamp!) / 1000);
                  const countdown = Math.max(0, 3 - timeElapsed);
                  const isLocked = countdown > 0;
                  
                  return (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`mt-3 w-full border-red-200 text-red-600 ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-red-50 hover:text-red-700'}`}
                      onClick={handleRetry}
                      disabled={isProcessing || isLocked}
                    >
                      <RefreshCw className={`w-3 h-3 mr-2 ${isLocked ? 'animate-spin opacity-50' : ''}`} />
                      {isLocked ? `Retry in ${countdown}s` : 'Retry Request'}
                    </Button>
                  );
                })()
              )}
            </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-start">
            <div className="p-4 bg-white border rounded-2xl rounded-tl-sm shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {pendingChanges && (
        <div className="p-4 bg-green-50 border-t border-green-100 flex flex-col gap-2">
          <p className="text-xs font-semibold text-green-800 text-center">Review proposed changes in the preview pane</p>
          <div className="flex gap-2">
            <Button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-2" /> Accept
            </Button>
            <Button onClick={handleDiscard} variant="outline" className="flex-1 border-green-200 text-green-700 hover:bg-green-100">
              <Trash2 className="w-4 h-4 mr-2" /> Discard
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 bg-white border-t">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative flex items-end p-1.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            style={{ minHeight: '32px' }}
            className="flex-1 pl-3 pr-2 py-1.5 bg-transparent focus:outline-none resize-none overflow-y-auto max-h-[96px] text-sm"
            placeholder={pendingChanges ? "Tweak this fix..." : "Tell me what to fix..."}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                }
              }
            }}
            disabled={isProcessing}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost"
            className="shrink-0 w-8 h-8 text-slate-400 hover:text-blue-600 ml-1 mb-[2px]"
            disabled={!input.trim() || isProcessing}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-3">
          Messages are processed by AI. Verify important information.
        </p>
      </div>
    </div>
  );
}
