"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Loader2, ChevronLeft } from "lucide-react";
import { useProfile } from "@/components/profile-provider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface GrantIntelligenceChatProps {
  onClose?: () => void;
  /** Active Client Profile (defaults to ProfileProvider selection) */
  profileId?: string;
}

export function GrantIntelligenceChat({ onClose, profileId: profileIdProp }: GrantIntelligenceChatProps) {
  const { profileId: profileFromContext } = useProfile();
  const profileId = profileIdProp ?? profileFromContext;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/grant-match-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const data = JSON.parse(line.slice(2));
                if (data.type === "text") {
                  assistantContent += data.content;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage?.role === "assistant") {
                      lastMessage.content = assistantContent;
                    } else {
                      newMessages.push({
                        id: (Date.now() + 1).toString(),
                        role: "assistant",
                        content: assistantContent,
                      });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Ensure final message is added
      if (assistantContent) {
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role !== "assistant") {
            newMessages.push({
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: assistantContent,
            });
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">Corvo Grant Intelligence</h2>
            <p className="text-xs text-muted-foreground">Ask about grants in your pipeline</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-sm text-muted-foreground mb-4">
              Ask Corvo about grants, scores, deadlines, or financial scenarios
            </p>
            <div className="space-y-2 text-xs text-muted-foreground text-left max-w-xs mx-auto">
              <p className="font-medium">Try asking:</p>
              <ul className="space-y-1 pl-4">
                <li>• "What grants are in the pipeline?"</li>
                <li>• "Show me critical deadlines"</li>
                <li>• "What should I do next?"</li>
                <li>• "Explain the score for [grant name]"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              <div className="whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Corvo is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Corvo about grants..."
            disabled={isLoading}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function GrantIntelligenceChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40">
          <Button
            onClick={() => setIsOpen(true)}
            size="sm"
            className="rounded-l-lg rounded-r-none shadow-lg h-24 w-12 flex flex-col items-center justify-center gap-1"
          >
            <MessageSquare className="h-5 w-5" />
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sidebar (when open) */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-screen w-full sm:w-96 bg-background border-l shadow-2xl z-50 flex flex-col">
            <GrantIntelligenceChat onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
