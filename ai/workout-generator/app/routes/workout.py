from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.models.workout import WorkoutRequest, WorkoutResponse
from app.services.workout_service import generate_workout

router = APIRouter(prefix="/workout", tags=["workout"])


@router.post(
    "/generate",
    response_model=WorkoutResponse,
    summary="Generate a personalised workout plan",
    response_description="A structured weekly workout plan tailored to the user's profile",
    responses={
        200: {
            "description": "Plan generated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "plan": {
                            "title": "4-Day Hypertrophy Plan — Dumbbells",
                            "overview": "An upper/lower split for an intermediate lifter focused on muscle gain. "
                                        "Sessions are kept to ~60 minutes with progressive overload as the main driver.",
                            "weekly_schedule": [
                                {
                                    "day": "Day 1 - Monday",
                                    "focus": "Upper Body — Push",
                                    "warm_up": "5 min light cardio + shoulder circles",
                                    "exercises": [
                                        {
                                            "name": "Dumbbell Bench Press",
                                            "sets": "4",
                                            "reps": "8-10",
                                            "duration": None,
                                            "rest": "90 seconds",
                                            "notes": "Control the eccentric (2-3 seconds down)",
                                        }
                                    ],
                                    "cool_down": "5 min stretching — chest, shoulders, triceps",
                                }
                            ],
                            "general_tips": [
                                "Increase weight by 2.5 kg once you hit the top of the rep range on all sets",
                                "Aim for 7-9 hours of sleep for optimal recovery",
                            ],
                            "nutrition_notes": "Target a 200-300 kcal surplus. Aim for 1.8 g protein/kg/day.",
                        },
                        "raw_response": None,
                        "error": None,
                    }
                }
            },
        },
        422: {
            "description": "Validation error — one or more request fields are invalid or missing",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "type": "missing",
                                "loc": ["body", "age"],
                                "msg": "Field required",
                                "input": {},
                            }
                        ]
                    }
                }
            },
        },
        500: {
            "description": "Internal error — the AI model failed to generate a valid plan",
            "content": {
                "application/json": {
                    "example": {"detail": "The model returned an unexpected format. Please try again."}
                }
            },
        },
    },
)
async def generate_workout_plan(request: WorkoutRequest) -> WorkoutResponse:
    """
    Generate a fully personalised, AI-powered weekly workout plan from a user profile.

    ### How it works
    The request body is injected into a pre-established prompt and sent to Google Gemini via LangChain.
    The model returns a structured JSON plan which is validated and returned to the caller.

    ### Field reference

    | Field | Type | Required | Description |
    |-------|------|----------|-------------|
    | `age` | integer (10–100) | Yes | User age in years |
    | `weight_kg` | float | Yes | Body weight in kilograms |
    | `height_cm` | float | Yes | Height in centimetres |
    | `fitness_level` | enum | Yes | `beginner` · `intermediate` · `advanced` |
    | `goal` | enum | Yes | `weight_loss` · `muscle_gain` · `endurance` · `flexibility` · `general_fitness` |
    | `days_per_week` | integer (1–7) | Yes | Available training days per week |
    | `equipment` | enum | Yes | `none` · `dumbbells` · `barbell` · `resistance_bands` · `pull_up_bar` · `full_gym` |
    | `restrictions` | string | No | Injuries or physical limitations |
    | `additional_info` | string | No | Session duration, preferred style, schedule preferences |

    ### AI agent usage
    This endpoint can be registered as a **tool** in any agent framework. Pass the user's profile
    as the tool input and receive a ready-to-display workout plan as the output.
    """
    response = await generate_workout(request)

    if not response.success:
        raise HTTPException(status_code=500, detail=response.error)

    return response
