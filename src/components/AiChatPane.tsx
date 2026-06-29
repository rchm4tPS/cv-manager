"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";
import { Loader2, X, Send } from "lucide-react";

export function AiChatPane() {
  const { analysisMode, setAnalysisMode } = useResumeStore();
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Hi there! I can help you improve your resume. Ask me for feedback, or improvements for specific sections I can directly edit your resume." }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (analysisMode !== 'chat') return null;

  const handleSend = () => {
    if (!input.trim() || isProcessing) return;

    setMessages([...messages, { role: "user", text: input }]);
    const currentInput = input;
    setInput("");
    setIsProcessing(true);

    // Simulate AI response for now
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `I've updated your CV based on your request: "${currentInput}". I removed unnecessary filler words and improved the tone. Do you want to accept this change?` }
      ]);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-white border-r w-[400px] shrink-0 relative">
      <div className="flex items-center justify-between p-4 border-b h-[60px]">
        <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
          Clear
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => setAnalysisMode('step-detail')}
        >
          <X className="w-4 h-4 mr-2" />
          Close Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className="flex items-center gap-2 mb-1">
              {msg.role === "ai" && <span className="text-xs font-semibold text-slate-500">JobSuit AI</span>}
            </div>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-sm ${
              msg.role === "user" 
                ? "bg-blue-600 text-white rounded-br-sm" 
                : "bg-white text-slate-800 border rounded-tl-sm"
            }`}>
              {msg.text}
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
      </div>

      <div className="p-4 bg-white border-t">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative flex items-center"
        >
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            placeholder="Message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
          />
          <Button 
            type="submit" 
            size="icon" 
            variant="ghost"
            className="absolute right-2 text-slate-400 hover:text-blue-600"
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
