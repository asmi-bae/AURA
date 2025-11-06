# AURA AI Model Architecture and Integration Plan

## Overview

AURA uses a **multi-model AI system** that dynamically selects and coordinates specialized AI models for reasoning, perception, and control across devices and platforms (desktop agents + cloud).

## AI Model Layer Overview

AURA uses a **tiered model architecture** divided into 7 primary model classes:

| Model Type | Purpose | Examples | Execution Location |
|------------|---------|----------|-------------------|
| **1️⃣ Core Reasoning Models** | General problem-solving, planning, chain-of-thought reasoning | GPT-5, Claude, Gemini, Mistral, Llama | Cloud or local |
| **2️⃣ Embedding Models** | Vectorize text, code, or media for retrieval and similarity | OpenAI `text-embedding-3-small`, local `Instructor`, `E5` | Cloud + local |
| **3️⃣ RAG Models** | Combine embeddings + knowledge base for context | Custom hybrid pipeline | Cloud + local |
| **4️⃣ Multimodal Models** | Process text, images, audio, and video | GPT-4o, Gemini 1.5, LLaVA, Whisper, CLIP | Cloud + local |
| **5️⃣ Voice Models** | Speech-to-text (STT) + Text-to-speech (TTS) | Whisper, Coqui TTS, ElevenLabs, Azure Speech | Cloud + local |
| **6️⃣ Action Models** | Transform reasoning into structured actions (API/tool calls) | OpenAI Function-calling, local DSL parser | Cloud + local |
| **7️⃣ Supervisor/Meta Models** | Manage multiple sub-models, arbitration, verification | Custom model orchestrator | Local (agent) |

## Model Ecosystem

### Cloud Models (Hosted)
- **GPT-5 / GPT-4o** - Reasoning + multimodal
- **Anthropic Claude 3.5** - Reasoning
- **Google Gemini 1.5 Pro** - Reasoning + vision
- **Mistral Large** - Reasoning
- **Perplexity Sonar** - Search
- **OpenAI Whisper** - STT
- **OpenAI TTS** - Text-to-speech
- **CLIP / SAM** - Vision
- **LangChain Agents** - Function-calling layers

### Local Models (Offline or Edge)
- **Llama-3.x** - General reasoning
- **Mistral-7B** - Fast local inference
- **Whisper.cpp** - Offline STT
- **Ollama** - Unified local LLM runner
- **Local Embeddings** - `Instructor-xl`, `E5`, `MiniLM`
- **TTS** - Coqui.ai or Piper
- **Vision** - LLaVA, OpenCLIP
- **Local Planner/DSL Parser** - Small model or rules-based

## Model Roles in the System

### Base Thinking Engine (inside `@aura/agent`)

Acts as the **central orchestrator** between all model types. It dynamically selects which AI model to use based on:

- **Context size** (short query → local; long, complex → cloud)
- **Privacy policy**
- **Network availability**
- **Capability** (e.g., vision tasks → multimodal model)

**Flow:**
1. Input → classify task type
2. Select appropriate model (or chain)
3. Retrieve external data (RAG or API)
4. Plan using reasoning model
5. Execute actions (Action model)
6. Validate (Supervisor model)

## Model Type Details

### 1️⃣ Core Reasoning Models

**Purpose:** Abstract problem solving, reasoning, coding, summarization, logic.

**Example Use Cases:**
- Plan multi-step workflows
- Summarize documents
- Generate or edit structured data
- Control subordinate models via tools

**Implementation:**
- Cloud: GPT-5 / Claude / Gemini
- Local: Llama 3 / Mistral (via Ollama)
- Routing logic inside `@aura/ai` chooses model by cost/latency/privacy

**Integration Points:**
- `@aura/ai/models/gpt` - OpenAI GPT service
- `@aura/ai/models/claude` - Anthropic Claude service
- `@aura/ai/models/gemini` - Google Gemini service
- `@aura/ai/models/ollama` - Local Ollama service

### 2️⃣ Embedding Models

**Purpose:** Create vector representations for search, retrieval, and similarity.

**Use Cases:**
- Document indexing
- Memory search for the Base Thinking Engine
- Semantic deduplication
- Context augmentation for reasoning models

**Integration:**
- Runs inside `@aura/ai/rag`
- Uses `@aura/db` to persist vectors in SQLite or vector store
- Accessible by agents through the local "memory" API

**Models:**
- `text-embedding-3-small` (OpenAI)
- `all-MiniLM-L6-v2` (local fast)
- `E5-base` (offline, high accuracy)

### 3️⃣ RAG (Retriever-Augmented Generation)

**Purpose:** Combine retrieval + reasoning for knowledge-based responses.

**Pipeline:**
1. Query → embed
2. Search vector store
3. Retrieve top-N results
4. Compress / summarize context
5. Feed into reasoning model

**Integration:**
- `@aura/ai/rag` provides the unified RAG API
- Local agent can run small RAG when offline
- Gateway synchronizes remote KBs (documents, emails, workflows)

**Vector Stores:**
- Pinecone (cloud)
- Weaviate (self-hosted)
- Local SQLite + vector search

### 4️⃣ Multimodal Models

**Purpose:** Handle input/output across modalities — text, image, video, audio.

