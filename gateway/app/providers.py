from __future__ import annotations
import httpx
import logging
from .config import settings

logger = logging.getLogger("uvicorn")

async def request_openai_compatible(
    base_url: str, 
    api_key: str, 
    model: str, 
    messages: list[dict], 
    temperature: float
) -> str:
    """Generic handler for OpenAI, Ollama, DeepSeek, Perplexity, xAI"""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    # Handle Perplexity specific requirement (no system messages usually allowed, but we'll try)
    if "perplexity" in base_url or "sonar" in model:
        # Perplexity works best if system prompt is merged into user prompt or handled carefully
        pass 

    url = base_url.rstrip("/") + "/chat/completions"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.status_code != 200:
            logger.error(f"Provider Error ({model}): {r.text}")
            r.raise_for_status()
        data = r.json()
        return data["choices"][0]["message"]["content"]

async def request_anthropic(
    api_key: str, 
    model: str, 
    messages: list[dict], 
    temperature: float
) -> str:
    """Handler for Anthropic (Claude)"""
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    
    # Anthropic separates System prompt from messages
    system_prompt = ""
    filtered_messages = []
    for m in messages:
        if m["role"] == "system":
            system_prompt += m["content"] + "\n"
        else:
            filtered_messages.append(m)

    payload = {
        "model": model,
        "max_tokens": 4096,
        "messages": filtered_messages,
        "temperature": temperature,
    }
    if system_prompt:
        payload["system"] = system_prompt.strip()

    url = "https://api.anthropic.com/v1/messages"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(url, headers=headers, json=payload)
        if r.status_code != 200:
            logger.error(f"Anthropic Error: {r.text}")
            r.raise_for_status()
        data = r.json()
        return data["content"][0]["text"]

async def request_google(
    api_key: str, 
    model: str, 
    messages: list[dict], 
    temperature: float
) -> str:
    """Handler for Google (Gemini)"""
    # Gemini uses a different message structure: contents: [{role: "user", parts: [{text: "..."}]}]
    contents = []
    system_instruction = None
    
    for m in messages:
        role = "user" if m["role"] == "user" else "model"
        if m["role"] == "system":
            system_instruction = {"parts": [{"text": m["content"]}]}
            continue
            
        contents.append({
            "role": role,
            "parts": [{"text": m["content"]}]
        })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 4096
        }
    }
    if system_instruction:
        payload["systemInstruction"] = system_instruction

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(url, headers={"Content-Type": "application/json"}, json=payload)
        if r.status_code != 200:
            logger.error(f"Gemini Error: {r.text}")
            r.raise_for_status()
        data = r.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            return "Error: Gemini returned no content."


# Provider configuration map
PROVIDERS = {
    "openai": {
        "handler": "openai_compatible",
        "get_config": lambda: (
            settings.omega_openai_base_url,
            settings.omega_openai_api_key,
            settings.omega_model,
        ),
    },
    "cloud": {  # alias for openai
        "handler": "openai_compatible",
        "get_config": lambda: (
            settings.omega_openai_base_url,
            settings.omega_openai_api_key,
            settings.omega_model,
        ),
    },
    "local": {
        "handler": "openai_compatible",
        "get_config": lambda: (
            settings.omega_local_base_url,
            "ollama",  # Ollama ignores API key
            settings.omega_local_model,
        ),
    },
    "anthropic": {
        "handler": "anthropic",
        "get_config": lambda: (
            settings.omega_anthropic_api_key,
            settings.omega_anthropic_model,
        ),
    },
    "google": {
        "handler": "google",
        "get_config": lambda: (
            settings.omega_gemini_api_key,
            settings.omega_gemini_model,
        ),
    },
    "gemini": {  # alias for google
        "handler": "google",
        "get_config": lambda: (
            settings.omega_gemini_api_key,
            settings.omega_gemini_model,
        ),
    },
    "perplexity": {
        "handler": "openai_compatible",
        "get_config": lambda: (
            "https://api.perplexity.ai",
            settings.omega_perplexity_api_key,
            settings.omega_perplexity_model,
        ),
    },
    "deepseek": {
        "handler": "openai_compatible",
        "get_config": lambda: (
            settings.omega_deepseek_base_url,
            settings.omega_deepseek_api_key,
            settings.omega_deepseek_model,
        ),
    },
    "xai": {
        "handler": "openai_compatible",
        "get_config": lambda: (
            settings.omega_xai_base_url,
            settings.omega_xai_api_key,
            settings.omega_xai_model,
        ),
    },
    "grok": {  # alias for xai
        "handler": "openai_compatible",
        "get_config": lambda: (
            settings.omega_xai_base_url,
            settings.omega_xai_api_key,
            settings.omega_xai_model,
        ),
    },
}


async def route_request(
    provider: str,
    messages: list[dict],
    temperature: float = 0.2,
    model_override: str | None = None,
) -> str:
    """
    Route a chat completion request to the appropriate provider.

    Args:
        provider: Provider name (openai, anthropic, google, perplexity, deepseek, xai, local)
        messages: Chat messages in OpenAI format [{role, content}, ...]
        temperature: Creativity parameter (0.0-1.0)
        model_override: Override the default model for this provider

    Returns:
        The assistant's response content as a string.
    """
    provider = provider.lower()

    if provider not in PROVIDERS:
        available = ", ".join(PROVIDERS.keys())
        return f"OMEGA_GATEWAY: Unknown provider '{provider}'. Available: {available}"

    config = PROVIDERS[provider]
    handler_type = config["handler"]

    try:
        if handler_type == "openai_compatible":
            base_url, api_key, default_model = config["get_config"]()
            if not api_key and provider not in ("local",):
                return f"OMEGA_GATEWAY: API key not configured for {provider}."
            model = model_override or default_model
            logger.info(f"Routing to {provider.upper()} ({model})")
            return await request_openai_compatible(base_url, api_key, model, messages, temperature)

        elif handler_type == "anthropic":
            api_key, default_model = config["get_config"]()
            if not api_key:
                return f"OMEGA_GATEWAY: API key not configured for Anthropic."
            model = model_override or default_model
            logger.info(f"Routing to ANTHROPIC ({model})")
            return await request_anthropic(api_key, model, messages, temperature)

        elif handler_type == "google":
            api_key, default_model = config["get_config"]()
            if not api_key:
                return f"OMEGA_GATEWAY: API key not configured for Google/Gemini."
            model = model_override or default_model
            logger.info(f"Routing to GOOGLE ({model})")
            return await request_google(api_key, model, messages, temperature)

        else:
            return f"OMEGA_GATEWAY: Unknown handler type '{handler_type}'."

    except httpx.ConnectError:
        return f"OMEGA_GATEWAY: Could not connect to {provider}."
    except httpx.HTTPStatusError as e:
        return f"OMEGA_GATEWAY: {provider} returned HTTP {e.response.status_code}."
    except Exception as e:
        logger.error(f"Provider error ({provider}): {e}")
        return f"OMEGA_GATEWAY: Error from {provider}: {str(e)}"


def list_providers() -> list[str]:
    """Return list of available provider names."""
    return list(PROVIDERS.keys())