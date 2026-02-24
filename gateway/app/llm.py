from __future__ import annotations
import logging
import asyncio
from .config import settings
from . import providers

logger = logging.getLogger("uvicorn")

async def chat_completion(messages: list[dict], temperature: float = 0.2, mode: str | None = None) -> str:
    """
    Routes the chat request.
    Modes:
    - "omega" (Default): The Council deliberates, Speaker synthesizes.
    - "local", "cloud", "anthropic", etc.: Direct 1:1 access.
    """
    target_mode = mode or settings.default_ai_mode
    logger.info(f"OMEGA GATEWAY: Routing request to {target_mode.upper()}")

    # --- THE COLLECTIVE (OmegA / Council Mode) ---
    if target_mode == "omega":
        return await run_council_synthesis(messages, temperature)

    # --- DIRECT ROUTING (Private or Group-Addressing) ---
    return await route_to_provider(target_mode, messages, temperature)


async def route_to_provider(mode: str, messages: list[dict], temperature: float) -> str:
    """Helper to route to a specific provider."""
    try:
        if mode == "local":
            return await providers.request_openai_compatible(
                base_url=settings.omega_local_base_url,
                api_key="ollama",
                model=settings.omega_local_model,
                messages=messages,
                temperature=temperature
            )
        elif mode in ["cloud", "openai", "safa"]:
            if not settings.omega_openai_api_key: return "Missing OpenAI API Key."
            return await providers.request_openai_compatible(
                base_url=settings.omega_openai_base_url,
                api_key=settings.omega_openai_api_key,
                model=settings.omega_model,
                messages=messages,
                temperature=temperature
            )
        elif mode in ["anthropic", "claude"]:
            if not settings.omega_anthropic_api_key: return "Missing Anthropic API Key."
            return await providers.request_anthropic(
                api_key=settings.omega_anthropic_api_key,
                model=settings.omega_anthropic_model,
                messages=messages,
                temperature=temperature
            )
        elif mode in ["google", "gemini"]:
            if not settings.omega_gemini_api_key: return "Missing Google Gemini API Key."
            return await providers.request_google(
                api_key=settings.omega_gemini_api_key,
                model=settings.omega_gemini_model,
                messages=messages,
                temperature=temperature
            )
        elif mode == "perplexity":
            if not settings.omega_perplexity_api_key: return "Missing Perplexity API Key."
            return await providers.request_openai_compatible(
                base_url="https://api.perplexity.ai",
                api_key=settings.omega_perplexity_api_key,
                model=settings.omega_perplexity_model,
                messages=messages,
                temperature=temperature
            )
        elif mode == "deepseek":
            if not settings.omega_deepseek_api_key: return "Missing DeepSeek API Key."
            return await providers.request_openai_compatible(
                base_url=settings.omega_deepseek_base_url,
                api_key=settings.omega_deepseek_api_key,
                model=settings.omega_deepseek_model,
                messages=messages,
                temperature=temperature
            )
        elif mode in ["xai", "grok"]:
            if not settings.omega_xai_api_key: return "Missing xAI API Key."
            return await providers.request_openai_compatible(
                base_url=settings.omega_xai_base_url,
                api_key=settings.omega_xai_api_key,
                model=settings.omega_xai_model,
                messages=messages,
                temperature=temperature
            )
        else:
            return f"OMEGA_GATEWAY: Unknown AI Mode '{mode}'."
    except Exception as e:
        logger.error(f"Routing Error ({mode}): {e}")
        return f"Error connecting to {mode}: {str(e)}"


async def run_council_synthesis(messages: list[dict], temperature: float) -> str:
    """
    Orchestrates the 'gAIng'. 
    """
    user_query = messages[-1]["content"]
    logger.info("OmegA: Convening the Council...")
    
    async def get_advisor_opinion(advisor_mode: str) -> str:
        try:
            # Fallback to local if key is missing
            actual_mode = advisor_mode
            if advisor_mode in ["claude", "anthropic"] and not settings.omega_anthropic_api_key:
                actual_mode = "local"
            elif advisor_mode in ["google", "gemini"] and not settings.omega_gemini_api_key:
                actual_mode = "local"
                
            response = await route_to_provider(actual_mode, messages, temperature)
            return f"--- Advisor {advisor_mode.upper()} ---\n{response}\n"
        except Exception as e:
            logger.warning(f"Advisor {advisor_mode} failed: {e}")
            return ""

    # Run in parallel
    results = await asyncio.gather(
        get_advisor_opinion("claude"),
        get_advisor_opinion("gemini"),
        return_exceptions=True
    )
    
    council_output = "\n".join([r for r in results if isinstance(r, str)])
    
    # 2. THE SPEAKER SYNTHESIZES
    synthesis_prompt = f"""
You are OmegA, a super-intelligence formed by a collective of AI agents.
Your 'Council' has just deliberated on the user's query.

USER QUERY:
{user_query}

COUNCIL ADVICE:
{council_output}

INSTRUCTIONS:
Synthesize the Council's advice into a single, cohesive, authoritative response.
Do not just repeat what they said. Merge their insights into your own voice.
You are the Speaker of the House. Your voice is Mega.
"""
    
    synthesis_messages = messages[:-1] + [{"role": "user", "content": synthesis_prompt}]
    logger.info("OmegA: Speaker is synthesizing...")
    
    # Fallback to local if Safa/OpenAI key is missing
    speaker_mode = "cloud" if settings.omega_openai_api_key else "local"
    final_response = await route_to_provider(speaker_mode, synthesis_messages, temperature)
    
    return final_response