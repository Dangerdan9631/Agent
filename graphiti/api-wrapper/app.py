import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from graphiti_core import Graphiti
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.nodes import EpisodeType
from graphiti_core.search.search_config_recipes import NODE_HYBRID_SEARCH_RRF
from graphiti_core.utils.maintenance.graph_data_operations import clear_data


class Settings(BaseSettings):
    ollama_openai_base_url: str = 'http://ollama:11434/v1'
    ollama_api_key: str = 'ollama'
    ollama_chat_model: str = 'qwen2.5:14b'
    ollama_small_model: str = 'qwen2.5:14b'
    ollama_embed_model: str = 'nomic-embed-text'
    ollama_embedding_dim: int = 768
    neo4j_uri: str = 'bolt://neo4j:7687'
    neo4j_user: str = 'neo4j'
    neo4j_password: str = 'graphiti-password'
    graphiti_enable_reranker: bool = False
    graphiti_telemetry_enabled: bool = False

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')


class EpisodeRequest(BaseModel):
    name: str
    episode_body: str | dict[str, Any] | list[Any]
    source: Literal['text', 'json', 'message'] = 'text'
    source_description: str = 'api wrapper'
    group_id: str | None = None
    reference_time: datetime | None = None


class FactsSearchRequest(BaseModel):
    query: str
    group_ids: list[str] | None = None
    num_results: int = Field(default=10, ge=1, le=50)
    center_node_uuid: str | None = None


class NodesSearchRequest(BaseModel):
    query: str
    limit: int = Field(default=5, ge=1, le=50)


class HealthResponse(BaseModel):
    status: str
    neo4j_uri: str
    ollama_openai_base_url: str
    reranker_enabled: bool


def get_settings() -> Settings:
    return Settings()


def build_graphiti(settings: Settings) -> Graphiti:
    llm_config = LLMConfig(
        api_key=settings.ollama_api_key,
        model=settings.ollama_chat_model,
        small_model=settings.ollama_small_model,
        base_url=settings.ollama_openai_base_url,
    )
    llm_client = OpenAIGenericClient(config=llm_config)

    graphiti_kwargs: dict[str, Any] = {
        'llm_client': llm_client,
        'embedder': OpenAIEmbedder(
            config=OpenAIEmbedderConfig(
                api_key=settings.ollama_api_key,
                embedding_model=settings.ollama_embed_model,
                embedding_dim=settings.ollama_embedding_dim,
                base_url=settings.ollama_openai_base_url,
            )
        ),
    }

    if settings.graphiti_enable_reranker:
        graphiti_kwargs['cross_encoder'] = OpenAIRerankerClient(
            client=llm_client,
            config=llm_config,
        )

    return Graphiti(
        settings.neo4j_uri,
        settings.neo4j_user,
        settings.neo4j_password,
        **graphiti_kwargs,
    )


async def graphiti_dependency(settings: Settings = Depends(get_settings)):
    client = build_graphiti(settings)
    try:
        yield client
    finally:
        await client.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    client = build_graphiti(settings)
    try:
        await client.build_indices_and_constraints()
    finally:
        await client.close()
    yield


app = FastAPI(title='Graphiti API Wrapper', version='1.0.0', lifespan=lifespan)


@app.get('/health', response_model=HealthResponse)
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status='healthy',
        neo4j_uri=settings.neo4j_uri,
        ollama_openai_base_url=settings.ollama_openai_base_url,
        reranker_enabled=settings.graphiti_enable_reranker,
    )


@app.post('/episodes')
async def add_episode(
    request: EpisodeRequest,
    graphiti: Graphiti = Depends(graphiti_dependency),
) -> dict[str, str]:
    episode_body = request.episode_body
    serialized_body = episode_body if isinstance(episode_body, str) else json.dumps(episode_body)
    await graphiti.add_episode(
        name=request.name,
        episode_body=serialized_body,
        source=getattr(EpisodeType, request.source),
        source_description=request.source_description,
        group_id=request.group_id,
        reference_time=request.reference_time or datetime.now(timezone.utc),
    )
    return {'status': 'accepted', 'name': request.name}


@app.post('/search/facts')
async def search_facts(
    request: FactsSearchRequest,
    graphiti: Graphiti = Depends(graphiti_dependency),
) -> dict[str, list[dict[str, Any]]]:
    results = await graphiti.search(
        query=request.query,
        group_ids=request.group_ids,
        num_results=request.num_results,
        center_node_uuid=request.center_node_uuid,
    )
    return {
        'facts': [
            {
                'uuid': result.uuid,
                'fact': result.fact,
                'name': result.name,
                'source_node_uuid': result.source_node_uuid,
                'target_node_uuid': result.target_node_uuid,
                'valid_at': result.valid_at.isoformat() if result.valid_at else None,
                'invalid_at': result.invalid_at.isoformat() if result.invalid_at else None,
                'created_at': result.created_at.isoformat() if result.created_at else None,
            }
            for result in results
        ]
    }


@app.post('/search/nodes')
async def search_nodes(
    request: NodesSearchRequest,
    graphiti: Graphiti = Depends(graphiti_dependency),
) -> dict[str, list[dict[str, Any]]]:
    node_search_config = NODE_HYBRID_SEARCH_RRF.model_copy(deep=True)
    node_search_config.limit = request.limit
    node_search_results = await graphiti._search(query=request.query, config=node_search_config)
    return {
        'nodes': [
            {
                'uuid': node.uuid,
                'name': node.name,
                'labels': list(node.labels),
                'summary': node.summary,
                'created_at': node.created_at.isoformat() if node.created_at else None,
                'attributes': node.attributes,
            }
            for node in node_search_results.nodes
        ]
    }


@app.get('/episodes/{group_id}')
async def get_episodes(
    group_id: str,
    last_n: int = 10,
    graphiti: Graphiti = Depends(graphiti_dependency),
) -> list[dict[str, Any]]:
    episodes = await graphiti.retrieve_episodes(
        group_ids=[group_id],
        last_n=last_n,
        reference_time=datetime.now(timezone.utc),
    )
    return [
        {
            'uuid': episode.uuid,
            'name': episode.name,
            'content': episode.content,
            'created_at': episode.created_at.isoformat() if episode.created_at else None,
            'group_id': episode.group_id,
            'source_description': episode.source_description,
        }
        for episode in episodes
    ]


@app.post('/clear')
async def clear_graph(graphiti: Graphiti = Depends(graphiti_dependency)) -> dict[str, str]:
    await clear_data(graphiti.driver)
    await graphiti.build_indices_and_constraints()
    return {'status': 'cleared'}
