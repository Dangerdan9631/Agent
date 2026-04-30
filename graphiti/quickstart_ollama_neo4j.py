import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

from graphiti_core import Graphiti
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.nodes import EpisodeType


def normalize_base_url(base_url: str) -> str:
    trimmed = base_url.rstrip("/")
    if trimmed.endswith("/v1"):
        return trimmed
    return f"{trimmed}/v1"


def env_flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def build_graphiti() -> Graphiti:
    load_dotenv(Path(__file__).with_name(".env"))

    base_url = normalize_base_url(os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"))
    api_key = os.getenv("OLLAMA_API_KEY", "ollama")
    chat_model = os.getenv("OLLAMA_CHAT_MODEL", "qwen2.5:14b")
    small_model = os.getenv("OLLAMA_SMALL_MODEL", chat_model)
    embed_model = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    embedding_dim = int(os.getenv("OLLAMA_EMBEDDING_DIM", "768"))

    neo4j_uri = os.getenv("NEO4J_URI", "bolt://127.0.0.1:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "graphiti-password")

    llm_config = LLMConfig(
        api_key=api_key,
        model=chat_model,
        small_model=small_model,
        base_url=base_url,
    )
    llm_client = OpenAIGenericClient(config=llm_config)

    graphiti_kwargs = {
        "llm_client": llm_client,
        "embedder": OpenAIEmbedder(
            config=OpenAIEmbedderConfig(
                api_key=api_key,
                embedding_model=embed_model,
                embedding_dim=embedding_dim,
                base_url=base_url,
            )
        ),
    }

    if env_flag("GRAPHITI_ENABLE_RERANKER"):
        graphiti_kwargs["cross_encoder"] = OpenAIRerankerClient(
            client=llm_client,
            config=llm_config,
        )

    return Graphiti(
        neo4j_uri,
        neo4j_user,
        neo4j_password,
        **graphiti_kwargs,
    )


async def main() -> None:
    graphiti = build_graphiti()

    episodes = [
        {
            "name": "local-ollama-stack",
            "content": {
                "service": "ollama",
                "base_url": "http://127.0.0.1:11434",
                "chat_model": os.getenv("OLLAMA_CHAT_MODEL", "qwen2.5:14b"),
                "embed_model": os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
            },
            "type": EpisodeType.json,
            "description": "local model server configuration",
        },
        {
            "name": "local-graphiti-stack",
            "content": "Graphiti uses Neo4j on bolt://127.0.0.1:7687 and reads LLM traffic from the local Ollama OpenAI-compatible API endpoint.",
            "type": EpisodeType.text,
            "description": "local graph memory configuration",
        },
        {
            "name": "repo-purpose",
            "content": "This repository centers on agent configuration and local AI tooling. The Graphiti folder is configured to use Neo4j plus the Ollama stack defined in the sibling ollama folder.",
            "type": EpisodeType.text,
            "description": "repository context",
        },
    ]

    try:
        for episode in episodes:
            episode_body = episode["content"]
            await graphiti.add_episode(
                name=episode["name"],
                episode_body=episode_body if isinstance(episode_body, str) else json.dumps(episode_body),
                source=episode["type"],
                source_description=episode["description"],
                reference_time=datetime.now(timezone.utc),
            )
            print(f"Added episode: {episode['name']}")

        query = "Which local services does Graphiti depend on in this workspace?"
        print(f"\nSearch query: {query}")
        results = await graphiti.search(query)

        if not results:
            print("No results returned.")
            return

        print("\nTop search results:")
        for result in results[:5]:
            print(f"- {result.fact}")
    finally:
        await graphiti.close()


if __name__ == "__main__":
    asyncio.run(main())
