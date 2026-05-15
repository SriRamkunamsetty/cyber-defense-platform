import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface PremiumSOCCopilotProps {
  investigationId?: number;
  onQuerySubmit?: (query: string) => Promise<string>;
}

export function PremiumSOCCopilot({
  investigationId,
  onQuerySubmit,
}: PremiumSOCCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I'm your SOC Copilot, an AI-powered cybersecurity analyst. Ask me anything about the current investigation, threat indicators, attack chains, or mitigation strategies.",
      timestamp: new Date(),
    },
  ]);

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

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Simulate streaming response
      let response = "";

      if (onQuerySubmit) {
        response = await onQuerySubmit(input);
      } else {
        // Mock response for demo
        response = generateMockResponse(input);
      }

      // Add assistant message with streaming effect
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Simulate streaming by updating message
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id ? { ...msg, isStreaming: false } : msg
          )
        );
      }, 1000);
    } catch (error) {
      console.error("Failed to get response:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResponse = (query: string): string => {
    const responses: Record<string, string> = {
      threat: `The detected malware exhibits sophisticated evasion techniques including dynamic code loading, encrypted command-and-control communication, and accessibility service abuse. The attack chain suggests a banking trojan variant with capabilities for credential harvesting and SMS interception.`,
      mitigation: `Recommended mitigation strategies include: 1) Immediate APK removal from all endpoints, 2) Reset compromised credentials, 3) Monitor for C2 communication patterns, 4) Implement enhanced permission monitoring, 5) Deploy behavioral detection rules.`,
      attack: `The attack chain follows a multi-stage progression: Initial installation → Permission escalation → Accessibility service abuse → Credential harvesting → C2 communication → Payload execution. Each stage is designed to evade detection while establishing persistent control.`,
      default: `Based on the investigation findings, this APK demonstrates multiple indicators of compromise. The risk score of 92/100 reflects critical threats including banking trojan behavior, credential harvesting capabilities, and encrypted C2 communication mechanisms.`,
    };

    const key = Object.keys(responses).find((k) => query.toLowerCase().includes(k));
    return key ? responses[key] : responses.default;
  };

  return (
    <Card className="bg-white/5 border-white/10 flex flex-col h-96">
      {/* Header */}
      <div className="border-b border-white/10 p-4 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-foreground">SOC Copilot</h3>
        <span className="text-xs text-muted-foreground ml-auto">AI-Powered Analyst</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/30"
                    : "bg-white/5 text-foreground border border-white/10"
                }`}
              >
                {message.isStreaming ? (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-3 h-3" />
                    </motion.div>
                    <span className="text-xs">Thinking...</span>
                  </div>
                ) : (
                  <Streamdown>{message.content}</Streamdown>
                )}
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about threats, attack chains, or mitigations..."
            disabled={isLoading}
            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-50"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="sm"
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
}
