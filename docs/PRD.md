# Magic Note — PRD v1

> Owner: Bonnie (PM)
> Date: 2026-04-09
> Status: Draft v1

---

## 1. Product Overview

### 1.1 Product Name
**Magic Note**

### 1.2 One-line Positioning
An AI-powered personal knowledge operating system that helps users capture, organize, understand, review, and retain knowledge across devices.

### 1.3 Vision
Magic Note is not just a note-taking tool. It is a **knowledge growth system** that turns fragmented inputs (screenshots, links, text) into structured, retrievable, learnable, and testable knowledge.

### 1.4 Design Direction
**Harry Potter / wizarding-inspired magical UI**

Visual principles:
- dark magical palette: deep navy / deep purple / gold accents
- parchment / spellbook / constellation-inspired UI motifs
- elegant but readable typography
- immersive but practical for high-frequency daily use

### 1.5 Platform Strategy
**Web App first, delivered as a PWA**

Requirements:
- excellent experience on both **mobile** and **desktop**
- installable to home screen on phone
- responsive layouts, not desktop-shrunk-on-mobile
- same account + same knowledge graph across devices

---

## 2. Target Users

### 2.1 Initial User
- BonnieLee (power user)
- works across multiple platforms and information sources
- wants AI-assisted organization, learning, recall, and self-testing

### 2.2 Future Product Direction
Magic Note should be designed as a **multi-user product from day 1**, even if first launch only has one active user.

This means:
- account system must support multiple users
- knowledge must be isolated per user / workspace
- architecture should support future team / shared spaces
- permissions and data boundaries should be considered early

---

## 3. Problem Statement

Users consume and collect knowledge across many sources every day:
- screenshots
- links
- short text notes
- messages
- documents
- ideas captured on mobile

Current problems:
1. knowledge is fragmented across tools and platforms
2. captured information is not automatically structured
3. stored knowledge is hard to retrieve at the moment of need
4. most note tools help store, but not necessarily help learn
5. users forget what they saved and rarely revisit it effectively
6. there is no strong closed loop from capture → understanding → retention → growth

Magic Note should solve this by building a full loop:

**capture → analyze → organize → retrieve → review → test → grow**

---

## 4. Product Goals

### 4.1 User Goals
Users should be able to:
- quickly save useful knowledge from daily life and work
- understand what they saved through AI-generated analysis
- accumulate knowledge in a structured long-term system
- revisit important knowledge at the right time
- be tested on what matters so knowledge becomes durable
- grow knowledge reserves over time across multiple domains

### 4.2 Business / Product Goals
Magic Note should:
- start as a strong single-user experience
- be architected for multi-user scalability
- support future subscription or SaaS productization
- create differentiation through the combination of:
  - capture
  - AI understanding
  - spaced repetition
  - testing
  - knowledge graphing

### 4.3 Non-Goals for MVP
MVP will not prioritize:
- team collaboration features
- marketplace / social features
- enterprise admin features
- browser extension
- native iOS / Android apps
- complex manual folder systems

---

## 5. Core Product Principles

1. **Low-friction capture**
   - user should be able to throw things in quickly
   - the system should do most of the structuring work

2. **AI should organize, not just summarize**
   - extracting knowledge is more important than producing pretty summaries

3. **Knowledge should become learnable**
   - information capture is not enough; the system must help retention

4. **Multi-domain by design**
   - no rigid preset taxonomy
   - categories should be dynamic and evolve with content

5. **Mobile matters as much as desktop**
   - quick capture on mobile
   - deep review and management on desktop

6. **Magical, but not gimmicky**
   - theme should enhance delight and memorability
   - clarity and usability always win over decoration

---

## 6. MVP Scope

### 6.1 Input Types (MVP)
Magic Note v1 must support three primary input types:

1. **Screenshot upload**
2. **Link save**
3. **Manual text input**

### 6.2 Required Capability for Each Input
Each supported input type must not only be stored, but also **recognized and analyzed**.

#### A. Screenshot
System should:
- run OCR when applicable
- identify visible key content
- infer topic / intent / entities
- generate structured summary
- propose tags and related domains

