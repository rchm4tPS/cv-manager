"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";
import { Loader2, X, Send, Check, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AiChatPane() {
  const { 
    resume, 
    analysisMode, 
    setAnalysisMode, 
    activeAnalysisStep,
    pendingChanges,
    setPendingChanges,
    applyPendingChanges,
    discardPendingChanges,
    chatMessages,
    setChatMessages,
    setIsChatOpen,
    activeSuggestionIdForChat,
    setActiveSuggestionIdForChat,
    updateSuggestionStatus,
    pendingAiMessage,
    setPendingAiMessage
  } = useResumeStore();
  
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (pendingAiMessage) {
      const msg = pendingAiMessage;
      setPendingAiMessage(null);
      handleSend(msg);
    }
  }, [pendingAiMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isProcessing]);

  const handleSend = async (overrideMessage?: string) => {
    const textToSend = typeof overrideMessage === 'string' ? overrideMessage : input;
    if (!textToSend.trim() || isProcessing) return;

    const newMessages = [...chatMessages, { role: "user" as const, text: textToSend }];
    setChatMessages(newMessages);
    if (!overrideMessage || typeof overrideMessage !== 'string') {
      setInput("");
    }
    setIsProcessing(true);

    try {
      const res = await fetch('/api/chat-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          messages: [newMessages[newMessages.length - 1]], // Isolate context per message
          stepId: activeAnalysisStep
        })
      });

      const data = await res.json();
      if (data.success && data.data) {
        const aiMsg: any = { role: "ai", text: data.data.reply, thought: data.data.thought };
        if (data.data.proposedChanges && Object.keys(data.data.proposedChanges).length > 0) {
          aiMsg.status = 'pending';
          setPendingChanges(data.data.proposedChanges);
          toast({
            title: "Changes Proposed",
            description: "Review the green highlights in the preview pane.",
          });
        }
        setChatMessages([...newMessages, aiMsg]);
      } else {
        throw new Error(data.error || "Failed to get AI response");
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      setChatMessages([...newMessages, { role: "ai", text: "Sorry, I encountered an error while trying to process your request." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = () => {
    applyPendingChanges();
    if (activeSuggestionIdForChat) {
      updateSuggestionStatus(activeSuggestionIdForChat, 'accepted');
      setActiveSuggestionIdForChat(null);
    }
    toast({ title: "Changes Accepted", description: "Your resume has been updated." });
  };

  const handleDiscard = () => {
    discardPendingChanges();
    if (activeSuggestionIdForChat) {
      updateSuggestionStatus(activeSuggestionIdForChat, 'rejected');
      setActiveSuggestionIdForChat(null);
    }
    toast({ title: "Changes Discarded" });
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
            if (pendingChanges) discardPendingChanges();
            if (activeSuggestionIdForChat) setActiveSuggestionIdForChat(null);
            setIsChatOpen(false);
          }}
        >
          <X className="w-4 h-4 mr-2" />
          Close Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {chatMessages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className="flex items-center gap-2 mb-1">
              {msg.role === "ai" && <span className="text-xs font-semibold text-slate-500">JobSuit AI</span>}
            </div>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-sm ${
              msg.role === "user" 
                ? "bg-blue-600 text-white rounded-br-sm" 
                : "bg-white text-slate-800 border rounded-tl-sm"
            }`}>
              {msg.role === 'ai' && msg.thought && (
                <details className="mb-3 border-b pb-2 cursor-pointer text-xs">
                  <summary className="font-semibold text-slate-500 mb-1 outline-none">AI Reasoning</summary>
                  <p className="text-slate-600 italic mt-1">{msg.thought}</p>
                </details>
              )}
              {msg.text}
              {msg.role === 'ai' && msg.status && (
                <div className={`mt-3 pt-2 border-t text-xs font-semibold flex items-center gap-1 ${
                  msg.status === 'accepted' ? 'text-green-600' :
                  msg.status === 'rejected' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                  {msg.status === 'accepted' && <Check className="w-3 h-3" />}
                  {msg.status === 'rejected' && <X className="w-3 h-3" />}
                  {msg.status === 'pending' && <Loader2 className="w-3 h-3 animate-spin" />}
                  Suggestion {msg.status}
                </div>
              )}
            </div>
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
          className="relative flex items-center"
        >
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="Tell me what to fix..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isProcessing || !!pendingChanges}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost"
            className="absolute right-2 text-slate-400 hover:text-blue-600"
            disabled={!input.trim() || isProcessing || !!pendingChanges}
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
