import React, { useState } from "react";
import { MessageSquare, Send, Sparkles, AlertCircle, Shield } from "lucide-react";
import { askQuestionStream } from "../api.js";

const SUGGESTIONS = [
  "Is it safe to switch off Spotify or Discord at startup?",
  "What is consuming most of my RAM right now?",
  "Is it safe to clear Windows Temp files?",
];

export const AskPanel: React.FC = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const handleAsk = (qText: string) => {
    const q = qText.trim();
    if (!q || isStreaming) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setIsStreaming(true);

    let assistantMessage = "";
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    askQuestionStream(
      q,
      (token) => {
        assistantMessage += token;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", text: assistantMessage };
          return next;
        });
      },
      () => {
        setIsStreaming(false);
      },
      (err) => {
        setIsStreaming(false);
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            text: "Could not complete safety inquiry. Local AI service may be starting up.",
          };
          return next;
        });
      }
    );
  };

  return (
    <div className="w-full bg-[#333333] border border-[#3D3D3D] rounded-lg p-5 text-left mt-8">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-[#C0C0C0]" />
        <h3 className="text-sm font-medium text-white tracking-tight">
          Ask Featherlight: "Is it safe to switch this off?"
        </h3>
      </div>

      <p className="text-xs text-[#9E9E9E] mb-4">
        Grounded only in your system scan and safety allowlists. System components are strictly flagged.
      </p>

      {/* Suggested chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(s)}
            disabled={isStreaming}
            className="text-xs px-2.5 py-1 rounded bg-[#2A2A2A] border border-[#3D3D3D] text-[#C0C0C0] hover:text-white hover:border-[#6B6B6B] transition-colors text-left"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-[260px] overflow-y-auto pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-[#222222] text-[#C0C0C0] ml-6 border border-[#3D3D3D]"
                  : "bg-[#2A2A2A] text-white border border-[#3D3D3D] mr-4"
              }`}
            >
              <div className="font-medium text-[11px] text-[#9E9E9E] mb-1 uppercase tracking-wider">
                {m.role === "user" ? "You" : "Featherlight Safety AI"}
              </div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(question);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask e.g. 'Can I turn off OneDrive?'"
          disabled={isStreaming}
          className="flex-1 bg-[#222222] border border-[#3D3D3D] rounded px-3 py-2 text-xs text-white placeholder-[#9E9E9E] focus:outline-none focus:border-[#C0C0C0]"
        />
        <button
          type="submit"
          disabled={isStreaming || !question.trim()}
          className="p-2 rounded bg-[#E10600] text-white hover:bg-[#C00500] disabled:opacity-50 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
