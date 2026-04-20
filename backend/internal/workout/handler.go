package workout

import (
	"errors"
	"strconv"

	"github.com/funcione/backend/internal/models"
	"github.com/funcione/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// Generate godoc
// POST /api/v1/workouts/generate
// Validates the 1-week cooldown, calls the AI service, persists and returns the plan.
func (h *Handler) Generate(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var req models.WorkoutGenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.service.Generate(userID, req)
	if err != nil {
		var cooldownErr *CooldownError
		if errors.As(err, &cooldownErr) {
			response.TooManyRequests(c, ErrCooldownActive.Error(), map[string]interface{}{
				"next_available_at": cooldownErr.NextAvailableAt,
			})
			return
		}
		response.InternalServerError(c, err.Error())
		return
	}

	response.Created(c, "workout generated successfully", result)
}

// List godoc
// GET /api/v1/workouts
// Returns a summary list (id, title, overview, created_at) of all the user's workouts.
func (h *Handler) List(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	workouts, err := h.service.List(userID)
	if err != nil {
		response.InternalServerError(c, "failed to list workouts")
		return
	}

	response.OK(c, "workouts retrieved", workouts)
}

// GetLatest godoc
// GET /api/v1/workouts/latest
// Returns the most recent workout with its full plan.
func (h *Handler) GetLatest(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	workout, err := h.service.GetLatest(userID)
	if err != nil {
		if errors.Is(err, ErrWorkoutNotFound) {
			response.NotFound(c, "no workouts found for this user")
			return
		}
		response.InternalServerError(c, "failed to get latest workout")
		return
	}

	response.OK(c, "workout retrieved", workout)
}

// GetByID godoc
// GET /api/v1/workouts/:id
// Returns a specific workout by its ID (must belong to the authenticated user).
func (h *Handler) GetByID(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		response.BadRequest(c, "invalid workout id")
		return
	}

	workout, err := h.service.GetByID(uint(id), userID)
	if err != nil {
		if errors.Is(err, ErrWorkoutNotFound) {
			response.NotFound(c, "workout not found")
			return
		}
		response.InternalServerError(c, "failed to get workout")
		return
	}

	response.OK(c, "workout retrieved", workout)
}
