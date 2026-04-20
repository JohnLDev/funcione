package workout

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/funcione/backend/internal/models"
	"github.com/funcione/backend/pkg/config"
	"gorm.io/gorm"
)

const cooldownDuration = 7 * 24 * time.Hour

var (
	ErrCooldownActive = errors.New("you can only generate a new workout once per week")
	ErrWorkoutNotFound = errors.New("workout not found")
)

// CooldownError carries the cooldown details so the handler can include them
// in the 429 response.
type CooldownError struct {
	NextAvailableAt time.Time
}

func (e *CooldownError) Error() string {
	return ErrCooldownActive.Error()
}

// aiWorkoutResponse mirrors the shape returned by the Python AI service.
type aiWorkoutResponse struct {
	Success     bool                   `json:"success"`
	Plan        map[string]interface{} `json:"plan"`
	RawResponse *string                `json:"raw_response"`
	Error       *string                `json:"error"`
}

type Service interface {
	Generate(userID uint, req models.WorkoutGenerateRequest) (*models.WorkoutDetailResponse, error)
	List(userID uint) ([]models.WorkoutSummaryResponse, error)
	GetLatest(userID uint) (*models.WorkoutDetailResponse, error)
	GetByID(id, userID uint) (*models.WorkoutDetailResponse, error)
}

type service struct {
	repo   Repository
	aiCfg  config.AIConfig
	client *http.Client
}

func NewService(repo Repository, aiCfg config.AIConfig) Service {
	return &service{
		repo:   repo,
		aiCfg:  aiCfg,
		client: &http.Client{Timeout: 120 * time.Second},
	}
}

func (s *service) Generate(userID uint, req models.WorkoutGenerateRequest) (*models.WorkoutDetailResponse, error) {
	if err := s.checkCooldown(userID); err != nil {
		return nil, err
	}

	plan, err := s.callAIService(req)
	if err != nil {
		return nil, fmt.Errorf("AI service error: %w", err)
	}

	profileBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal profile: %w", err)
	}

	planBytes, err := json.Marshal(plan)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal plan: %w", err)
	}

	w := &models.Workout{
		UserID:      userID,
		ProfileJSON: string(profileBytes),
		PlanJSON:    string(planBytes),
	}

	if err := s.repo.Create(w); err != nil {
		return nil, fmt.Errorf("failed to save workout: %w", err)
	}

	return w.ToDetailResponse()
}

func (s *service) List(userID uint) ([]models.WorkoutSummaryResponse, error) {
	workouts, err := s.repo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	result := make([]models.WorkoutSummaryResponse, 0, len(workouts))
	for _, w := range workouts {
		result = append(result, w.ToSummaryResponse())
	}
	return result, nil
}

func (s *service) GetLatest(userID uint) (*models.WorkoutDetailResponse, error) {
	w, err := s.repo.FindLatestByUserID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkoutNotFound
		}
		return nil, err
	}
	return w.ToDetailResponse()
}

func (s *service) GetByID(id, userID uint) (*models.WorkoutDetailResponse, error) {
	w, err := s.repo.FindByIDAndUserID(id, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkoutNotFound
		}
		return nil, err
	}
	return w.ToDetailResponse()
}

// checkCooldown returns a *CooldownError if the user has generated a workout
// in the last 7 days, nil otherwise.
func (s *service) checkCooldown(userID uint) error {
	latest, err := s.repo.FindLatestByUserID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	elapsed := time.Since(latest.CreatedAt)
	if elapsed < cooldownDuration {
		return &CooldownError{
			NextAvailableAt: latest.CreatedAt.Add(cooldownDuration),
		}
	}
	return nil
}

// callAIService sends the profile to the Python AI microservice and returns
// the generated plan as a raw map.
func (s *service) callAIService(req models.WorkoutGenerateRequest) (map[string]interface{}, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/api/v1/workout/generate", s.aiCfg.WorkoutGeneratorURL)
	httpReq, err := http.NewRequest(http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("request to AI service failed: %w", err)
	}
	defer resp.Body.Close()

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read AI service response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AI service returned %d: %s", resp.StatusCode, string(rawBody))
	}

	var aiResp aiWorkoutResponse
	if err := json.Unmarshal(rawBody, &aiResp); err != nil {
		return nil, fmt.Errorf("failed to parse AI service response: %w", err)
	}

	if !aiResp.Success {
		msg := "AI service returned an error"
		if aiResp.Error != nil {
			msg = *aiResp.Error
		}
		return nil, errors.New(msg)
	}

	return aiResp.Plan, nil
}
