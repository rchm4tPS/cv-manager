"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useResumeStore } from "@/store/useResumeStore";

export function AIChatbot() {
  const { tailoringJob } = useResumeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [isDiffing, setIsDiffing] = useState(false);

  useEffect(() => {
    if (tailoringJob) {
      setTimeout(() => {
        setIsOpen(true);
        setMessages([
          { 
            role: "ai", 
            text: `Hi! I see you want to tailor your CV for the ${tailoringJob.position} role at ${tailoringJob.company}. I've loaded the job description. What would you like to focus on?` 
          }
        ]);
      }, 0);
    }
  }, [tailoringJob]);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages([...messages, { role: "user", text: input }]);
    const currentInput = input;
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `I have updated your CV based on your request: "${currentInput}". I removed unnecessary line breaks and improved the tone. Do you want to accept this change?` }
      ]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Chatbot Toggle Button */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 items-end z-50">
        {isOpen && (
          <div className="w-80 h-96 bg-background border rounded-lg shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out">
            <div className="bg-primary text-primary-foreground p-3 flex justify-between items-center">
              <span className="font-semibold text-sm">AI Assistant</span>
              <div className="flex gap-2">
                <Button 
                  variant={isDiffing ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => setIsDiffing(!isDiffing)}
                >
                  {isDiffing ? "Hide Diff" : "Show Diff"}
                </Button>
                <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-white">✕</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center mt-10">
                  Hi! I&apos;m your AI assistant. Tell me how you&apos;d like to improve your CV.
                </p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border"}`}>
                      {msg.text}
                      {msg.role === "ai" && (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="default" className="h-7 text-xs">Accept</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive">Reject</Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t bg-muted/30">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
                  placeholder="Ask AI to edit..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <Button type="submit" size="sm">Send</Button>
              </form>
            </div>
          </div>
        )}
        
        <Button 
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "✕" : "✨"}
        </Button>
      </div>
    </>
  );
}
