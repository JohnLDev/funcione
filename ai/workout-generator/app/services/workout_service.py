import logging

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException

from app.models.workout import WorkoutRequest, WorkoutResponse, WorkoutPlan
from app.prompts.workout_prompt import workout_prompt
from app.config import settings

logger = logging.getLogger(__name__)


def _build_chain():
    llm = ChatOpenAI(
        base_url=settings.model_runner_base_url,
        model=settings.model_runner_model,
        temperature=settings.model_runner_temperature,
        api_key="not-needed",  # Docker Model Runner doesn't require an API key
    )
    parser = JsonOutputParser()
    return workout_prompt | llm | parser


def _format_enum_value(value: str) -> str:
    return value.replace("_", " ")


async def generate_workout(request: WorkoutRequest) -> WorkoutResponse:
    try:
        chain = _build_chain()

        input_data = {
            "age": request.age,
            "weight_kg": request.weight_kg,
            "height_cm": request.height_cm,
            "fitness_level": _format_enum_value(request.fitness_level.value),
            "goal": _format_enum_value(request.goal.value),
            "days_per_week": request.days_per_week,
            "equipment": _format_enum_value(request.equipment.value),
            "restrictions": request.restrictions or "None",
            "additional_info": request.additional_info or "None",
        }

        logger.info(
            "Invoking LangChain chain via Docker Model Runner (%s)",
            settings.model_runner_model,
        )
        result = await chain.ainvoke(input_data)

        logger.info("Raw model output keys: %s", list(result.keys()) if isinstance(result, dict) else type(result))
        plan = WorkoutPlan.model_validate(result)

        return WorkoutResponse(success=True, plan=plan)

    except OutputParserException as e:
        logger.error("Failed to parse model output: %s", str(e))
        return WorkoutResponse(
            success=False,
            raw_response=str(e),
            error="The model returned an unexpected format. Please try again.",
        )
    except Exception as e:
        logger.exception("Unexpected error during workout generation")
        return WorkoutResponse(success=False, error=str(e))
