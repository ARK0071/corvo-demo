"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  Send,
  Loader2,
  RotateCcw,
  Anchor,
  AlertCircle,
  X,
  History,
  ArrowLeft,
  ArrowRight,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePorterPanel } from "@/contexts/porter-context";
import { PorterMessageBubble } from "./porter-message-bubble";

// ---------------------------------------------------------------------------
// Page-aware suggested prompts
// ---------------------------------------------------------------------------

interface Suggestion {
  label: string;
  question: string;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { label: "Pipeline overview", question: "Show me my grant pipeline summary" },
  { label: "Overdue items", question: "What tasks and reports are overdue?" },
  { label: "Upcoming deadlines", question: "What deadlines are coming up in the next 30 days?" },
  { label: "Compliance help", question: "What are the key 2 CFR 200 requirements for cost allowability?" },
];

const PAGE_SUGGESTIONS: Record<string, Suggestion[]> = {
  "/porter-dashboard": [
    { label: "Pipeline summary", question: "Give me an overview of my grant pipeline" },
    { label: "Action items", question: "What are my most urgent action items?" },
    { label: "Overdue tasks", question: "Show me all overdue tasks across awards" },
    { label: "Upcoming reports", question: "What reports are due in the next 30 days?" },
  ],
  "/grants": [
    { label: "Search grants", question: "Find grants for port infrastructure projects" },
    { label: "Pipeline status", question: "What's the current state of my pipeline?" },
    { label: "Compare grants", question: "Help me compare grants in my pipeline" },
    { label: "Grant scoring", question: "Explain how grant fit scores are calculated" },
  ],
  "/awards": [
    { label: "Award summary", question: "Show me a summary of all active awards" },
    { label: "Financial health", question: "What's the financial status of my awards?" },
    { label: "Compliance status", question: "Show me compliance status across all awards" },
    { label: "Subrecipient risks", question: "Are there any high-risk subrecipients?" },
  ],
  "/reporting": [
    { label: "Report status", question: "What reports are due or overdue?" },
    { label: "SF-425 help", question: "Walk me through filling out an SF-425 report" },
    { label: "Indirect costs", question: "Explain the 2 CFR 200 de minimis indirect cost rate" },
    { label: "Audit prep", question: "What do I need to prepare for a single audit?" },
  ],
  "/calendar": [
    { label: "This month", question: "What are all deadlines this month?" },
    { label: "Critical tasks", question: "Show me critical-priority tasks" },
    { label: "Blocked items", question: "Are there any blocked tasks I should know about?" },
    { label: "Team workload", question: "Show team assignments across awards" },
  ],
  "/drafting": [
    { label: "NOFO requirements", question: "Search for key requirements in the NOFO" },
    { label: "Budget guidance", question: "What are the cost principles for this grant?" },
    { label: "Buy America", question: "What are the Buy America requirements for this grant?" },
    { label: "Match requirements", question: "What is the cost sharing requirement?" },
  ],
};

function getSuggestionsForPage(pathname: string): Suggestion[] {
  if (PAGE_SUGGESTIONS[pathname]) return PAGE_SUGGESTIONS[pathname];
  for (const key of Object.keys(PAGE_SUGGESTIONS)) {
    if (pathname.startsWith(key)) return PAGE_SUGGESTIONS[key];
  }
  return DEFAULT_SUGGESTIONS;
}

function getPageContextLabel(pathname: string): string {
  if (pathname.startsWith("/porter-dashboard")) return "Dashboard";
  if (pathname.startsWith("/grants")) return "Grants";
  if (pathname.startsWith("/awards")) return "Awards";
  if (pathname.startsWith("/reporting")) return "Reporting";
  if (pathname.startsWith("/calendar")) return "Calendar";
  if (pathname.startsWith("/drafting")) return "Drafting";
  if (pathname.startsWith("/competitive-intel")) return "Competitive Intel";
  if (pathname.startsWith("/newsroom")) return "Newsroom";
  if (pathname.startsWith("/admin")) return "Admin";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Home";
}

// ---------------------------------------------------------------------------
// Conversation persistence helpers
// ---------------------------------------------------------------------------

function extractTextFromMessage(msg: UIMessage): string {
  return msg.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("\n");
}

async function persistConversation(params: {
  conversationId: string | null;
  messages: UIMessage[];
  savedCount: number;
  pageContext: string;
}): Promise<{ conversationId: string; savedCount: number }> {
  const { messages, savedCount, pageContext } = params;
  let { conversationId } = params;

  // Extract unsaved messages (everything after savedCount)
  const unsaved = messages.slice(savedCount);
  if (unsaved.length === 0) return { conversationId: conversationId ?? "", savedCount };

  const toSave = unsaved.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: extractTextFromMessage(m),
  }));

  // Create conversation on first save
  if (!conversationId) {
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg
      ? extractTextFromMessage(firstUserMsg).slice(0, 100)
      : "New conversation";

    const res = await fetch("/api/porter-chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", title, pageContext }),
    });

    if (!res.ok) return { conversationId: "", savedCount };
    const data = await res.json();
    conversationId = data.id;
  }

  // Save messages
  await fetch("/api/porter-chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "save",
      conversationId,
      messages: toSave,
    }),
  });

  return { conversationId: conversationId!, savedCount: messages.length };
}

