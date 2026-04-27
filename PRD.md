# Dumb Council — Product Requirements Document

## Overview

**Dumb Council** is a web app where users submit any question and watch a panel of AI agents with absurd personas debate it live in a simulated council chamber. Three rounds of cross-referencing debate conclude with an AI Judge declaring a winner. The irony is the feature — the debate is completely useless, and everyone knows it.

Built for the Google HQ reverse-psychology hackathon. The goal is a polished overimplementation of a fundamentally stupid idea.

---

## Goals

- Ship a working, demo-able product in 5 days
- Make the absurdity feel intentional and polished, not sloppy
- Live-streamed debate with genuine agent-to-agent cross-referencing
- Shareable session replays

## Non-Goals

- Solving real problems
- User accounts or persistent history
- Mobile-native app
- Multi-user / multiplayer sessions

---

## How It Works

1. User lands on the app and enters any question (e.g. "Is water healthy?")
2. The Council convenes — 5 agents with fixed personas are seated
3. **Round 1**: Each agent delivers their opening argument
4. **Round 2**: Each agent responds to at least one other agent's point by name, expanding their position
5. **Round 3**: Each agent delivers a closing statement, referencing the full debate
6. **The Judge** reviews all arguments and delivers a verdict — one winner, with a brief absurd rationale
7. A shareable link to the session replay is generated

---

## Agent Personas

All 5 agents are permanent council members, present for every debate.

| Agent | Title | Personality |
|---|---|---|
| **Senator Alarmus** | Minister of Catastrophe | Treats every question as an imminent global extinction event |
| **Professor Pedanticus** | Chair of Overcitation | Cites made-up studies and journals to support any position |
| **Lord Contrarius** | Duke of Opposition | Reflexively opposes the previous speaker regardless of content |
| **Dame Doomsday** | Secretary of Inevitable Decline | Agrees with catastrophe but adds bureaucratic process requirements |
| **Sir Technobro** | Chief Disruption Officer | Proposes a blockchain/AI startup solution to every problem |

**The Judge**: *Chief Justice Verdictus* — delivers a final ruling with faux gravitas, picking a winner and briefly explaining why in the most convoluted way possible.

---

## Debate Mechanics

### Structure
- **3 rounds**, each round = all 5 agents speak once
- **Round 1** — Opening arguments (respond to the question)
- **Round 2** — Rebuttals (must reference at least one other agent by name and counter their point)
- **Round 3** — Closing statements (synthesize the debate, make a final appeal)
- **Judgment** — Judge reviews all 3 rounds and declares a winner

### Cross-Referencing
Agents receive the transcript of all prior turns in context. They are instructed to call out other agents by name and directly address or refute specific claims made. This is what makes the debate feel live and interconnected.

### Streaming
Each agent turn streams token-by-token to the frontend via Server-Sent Events (SSE). The next agent begins only after the previous one finishes (sequential, not parallel), so the debate feels like a real back-and-forth.

---

## UI / UX

### Visual Direction
**Formal but chaotic.** Think a crumbling parliament that still insists on procedural decorum. Clean layout, serious typography — but the content is unhinged. The tension between the form and the content *is* the joke.

### Key Screens

#### Landing Page
- Large prompt input: "Bring your question before the Council"
- Submit button: "Convene the Council"
- Minimal, dry, slightly ominous

#### Council Chamber (main view)
- 5 agent cards arranged in a council arc/semicircle layout
- Each card shows: agent name, title, avatar/icon
- Active speaker is visually highlighted (glowing border, raised card, etc.)
- Streaming text appears below the active agent's card
- Round indicator visible (Round 1 / 2 / 3 → Judgment)
- Transcript panel on the side or below — scrollable full debate history

#### Judgment Screen
- Judge enters (animation or visual cue)
- Judgment streams in with gravitas
- Winner is announced with a highlight
- Share button appears: copies a link to replay this session

#### Replay View
- Same council chamber layout, but pre-loaded — plays back the stored debate
- No streaming, just rendered text

### Tone Notes
- All UI copy should be formal, procedural, dry
- Error states should also be in-universe ("The Council cannot convene at this time. A quorum has not been reached.")

---

## Tech Architecture

### Frontend
- **React** (Vite or Next.js)
- SSE consumer — renders streamed tokens per agent turn
- State machine for debate phases: `idle → round1 → round2 → round3 → judgment → complete`

### Backend
- **Node.js** (Express or Fastify)
- Orchestrates debate turn order
- Maintains full transcript in memory per session
- Streams each agent turn via SSE to the frontend
- Calls Gemini via **backboard.io** for each agent turn

### AI Infrastructure
- **Google Gemini** as the model provider via **backboard.io** (`llm_provider: "google"`)
- **Base URL:** `https://app.backboard.io/api` — auth via `X-API-Key` header

#### Setup (once at server startup)
1. Create **6 assistants** (POST `/assistants`) — one per agent + Judge, each with their persona as `system_prompt`
2. Store the 6 `assistant_id` values in server config/env

#### Per debate session
1. Create **1 thread per assistant** (POST `/assistants/:id/threads`) — 6 threads total
2. Store thread IDs in the session object (in-memory, keyed by session UUID)

#### Per agent turn
- POST `/threads/:thread_id/messages` with:
  - `content`: question + full transcript so far + round instruction
  - `stream: "true"` — response is SSE
  - `llm_provider: "google"`, `model_name: "gemini-2.0-flash"` (or latest flash)
  - `memory: "off"` — context is passed explicitly via transcript; no cross-session memory needed
- SSE event types:
  - `content_streaming` → `event.content` chunk → forward to frontend
  - `run_ended` → turn complete, trigger next agent

#### Judge turn
- Same as agent turn but sent to the Judge's thread
- `content` includes the full 3-round transcript + instruction to declare a winner with rationale

### Session / Sharing
- Each session gets a UUID on creation
- Full debate transcript stored in memory (or flat file / Redis if needed for replay)
- Shareable URL: `/session/:uuid` renders the replay view
- No auth, no user accounts

### No Database
- Sessions live in-memory or written to a temp file
- Acceptable for hackathon scope — sessions are ephemeral

---

## 5-Day Plan

| Day | Focus |
|---|---|
| **Day 1** | Repo setup, backend scaffold, backboard.io + Gemini integration, first agent turn working |
| **Day 2** | Full debate orchestration — all 5 agents × 3 rounds, cross-referencing, Judge turn |
| **Day 3** | Frontend — council chamber UI, SSE streaming, active speaker highlighting |
| **Day 4** | Polish — animations, share link, replay view, error states, in-universe copy |
| **Day 5** | Buffer — bug fixes, demo prep, final QA |

---

## Success Criteria (Hackathon Demo)

- [ ] User submits a question and watches the full debate stream live
- [ ] Agents visibly reference each other's arguments
- [ ] Judge delivers a verdict
- [ ] Share link works and loads a replay
- [ ] The demo gets a laugh (primary KPI)
