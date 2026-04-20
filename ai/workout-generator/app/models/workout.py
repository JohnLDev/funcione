from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class FitnessLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class FitnessGoal(str, Enum):
    weight_loss = "weight_loss"
    muscle_gain = "muscle_gain"
    endurance = "endurance"
    flexibility = "flexibility"
    general_fitness = "general_fitness"


class AvailableEquipment(str, Enum):
    none = "none"
    dumbbells = "dumbbells"
    barbell = "barbell"
    resistance_bands = "resistance_bands"
    pull_up_bar = "pull_up_bar"
    full_gym = "full_gym"


class WorkoutRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "age": 28,
                "weight_kg": 75.0,
                "height_cm": 178.0,
                "fitness_level": "intermediate",
                "goal": "muscle_gain",
                "days_per_week": 4,
                "equipment": "dumbbells",
                "restrictions": "mild lower back pain",
                "additional_info": "Prefer morning workouts, about 60 minutes each session",
            }
        }
    )

    age: int = Field(..., ge=10, le=100, description="User age in years")
    weight_kg: float = Field(..., gt=0, description="User weight in kilograms")
    height_cm: float = Field(..., gt=0, description="User height in centimeters")
    fitness_level: FitnessLevel = Field(
        ...,
        description="Current fitness level. `beginner` = less than 6 months of consistent training; "
                    "`intermediate` = 6 months to 2 years; `advanced` = 2+ years.",
    )
    goal: FitnessGoal = Field(
        ...,
        description="Primary fitness goal. Accepted values: `weight_loss`, `muscle_gain`, "
                    "`endurance`, `flexibility`, `general_fitness`.",
    )
    days_per_week: int = Field(..., ge=1, le=7, description="Number of days available for training per week (1–7)")
    equipment: AvailableEquipment = Field(
        ...,
        description="Best describes the equipment available. Accepted values: `none` (bodyweight only), "
                    "`dumbbells`, `barbell`, `resistance_bands`, `pull_up_bar`, `full_gym`.",
    )
    restrictions: Optional[str] = Field(
        None,
        description="Physical restrictions, injuries, or medical conditions that must be respected. "
                    "Leave null if none.",
        examples=["knee injury", "lower back pain", "shoulder surgery recovery"],
    )
    additional_info: Optional[str] = Field(
        None,
        description="Any extra context that may help personalise the plan, such as session duration, "
                    "preferred training style, or schedule preferences. Leave null if none.",
        examples=["Prefer 45-minute sessions", "No equipment on weekends"],
    )


class Exercise(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "name": "Dumbbell Romanian Deadlift",
                "sets": "3",
                "reps": "10-12",
                "duration": None,
                "rest": "60 seconds",
                "notes": "Keep a neutral spine throughout the movement",
            }
        }
    )

    name: str = Field(default="", description="Exercise name")
    sets: Optional[str] = Field(None, description="Number of sets (e.g. '3', '4')")
    reps: Optional[str] = Field(None, description="Rep range (e.g. '8-10', '12-15'). Null for timed exercises.")
    duration: Optional[str] = Field(None, description="Duration for timed exercises (e.g. '30 seconds', '1 minute'). Null for rep-based exercises.")
    rest: Optional[str] = Field(None, description="Rest period between sets (e.g. '60 seconds', '90 seconds')")
    notes: Optional[str] = Field(None, description="Execution tips or safety cues for this exercise")


class WorkoutDay(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "day": "Day 1 - Monday",
                "focus": "Upper Body — Push",
                "warm_up": "5 minutes light cardio + shoulder circles and arm swings",
                "exercises": [
                    {
                        "name": "Dumbbell Bench Press",
                        "sets": "4",
                        "reps": "8-10",
                        "duration": None,
                        "rest": "90 seconds",
                        "notes": "Control the eccentric phase (2-3 seconds down)",
                    }
                ],
                "cool_down": "5 minutes stretching — chest, shoulders, triceps",
            }
        }
    )

    day: str = Field(default="", description="Day label including suggested weekday (e.g. 'Day 1 - Monday')")
    focus: str = Field(default="", description="Main muscle group or training type for the session (e.g. 'Upper Body — Push')")
    exercises: List[Exercise] = Field(default_factory=list, description="Ordered list of exercises for the session")
    warm_up: Optional[str] = Field(None, description="Warm-up routine description")
    cool_down: Optional[str] = Field(None, description="Cool-down routine description")


class WorkoutPlan(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        json_schema_extra={
            "example": {
                "title": "4-Day Hypertrophy Plan — Dumbbells",
                "overview": "An upper/lower split designed for intermediate lifters focused on muscle gain. "
                            "Sessions are kept to 60 minutes with progressive overload as the primary driver.",
                "weekly_schedule": [],
                "general_tips": [
                    "Increase weight by 2.5 kg once you hit the top of the rep range on all sets",
                    "Aim for 7-9 hours of sleep per night for optimal recovery",
                ],
                "nutrition_notes": "Target a caloric surplus of 200-300 kcal above maintenance. "
                                   "Aim for 1.6-2.2 g of protein per kg of bodyweight daily.",
            }
        }
    )

    title: str = Field(default="Workout Plan", description="Descriptive plan title")
    overview: str = Field(default="", description="Summary of the plan and why it suits the user's profile")
    weekly_schedule: List[WorkoutDay] = Field(default_factory=list, description="One entry per training day")
    general_tips: List[str] = Field(default_factory=list, description="Actionable tips for progression, recovery, and adherence")
    nutrition_notes: Optional[str] = Field(None, description="Basic nutrition guidance aligned with the user's goal")


class WorkoutResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "plan": {
                    "title": "4-Day Hypertrophy Plan — Dumbbells",
                    "overview": "An upper/lower split designed for intermediate lifters.",
                    "weekly_schedule": [],
                    "general_tips": ["Track your lifts to ensure progressive overload"],
                    "nutrition_notes": "Aim for 1.8 g of protein per kg of bodyweight.",
                },
                "raw_response": None,
                "error": None,
            }
        }
    )

    success: bool = Field(..., description="Whether the plan was successfully generated")
    plan: Optional[WorkoutPlan] = Field(None, description="The generated workout plan. Present only when `success` is true.")
    raw_response: Optional[str] = Field(None, description="Raw model output. Present only when the parser fails.")
    error: Optional[str] = Field(None, description="Error message. Present only when `success` is false.")
