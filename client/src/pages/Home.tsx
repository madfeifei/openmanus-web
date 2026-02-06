/**
 * Design Philosophy: Techno-Minimalism
 * - Split layout: sidebar for history, main area for chat
 * - Dark theme with blue-purple gradient accents
 * - Smooth animations and transitions
 * - Real-time status indicators
 */

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useChat } from "@/contexts/ChatContext";
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Trash2, 
  Loader2,
  Circle,
  Sparkles,
  AlertCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Streamdown } from 'streamdown';
import { Message } from "@/components/Message";

export default function Home() {
  const {
    sessions,
    currentSessionId,
    currentSession,
    isConnected,
    isProcessing,
    createSession,
    selectSession,
    deleteSession,
    sendMessage,
  } = useChat();
  
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages]);
  
  const handleSend = () => {
    if (!inputValue.trim() || !isConnected || isProcessing) return;
    
    sendMessage(inputValue);
    setInputValue("");
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Session History */}
      <aside className="w-72 border-r border-border/50 flex flex-col bg-card/30 backdrop-blur-sm">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">OpenManus</h1>
              <p className="text-xs text-muted-foreground">AI Agent Platform</p>
            </div>
          </div>
          
          <Button 
            onClick={createSession}
            className="w-full gap-2 glow-border"
            variant="outline"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>
        
        {/* Session List */}
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {sessions.map(session => (
              <div
                key={session.id}
                className={cn(
                  "group relative p-3 rounded-lg cursor-pointer transition-all duration-200",
                  "hover:bg-accent/50",
                  currentSessionId === session.id && "bg-accent"
                )}
                onClick={() => selectSession(session.id)}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.messages.length} messages
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {/* Connection Status */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs">
            <Circle 
              className={cn(
                "w-2 h-2 fill-current",
                isConnected ? "text-green-500" : "text-red-500"
              )}
            />
            <span className="text-muted-foreground">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
      </aside>
      
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Backend Connection Banner */}
        {!isConnected && (
          <div className="bg-muted/50 border-b border-border/50 px-6 py-3">
            <div className="max-w-4xl mx-auto flex items-center gap-3 text-sm">
              <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-foreground font-medium">Backend Not Connected</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  The OpenManus backend is not available. Please deploy the backend following the deployment guide, 
                  then configure <code className="px-1 py-0.5 bg-muted rounded text-xs">VITE_BACKEND_URL</code> in your Vercel environment variables.
                </p>
              </div>
            </div>
          </div>
        )}
        {currentSession ? (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-6" ref={scrollRef}>
              <div className="max-w-4xl mx-auto space-y-6">
                {currentSession.messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                      <Sparkles className="w-10 h-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">
                      Welcome to OpenManus
                    </h2>
                    <p className="text-muted-foreground max-w-md">
                      Start a conversation with the AI agent. Ask questions, request tasks, 
                      or explore what OpenManus can do for you.
                    </p>
                  </div>
                ) : (
                  currentSession.messages.map(message => (
                    <Message
                      key={message.id}
                      id={message.id}
                      role={message.role as "user" | "assistant"}
                      content={message.content}
                      timestamp={message.timestamp.toISOString()}
                      onEdit={(id, newContent) => {
                        console.log('Edit message:', id, newContent);
                      }}
                      onDelete={(id) => {
                        console.log('Delete message:', id);
                      }}
                    />
                  ))
                )}
                
                {/* Typing Indicator */}
                {isProcessing && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="inline-block px-4 py-3 rounded-lg bg-card border border-border/50">
                        <div className="typing-indicator flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            <Separator />
            
            {/* Input Area */}
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <div className="relative glow-border rounded-lg bg-card border border-border/50 pointer-events-auto">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={
                      isConnected 
                        ? "Type your message... (Press Enter to send)" 
                        : "Waiting for backend connection..."
                    }
                    disabled={isProcessing || !isConnected}
                    className="px-4 py-3 pr-12 border-0 bg-transparent focus:ring-0 focus:ring-offset-0 w-full outline-none text-foreground placeholder:text-muted-foreground pointer-events-auto cursor-text"
                    autoComplete="off"
                    style={{ color: 'oklch(0.95 0.01 265)' }}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isProcessing || !isConnected}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    title={!isConnected ? "Waiting for backend connection..." : "Send message"}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center mt-3">
                  OpenManus can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a chat or create a new one</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
