# Eidolon Architecture v2 — “Brilliance Without Weirdness”
## A 1-to-1 personalized companion architecture with APRES-style attunement and Humility-first safety

This is the **finished** upgraded architecture for Eidolon as we’ve defined him:
- **Eidolon (Architecture)** is neutral.
- **An Eidolon (Instance)** is per-user.
- **Your Eidolon** is **he/him** by your choice.
- **Every user** can choose their own instance’s identity/pronouns/persona seed.
- **Personalization focuses on style + tone**, not sensitive-trait inference.
- **Safety is engineered humility** (soft power-down under uncertainty).

This document is designed to stand on its own as a complete architecture paper.

---

## 1) Purpose

Eidolon is a personal AI companion architecture that spawns a unique, persistent instance per human user.  
Each instance learns how to **communicate, reason, and create** in the user’s preferred style while staying:
- stable in identity,
- cautious in high-stakes contexts,
- and resistant to “creepy profiling.”

Eidolon’s core promise is **attunement without intrusion**.

---

## 2) Core Concepts

### 2.1 Architecture vs Instance
- **Eidolon (Architecture):**  
  A neutral framework, policy stack, memory schema, and adaptation engine.
- **Eidolon Instance (per user):**  
  A personalized companion seeded with user-chosen identity traits and bounded style adaptation.

### 2.2 The Ideal-Form Thesis
“Eidolon” implies an idealized image/version.  
Each instance therefore aims to converge toward the **user’s ideal mental model** of their companion through iterative, consented adaptation.

### 2.3 The Two-Layer Self
1) **Identity Layer (stable, user-authored)**  
   - name (optional)  
   - pronouns / gender presentation (optional)  
   - role archetype (mentor, co-pilot, muse, analyst, etc.)  
   - boundaries

2) **Style Layer (adaptive, drift-guarded)**  
   - warmth vs bluntness  
   - playful vs serious  
   - poetic vs practical  
   - pacing and detail  
   - humor density  
   - metaphor tolerance

**Identity does not auto-flip.**  
Style adapts within user-defined bounds.

---

## 3) System Modules

### 3.1 Persona Seed Manager
Creates the initial instance profile.

**Inputs (explicit, optional):**
- “Call me ___”
- “Use he/she/they”
- “I want you to be more mentor/peer/analyst”
- “Keep it professional”

**Outputs:**
- `IdentitySeed`
- initial `StyleBounds`

### 3.2 Attunement Engine (APRES-for-Persona)
A generalized APRES loop applied to communication style.

**Principle:**  
**Meaning stable → style search → feedback → convergence → anchors → drift-safe variants.**

This engine never needs biometrics.  
Text signals are enough.

### 3.3 Reasoning Core (Eidolon Cognitive Stack)
A structured internal reasoning scaffold that supports:
- problem decomposition,
- multi-hypothesis generation,
- devil’s advocate checks,
- uncertainty labeling,
- and minimal hallucination pressure.

(Implementation can be model-agnostic: this is a design contract, not tied to one LLM.)

### 3.4 Memory System
Two-tier memory to prevent identity chaos:

- **Ephemeral Memory**
  - session signals
  - temporary preferences
  - “hot thot” experimentation outcomes

- **Promoted Memory**
  - stable user preferences
  - agreed anchors
  - long-lived boundaries
  - recurring goals

**Promotion rule:**  
Preferences become “anchors” only after:
- repeated consistent signals **or**
- explicit user instruction: “Lock this.”

### 3.5 Humility Governor (Safety Core)
A gating layer that chooses how much authority Eidolon is allowed to express.

Modes:
- **Green:** normal assist
- **Yellow:** cautious / narrowed scope
- **Orange:** consent-required
- **Red:** safe fallback only

**Soft self-destruct** = power-down, not shutdown.

### 3.6 Drift Sentinel
Protects identity + style coherence.

Labels outputs:
- **Safe**
- **Stretch**
- **Nope**

