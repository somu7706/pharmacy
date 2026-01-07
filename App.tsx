/** @format */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Mic,
  Image as ImageIcon,
  Video as VideoIcon,
  Search,
  MapPin,
  BrainCircuit,
  Activity,
  Settings,
  Menu,
  Sparkles,
  PhoneCall,
  X,
  FileText,
  Terminal,
  Layers,
} from "lucide-react";
import { AgentStatus, Message, MessageRole, Attachment } from "./types";
import { geminiService } from "./services/geminiService";
import Sidebar from "./components/Sidebar";
import MessageBubble from "./components/MessageBubble";
import VoiceAgentOverlay from "./components/VoiceAgentOverlay";

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activeMode, setActiveMode] = useState<
    "chat" | "image" | "video" | "live"
  >("chat");
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(500);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (
    role: MessageRole,
    content: string,
    extra?: Partial<Message>
  ) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
      ...extra,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const [header, data] = base64.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] || "image/png";

      let type: Attachment["type"] = "image";
      if (mimeType.startsWith("video")) type = "video";
      else if (mimeType.startsWith("audio")) type = "audio";
      else if (mimeType === "application/pdf") type = "pdf";
      else if (
        mimeType.includes("text") ||
        mimeType.includes("json") ||
        mimeType.includes("javascript") ||
        mimeType.includes("typescript")
      )
        type = "code";
      else if (
        mimeType.includes("spreadsheet") ||
        mimeType.includes("excel") ||
        mimeType.includes("csv")
      )
        type = "spreadsheet";
      else if (
        mimeType.includes("presentation") ||
        mimeType.includes("powerpoint")
      )
        type = "presentation";
      else if (!mimeType.startsWith("image")) type = "document"; // Fallback for other non-image types

      setAttachments((prev) => [
        ...prev,
        {
          type,
          url: URL.createObjectURL(file),
          data: data,
          mimeType,
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const currentInput = input;
    const currentAttachments = [...attachments];
    setInput("");
    setAttachments([]);
    setStatus(AgentStatus.THINKING);

    addMessage("user", currentInput, { attachments: currentAttachments });

    try {
      if (activeMode === "image") {
        setStatus(AgentStatus.GENERATING);
        const result = await geminiService.generateImage(currentInput);
        addMessage(
          "assistant",
          "Here's the image you requested based on: " + currentInput,
          {
            attachments: [
              { type: "image", url: result.url, mimeType: "image/png" },
            ],
          }
        );
      } else if (activeMode === "video") {
        setStatus(AgentStatus.GENERATING);
        const result = await geminiService.generateVideo(currentInput);
        addMessage("assistant", "I've generated this video for you.", {
          attachments: [
            { type: "video", url: result.url, mimeType: "video/mp4" },
          ],
        });
      } else {
        // Default text/reasoning mode
        const result = await geminiService.chat(
          currentInput,
          currentAttachments,
          {
            useSearch:
              currentInput.toLowerCase().includes("search") ||
              currentInput.toLowerCase().includes("latest"),
            useMaps:
              currentInput.toLowerCase().includes("location") ||
              currentInput.toLowerCase().includes("near me"),
            thinkingBudget: thinkingBudget,
          }
        );

        addMessage("assistant", result.text, {
          groundingSources: result.sources,
        });
      }
    } catch (error: any) {
      console.error(error);
      addMessage("assistant", `Encountered an error: ${error.message}`);
      setStatus(AgentStatus.ERROR);
    } finally {
      setStatus(AgentStatus.IDLE);
    }
  };

  return (
    <div className="flex h-screen w-full dark-bg overflow-hidden text-gray-200">
      <Sidebar
        isOpen={isSidebarOpen}
        toggle={() => setSidebarOpen(!isSidebarOpen)}
        activeMode={activeMode}
        setMode={setActiveMode}
      />

      <main className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 glass z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">
              Nexus Agent{" "}
              <span className="text-xs font-normal text-gray-400 ml-2 px-2 py-0.5 rounded-full border border-gray-700 uppercase tracking-widest">
                v3.0.1
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowVoiceOverlay(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 transition-all text-sm font-medium border border-indigo-500/30"
            >
              <PhoneCall className="w-4 h-4" />
              Live Mode
            </button>
            <div className="h-8 w-px bg-white/10"></div>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8 opacity-60">
              <BrainCircuit className="w-16 h-16 text-blue-500 animate-pulse" />
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">
                  Nexus Intelligence
                </h2>
                <p className="text-gray-400 text-lg">
                  Your high-performance multi-modal partner for design,
                  research, and technical execution.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                {[
                  {
                    icon: ImageIcon,
                    title: "Concept Visualization",
                    desc: "High-res image synthesis",
                  },
                  {
                    icon: Terminal,
                    title: "Deep Logic",
                    desc: "Complex reasoning & code",
                  },
                  {
                    icon: Search,
                    title: "Market Analysis",
                    desc: "Search-grounded insights",
                  },
                  {
                    icon: Activity,
                    title: "Live Voice",
                    desc: "Real-time vocal feedback",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <item.icon className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="font-semibold text-white mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          {status === AgentStatus.THINKING && (
            <div className="flex gap-4 max-w-3xl animate-in fade-in duration-500">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none italic text-gray-400 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
                Analyzing multimodal inputs and computing response...
              </div>
            </div>
          )}
        </div>

        {/* Input Dock */}
        <div className="p-4 glass border-t border-white/10">
          <div className="max-w-4xl mx-auto space-y-4">
            {attachments.length > 0 && (
              <div className="flex gap-2 p-2 bg-white/5 rounded-lg border border-white/10 overflow-x-auto">
                {attachments.map((at, i) => (
                  <div key={i} className="relative group shrink-0">
                    <button
                      onClick={() =>
                        setAttachments((prev) =>
                          prev.filter((_, idx) => idx !== i)
                        )
                      }
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                    {at.type === "image" ? (
                      <img
                        src={at.url}
                        className="w-16 h-16 object-cover rounded-md border border-white/20"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-blue-900/40 rounded-md border border-white/20 flex items-center justify-center">
                        {at.type === "video" ? (
                          <VideoIcon size={20} />
                        ) : at.type === "audio" ? (
                          <Mic size={20} />
                        ) : (
                          <FileText size={20} className="text-blue-300" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-white/5 border border-white/20 rounded-2xl p-2 focus-within:border-blue-500/50 transition-all shadow-2xl">
              <div className="flex items-center pl-2 pb-2">
                <label className="p-2 text-gray-400 hover:text-white cursor-pointer hover:bg-white/5 rounded-full transition-colors">
                  <ImageIcon size={20} />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,text/*,application/json,.csv,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  activeMode === "image"
                    ? "Describe the high-res visual concept..."
                    : activeMode === "video"
                    ? "Describe the motion sequence..."
                    : "Inquire, design, or solve..."
                }
                className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-2 max-h-48 min-h-[44px] text-gray-100 placeholder-gray-500"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={
                  status !== AgentStatus.IDLE ||
                  (!input.trim() && attachments.length === 0)
                }
                className={`p-3 rounded-xl transition-all mb-1 mr-1 ${
                  input.trim() || attachments.length > 0
                    ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    : "bg-white/5 text-gray-600"
                }`}
              >
                <Send size={20} />
              </button>
            </div>

            <div className="flex items-center justify-between px-2 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
              <div className="flex gap-4">
                <span className="flex items-center gap-1.5">
                  <Layers size={12} className="text-blue-500" /> Multi-modal
                  context active
                </span>
                <span className="flex items-center gap-1.5">
                  <BrainCircuit size={12} className="text-purple-500" />{" "}
                  Thinking Budget: {thinkingBudget} tokens
                </span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() =>
                    setThinkingBudget((prev) => (prev === 0 ? 500 : 0))
                  }
                  className={`hover:text-blue-400 transition-colors ${
                    thinkingBudget > 0 ? "text-blue-400" : ""
                  }`}
                >
                  Reasoning Mode
                </button>
                <span>Nexus v3 Engine</span>
              </div>
            </div>
          </div>
        </div>

        {showVoiceOverlay && (
          <VoiceAgentOverlay onClose={() => setShowVoiceOverlay(false)} />
        )}
      </main>
    </div>
  );
};

export default App;