Examples:
- article screenshot
- diagram screenshot
- social media post screenshot
- product screenshot
- slide screenshot

#### B. Link
System should:
- fetch page content / metadata
- extract title / source / summary
- identify main concepts and actionability
- classify content type (article, tutorial, product page, thread, etc.)
- propose tags and related knowledge

#### C. Manual text
System should:
- parse freeform note input
- identify ideas, facts, tasks, questions, and concepts
- convert note into structured knowledge card
- suggest domain and relationships

### 6.3 MVP Functional Modules

#### 1) Capture Inbox
A unified inbox where users can submit:
- screenshot
- link
- text

Expected experience:
- fast input on mobile
- drag/drop or paste on desktop
- low friction, minimal required fields

#### 2) AI Knowledge Processing
For each new item, Magic Note should automatically generate:
- title
- concise summary
- key concepts
- tags
- domain suggestion
- source metadata
- potential follow-up questions

#### 3) Knowledge Card
Each item becomes a structured knowledge card containing:
- original input
- extracted content
- AI summary
- key insights
- tags / domain
- related cards
- review status

#### 4) Search & Retrieval
Support semantic retrieval so the user can:
- search by keyword
- search by meaning / concept
- browse by domain
- browse by recency / importance / review status

#### 5) Review System
System should support lightweight review workflows:
- new knowledge queue
- needs review queue
- reviewed / mastered status
- daily review list

#### 6) AI Quiz / Recall
MVP should support generating review questions from saved cards:
- short-answer questions
- concept recall prompts
- simple self-check questions

#### 7) Progress View
Basic dashboard showing:
- number of captured items
- reviewed items
- pending review items
- domains accumulated
- recent learning streak / activity

---

## 7. Information Architecture

### 7.1 Top-level Navigation
Recommended IA:

1. **Inbox**
2. **Library**
3. **Review**
4. **Quiz**
5. **Map**
6. **Profile / Settings**

### 7.2 Module Meaning

#### Inbox
- capture new knowledge
- process pending items
- recent incoming items

#### Library
- browse all knowledge cards
- filters: domain / source type / tag / review status

#### Review
- daily review queue
- spaced repetition prompts
- revisit important saved knowledge

#### Quiz
- auto-generated questions
- self-assessment
- weakness tracking

#### Map
- knowledge graph / constellation view
- see clusters and related concepts

#### Profile / Settings
- account
- theme
- notification settings
- review cadence
- AI preferences

---

## 8. Domain Model

Magic Note should support **dynamic domains**, not hardcoded categories only.

### 8.1 Initial Domain Strategy
System behavior:
- AI suggests one or more domains per item
- users may edit / merge / rename domains
- domains evolve over time based on accumulated content

### 8.2 Example Domains
Examples only, not fixed:
- Product
- Technology
- Business
- Writing
- Psychology
- Learning
- Health
- Finance
- AI
- Design

### 8.3 Domain Evolution
Magic Note should support:
- one item belonging to multiple domains
- automatic clustering of similar concepts
- future merge / split of domains without data loss

---

## 9. Learning & Retention Loop

This is the product differentiator.

### 9.1 Learning Loop
1. Capture knowledge
2. AI extracts and structures it
3. User reviews the card
4. System generates recall questions
5. User answers / self-evaluates
6. System schedules future review
7. Knowledge becomes more durable

### 9.2 Review Modes
MVP can support:
- passive review: reread summary and key insights
- active recall: answer a question before revealing answer
- quick confidence rating: easy / medium / hard / forgot

### 9.3 Quiz Modes (MVP)
- What is this concept?
- Why does this matter?
- What are the key takeaways?
- How does this connect to previous knowledge?

---

## 10. Multi-user / Productization Requirements

Since the product must be multi-user from the beginning, the architecture should assume:

### 10.1 Account System
- email or OAuth sign-in
- one user owns one or more knowledge spaces in future
- all content belongs to a user_id from day 1

### 10.2 Data Isolation
- cards, uploads, graph nodes, reviews, and quiz history must all be user-scoped
- no shared index by default

