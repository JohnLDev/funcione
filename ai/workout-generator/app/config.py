from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Docker Model Runner endpoint (OpenAI-compatible API)
    model_runner_base_url: str = "http://model-runner.docker.internal/engines/llama.cpp/v1"
    model_runner_model: str = "ai/llama3.2:1B-Q4_0"
    model_runner_temperature: float = 0.7

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
