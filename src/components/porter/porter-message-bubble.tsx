"use client";

import { memo } from "react";
import type { UIMessage } from "ai";
import { User, Anchor } from "lucide-react";
import { MarkdownRenderer } from "../chat/markdown-renderer";
import { PorterToolIndicator } from "./porter-tool-indicator";
import { ToolResultCard } from "./tool-result-cards";

interface PorterMessageBubbleProps {
  message: UIMessage;
  isStreaming?: boolean;
}

function PorterMessageBubbleInner({ message, isStreaming }: PorterMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-blue-600 text-white"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Anchor className="h-3.5 w-3.5" />}
      </div>

      <div className={`flex max-w-[85%] flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
        <div className="text-[10px] font-medium text-muted-foreground">
          {isUser ? "You" : "Porter"}
        </div>
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
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
                <div key={i}>
                  <PorterToolIndicator
                    toolName={toolName}
                    args={(toolPart.input as Record<string, unknown>) || {}}
                    state={isComplete ? "result" : "call"}
                  />
                  {isComplete && toolPart.output && (
                    <ToolResultCard toolName={toolName} output={toolPart.output} />
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export const PorterMessageBubble = memo(PorterMessageBubbleInner, (prev, next) => {
  if (next.isStreaming) return false;
  return prev.message.id === next.message.id;
});