### 10.3 Future Expandability
Potential future expansion:
- shared collections
- mentor / coach mode
- team knowledge spaces
- collaborative learning

---

## 11. UX Requirements

### 11.1 Mobile UX Requirements
Mobile is a first-class experience, not a fallback.

Must support:
- fast screenshot upload
- quick paste / share of links
- simple text capture
- thumb-friendly navigation
- short review sessions
- easy quiz flow
- installable PWA behavior

### 11.2 Desktop UX Requirements
Desktop should be optimized for:
- browsing large libraries
- graph exploration
- deeper reading
- comparing cards
- reviewing clusters of knowledge

### 11.3 Cross-device Continuity
- users should be able to capture on mobile and review later on desktop
- sync must feel seamless

---

## 12. Design Language

### 12.1 Theme Direction
Harry Potter / magical-academia inspired, but legally distinct.

Keywords:
- magical
- scholarly
- immersive
- elegant
- mysterious
- warm intelligence

### 12.2 Visual Motifs
- spellbook / parchment cards
- golden glow accents
- constellation / star map graph views
- magical ink / rune-like subtle motion
- owl / letter / academy metaphors for reminders and review

### 12.3 Usability Constraint
Theme must not hurt:
- readability
- speed
- information density
- accessibility

---

## 13. Suggested MVP Tech Direction

### 13.1 Frontend
- Next.js / React
- PWA support
- responsive-first design system

### 13.2 Backend
- API service for ingestion + AI processing + review scheduling
- support async processing pipeline for images and links

### 13.3 Storage
- relational DB for users / cards / reviews / metadata
- object storage for screenshots/files
- vector search for semantic retrieval
- graph or graph-like relationships for knowledge mapping

### 13.4 AI Pipeline
Need support for:
- OCR / vision for screenshots
- content extraction for links
- summarization / concept extraction
- tagging / clustering
- quiz generation

---

## 14. Success Metrics

### 14.1 Engagement Metrics
- weekly active users
- capture frequency per user
- review completion rate
- quiz completion rate
- D7 / D30 retention

### 14.2 Learning Metrics
- percentage of cards reviewed at least once
- repeated recall performance
- mastery rate trend over time
- domain growth breadth / depth

### 14.3 Product Quality Metrics
- time from input to usable card
- OCR/link extraction success rate
- search success rate
- mobile task completion rate

---

## 15. MVP Milestones

### Milestone 1 — Foundation
- account system
- capture inbox
- screenshot/link/text ingestion
- AI card generation

### Milestone 2 — Knowledge Retrieval
- library view
- semantic search
- tags / domains / related cards

### Milestone 3 — Learning Loop
- review queue
- recall questions
- simple spaced repetition scheduling

### Milestone 4 — Product Polish
- magical UI theme
- mobile PWA polish
- dashboard / progress views

---

## 16. Open Questions

1. What should be the first sign-in method? Email, Google, GitHub, or mixed?
2. Should the first version support notifications/push reminders, or keep reminders in-app only?
3. Should quizzes remain fully AI-generated, or should users also be able to pin important cards into manual study decks?
4. Should links be stored as snapshots for long-term reliability?
5. Should there be a separate “insight” object apart from a card, or keep one unified card model first?

---

## 17. PM Recommendation

Recommended launch strategy:

- Build **Magic Note** as a **multi-user PWA knowledge product** from day 1
- Start with **three high-frequency inputs**: screenshots, links, text
- Make AI processing a core capability, not an add-on
- Prioritize the **learning loop** early, because that is the differentiator
- Treat mobile and desktop as equally important surfaces
- Use magical design language to create strong identity, but keep the UX professional and highly usable

---

## 18. Next Deliverables

After this PRD, recommended next docs are:
1. `IA.md` — page structure and navigation flows
2. `user-stories.md` — user stories + acceptance criteria
3. `design-direction.md` — visual style system and references
4. `tech-architecture.md` — system architecture and data flow
5. `mvp-roadmap.md` — implementation phases and priorities
