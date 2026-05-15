import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Streamdown } from "streamdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface SOCCopilotChatProps {
  investigationId: number;
  threatSummary?: string;
  iocs?: Array<{ type: string; value: string; severity: string }>;
  onSendMessage?: (message: string) => Promise<string>;
}

export function SOCCopilotChat({
  investigationId,
  threatSummary,
  iocs,
  onSendMessage,
}: SOCCopilotChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Call the analysis function or API
      let response = "I'm analyzing your question...";

      if (onSendMessage) {
        response = await onSendMessage(inputValue);
      } else {
        // Default response if no handler provided
        response = generateDefaultResponse(inputValue, threatSummary, iocs);
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to process your question"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg border border-white/10">
      {/* Header */}
      <div className="border-b border-white/10 p-4">
        <h3 className="text-lg font-semibold text-cyan-300">SOC Copilot</h3>
        <p className="text-sm text-muted-foreground">
          Ask questions about this investigation
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>Start a conversation about the investigation findings.</p>
              <p className="text-xs mt-2">
                Ask about threats, IOCs, risk scores, or mitigations.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/30"
                    : "bg-white/5 text-foreground border border-white/10"
                }`}
              >
                {message.role === "assistant" ? (
                  <Streamdown>{message.content}</Streamdown>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
                <p className="text-xs opacity-60 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/5 text-foreground border border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span className="text-sm">Analyzing...</span>
              </div>
            </motion.div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask about threats, IOCs, or mitigations..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function generateDefaultResponse(
  question: string,
  threatSummary?: string,
  iocs?: Array<{ type: string; value: string; severity: string }>
): string {
  const lowerQuestion = question.toLowerCase();

  if (
    lowerQuestion.includes("threat") ||
    lowerQuestion.includes("malware") ||
    lowerQuestion.includes("risk")
  ) {
    return (
      threatSummary ||
      "Based on the analysis, this APK shows suspicious behavior patterns. Please review the threat intelligence panel for detailed findings."
    );
  }

  if (lowerQuestion.includes("ioc") || lowerQuestion.includes("indicator")) {
    if (!iocs || iocs.length === 0) {
      return "No indicators of compromise were identified in this analysis.";
    }
    const highSeverity = iocs.filter((ioc) => ioc.severity === "high");
    return `Found ${iocs.length} total IOCs, with ${highSeverity.length} high-severity indicators. Check the Threat Intelligence panel for details.`;
  }

  if (lowerQuestion.includes("mitigation") || lowerQuestion.includes("fix")) {
    return "Recommended mitigations include: restricting app permissions, monitoring network traffic, and keeping your system updated. See the Executive Report for detailed recommendations.";
  }

  return "I can help you analyze this investigation. Try asking about threats, IOCs, risk scores, or recommended mitigations.";
}
