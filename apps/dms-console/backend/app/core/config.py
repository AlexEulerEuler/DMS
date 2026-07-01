from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "DMS Console Backend"
    version: str = "0.1.0"
    environment: str = "local"
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="DMS_",
        env_nested_delimiter="__",
        extra="ignore",
    )


settings = Settings()