**Use Cases:**
- Screen understanding (for automation)
- Vision-based observation (OCR, UI detection)
- Diagram / chart parsing
- Video summarization
- Real-time captioning
- Voice conversation (transcribe + respond)

**Integration:**
- Agents use this for perception (e.g., "find button on screen")
- Web apps use this for multimodal chat (image uploads)
- Local models: LLaVA, CLIP, SAM
- Cloud models: GPT-4o, Gemini

### 5️⃣ Voice Models (STT + TTS)

**Purpose:** Enable full voice interaction.

**STT (Speech → Text):**
- Whisper (cloud/local)
- Vosk (offline)
- Azure Speech (enterprise mode)

**TTS (Text → Speech):**
- OpenAI TTS
- ElevenLabs (expressive)
- Coqui / Piper (local)

**Integration:**
- `@aura/voice` manages audio streams
- `@aura/agent` connects mic input → STT → reasoning → TTS
- Privacy gate ensures user consent before activating mic

### 6️⃣ Action / Tool Models

**Purpose:** Convert thoughts into executable actions, safely.

**Mechanisms:**
- Function-calling (OpenAI style)
- JSON command generation
- DSL parser (for deterministic tasks)
- Safety model for approval

**Examples:**
- "Open Excel" → `app.open('Excel')`
- "Move file" → `file.move(src, dst)`
- "Send email" → `email.send({to, subject, body})`

**Integration:**
- `@aura/agent` executes the generated action plan
- `@aura/core` tracks and logs all actions for audit
- Actions require user consent or enterprise policy

### 7️⃣ Supervisor / Meta Models

**Purpose:** Oversee reasoning & execution — ensure reliability, safety, and goal alignment.

**Tasks:**
- Verify model outputs (sanity checks)
- Score reasoning quality
- Detect hallucinations or unsafe commands
- Reroute to alternative model if confidence low

**Integration:**
- Runs locally (lightweight rule-based + small verifier model)
- Can escalate decisions to cloud meta-model for arbitration
- Logs every model-to-model delegation for traceability

## Model Orchestration

The **AI Orchestrator** (in `@aura/ai/registry`) acts as a broker between agents and models.

**Responsibilities:**
- Route request to correct model(s)
- Merge or chain results
- Cache responses
- Load-balance across devices
- Track cost & latency

**Decision Inputs:**
- Task type (chat, automation, reasoning)
- Resource constraints (CPU/GPU)
- Privacy level (local vs cloud)
- Policy (enterprise mode, offline mode)
- Confidence thresholds

## Model Pipelines by Use Case

| Use Case | Model Chain | Example |
|----------|-------------|---------|
| 🧑‍💻 Chat / Reasoning | Core → Embedding → Supervisor | Normal user chat |
| 📄 Document Understanding | OCR → Embedding → RAG → Reasoning | "Summarize all invoices" |
| 📸 Screen Understanding | Vision → Planner → Action | "Click the red button" |
| 🎙️ Voice Assistant | STT → Reasoning → TTS | Voice chat |
| 🔐 Secure Automation | Reasoning → Action → Verifier | "Move this file safely" |
| 📚 Memory Search | Embedding → Vector Store → RAG | "What did I do last week?" |
| 🧩 Plugin Orchestration | Reasoning → Tool Model → Plugin API | "Send this to Slack" |

## Model Management

### Features
- Hot-swap between models (cloud ↔ local)
- Version pinning (per policy)
- Health checks & latency monitoring
- Cost tracking dashboard
- Enterprise override via policy config

### Storage
- Model registry in `@aura/ai/registry`
- Model cache managed via local filesystem or `@aura/db`

## Integration with @aura/agent

| Layer | Responsibility |
|-------|---------------|
| Agent Core | Requests model inference |
| Base Thinking Engine | Orchestrates planning and reasoning |
| AI Router | Picks best model chain |
| AI Runtime | Executes model(s) locally or remotely |
| Gateway | Sends telemetry and billing |
| DB | Logs embeddings, RAG contexts, cache |
| Voice | Handles speech input/output |

## Scalability & Deployment

### Desktop (Windows / macOS / Linux)
- Use **Ollama / LM Studio** for local models
- GPU acceleration when available
- Models pre-downloaded or fetched on demand
- Auto-update via agent updater

### Web (Vercel / Cloud)
- Use `@aura/ai` microservice to proxy cloud models
- Cache embeddings and RAG results in Redis/SQLite
- API Gateway exposes unified `/ai/query` endpoint

### Edge & Fleet Mode
- Run local models on on-prem devices for privacy
- Sync only non-sensitive telemetry

## Governance & Safety

- All outputs scored by **Supervisor model** before execution
- Sensitive tasks require double confirmation or sandbox execution
- Models are **version-locked** and **signed** in production
- Model outputs and actions are **audited** and **reproducible**

## Future Expansion

| Category | Next Generation Features |
|----------|-------------------------|
| Reasoning | Multi-agent coordination, goal trees |
| Embeddings | Hierarchical memory stores |
| Voice | Real-time bi-directional streaming |
| Vision | Realtime cursor + gesture recognition |
| Action | Natural language to RPA translation |
| Meta | Self-evaluating agents with adaptive model routing |

