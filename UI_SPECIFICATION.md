# Human Frontend Implementation Specification (`UI_SPECIFICATION.md`)

This document is a hand-crafted engineering and design specification created for human frontend developers to build the **AI Code Review Bot UI** from scratch using **React**, **Tailwind CSS**, and **Framer Motion**.

---

## 1. Component Hierarchy & Architecture

The application layout follows a high-density, low-clutter IDE/Terminal grid layout engineered for developer productivity.

```
+---------------------------------------------------------------------------------------------------+
| Top System Status Bar: System Online Indicator | Latency Status | Model Version (Gemini v1.5/3.6) |
+---------------------------------------------------------------------------------------------------+
| Main Navigation Header: Brand Logo | Reviewer Tab | Webhook Simulator Tab | Actions YAML Tab | History |
+---------------------------------------------------------------------------------------------------+
| Toolbar: Sample Presets (1-Click SQLi/XSS) | Focus Areas | Model Selector | [ RUN REVIEW ] Button  |
+--------------------------------------------------+------------------------------------------------+
| LEFT PANEL: Monospaced Code Editor               | RIGHT PANEL: Gemini Analysis Viewer            |
| - Header: ACTIVE_DIFF | Filename & Lang Select   | - Header: GEMINI ANALYSIS | Export / Copy      |
| - Line Numbers & Syntax Glass Area               | - Health Score Badge (e.g., 88/100)            |
| - Laser Scanning Beam Overlay (during loading)   | - Markdown Rendered Issue Findings & Fixes     |
+--------------------------------------------------+------------------------------------------------+
| Footer Action Bar: [ APPROVE & COMMENT ] | [ REQUEST CHANGES ] | AI Confidence Meter (98.2%)        |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Custom Design Tokens & CSS Specification

### Color Palette (Slate Dark Mode & Neon Indigo Accent)
- **Background Canvas**: `#020617` (`bg-slate-950` / `bg-[#020617]`)
- **Container Panel Surfaces**: `rgba(15, 23, 42, 0.6)` (`bg-slate-900/60` with `backdrop-blur-xl`)
- **Borders**: `rgba(255, 255, 255, 0.1)` (`border-white/10`) or `rgba(99, 102, 241, 0.3)` (`border-indigo-500/30`)
- **Primary Accent Button**: `#4f46e5` (`bg-indigo-600`) with glow `shadow-[0_0_15px_rgba(79,70,229,0.4)]`
- **Text Primary**: `#f8fafc` (`text-slate-100`)
- **Text Secondary**: `#94a3b8` (`text-slate-400`)
- **Monospaced Code Text**: Fira Code / JetBrains Mono / Source Code Pro

### Custom CSS Rules (`index.css`)
```css
@import "tailwindcss";

@layer utilities {
  /* Sleek Minimalist Scrollbars */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: rgba(2, 6, 23, 0.5);
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.4);
  }
}
```

---

## 3. Handcrafted Animation & Interaction Rules

### A. Laser Scanning Beam Keyframes (Loading State)
When `isReviewing` is `true`, render a laser scanning line across the code editor area:

```tsx
/* Laser Beam Keyframe CSS */
<motion.div
  initial={{ y: "0%" }}
  animate={{ y: ["0%", "100%", "0%"] }}
  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
  className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(6,182,212,0.9)] z-20 pointer-events-none"
/>
```

### B. Staggered Entrance (Framer Motion)
```tsx
const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" }
  }
};
```

### C. Canvas Confetti Trigger (Passed Audits)
When review completes with a score $\ge 90$:
```tsx
import confetti from "canvas-confetti";

if (score >= 90) {
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#6366f1", "#06b6d4", "#10b981"]
  });
}
```

---

## 4. Starter React Code Shell (`App.jsx` / `App.tsx`)

Human developers can start with this minimal, clean state container and polish the JSX markup manually:

```jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [code, setCode] = useState("// Paste code snippet or git diff here\nfunction sum(a, b) {\n  return a + b;\n}");
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState(null);

  const handleRunReview = async () => {
    if (!code.trim()) return;
    setIsReviewing(true);
    setReviewResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code_snippet: code,
          language: "typescript",
          filename: "index.ts",
          model_name: "gemini-1.5-pro"
        })
      });

      const data = await response.json();
      setReviewResult(data);
    } catch (err) {
      console.error("Review request failed:", err);
    } finally {
      setIsReviewing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-mono flex flex-col">
      {/* HEADER */}
      <header className="h-14 border-b border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-6">
        <span className="text-xs tracking-widest text-slate-400 font-bold uppercase">
          AI CODE REVIEW BOT // GEMINI 1.5 PRO
        </span>
        <button
          onClick={handleRunReview}
          disabled={isReviewing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded border border-indigo-400/50 shadow-[0_0_15px_rgba(79,70,229,0.4)]"
        >
          {isReviewing ? "Scanning..." : "RUN REVIEW"}
        </button>
      </header>

      {/* WORKSPACE GRID */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        {/* CODE EDITOR */}
        <div className="relative rounded-xl border border-white/10 bg-slate-900/60 p-4 flex flex-col">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">INPUT_DIFF</div>
          {isReviewing && (
            <motion.div
              initial={{ y: "0%" }}
              animate={{ y: ["0%", "100%", "0%"] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,1)]"
            />
          )}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full bg-transparent resize-none text-xs font-mono text-slate-200 focus:outline-none"
          />
        </div>

        {/* REVIEW RESULT */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 overflow-y-auto">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">GEMINI_REPORT</div>
          {reviewResult ? (
            <div className="text-xs space-y-4">
              <div className="text-emerald-400 font-bold text-lg">Score: {reviewResult.score} / 100</div>
              <pre className="whitespace-pre-wrap font-sans text-slate-300">{reviewResult.markdown_review}</pre>
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic">Click "RUN REVIEW" to trigger Gemini AI code audit.</p>
          )}
        </div>
      </main>
    </div>
  );
}
```
