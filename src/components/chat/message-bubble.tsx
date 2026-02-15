"use client";

import { memo } from "react";
import type { UIMessage } from "ai";
import { User, Feather } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";
import { ToolCallIndicator } from "./tool-call-indicator";

interface MessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
}

function MessageBubbleInner({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Feather className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={`flex max-w-[85%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div className="text-xs font-medium text-muted-foreground">
          {isUser ? "You" : "Corvus"}
        </div>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border shadow-sm"
          } ${isStreaming && !isUser ? "streaming-message" : ""}`}
        >
          {message.parts.map((part, i) => {
            if (part.type === "text" && part.text) {
              return (
                <div key={i} className={isUser ? "" : "prose-sm max-w-none"}>
                  {isUser ? (
                    <p className="text-sm">{part.text}</p>
                  ) : (
                    <MarkdownRenderer content={part.text} />
                  )}
                </div>
              );
            }

            if (part.type.startsWith("tool-")) {
              const toolName = part.type.slice(5);
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const toolPart = part as any;
              const isComplete = toolPart.state === "output-available";
              return (
                <ToolCallIndicator
                  key={i}
                  toolName={toolName}
                  args={(toolPart.input as Record<string, unknown>) || {}}
                  state={isComplete ? "result" : "call"}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}

// Memoize: skip re-render for messages that aren't actively streaming
export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  // Always re-render if it's the streaming message
  if (next.isStreaming) return false;
  // For non-streaming messages, skip re-render if message ID is the same
  return prev.message.id === next.message.id;
});