// ---------------------------------------------------------------------------
// Conversation history sidebar (inside the panel)
// ---------------------------------------------------------------------------

interface ConversationEntry {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

function ConversationHistory({
  onBack,
  onSelect,
  onNew,
}: {
  onBack: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/porter-chat/conversations")
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((data) => setConversations(data.conversations ?? []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-1 hover:bg-muted rounded">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">Conversation History</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onNew} className="text-xs gap-1">
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className="w-full text-left rounded-md px-3 py-2 hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium truncate">{conv.title}</p>
                <p className="text-xs text-muted-foreground">
                  {conv.messageCount} messages &middot;{" "}
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Porter Panel
// ---------------------------------------------------------------------------

export function PorterPanel() {
  const { isOpen, close } = usePorterPanel();
  const pathname = usePathname();

  const [showHistory, setShowHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const savedCountRef = useRef(0);

  const pageContext = useMemo(() => getPageContextLabel(pathname), [pathname]);
  const suggestions = useMemo(() => getSuggestionsForPage(pathname), [pathname]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/porter-chat",
        body: { pageContext: pathname },
      }),
    [pathname]
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    onFinish: useCallback(
      async ({ messages: finishedMessages }: { messages: UIMessage[] }) => {
        // Auto-save conversation when assistant finishes responding
        try {
          const result = await persistConversation({
            conversationId,
            messages: finishedMessages,
            savedCount: savedCountRef.current,
            pageContext: pathname,
          });
          if (result.conversationId) {
            setConversationId(result.conversationId);
          }
          savedCountRef.current = result.savedCount;
        } catch {
          // Persistence is best-effort — don't break the chat
        }
      },
      [conversationId, pathname]
    ),
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTime = useRef(0);

  const isLoading = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  const scrollToBottom = useCallback(() => {
    const now = Date.now();
    if (isStreaming && now - lastScrollTime.current < 100) return;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      lastScrollTime.current = Date.now();
      scrollRafRef.current = null;
    });
  }, [isStreaming]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    await sendMessage({ text: message });
  }

  function handleSuggestionSelect(question: string) {
    setInput("");
    sendMessage({ text: question });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleNewConversation() {
    setMessages([]);
    setInput("");
    setConversationId(null);
    savedCountRef.current = 0;
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function handleLoadConversation(convId: string) {
    try {
      const res = await fetch(`/api/porter-chat/conversations?id=${convId}`);
      if (!res.ok) {
        setShowHistory(false);
        return;
      }
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        // Convert saved messages to UIMessage format
        const uiMessages: UIMessage[] = data.messages.map(
          (m: { role: string; content: string }, i: number) => ({
            id: `loaded-${convId}-${i}`,
            role: m.role as "user" | "assistant",
            content: m.content,
            parts: [{ type: "text" as const, text: m.content }],
          })
        );
        setMessages(uiMessages);
        setConversationId(convId);
        savedCountRef.current = uiMessages.length;
      }
    } catch {
      // If load fails, just close history
    }
    setShowHistory(false);
  }

  if (!isOpen) return null;

  const isEmpty = messages.length === 0;
  const lastMessageIndex = messages.length - 1;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20" onClick={close} />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-[480px] max-w-[90vw] flex-col border-l bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        {showHistory ? (
          <ConversationHistory
            onBack={() => setShowHistory(false)}
            onSelect={handleLoadConversation}
            onNew={handleNewConversation}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white">
                  <Anchor className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Porter</h2>
                  <p className="text-[10px] text-muted-foreground">
                    Viewing: {pageContext}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowHistory(true)}
                  title="Conversation history"
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleNewConversation}
                    title="New conversation"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="px-4 py-4">
                {isEmpty ? (
                  <div className="flex flex-col items-center pt-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm mb-3">
                      <Anchor className="h-6 w-6" />
                    </div>
                    <h3 className="mb-1 text-lg font-semibold">How can I help?</h3>
                    <p className="mb-6 text-xs text-muted-foreground text-center max-w-xs">
                      I can search grants, check compliance, manage tasks, and answer questions about your awards.
                    </p>
                    <div className="w-full space-y-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => handleSuggestionSelect(s.question)}
                          className="group flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <div>
                            <div className="font-medium text-xs">{s.label}</div>
                            <div className="text-[11px] text-muted-foreground">{s.question}</div>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <PorterMessageBubble
                        key={message.id}
                        message={message}
                        isStreaming={
                          isStreaming && index === lastMessageIndex && message.role === "assistant"
                        }
                      />
                    ))}

                    {/* Loading */}
                    {isLoading &&
                      messages.length > 0 &&
                      messages[lastMessageIndex]?.role === "user" && (
                        <div className="flex gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                            <Anchor className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                            <div className="flex gap-1">
                              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            </div>
                            <span className="text-xs text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      )}

                    {/* Error */}
                    {error && (
                      <div className="flex gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                          <AlertCircle className="h-3.5 w-3.5" />
                        </div>
                        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2">
                          <p className="text-xs font-medium text-destructive">Something went wrong</p>
                          <p className="mt-0.5 text-[11px] text-destructive/80">
                            {error.message || "Please try again."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="border-t bg-card p-3">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Porter anything..."
                    rows={1}
                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ maxHeight: "100px", minHeight: "36px" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 100) + "px";
                    }}
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isLoading}
                  className="h-9 px-3"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
