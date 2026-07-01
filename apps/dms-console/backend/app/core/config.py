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

    # GitHub proxy (README §6, api-contract.md §10.2). Single-user server credentials.
    # When token/owner/repo are all set, Issues are proxied to the real GitHub REST API;
    # otherwise an in-memory mock is used so the console works without external setup.
    github_token: str | None = None
    github_owner: str | None = None
    github_repo: str | None = None
    github_api_url: str = "https://api.github.com"

    # Runtime persistence + storage (docs/ia/runtime.md §1-2, §6).
    db_path: str = "./dms.db"
    storage_dir: str = "./storage"
    # Seed an empty DB with sample data (dev default on; set 0 for a clean prod start).
    seed: bool = True
    # Optional API token gate (runtime.md §5). When set, requests need Bearer auth.
    api_token: str | None = None
    # Docs root the agent loop reads from. Defaults to apps/dms-console/docs;
    # override in containers (e.g. /docs) where the source tree layout differs.
    docs_dir: str | None = None

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.db_path}"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="DMS_",
        env_nested_delimiter="__",
        extra="ignore",
    )


settings = Settings()
