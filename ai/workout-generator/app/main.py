import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.routes.workout import router as workout_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

_DESCRIPTION = """
## Overview

The **Workout Generator API** uses a local LLM (`ai/llama3.2:1B-Q4_0`) served by
**Docker Model Runner** via LangChain to produce fully personalised,
week-long workout plans from a single JSON request describing a user's profile.

It is designed to be consumed by:
- **Frontend applications** — fitness apps, dashboards, chatbots
- **AI agents / LLM tools** — the endpoint can be registered as a tool in any agent framework
  (LangChain, LlamaIndex, OpenAI function calling, etc.)
- **Backend services** — any system that needs AI-generated training content

---

## How to integrate with an AI agent

Register `POST /api/v1/workout/generate` as a tool in your agent with the following description:

> Generates a personalised workout plan. Accepts a JSON body with the user's age, weight (kg),
> height (cm), fitness level (beginner | intermediate | advanced), primary goal
> (weight_loss | muscle_gain | endurance | flexibility | general_fitness),
> available training days per week (1–7), equipment
> (none | dumbbells | barbell | resistance_bands | pull_up_bar | full_gym),
> and optional restrictions and additional context.
> Returns a structured weekly plan with exercises, sets, reps, rest periods, and tips.

---

## Authentication

No authentication is required in development. For production deployments, protect the API
behind an API Gateway or add a Bearer token middleware.

---

## Errors

| HTTP Status | Meaning |
|-------------|---------|
| `422` | Validation error — one or more request fields are invalid or missing |
| `500` | The AI model returned an unexpected response or an internal error occurred |
"""

_TAGS_METADATA = [
    {
        "name": "workout",
        "description": "Generate AI-powered personalised workout plans. "
                       "The core endpoint for all integrations.",
    },
    {
        "name": "health",
        "description": "Liveness probe. Use this endpoint to check whether the service is running.",
    },
]

app = FastAPI(
    title="Workout Generator API",
    description=_DESCRIPTION,
    version="1.0.0",
    openapi_tags=_TAGS_METADATA,
    contact={
        "name": "Funcione",
        "url": "https://github.com/funcione",
    },
    license_info={
        "name": "MIT",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workout_router, prefix="/api/v1")


@app.get("/health", tags=["health"], summary="Health check")
async def health_check():
    """Returns `200 OK` when the service is running. Use as a liveness probe."""
    return {"status": "ok"}
