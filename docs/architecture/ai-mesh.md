# 🧠 Multi-Tier AI Consensus Mesh

SkyView AG-RIN replaces monolithic LLM dependencies with a resilient **Multi-Tier Model Pool and Consensus Network**. This architecture ensures continuous, highly available agricultural reasoning even during upstream provider rate limits or outages.

---

## 🔀 System-One Decision Router

Every incoming farmer query is first evaluated by the **Decision Router** (`skyview/agents/decision_router.py`), which uses zero-shot intent categorization and confidence scoring:

```mermaid
flowchart TD
    Prompt[Farmer Query Input] --> Router[System-One Decision Router]
    
    Router --> Check1{Intent Category}
    
    Check1 -->|DISEASE_PATHOLOGY| DiseaseAgent[Disease Diagnostics Service]
    Check1 -->|MANDI_PRICE| MandiAgent[Live Mandi Pricing Agent]
    Check1 -->|EQUIPMENT_BARTER| BarterAgent[Marketplace Optimization Agent]
    Check1 -->|AGRONOMY_QA| QA_Agent[General Agronomy Agent]

    subgraph LLM_Pool [Resilient Multi-Provider Pool]
        Provider1[Tier 1: Groq LLaMA 3.3 70B]
        Provider2[Tier 2: Together AI DeepSeek V3]
        Provider3[Tier 3: Google Gemini 1.5 Pro]
    end

    DiseaseAgent --> LLM_Pool
    MandiAgent --> LLM_Pool
    BarterAgent --> LLM_Pool
    QA_Agent --> LLM_Pool

    LLM_Pool --> ConsensusEngine[Output Consensus & Grounding Filter]
    ConsensusEngine --> Response[Final Multilingual Answer]
```

---

## 🛡️ Model Failover Hierarchy

The LLM pool manager (`skyview/utils/llm_pool.py`) maintains real-time health checks on configured API endpoints:

1. **Primary Worker:** Groq Cloud (`llama-3.3-70b-versatile`)
   - Latency target: `< 500 ms`
   - Role: Fast, conversational dialogue in Hindi, Marathi, Telugu, Tamil, and English.
2. **Secondary Worker:** Together AI (`deepseek-ai/DeepSeek-V3`)
   - Latency target: `~1.2 s`
   - Role: Complex graph traversal arbitration for 3-party circular barter loops and fertilizer stoichiometry calculations.
3. **Tertiary Worker:** Google DeepMind Gemini (`gemini-1.5-pro` / `gemini-1.5-flash`)
   - Latency target: `~1.5 s`
   - Role: Multimodal crop pest vision analysis and regional Indian dialect understanding.
4. **Deterministic Local Fallback:**
   - In total network isolation, rule-based agronomic heuristics compiled from ICAR (Indian Council of Agricultural Research) standards provide actionable recommendations.
