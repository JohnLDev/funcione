package models

import (
	"encoding/json"
	"time"
)

// Workout stores a generated workout plan in the database.
// ProfileJSON and PlanJSON hold the raw JSON blobs; the service layer
// deserialises them into the response DTOs before returning to the client.
type Workout struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint      `gorm:"not null;index"           json:"user_id"`
	ProfileJSON string    `gorm:"column:profile_json;type:text;not null" json:"-"`
	PlanJSON    string    `gorm:"column:plan_json;type:text;not null"    json:"-"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// WorkoutGenerateRequest is the payload the frontend sends to request a new workout.
// It mirrors the WorkoutRequest accepted by the AI service.
type WorkoutGenerateRequest struct {
	Age            int     `json:"age"             binding:"required,min=10,max=100"`
	WeightKg       float64 `json:"weight_kg"       binding:"required,gt=0"`
	HeightCm       float64 `json:"height_cm"       binding:"required,gt=0"`
	FitnessLevel   string  `json:"fitness_level"   binding:"required,oneof=beginner intermediate advanced"`
	Goal           string  `json:"goal"            binding:"required,oneof=weight_loss muscle_gain endurance flexibility general_fitness"`
	DaysPerWeek    int     `json:"days_per_week"   binding:"required,min=1,max=7"`
	Equipment      string  `json:"equipment"       binding:"required,oneof=none dumbbells barbell resistance_bands pull_up_bar full_gym"`
	Restrictions   string  `json:"restrictions"`
	AdditionalInfo string  `json:"additional_info"`
}

// WorkoutDetailResponse is the API response shape returned to the frontend.
type WorkoutDetailResponse struct {
	ID        uint                   `json:"id"`
	UserID    uint                   `json:"user_id"`
	Profile   map[string]interface{} `json:"profile"`
	Plan      map[string]interface{} `json:"plan"`
	CreatedAt time.Time              `json:"created_at"`
	UpdatedAt time.Time              `json:"updated_at"`
}

// WorkoutSummaryResponse is used in list endpoints (omits the heavy plan body).
type WorkoutSummaryResponse struct {
	ID        uint      `json:"id"`
	UserID    uint      `json:"user_id"`
	Title     string    `json:"title"`
	Overview  string    `json:"overview"`
	CreatedAt time.Time `json:"created_at"`
}

// ToDetailResponse deserialises the stored JSON blobs into the response DTO.
func (w *Workout) ToDetailResponse() (*WorkoutDetailResponse, error) {
	var profile map[string]interface{}
	if err := json.Unmarshal([]byte(w.ProfileJSON), &profile); err != nil {
		return nil, err
	}

	var plan map[string]interface{}
	if err := json.Unmarshal([]byte(w.PlanJSON), &plan); err != nil {
		return nil, err
	}

	return &WorkoutDetailResponse{
		ID:        w.ID,
		UserID:    w.UserID,
		Profile:   profile,
		Plan:      plan,
		CreatedAt: w.CreatedAt,
		UpdatedAt: w.UpdatedAt,
	}, nil
}

// ToSummaryResponse extracts the lightweight fields from the plan JSON.
func (w *Workout) ToSummaryResponse() WorkoutSummaryResponse {
	var plan map[string]interface{}
	_ = json.Unmarshal([]byte(w.PlanJSON), &plan)

	title, _ := plan["title"].(string)
	overview, _ := plan["overview"].(string)

	return WorkoutSummaryResponse{
		ID:        w.ID,
		UserID:    w.UserID,
		Title:     title,
		Overview:  overview,
		CreatedAt: w.CreatedAt,
	}
}
