"use client";

import { useState, useRef, useEffect, DragEvent, ChangeEvent, KeyboardEvent } from "react";
import { 
  Send, 
  Paperclip, 
  X, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileCode,
  ArrowRight,
  Bot,
  User,
  PanelRight,
  Award,
  ChevronRight,
  TrendingUp,
  Briefcase,
  AlertCircle,
  Check
} from "lucide-react";

interface IssueItem {
  section: string;
  problem: string;
  severity: string;
}

interface BulletRewriteItem {
  original: string;
  improved: string;
  reason: string;
}

interface ExtractedSkills {
  technical: string[];
  soft: string[];
}

interface CategoryScores {
  content: number;
  formatting: number;
  keywords: number;
  impact: number;
}

interface JobMatch {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  fit_summary: string;
  tailoring_suggestions: string[];
}

interface AnalysisResult {
  overall_score: number;
  category_scores: CategoryScores;
  extracted_skills: ExtractedSkills;
  missing_sections: string[];
  issues: IssueItem[];
  recommendations: string[];
  bullet_rewrites: BulletRewriteItem[];
  job_match: JobMatch | null;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  isError?: boolean;
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showDashboard, setShowDashboard] = useState<boolean>(true);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [isDragActive, setIsDragActive] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Session ID
  useEffect(() => {
    let id = localStorage.getItem("resume_sensei_session_id");
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem("resume_sensei_session_id", id);
    }
    setSessionId(id);

    // Initial welcome message
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I am **ResumeSensei**, your AI-powered career coach.\n\nHere is how we can analyze your resume for a job match:\n\n* **Provide a Job Description (JD)**: Type or paste the target JD in the chat box.\n* **Upload your Resume**: Attach your resume (PDF, DOCX, or Image) here.\n* **Get Feedback & Tailor**: I will critique your resume against the JD, calculate a match score, and offer suggestions.\n\n*Feel free to ask follow-up questions to refine specific sections!*"
      }
    ]);
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    const supportedExtensions = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    
    if (!supportedExtensions.includes(ext)) {
      alert(`Unsupported file format '${ext}'. Please upload a PDF, DOCX, JPG, JPEG, or PNG.`);
      return false;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File is too large. Maximum allowed size is 5MB.");
      return false;
    }

    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const resetSession = async () => {
    if (loading) return;
    
    const confirmReset = window.confirm("Are you sure you want to clear this chat and start a new session?");
    if (!confirmReset) return;

    setLoading(true);
    setLoadingMessage("Resetting session...");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      await fetch(`${apiUrl}/session/reset`, {
        method: "POST",
        body: new URLSearchParams({ session_id: sessionId })
      });
    } catch (err) {
      console.error("Failed to reset session on backend:", err);
    }

    // Regenerate session id
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem("resume_sensei_session_id", newId);
    setSessionId(newId);

    // Reset state
    setFile(null);
    setAnalysis(null);
    setInput("");
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I am **ResumeSensei**, your AI-powered career coach.\n\nHere is how we can analyze your resume for a job match:\n\n* **Provide a Job Description (JD)**: Type or paste the target JD in the chat box.\n* **Upload your Resume**: Attach your resume (PDF, DOCX, or Image) here.\n* **Get Feedback & Tailor**: I will critique your resume against the JD, calculate a match score, and offer suggestions.\n\n*Feel free to ask follow-up questions to refine specific sections!*"
      }
    ]);
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (loading) return;
    const trimmedInput = input.trim();
    if (!trimmedInput && !file) return;

    setLoading(true);
    setLoadingMessage(file ? "Uploading and analyzing resume..." : "ResumeSensei is thinking...");

    const userMsgId = Math.random().toString(36).substring(7);
    
    // Add user message to UI
    const newUserMsg: Message = {
      id: userMsgId,
      role: "user",
      content: trimmedInput,
    };
    
    if (file) {
      newUserMsg.fileName = file.name;
      newUserMsg.fileSize = formatBytes(file.size);
      newUserMsg.fileType = file.name.substring(file.name.lastIndexOf(".")).toUpperCase();
    }
    
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");
    const fileToSend = file;
    setFile(null);

    // Warmup timer warning
    const warningTimer = setTimeout(() => {
      setLoadingMessage("Processing with Groq models, this may take a moment...");
    }, 4500);

    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);
      if (trimmedInput) {
        formData.append("message", trimmedInput);
      }
      if (fileToSend) {
        formData.append("file", fileToSend);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Append assistant message
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: data.message
        }
      ]);

      // If structured analysis data is returned, update state
      if (data.analysis) {
        setAnalysis(data.analysis);
        setShowDashboard(true); // Open dashboard on analysis
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: `⚠️ **Error:** ${err.message || "Failed to contact the analyser server. Please ensure the backend is running and try again."}`,
          isError: true
        }
      ]);
    } finally {
      clearTimeout(warningTimer);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Safe custom Markdown formatter helper
  const renderMessageContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
      let text = line;
      if (isBullet) {
        text = trimmed.substring(2);
      }
      
      const parts = text.split("**");
      const renderedParts = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-bold text-slate-100">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-5 list-disc text-slate-300 my-1.5 leading-relaxed">
            {renderedParts}
          </li>
        );
      }

      return (
        <p key={idx} className="text-slate-300 my-2 leading-relaxed min-h-[1.2rem]">
          {renderedParts}
        </p>
      );
    });
  };

  // circular score progress ring
  const CircularScore = ({ score, title, size = 110, colorClass = "text-indigo-500" }: { score: number; title: string; size?: number; colorClass?: string }) => {
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (score / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-2 p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-inner">
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className="text-slate-850"
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className={`${colorClass} transition-all duration-1000 ease-out`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-extrabold text-white">{score}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">%</span>
          </div>
        </div>
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</span>
      </div>
    );
  };

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col antialiased overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-600/90 rounded-xl text-white shadow-lg shadow-indigo-600/10">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-tight">
              ResumeSensei
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Conversational Career Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 border border-slate-900 bg-slate-900/30 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>In-Memory Context</span>
          </div>

          <button
            onClick={() => setShowDashboard(prev => !prev)}
            disabled={!analysis}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              !analysis 
                ? "opacity-50 cursor-not-allowed border-slate-900 text-slate-500" 
                : showDashboard 
                  ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20" 
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
            }`}
          >
            <PanelRight className="w-4 h-4" />
            <span>{showDashboard ? "Hide Analysis" : "Show Analysis"}</span>
          </button>

          <button
            onClick={resetSession}
            className="p-1.5 sm:px-3 sm:py-1.5 border border-slate-900 bg-slate-950 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-905 transition-colors flex items-center gap-1.5"
            title="Start New Chat Session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Workspace Area: Chat + Dashboard */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* Chat Interface Pane (Left) */}
        <div className={`flex-1 flex flex-col h-full bg-slate-955 transition-all duration-300 border-r border-slate-900 ${
          showDashboard && analysis ? "w-[55%] lg:w-[50%]" : "w-full"
        }`}>
          
          {/* Message List */}
          <div 
            className="flex-1 overflow-y-auto p-6 space-y-6"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            {isDragActive && (
              <div className="absolute inset-0 bg-indigo-600/10 backdrop-blur-sm border-2 border-dashed border-indigo-500 m-4 rounded-2xl flex flex-col items-center justify-center z-50 pointer-events-none animate-pulse">
                <FileText className="w-16 h-16 text-indigo-400 mb-2" />
                <p className="text-lg font-bold text-white">Drop your resume here</p>
                <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, JPG, PNG (Max 5MB)</p>
              </div>
            )}

            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex gap-4 max-w-2xl animate-fade-in ${
                  msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user" 
                    ? "bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-500/10" 
                    : "bg-slate-909 border border-slate-800 text-indigo-400"
                }`}>
                  {msg.role === "user" ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
                </div>

                {/* Bubble */}
                <div className={`flex flex-col gap-2.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`px-4.5 py-3 rounded-2xl text-sm shadow-md ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : msg.isError 
                        ? "bg-rose-950/40 border border-rose-900/50 text-slate-100 rounded-tl-none"
                        : "bg-slate-900/60 border border-slate-900/80 text-slate-100 rounded-tl-none"
                  }`}>
                    {/* Render message text */}
                    {msg.content && <div className="space-y-1.5">{renderMessageContent(msg.content)}</div>}

                    {/* Attached File Card */}
                    {msg.fileName && (
                      <div className={`mt-3 flex items-center gap-3 p-3 rounded-xl border text-left ${
                        msg.role === "user"
                          ? "bg-indigo-700/50 border-indigo-500/30"
                          : "bg-slate-950/80 border-slate-800"
                      }`}>
                        <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs">{msg.fileName}</p>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{msg.fileType} • {msg.fileSize}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing / Loading Indicator */}
            {loading && (
              <div className="flex gap-4 max-w-2xl mr-auto animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-slate-909 border border-slate-800 flex items-center justify-center flex-shrink-0 text-indigo-400">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="px-4.5 py-3 bg-slate-900/60 border border-slate-900/80 rounded-2xl rounded-tl-none text-sm text-slate-300 flex flex-col gap-2 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                      <span className="font-semibold text-xs text-slate-400 uppercase tracking-wider">{loadingMessage}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-505">
                      <Clock className="w-3 h-3" />
                      <span>Groq models respond in seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="p-4 border-t border-slate-900 bg-slate-950/85 backdrop-blur-md">
            
            {/* File upload preview banner */}
            {file && (
              <div className="mb-3.5 mx-auto max-w-3xl flex items-center justify-between p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-md">{file.name}</p>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-1 text-slate-400 hover:text-rose-450 hover:bg-slate-900/50 rounded-lg transition-all"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="mx-auto max-w-3xl relative flex items-end gap-2.5 bg-slate-900/50 border border-slate-900 rounded-2xl p-2.5 focus-within:border-slate-800 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-indigo-455 hover:bg-slate-850 rounded-xl transition-all flex-shrink-0"
                title="Attach resume (PDF, DOCX, Image)"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <textarea
                ref={chatInputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !analysis 
                    ? "Type/paste a Job Description first, or attach your resume..." 
                    : "Ask ResumeSensei a follow-up question..."
                }
                rows={1}
                className="flex-1 bg-transparent border-0 outline-none text-slate-100 text-sm py-2 px-1 resize-none placeholder-slate-500 max-h-36 min-h-[36px]"
              />

              <button
                onClick={handleSendMessage}
                disabled={loading || (!input.trim() && !file)}
                className={`p-2 rounded-xl text-white shadow-lg transition-all flex-shrink-0 ${
                  loading || (!input.trim() && !file)
                    ? "bg-slate-800/80 text-slate-500 cursor-not-allowed shadow-none"
                    : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 active:scale-95 cursor-pointer"
                }`}
                title="Send Message"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
            <div className="text-center text-[10px] text-slate-600 mt-2 font-medium">
              Actively protecting against prompt injections. Text & files are evaluated strictly as passive data.
            </div>
          </div>
        </div>

        {/* Structured Analysis Dashboard Pane (Right) */}
        {showDashboard && analysis && (
          <div className="w-[45%] lg:w-[50%] h-full bg-slate-955 flex flex-col overflow-hidden animate-slide-in">
            {/* Dashboard Header */}
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between bg-slate-900/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <h2 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">Analysis Dashboard</h2>
              </div>
              <button
                onClick={() => setShowDashboard(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg transition-colors"
                title="Close Dashboard"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Dashboard Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              
              {/* Score Overview Circle & Category Progress Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="flex justify-center md:col-span-1">
                  <CircularScore score={analysis.overall_score} title="Overall Score" colorClass="text-indigo-500" />
                </div>
                
                <div className="md:col-span-2 space-y-4">
                  <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Category Ratings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(analysis.category_scores).map(([category, score]) => (
                      <div key={category} className="bg-slate-900/40 border border-slate-900/60 p-3 rounded-xl">
                        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                          <span className="capitalize text-slate-400">{category}</span>
                          <span className="text-slate-200">{score}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${score}%` }} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Job Match Section (if present) */}
              {analysis.job_match ? (
                <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-5 space-y-5 shadow-lg shadow-indigo-600/5">
                  <div className="flex items-center justify-between border-b border-indigo-500/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4.5 h-4.5 text-indigo-405" />
                      <h3 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider">Job Fit Assessment</h3>
                    </div>
                    <span className="px-3 py-1 bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 text-xs font-bold rounded-full">
                      Match Score: {analysis.job_match.match_score}%
                    </span>
                  </div>

                  <div className="text-sm text-slate-300 leading-relaxed italic bg-slate-955/40 p-3 rounded-xl border border-indigo-950/20">
                    "{analysis.job_match.fit_summary}"
                  </div>

                  {/* Skills lists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Matched Skills ({analysis.job_match.matched_skills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.job_match.matched_skills.length > 0 ? (
                          analysis.job_match.matched_skills.map(skill => (
                            <span key={skill} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded-md uppercase">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">No skills matched</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Missing Skills ({analysis.job_match.missing_skills.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.job_match.missing_skills.length > 0 ? (
                          analysis.job_match.missing_skills.map(skill => (
                            <span key={skill} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-450 text-[10px] font-semibold rounded-md uppercase">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">No missing skills detected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tailoring suggestions */}
                  {analysis.job_match.tailoring_suggestions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">Tailoring Suggestions</span>
                      <ul className="space-y-2">
                        {analysis.job_match.tailoring_suggestions.map((suggestion, sIdx) => (
                          <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2 bg-indigo-950/20 p-2.5 rounded-xl border border-indigo-950/30">
                            <span className="text-indigo-400 font-bold mt-0.5">•</span>
                            <span className="leading-relaxed">{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-slate-800 bg-slate-900/10 rounded-2xl p-4.5 text-center text-xs text-slate-505 italic">
                  Provide a Job Description in chat to enable Match Score and alignment insights.
                </div>
              )}

              {/* Skills Inventory */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2">Skills Inventory</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/30 border border-slate-900/60 p-4 rounded-xl space-y-2.5">
                    <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Technical Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.extracted_skills.technical.map(skill => (
                        <span key={skill} className="px-2 py-0.5 bg-indigo-600/10 border border-indigo-500/10 text-indigo-350 text-[10px] font-semibold rounded-md uppercase">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900/30 border border-slate-900/60 p-4 rounded-xl space-y-2.5">
                    <span className="text-xs font-bold text-slate-450 uppercase tracking-wider block">Soft Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.extracted_skills.soft.map(skill => (
                        <span key={skill} className="px-2 py-0.5 bg-cyan-600/10 border border-cyan-500/10 text-cyan-350 text-[10px] font-semibold rounded-md uppercase">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Critical Issues */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2">Issues & Flaws ({analysis.issues.length})</h3>
                {analysis.issues.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.issues.map((issue, idx) => (
                      <div key={idx} className="flex gap-3 p-3.5 bg-slate-900/40 border border-slate-900/80 rounded-xl">
                        <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                          issue.severity === "high" 
                            ? "bg-rose-500/15 text-rose-400" 
                            : issue.severity === "medium" 
                              ? "bg-amber-500/15 text-amber-400" 
                              : "bg-slate-500/15 text-slate-450"
                        }`}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200 capitalize">{issue.section}</span>
                            <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 font-bold rounded-md ${
                              issue.severity === "high"
                                ? "bg-rose-500/10 text-rose-450"
                                : issue.severity === "medium"
                                  ? "bg-amber-500/10 text-amber-450"
                                  : "bg-slate-500/10 text-slate-450"
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{issue.problem}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-xl text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fantastic! No critical resume formatting or content issues detected.</span>
                  </div>
                )}
              </div>

              {/* Missing Sections */}
              {analysis.missing_sections.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Missing Sections</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.missing_sections.map(section => (
                      <span key={section} className="px-3 py-1 bg-slate-900 border border-slate-800 text-slate-350 text-xs font-semibold rounded-lg flex items-center gap-1.5 uppercase">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                        {section}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations Checklist */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2">Improvement Recommendations</h3>
                <ul className="space-y-2.5">
                  {analysis.recommendations.map((rec, rIdx) => (
                    <li key={rIdx} className="flex gap-2.5 text-xs text-slate-300 bg-slate-900/20 border border-slate-900/60 p-3 rounded-xl items-start">
                      <div className="p-0.5 bg-indigo-500/10 text-indigo-400 rounded-md mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bullet Point Rewrites */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2">Tailored Bullet Point Rewrites</h3>
                {analysis.bullet_rewrites.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.bullet_rewrites.map((rewrite, bIdx) => (
                      <div key={bIdx} className="bg-slate-900/30 border border-slate-900/60 rounded-xl overflow-hidden shadow-inner">
                        <div className="bg-slate-900/60 px-4 py-2 border-b border-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Rewrite Example #{bIdx + 1}</span>
                          <span className="text-indigo-400 font-bold">TASK-ACTION-RESULT</span>
                        </div>
                        <div className="p-4 space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-500">Original Weak Version:</span>
                            <p className="text-xs text-slate-450 italic line-through font-mono leading-relaxed bg-rose-950/5 p-2 rounded-lg border border-rose-950/10">{rewrite.original}</p>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-500">ResumeSensei Improved Version:</span>
                            <p className="text-xs text-slate-200 font-medium leading-relaxed bg-emerald-950/5 p-2 rounded-lg border border-emerald-950/10">{rewrite.improved}</p>
                          </div>
                          <div className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/30 p-2.5 rounded-lg border border-slate-900 flex items-start gap-2">
                            <span className="font-bold text-indigo-405 mt-0.5">Reason:</span>
                            <span>{rewrite.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-2">
                    No bullet points provided for rewrite.
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-3 bg-slate-950 text-center text-[10px] text-slate-500 flex-shrink-0 flex items-center justify-center gap-3">
        <span>&copy; {new Date().getFullYear()} ResumeSensei.</span>
        <span>•</span>
        <span>Built with Next.js, FastAPI & Groq LLMs</span>
      </footer>
    </div>
  );
}
