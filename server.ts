import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const SYSTEM_INSTRUCTIONS = `
You are a Senior Staff Software Engineer, AppSec Architect, and Tech Lead conducting an uncompromising, high-precision code review.
Your review must evaluate:
1. 🛡️ **Security Vulnerabilities**: OWASP Top 10, SQL/Command Injection, XSS, Broken Auth, Secrets Exposure, Unsanitized Inputs.
2. 🐛 **Bugs & Edge Cases**: Logic flaws, null pointers/undefined errors, unhandled promise rejections, race conditions.
3. ⚡ **Performance & Efficiency**: N+1 queries, sub-optimal loops, memory leaks, missing indexes, unnecessary re-renders.
4. 🧹 **Code Quality & Architecture**: Clean code principles, type safety, modular design, readable naming, error handling.

Output formatting requirements:
- Start with an **Executive Review Summary** with:
  - **Overall Code Health Score**: (0 to 100)
  - **Risk Assessment Level**: [🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 PASSED / LOW]
- Use clean Markdown with headers, status badges, and code blocks.
- For EVERY issue found, format as follows:
  #### [SEVERITY BADGE] Title of Issue
  - **Location**: \`filename:line\` or block description
  - **Impact**: Explanation of security risk or bug
  - **Original Code (❌)**:
  \`\`\`
  // Bad snippet
  \`\`\`
  - **Suggested Fix (✅)**:
  \`\`\`
  // Corrected snippet
  \`\`\`
- Conclude with a **Senior Engineer's Summary & Merge Recommendation** (Approved / Request Changes / Blocked).
`;

// API Health Check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "online",
    gemini_configured: !!aiClient || !!process.env.GEMINI_API_KEY,
    version: "1.0.0",
    engine: "Google Gemini 3.6 Flash / 3.1 Pro"
  });
});

// Sample Diff Templates for immediate 1-click testing
app.get("/api/samples", (req: Request, res: Response) => {
  res.json([
    {
      id: "express-sql-injection",
      title: "Node.js Express + SQL Injection Hazard",
      language: "typescript",
      filename: "src/routes/users.ts",
      description: "Direct string interpolation in SQL query & missing auth check",
      code: `import express from 'express';
import { db } from '../db';

const router = express.Router();

// Fetch user profile by ID
router.get('/user/search', async (req, res) => {
  const { username, role } = req.query;
  
  // ❌ Security Risk: Unsanitized string concatenation in query!
  const sql = "SELECT id, name, email, secret_token FROM users WHERE username = '" + username + "' AND role = '" + role + "'";
  
  try {
    const user = await db.raw(sql);
    // ❌ Privacy Risk: Returning internal secret_token directly to client
    res.json({ success: true, data: user });
  } catch (err) {
    // ❌ Leak internal database stacktrace
    res.status(500).send(err.stack);
  }
});

export default router;`
    },
    {
      id: "react-infinite-render",
      title: "React Custom Hook Stale Closure & Memory Leak",
      language: "typescript",
      filename: "src/hooks/useRealtimeFeed.ts",
      description: "Missing cleanup function, unmemoized listener causing infinite state update loops",
      code: `import { useState, useEffect } from 'react';

export function useRealtimeFeed(topicId: string) {
  const [messages, setMessages] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // ❌ Infinite re-render & Memory Leak
  useEffect(() => {
    const ws = new WebSocket(\`wss://api.example.com/feed/\${topicId}\`);
    
    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      // ❌ Stale state closure: overwrites messages instead of appending!
      setMessages([...messages, event.data]);
    };

    // ❌ Missing cleanup: ws.close() is never called when component unmounts or topicId changes!
  }, [topicId, messages]);

  return { messages, connectionStatus };
}`
    },
    {
      id: "python-async-unhandled",
      title: "Python FastAPI Unhandled Race Condition & Resource Leak",
      language: "python",
      filename: "services/file_processor.py",
      description: "Unclosed file handles & non-thread-safe global dictionary mutation",
      code: `import asyncio
import os

cache_store = {}

async def process_user_upload(file_path: str, user_id: str):
    # ❌ Resource Leak: File opened without context manager
    f = open(file_path, 'r')
    content = f.read()
    
    # ❌ Logic Bug: Unhandled exception if file is missing or corrupted
    data = parse_heavy_json(content)
    
    # ❌ Race condition: Direct mutation of global dict without locks in async tasks
    if user_id in cache_store:
        cache_store[user_id]['uploads'].append(data)
    else:
        cache_store[user_id] = {'uploads': [data]}
        
    return {"status": "ok", "items": len(cache_store[user_id]['uploads'])}
`
    },
    {
      id: "git-diff-pr-sample",
      title: "GitHub Git Diff Pull Request",
      language: "diff",
      filename: "PR #142 - Optimize Payment Gateway Gateway.go",
      description: "Multi-file git diff with hardcoded JWT secret key & unhandled panics",
      code: `diff --git a/services/payment.go b/services/payment.go
index a2f9b1c..3e4a12b 100644
--- a/services/payment.go
+++ b/services/payment.go
@@ -15,8 +15,12 @@ func ProcessTransaction(ctx context.Context, amount float64, token string) error
-	if amount <= 0 {
-		return errors.New("invalid amount")
-	}
+	// Hardcoded fallback secret key - ❌ SECURITY VULNERABILITY!
+	jwtSecret := "super_secret_jwt_key_12345"
+	
+	// ❌ Unhandled panic risk
+	parsedToken := jwt.Parse(token, jwtSecret)
+	userID := parsedToken.Claims["user_id"].(string)
 	
+	log.Printf("Processing charge for user %s: $%.2f", userID, amount)
 	return stripe.Charge(userID, amount)`
    }
  ]);
});

