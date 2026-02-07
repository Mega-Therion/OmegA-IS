from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore",
        env_prefix="OMEGA_"
    )
    
    # --- OpenAI (Safa/Codex) ---
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"

    # --- Local / Ollama (Private) ---
    local_base_url: str = "http://localhost:11434/v1"
    local_model: str = "llama3"
    
    # --- Anthropic (Claude) ---
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20240620"

    # --- Google (Gemini) ---
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-pro"

    # --- Perplexity (Search/Comet) ---
    perplexity_api_key: str = ""
    perplexity_model: str = "llama-3-sonar-large-32k-online"

    # --- DeepSeek ---
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # --- xAI (Grok) ---
    xai_api_key: str = ""
    xai_base_url: str = "https://api.x.ai/v1"
    xai_model: str = "grok-beta"

    # --- System Settings ---
    default_ai_mode: str = "local"  # options: omega, local, cloud, anthropic, google, etc.
    db_url: str = ""
    redis_url: str = ""
    api_bearer_token: str = ""
    log_level: str = "INFO"

    # --- Neo4j (Knowledge Graph) ---
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "omega-knowledge"
    
    # --- Internal ---
    internal_token: str = ""
    brain_base_url: str = "http://localhost:8080"

settings = Settings()
