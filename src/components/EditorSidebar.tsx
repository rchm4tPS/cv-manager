import React from "react";

type TabType = "editor" | "analysis" | "settings";

interface EditorSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isChatOpen: boolean;
  onChatToggle: () => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  activeTab,
  onTabChange,
  isChatOpen,
  onChatToggle
}) => {
  return (
    <div className="w-14 border-r bg-muted/20 flex flex-col items-center py-4 gap-4 z-20 shrink-0">
      <button 
        onClick={() => onTabChange("editor")}
        className={`p-2 rounded-md transition-colors ${activeTab === 'editor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        title="Editor"
      >
        📝
      </button>
      <button 
        onClick={() => onTabChange("analysis")}
        className={`p-2 rounded-md transition-colors ${activeTab === 'analysis' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        title="Analysis"
      >
        📊
      </button>
      <button 
        onClick={() => onTabChange("settings")}
        className={`p-2 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
        title="Settings"
      >
        ⚙️
      </button>
      <button 
        onClick={onChatToggle}
        className={`p-2 rounded-md transition-colors mt-auto mb-4 ${isChatOpen ? 'bg-blue-100 text-blue-600 outline outline-1 outline-blue-400' : 'text-blue-500 hover:bg-blue-50'}`}
        title="AI Assistant"
      >
        ✨
      </button>
    </div>
  );
};