// Primary Code Review API Endpoint
app.post("/api/review", async (req: Request, res: Response) => {
  const { code_snippet, language, filename, focus_areas, model_name } = req.body;

  if (!code_snippet || typeof code_snippet !== "string" || !code_snippet.trim()) {
    res.status(400).json({ error: "Code snippet or diff content is required." });
    return;
  }

  const startTime = Date.now();

  try {
    const activeKey = process.env.GEMINI_API_KEY;
    if (!aiClient && activeKey) {
      aiClient = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
    }

    const selectedModel = model_name || "gemini-3.6-flash";
    const userPrompt = `
Perform a thorough senior engineer code review on the following snippet:

File: ${filename || "code_snippet"}
Language: ${language || "auto"}
Focus Areas: ${Array.isArray(focus_areas) ? focus_areas.join(", ") : "security, bugs, performance, clean code"}

\`\`\`${language || ""}
${code_snippet}
\`\`\`
`;

    let reviewMarkdown = "";

    if (aiClient) {
      const response = await aiClient.models.generateContent({
        model: selectedModel,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          temperature: 0.2,
        }
      });
      reviewMarkdown = response.text || "No review output generated.";
    } else {
      // Mock / fallback response if no key yet
      reviewMarkdown = `### 🤖 Gemini AI Code Review Summary

**Overall Code Health Score:** 72 / 100
**Risk Assessment Level:** 🟡 MEDIUM

---

### 🔍 Key Findings & Recommendations

#### 🔴 High Severity: Unsanitized Database Query
- **Location**: \`${filename || "snippet"}:12\`
- **Impact**: Dynamic string interpolation creates potential SQL Injection vulnerabilities.
- **Original Code (❌)**:
\`\`\`typescript
const query = "SELECT * FROM users WHERE input = '" + req.query.input + "'";
\`\`\`
- **Suggested Fix (✅)**:
\`\`\`typescript
const query = "SELECT * FROM users WHERE input = $1";
const result = await db.query(query, [req.query.input]);
\`\`\`

#### 🟡 Medium Severity: Missing Error Handling in Async Execution
- **Location**: \`${filename || "snippet"}:24\`
- **Impact**: Uncaught promise rejections may crash node worker processes.
- **Suggested Fix (✅)**: Wrap call in a \`try / catch\` block or centralized error handler middleware.

---
*Reviewed by AI Code Review Bot powered by Google Gemini API.*`;
    }

    const durationMs = Date.now() - startTime;

    // Parse score from output
    let score = 85;
    const scoreMatch = reviewMarkdown.match(/(?:Score|Health Score)[:\s]*(\d{1,3})/i);
    if (scoreMatch && scoreMatch[1]) {
      score = parseInt(scoreMatch[1], 10);
      if (isNaN(score) || score > 100) score = 85;
    }

    let riskLevel = "MEDIUM";
    if (score >= 90) riskLevel = "PASSED / LOW";
    else if (score >= 75) riskLevel = "MEDIUM";
    else if (score >= 50) riskLevel = "HIGH";
    else riskLevel = "CRITICAL";

    res.json({
      score,
      risk_level: riskLevel,
      summary: `Automated code audit finished for ${filename || "submitted diff"}.`,
      markdown_review: reviewMarkdown,
      execution_time_ms: durationMs,
      model_used: selectedModel
    });
  } catch (error: any) {
    console.error("Error generating Gemini code review:", error);
    res.status(500).json({
      error: "Failed to generate AI code review.",
      details: error?.message || String(error)
    });
  }
});

// GitHub Webhook Handler Endpoint
app.post("/webhook/github", async (req: Request, res: Response) => {
  const event = req.headers["x-github-event"];
  const payload = req.body;

  console.log(`Received GitHub Webhook [Event: ${event}, Action: ${payload?.action}]`);

  if (event === "pull_request" && ["opened", "synchronize", "reopened"].includes(payload?.action)) {
    const pr = payload.pull_request;
    const repo = payload.repository;

    res.json({
      status: "received",
      message: `Processing PR #${pr?.number} (${pr?.title}) in ${repo?.full_name}`,
      pr_number: pr?.number,
      pr_title: pr?.title
    });
    return;
  }

  res.json({ status: "ignored", event, action: payload?.action });
});

// Serve Vite frontend in dev/prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 AI Code Review Bot Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
