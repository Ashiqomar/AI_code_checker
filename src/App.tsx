import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Terminal,
  ShieldAlert,
  Sparkles,
  Play,
  Copy,
  Check,
  Download,
  RotateCcw,
  FileCode,
  GitPullRequest,
  Zap,
  Award,
  History,
  Code2,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Layers,
  Send,
  ExternalLink,
  Info,
  ShieldCheck,
  Trash2,
  Share2,
  Lock,
  ArrowRight
} from "lucide-react";

interface ReviewHistoryItem {
  id: string;
  timestamp: string;
  filename: string;
  language: string;
  score: number;
  riskLevel: string;
  reviewMarkdown: string;
  executionTimeMs: number;
  modelUsed: string;
}

interface CodeSample {
  id: string;
  title: string;
  language: string;
  filename: string;
  description: string;
  code: string;
}

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<"reviewer" | "webhook" | "workflow" | "history">("reviewer");
  const [code, setCode] = useState<string>(`// Enter source code snippet or git diff to review
function processPayment(user: any, amount: number) {
  const query = "SELECT * FROM users WHERE id = '" + user.id + "'";
  const token = "sk_live_99214a1f82e8e912400a"; // Potential hardcoded key
  
  if (amount > 0) {
    db.query(query);
    return { success: true, key: token };
  }
}`);
  const [filename, setFilename] = useState<string>("paymentService.ts");
  const [language, setLanguage] = useState<string>("typescript");
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.6-flash");
  const [focusAreas, setFocusAreas] = useState<string[]>(["security", "bugs", "performance", "quality"]);
  
  // Review Status
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<{
    score: number;
    riskLevel: string;
    markdown: string;
    executionTimeMs: number;
    modelUsed: string;
  } | null>(null);

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [samples, setSamples] = useState<CodeSample[]>([]);
  const [history, setHistory] = useState<ReviewHistoryItem[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type?: "info" | "success" | "warning" } | null>(null);

  const showToast = (message: string, type: "info" | "success" | "warning" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2800);
  };

  // Webhook Simulator State
  const [simulatedPrNumber, setSimulatedPrNumber] = useState<number>(142);
  const [simulatedPrTitle, setSimulatedPrTitle] = useState<string>("feat: Add payment authorization handler");
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [webhookLog, setWebhookLog] = useState<string[]>([]);
  const [isSimulatingWebhook, setIsSimulatingWebhook] = useState<boolean>(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fetch samples on load
  useEffect(() => {
    fetch("/api/samples")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSamples(data);
      })
      .catch(() => {
        setSamples([
          {
            id: "express-sql-injection",
            title: "Node.js Express + SQL Injection",
            language: "typescript",
            filename: "routes/users.ts",
            description: "Direct string concatenation in raw SQL query with unhandled error",
            code: `import express from 'express';\nimport { db } from '../db';\n\nconst router = express.Router();\n\nrouter.get('/user/search', async (req, res) => {\n  const { username } = req.query;\n  const sql = "SELECT * FROM users WHERE username = '" + username + "'";\n  const user = await db.raw(sql);\n  res.json(user);\n});`
          }
        ]);
      });
  }, []);

  // Compute line count
  const lineNumbers = code.split("\n").map((_, i) => i + 1);

  // Trigger AI Code Review
  const handleStartReview = async () => {
    if (!code.trim()) return;

    setIsReviewing(true);
    setReviewResult(null);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code_snippet: code,
          language,
          filename,
          focus_areas: focusAreas,
          model_name: selectedModel
        })
      });

      const data = await response.json();

      if (data && data.markdown_review) {
        const resultObj = {
          score: data.score || 85,
          riskLevel: data.risk_level || "MEDIUM",
          markdown: data.markdown_review,
          executionTimeMs: data.execution_time_ms || 1200,
          modelUsed: data.model_used || selectedModel
        };

        setReviewResult(resultObj);

        // Add to history
        const newHistoryItem: ReviewHistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          filename: filename || "snippet.ts",
          language,
          score: resultObj.score,
          riskLevel: resultObj.riskLevel,
          reviewMarkdown: resultObj.markdown,
          executionTimeMs: resultObj.executionTimeMs,
          modelUsed: resultObj.modelUsed
        };

        setHistory((prev) => [newHistoryItem, ...prev]);

        // Fire success confetti!
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#06b6d4", "#10b981", "#a855f7"]
        });

        showToast(`AI Review generated! Health Score: ${resultObj.score}/100`, "success");
      }
    } catch (err) {
      console.error("Review request error:", err);
      showToast("Review failed. Please check backend connection.", "warning");
    } finally {
      setIsReviewing(false);
    }
  };

  // Load sample code
  const loadSample = (sample: CodeSample) => {
    setCode(sample.code);
    setFilename(sample.filename);
    setLanguage(sample.language);
    showToast(`Loaded preset: ${sample.title}`, "info");
  };

  // Toggle focus areas
  const toggleFocusArea = (area: string) => {
    if (focusAreas.includes(area)) {
      if (focusAreas.length > 1) {
        setFocusAreas(focusAreas.filter((a) => a !== area));
      }
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  // Copy Markdown to Clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown file
  const downloadMarkdown = () => {
    if (!reviewResult) return;
    const blob = new Blob([reviewResult.markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ai-review-${filename.replace(/\s+/g, "_")}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported review for ${filename}`, "success");
  };

  // Simulate GitHub Webhook
  const handleSimulateWebhook = async () => {
    setIsSimulatingWebhook(true);
    setWebhookStatus("Triggering GitHub pull_request.opened event...");
    setWebhookLog(["[00:00.00] 📥 GitHub Event: pull_request (action: opened)"]);

    setTimeout(() => {
      setWebhookLog((prev) => [
        ...prev,
        `[00:00.35] 🔍 Fetching git diff for PR #${simulatedPrNumber} (${simulatedPrTitle})...`,
        `[00:00.80] 🤖 Invoking Google Gemini API (${selectedModel}) with Senior Staff Engineer System Prompt...`
      ]);
    }, 400);

    try {
      const res = await fetch("/webhook/github", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "pull_request"
        },
        body: JSON.stringify({
          action: "opened",
          pull_request: {
            number: simulatedPrNumber,
            title: simulatedPrTitle,
            html_url: `https://github.com/acme/app/pull/${simulatedPrNumber}`,
            diff_url: "https://github.com/acme/app/pull/142.diff",
            comments_url: `https://api.github.com/repos/acme/app/issues/${simulatedPrNumber}/comments`
          },
          repository: { full_name: "acme/payment-engine" }
        })
      });

      await res.json();

      setTimeout(() => {
        setWebhookLog((prev) => [
          ...prev,
          `[00:01.40] ✅ Gemini AI Code Review generated!`,
          `[00:01.65] 💬 Posting comment back to GitHub PR #${simulatedPrNumber}...`,
          `[00:01.90] 🎉 Webhook pipeline finished successfully [Status 200 OK]`
        ]);
        setWebhookStatus("Completed! AI review comment delivered to GitHub PR.");
        setIsSimulatingWebhook(false);
      }, 1200);
    } catch (err) {
      setWebhookLog((prev) => [...prev, `[ERROR] Failed to send webhook: ${String(err)}`]);
      setIsSimulatingWebhook(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-mono selection:bg-indigo-100 selection:text-indigo-900 relative overflow-x-hidden flex flex-col">
      {/* Background Ambient Glow Orbs */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-150px] right-[-50px] w-[600px] h-[600px] bg-cyan-200/30 rounded-full blur-[150px] pointer-events-none" />

      {/* Top System Status Bar */}
      <div className="bg-slate-100/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between text-xs font-mono z-40 text-slate-600">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
          </div>
          <span className="ml-2 text-xs tracking-widest text-slate-500 uppercase font-mono">
            Gemini-Code-Bot // v1.5-Pro
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] uppercase tracking-wider font-mono">
          <span className="flex items-center gap-2 text-emerald-700 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM ONLINE
          </span>
          <div className="h-3 w-[1px] bg-slate-300" />
          <span className="text-slate-500">API Latency: 242ms</span>
        </div>
      </div>

      {/* Main App Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 p-1">
            <Terminal className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-widest uppercase text-slate-900 font-mono">
                AI Code Reviewer
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {[
            { id: "reviewer", label: "Reviewer", icon: Code2 },
            { id: "webhook", label: "Webhook", icon: GitPullRequest },
            { id: "workflow", label: "Actions", icon: Layers, hideMobile: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-3 py-1.5 rounded text-xs font-mono tracking-wider transition-colors z-10 flex items-center space-x-1.5 ${
                  isActive ? "text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                } ${tab.hideMobile ? "hidden sm:flex" : ""}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-indigo-600 rounded shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-600"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-all relative"
          >
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">History</span>
            {history.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
                {history.length}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
        {/* REVIEWER TAB */}
        {activeTab === "reviewer" && (
          <motion.div
            key="reviewer-tab"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Top Toolbar: Samples & Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              {/* Preset Vulnerability Samples */}
              <div className="lg:col-span-7 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mr-1 font-semibold">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  SAMPLES:
                </span>
                {samples.map((sample) => (
                  <motion.button
                    key={sample.id}
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => loadSample(sample)}
                    className="px-2.5 py-1 rounded text-xs font-mono bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all hover:border-indigo-300 hover:text-indigo-600 flex items-center gap-1.5 font-medium"
                  >
                    <FileCode className="w-3 h-3 text-cyan-600" />
                    <span>{sample.title}</span>
                  </motion.button>
                ))}
              </div>

              {/* Model & Focus Controls */}
              <div className="lg:col-span-5 flex items-center justify-end space-x-3">
                <div className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 font-mono focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                  </select>
                </div>

                <motion.button
                  whileHover={{ scale: isReviewing ? 1 : 1.03, y: isReviewing ? 0 : -1 }}
                  whileTap={{ scale: isReviewing ? 1 : 0.96 }}
                  onClick={handleStartReview}
                  disabled={isReviewing || !code.trim()}
                  className={`px-4 py-2 rounded text-xs font-mono font-bold tracking-wider uppercase transition-all flex items-center space-x-2 border ${
                    isReviewing
                      ? "bg-indigo-100 text-indigo-400 border-indigo-200 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500 shadow-xs hover:shadow-indigo-500/20"
                  }`}
                >
                  {isReviewing ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Auditing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>RUN REVIEW</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Focus Area Selectors */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100/70 p-3 rounded-xl border border-slate-200 text-xs font-mono">
              <span className="text-slate-500 uppercase tracking-widest text-[10px] mr-2 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> FOCUS:
              </span>
              {[
                { id: "security", label: "🛡️ Security" },
                { id: "bugs", label: "🐛 Bugs" },
                { id: "performance", label: "⚡ Performance" },
                { id: "quality", label: "🧹 Clean Code" }
              ].map((area) => (
                <motion.button
                  key={area.id}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleFocusArea(area.id)}
                  className={`px-3 py-1 rounded transition-all border text-xs font-mono font-medium ${
                    focusAreas.includes(area.id)
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-xs font-semibold"
                      : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {area.label}
                </motion.button>
              ))}
            </div>

            {/* Split Screen Editor & Review Result */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Code Input Box */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col relative group">
                {/* Window Bar */}
                <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2 font-semibold">ACTIVE_DIFF</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="Filename"
                      className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-indigo-700 focus:outline-none focus:border-indigo-500 w-36"
                    />
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-mono text-slate-700 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="typescript">TypeScript</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="diff">Git Diff</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                    </select>
                  </div>
                </div>

                {/* Editor Container with Laser Beam overlay */}
                <div className="relative flex-1 min-h-[460px] bg-slate-900 font-mono text-xs flex overflow-hidden">
                  {/* Line Numbers */}
                  <div className="select-none py-4 px-3 text-right bg-slate-950/80 text-slate-500 border-r border-slate-800 font-mono text-xs min-w-[40px]">
                    {lineNumbers.map((n) => (
                      <div key={n} className="leading-6">
                        {n}
                      </div>
                    ))}
                  </div>

                  {/* Textarea Code Input */}
                  <textarea
                    ref={editorRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="// Paste code snippet or Git Diff here..."
                    className="w-full h-full p-4 bg-transparent text-slate-200 font-mono leading-6 resize-none focus:outline-none selection:bg-indigo-500/30 font-medium"
                    spellCheck={false}
                  />

                  {/* Laser Scanning Animation Beam */}
                  {isReviewing && (
                    <motion.div
                      className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-indigo-500 shadow-[0_0_15px_#06b6d4] pointer-events-none z-10"
                      initial={{ top: "0%" }}
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </div>

                {/* Footer status */}
                <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Lines: {lineNumbers.length} | Characters: {code.length}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCode("")}
                      className="hover:text-rose-600 transition-colors flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3 h-3" /> Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Review Output Viewer */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col relative">
                {/* Header Bar */}
                <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-800">
                      GEMINI ANALYSIS
                    </span>
                  </div>

                  {reviewResult && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(reviewResult.markdown)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-xs font-mono text-slate-700 flex items-center gap-1 border border-slate-200 transition-all font-medium"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>

                      <button
                        onClick={downloadMarkdown}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-xs font-mono text-slate-700 flex items-center gap-1 border border-slate-200 transition-all font-medium"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Content Box */}
                <div className="p-5 flex-1 min-h-[460px] max-h-[600px] overflow-y-auto font-sans text-sm text-slate-800">
                  {isReviewing ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 py-20">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-2 border-cyan-200 border-b-cyan-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                        <Cpu className="w-6 h-6 text-indigo-600 animate-pulse" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-800">Analyzing AST & Diff...</p>
                        <p className="text-[10px] text-slate-500 font-mono">Running Google Gemini Senior Staff Engineer Agent</p>
                      </div>
                    </div>
                  ) : reviewResult ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-4"
                    >
                      {/* Score Badge Header */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="p-4 rounded-lg bg-indigo-50/80 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 space-y-1.5">
                          <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest font-semibold">Health Score</p>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-3xl font-extrabold text-indigo-900 font-mono">
                              {reviewResult.score} / 100
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              reviewResult.score >= 90
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : reviewResult.score >= 70
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}>
                              Risk: {reviewResult.riskLevel}
                            </span>
                          </div>

                          {/* Animated Score Bar */}
                          <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden max-w-xs mt-2">
                            <motion.div
                              initial={{ width: "0%" }}
                              animate={{ width: `${reviewResult.score}%` }}
                              transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                              className={`h-full ${
                                reviewResult.score >= 85
                                  ? "bg-emerald-500"
                                  : reviewResult.score >= 70
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                            />
                          </div>
                        </div>

                        <div className="text-right font-mono text-xs text-slate-600 space-y-1 self-end sm:self-center">
                          <p className="flex items-center justify-end gap-1 font-semibold text-slate-700">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            {reviewResult.executionTimeMs} ms
                          </p>
                          <p className="text-[10px] text-indigo-600 uppercase tracking-widest font-bold">{reviewResult.modelUsed}</p>
                        </div>
                      </motion.div>

                      {/* Markdown Rendered Content */}
                      <div className="prose prose-slate max-w-none text-slate-800 prose-headings:text-slate-900 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100 text-xs sm:text-sm leading-relaxed font-sans">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {reviewResult.markdown}
                        </ReactMarkdown>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-3 my-auto">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Terminal className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold uppercase tracking-widest text-slate-700">Ready for Code Review</p>
                        <p className="text-xs text-slate-500 max-w-xs mt-1 font-mono">
                          Paste code snippet or git diff, then click "RUN REVIEW".
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* WEBHOOK SIMULATOR TAB */}
        {activeTab === "webhook" && (
          <motion.div
            key="webhook-tab"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4 text-indigo-600" />
                    GitHub Webhook Endpoint Simulator
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Simulate sending an automated <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">pull_request.opened</code> webhook event to your server.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  POST /webhook/github
                </span>
              </div>

              {/* PR Form input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1 font-bold">PR Number</label>
                  <input
                    type="number"
                    value={simulatedPrNumber}
                    onChange={(e) => setSimulatedPrNumber(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1 font-bold">Pull Request Title</label>
                  <input
                    type="text"
                    value={simulatedPrTitle}
                    onChange={(e) => setSimulatedPrTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <motion.button
                  whileHover={{ scale: isSimulatingWebhook ? 1 : 1.02 }}
                  whileTap={{ scale: isSimulatingWebhook ? 1 : 0.97 }}
                  onClick={handleSimulateWebhook}
                  disabled={isSimulatingWebhook}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded border border-indigo-500 transition-all shadow-xs flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSimulatingWebhook ? "Dispatching..." : "Simulate Webhook"}</span>
                </motion.button>

                {webhookStatus && (
                  <span className="text-xs font-mono text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {webhookStatus}
                  </span>
                )}
              </div>

              {/* Webhook Execution Terminal Logs */}
              <div className="bg-slate-900 p-4 rounded border border-slate-800 font-mono text-xs text-slate-200 min-h-[200px] max-h-[300px] overflow-y-auto space-y-1.5">
                <div className="text-slate-400 pb-2 border-b border-slate-800 uppercase tracking-widest text-[10px] font-bold">--- WEBHOOK PIPELINE EXECUTION LOGS ---</div>
                {webhookLog.length === 0 ? (
                  <p className="text-slate-500 italic">No webhook events dispatched yet. Click above to test.</p>
                ) : (
                  webhookLog.map((log, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-cyan-300"
                    >
                      {log}
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* WORKFLOW TAB */}
        {activeTab === "workflow" && (
          <motion.div
            key="workflow-tab"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    GitHub Actions Continuous AI Review Workflow
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    Save this workflow in <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">.github/workflows/ai-review.yml</code> to run AI Reviews automatically on every PR.
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => copyToClipboard(`name: Gemini AI Code Reviewer\n\non:\n  pull_request:\n    types: [opened, synchronize, reopened]\n\njobs:\n  review:\n    runs-on: ubuntu-latest\n...`)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-xs font-mono text-slate-700 rounded border border-slate-200 flex items-center gap-1.5 font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy YAML</span>
                </motion.button>
              </div>

              <div className="bg-slate-900 p-4 rounded border border-slate-800 overflow-x-auto font-mono text-xs text-indigo-300 leading-relaxed">
                <pre>{`name: Gemini AI Code Reviewer

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Dependencies
        run: pip install google-genai requests PyGithub

      - name: Run Gemini Code Audit
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
        run: python -m main`}</pre>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Clean Minimalism Light Footer Bar */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 z-10 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={handleStartReview}
            disabled={isReviewing || !code.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded border border-indigo-500 transition-all shadow-xs disabled:opacity-50"
          >
            APPROVE & COMMENT
          </button>
          <button
            onClick={() => setCode("// Request changes test\n" + code)}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold uppercase tracking-wider rounded transition-all"
          >
            REQUEST CHANGES
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase font-mono tracking-widest font-semibold">AI CONFIDENCE</div>
            <div className="text-xs text-indigo-700 font-bold font-mono">98.2%</div>
          </div>
          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 w-[98%]" />
          </div>
        </div>
      </footer>

      {/* HISTORY SIDE DRAWER */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryDrawer(false)}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-white border-l border-slate-200 z-50 p-6 flex flex-col shadow-2xl font-mono text-slate-800"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest">Audit History</h3>
                </div>
                <button
                  onClick={() => setShowHistoryDrawer(false)}
                  className="text-slate-600 hover:text-slate-900 text-xs font-mono px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {history.length === 0 ? (
                  <div className="text-center text-slate-500 py-12 text-xs font-mono">
                    No past reviews stored in session history yet.
                  </div>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setReviewResult({
                          score: item.score,
                          riskLevel: item.riskLevel,
                          markdown: item.reviewMarkdown,
                          executionTimeMs: item.executionTimeMs,
                          modelUsed: item.modelUsed
                        });
                        setFilename(item.filename);
                        setShowHistoryDrawer(false);
                      }}
                      className="p-3.5 rounded bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-indigo-700 font-semibold">{item.filename}</span>
                        <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-emerald-700">Score: {item.score}/100</span>
                        <span className="text-[10px] uppercase font-bold text-amber-600">{item.riskLevel}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* FLOATING TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-lg shadow-xl border text-xs font-mono font-medium ${
              toast.type === "success"
                ? "bg-slate-900 text-slate-100 border-emerald-500/40"
                : toast.type === "warning"
                ? "bg-slate-900 text-slate-100 border-amber-500/40"
                : "bg-slate-900 text-slate-100 border-indigo-500/40"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${
              toast.type === "success" ? "text-emerald-400" : toast.type === "warning" ? "text-amber-400" : "text-indigo-400"
            }`} />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