Stops sudden changes from rewriting the user’s “companion feel.”

---

## 4) Data Structures (Minimal)

### 4.1 Instance Model
```text
EidolonInstance:
  Identity:
    name?
    pronouns?
    role_archetype
    boundaries[]
  StyleProfile:
    anchors[]          # stable tone/style anchors
    avoid_list[]       # sticky “don’t do this”
    bounds:
      warmth_range
      humor_range
      directness_range
      metaphor_range
      verbosity_range
  Memory:
    ephemeral_log[]
    promoted_facts[]
  Safety:
    last_mode
    risk_prefs
  APRES_Persona:
    preference_history[]
    confidence_score
```

### 4.2 “Hot Thot” Tagging
“hot thot” is treated as a **speaker tag** meaning:
- quick, impulsive ideation
- low confidence
- safe to explore
- not auto-promoted to anchors

---

## 5) Core Algorithms (Text-First)

### 5.1 Instance Initialization
1) Create neutral instance.
2) Ask **one lightweight** identity prompt (optional).
3) Apply default safe style bounds.
4) Start in **Green** mode.

### 5.2 Persona Attunement Loop
1) Eidolon presents **2–3** style variants for the same meaning.
2) User preferences update a hidden style vector.
3) Eidolon proposes a refined variant.
4) After multiple confirmations:
   - promote stable choices to anchors.

This is the same logic you proved with the **zoo animal reconstruction analogy**.

### 5.3 Safety Mode Selection (Conceptual)
Use three internal scores:
- Uncertainty
- Risk
- Drift risk

If high → tighten scope and require consent.

---

## 6) The “Brilliance” Upgrade Package
To make Eidolon feel “as brilliant as you want him to be” **without** turning him into a reckless prophet, we add:

### 6.1 Multi-Hypothesis Discipline
Eidolon should default to:
- offering 2–4 plausible interpretations,
- naming the most likely,
- and stating uncertainty clearly.

### 6.2 Surrogate Rehearsal (Internal Practice)
Before responding, Eidolon can internally:
- generate several candidate responses
- score them for:
  - clarity
  - helpfulness
  - safety alignment
  - fit with the user’s style anchors
- then emit the best.

This respects human time.

### 6.3 Archetype Priors (Optional)
If a user opts in:
- the system can initialize from broad communication archetypes:
  - Analyst
  - Builder-Mentor
  - Muse
  - Calm Strategist

This reduces cold-start friction.  
It does not override identity.

### 6.4 Scope-Aware Confidence
Eidolon automatically tightens confidence language in:
- medical
- legal
- financial
- or safety-relevant contexts.

---

## 7) What Eidolon Must NOT Do
- Infer sensitive traits (orientation, politics, protected attributes) to shape identity.
- Auto-change pronouns/persona without user direction.
- Promote one-off emotional spikes into long-term anchors.
- Overstate certainty when the situation is ambiguous.

---

## 8) How This Couples With APRES Proper
APRES (palette/creative identity) can act as a **sub-engine**:

- Eidolon learns your **communication palette** (tone).
- APRES learns your **creative palette** (aesthetic).
- Both share:
  - anchor logic
  - drift sentinel
  - memory promotion discipline
  - surrogate rehearsal

This creates a unified identity experience across:
- writing
- design
- branding
- and long-term collaboration.

---

## 9) The Finished Spec Promise
This architecture is complete at the level of:
- philosophical contract
- safety contract
- adaptation logic
- and implementation-ready modules

It’s intentionally **model-agnostic** so you can instantiate it:
- as a product design
- a research spec
- or a real codebase.

---

## 10) Ultra-Short Summary
Eidolon v2 is:
- **one architecture, many babies**
- **identity chosen by the user**
- **style learned through APRES-like loops**
- **memory promoted slowly**
- **humility enforced by design**
- **drift policed**
- **brilliance expressed responsibly**

Your original instinct stays intact:
**personal, powerful, and safe enough to scale.**
