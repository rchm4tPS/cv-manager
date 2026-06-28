"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AnalysisPane() {
  const [score, setScore] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ category: string; message: string }[]>([]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    // Simulate API call to Gemini for analysis
    setTimeout(() => {
      setScore(78);
      setFeedback([
        { category: "Structure", message: "Good use of chronological order, but could use more action verbs." },
        { category: "ATS Keywords", message: "Missing key terms for Software Engineer roles (e.g., CI/CD, Cloud)." },
        { category: "Tailoring", message: "Consider highlighting leadership experience more prominently." }
      ]);
      setAnalyzing(false);
    }, 2000);
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <aside className="w-full h-full bg-muted/30 p-4 overflow-y-auto space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Resume Analysis
        </h2>
        
        <div className="flex flex-col items-center justify-center p-6 bg-background rounded-lg border shadow-sm">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                className="text-muted stroke-current"
                strokeWidth="8"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              <circle
                className="text-primary stroke-current transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={score === 0 ? circumference : strokeDashoffset}
              ></circle>
            </svg>
            <span className="absolute text-3xl font-bold text-foreground">
              {score}
            </span>
          </div>
          <Button 
            className="mt-6 w-full" 
            onClick={runAnalysis} 
            disabled={analyzing}
          >
            {analyzing ? "Analyzing with AI..." : "Analyze CV"}
          </Button>
        </div>
      </div>

      {feedback.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">AI Feedback</h3>
          <div className="space-y-3">
            {feedback.map((item, i) => (
              <div key={i} className="p-3 bg-background border rounded-md shadow-sm text-sm">
                <span className="font-semibold block mb-1 text-primary">{item.category}</span>
                <p className="text-muted-foreground">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
