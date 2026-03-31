"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Send, Loader2, RotateCcw, Anchor, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "../chat/message-bubble";
import { GrantMatchSuggestions } from "./grant-match-suggestions";
import { useProfile } from "@/components/profile-provider";

export function GrantMatchChat() {
  const { profileId } = useProfile();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/grant-match-chat",
        body: { profileId },
      }),
    [profileId]
  );
  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
  });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTime = useRef(0);

  const isLoading = status === "submitted" || status === "streaming";
  const isStreaming = status === "streaming";

  const scrollToBottom = useCallback(() => {
    const now = Date.now();
    if (isStreaming && now - lastScrollTime.current < 100) return;

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }
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
      if (scrollRafRef.current) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
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

  function handleReset() {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  const isEmpty = messages.length === 0;
  const lastMessageIndex = messages.length - 1;

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-48px)]">
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <Anchor className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-sm font-semibold">Porter</h1>
            <p className="text-xs text-muted-foreground">Grant intelligence & vendor matching</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
            <RotateCcw className="mr-1 h-3 w-3" />
            New conversation
          </Button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth-gpu">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center pt-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm mb-4">
                <Anchor className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold tracking-tight">
                Welcome to Porter
              </h2>
              <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
                Match vendors to federal grant programs, analyze qualifications,
                and find the right companies for port infrastructure projects.
              </p>
              <GrantMatchSuggestions onSelect={handleSuggestionSelect} />
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={isStreaming && index === lastMessageIndex && message.role === "assistant"}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && messages.length > 0 && messages[lastMessageIndex]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Anchor className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3">
                    <div className="flex gap-1">
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground ml-1">Analyzing...</span>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3">
                    <p className="text-sm font-medium text-destructive">Something went wrong</p>
                    <p className="mt-1 text-xs text-destructive/80">
                      {error.message || "Failed to get a response. Please try again."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-card p-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about grants, vendors, or matching..."
              rows={1}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ maxHeight: "120px", minHeight: "40px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || isLoading}
            className="h-10 px-4"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="mx-auto mt-2 max-w-3xl text-center text-xs text-muted-foreground">
          Porter helps match vendors with federal grant programs.
        </p>
      </div>
    </div>
  );
}
