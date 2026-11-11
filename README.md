# 🎯 PresentPro — AI Presentation Coach

> **TIET Campus Suite (TIET Patiala) —**  
> **Concept:** The AI presentation coach that sees *HOW* you speak, not just what you say.  
> **Zero API Keys:** Everything runs 100% client-side via in-browser WASM and browser APIs. Completely offline-capable, zero latency, and zero data leaves your machine.

---

## ⚡ Direct Competitive Advantage vs. Audio-Only Speech Tools

Audio-Only Speech Tools only processes audio speech recognition to estimate words-per-minute and print a transcript. **PresentPro completely outperforms Audio-Only Speech Tools by introducing multi-modal computer vision:**

| Feature | **PresentPro (Our Project)** | **Standard Audio Speech Tools** | ---|---|---| **Facial Gaze & Eye Contact** | ✅ **MediaPipe Iris WASM** (tracks eye angle & audience focus in real time) | ❌ Audio only — cannot see speaker | **Volume & Projection Stability** | ✅ **Web Audio API RMS Analyser** (detects trailing off or mumbling) | ❌ None | **Pause Quality Flow** | ✅ **Millisecond pause interval analysis** (natural pauses vs rushed runs) | ❌ None | **Filler Word Detection** | ✅ **Real-time highlighting** with timestamps ("um", "uh", "like", "basically") | ⚠️ Basic text matching | **Lexical Diversity (TTR)** | ✅ **Type-Token Ratio** evaluating vocabulary richness | ❌ Basic word counter | **Visual Diagnostic Radar** | ✅ **Recharts 6-axis Radar Chart & SVG animated gauges** | ❌ Flat text score | **Privacy & Cloud Reliance** | ✅ **100% In-Browser WASM / Zero API Keys** | ⚠️ Relies on cloud APIs / uploads audio |

---

## 🔬 The 6 Multimodal Metrics

1. **Iris Eye Contact Ratio (22% weight):**  
   Uses `@mediapipe/tasks-vision` client-side WASM to track 478 3D facial landmarks, specifically measuring iris offset against eye corners and head yaw.
2. **Filler Word Interceptor (20% weight):**  
   Monitors speech stream for verbal crutches (`um`, `uh`, `like`, `basically`, `actually`, `you know`, `literally`) with timestamped instances.
3. **Pace Calibration (20% weight):**  
   Measures Words Per Minute (WPM) calibrated directly to the TED-talk sweet spot of 130–150 WPM.
4. **Pause Quality & Flow (14% weight):**  
   Measures natural breathing and rhetorical pauses (0.8s–1.8s) vs. rushed breathless delivery.
5. **Volume Consistency (12% weight):**  
   Web Audio API `AnalyserNode` computes Float32 RMS decibel stability across the session, flagging sentence fade-outs.
6. **Vocabulary Diversity (12% weight):**  
   Calculates Type-Token Ratio (TTR = unique words / total words) to reward vivid verbs and prevent lexical repetition.

---

## 🧠 Rule-Based "Coach Says" Feedback Engine

No expensive or slow LLM API calls are required! PresentPro includes a deterministic coaching engine calibrated against executive speech standards, generating:
- **Key Strengths:** Specific positive affirmations with quantified metrics.
- **Areas for Improvement:** Clear explanations of why looking away or rushing hurts retention.
- **Actionable Steps:** Immediate, concrete rehearsal techniques (e.g., diaphragmatic breathing, gazepoint anchoring).

---

## 🎨 Warm & Approachable Design System

- **Accent Color:** Teal Accent (`oklch(0.60 0.18 190)`)
- **Background:** Light paper texture (`#FAF8F5`)
- **Typography:** Geist font family with high-legibility tabular numbers
- **Animations:** `framer-motion` spring transitions and live reactive SVG gauges

---

## 🚀 Quickstart & Development

### Prerequisites
- Node.js (v18+)
- Modern browser with camera & microphone access (Chrome, Edge, Brave, or Firefox)

### Setup & Run
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd 02-presentpro
npm install
npm run dev
```

### Production Build
```powershell
npm run build
```
Verify zero build errors and exit code 0.

---

## 🧪 Testing Without a Camera / Headless Review

For testing in restricted or headless environments, click the **"Sample 60s Pitch"** button in the header or hero banner. This immediately populates the full 6-metric dashboard, radar chart, interactive transcript, and rule-based coaching feedback!
