from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # --- OpenAI (Safa/Codex) ---
    omega_openai_api_key: str = ""
    omega_openai_base_url: str = "https://api.openai.com/v1"
    omega_model: str = "gpt-4o"

    # --- Local / Ollama (Private) ---
    omega_local_base_url: str = "http://omega-ollama:11434/v1"
    omega_local_model: str = "llama3"
    
    # --- Anthropic (Claude) ---
    omega_anthropic_api_key: str = ""
    omega_anthropic_model: str = "claude-3-5-sonnet-20240620"

    # --- Google (Gemini) ---
    omega_gemini_api_key: str = ""
    omega_gemini_model: str = "gemini-1.5-pro"

    # --- Perplexity (Search/Comet) ---
    omega_perplexity_api_key: str = ""
    omega_perplexity_model: str = "llama-3-sonar-large-32k-online"

    # --- DeepSeek ---
    omega_deepseek_api_key: str = ""
    omega_deepseek_base_url: str = "https://api.deepseek.com"
    omega_deepseek_model: str = "deepseek-chat"

    # --- xAI (Grok) ---
    omega_xai_api_key: str = ""
    omega_xai_base_url: str = "https://api.x.ai/v1"
    omega_xai_model: str = "grok-beta"

    # --- System Settings ---
    default_ai_mode: str = "omega"  # options: omega, local, cloud, anthropic, google, etc.
    omega_db_url: str = ""
    omega_redis_url: str = ""
    omega_api_bearer_token: str = ""
    omega_log_level: str = "INFO"

    # --- Neo4j (Knowledge Graph) ---
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "omega-knowledge"
    
    # --- Internal ---
    omega_internal_token: str = ""
    omega_brain_base_url: str = "http://localhost:8080"

settings = Settings()