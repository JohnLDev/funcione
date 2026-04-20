package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"

	"github.com/funcione/backend/pkg/response"
	"github.com/gin-gonic/gin"
)

const oauthStateCookie = "oauth_state"

type Handler struct {
	service     Service
	frontendURL string
}

func NewHandler(service Service, frontendURL string) *Handler {
	return &Handler{service: service, frontendURL: frontendURL}
}

// Register godoc
// POST /api/v1/auth/register
func (h *Handler) Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.service.Register(input)
	if err != nil {
		if errors.Is(err, ErrEmailAlreadyExists) {
			response.Conflict(c, err.Error())
			return
		}
		response.InternalServerError(c, "failed to register user")
		return
	}

	response.Created(c, "user registered successfully", result)
}

// Login godoc
// POST /api/v1/auth/login
func (h *Handler) Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	result, err := h.service.Login(input)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			response.Unauthorized(c, err.Error())
			return
		}
		if errors.Is(err, ErrPasswordAuth) {
			response.BadRequest(c, err.Error())
			return
		}
		response.InternalServerError(c, "failed to login")
		return
	}

	response.OK(c, "login successful", result)
}

// Profile godoc
// GET /api/v1/profile
func (h *Handler) Profile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		response.Unauthorized(c, "unauthorized")
		return
	}

	user, err := h.service.GetProfile(userID.(uint))
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			response.Unauthorized(c, "user not found")
			return
		}
		response.InternalServerError(c, "failed to get profile")
		return
	}

	response.OK(c, "profile retrieved", user)
}

// GoogleLogin godoc
// GET /api/v1/auth/google
// Redirects the browser to Google's OAuth consent screen.
func (h *Handler) GoogleLogin(c *gin.Context) {
	if !h.service.GoogleEnabled() {
		response.InternalServerError(c, ErrGoogleNotEnabled.Error())
		return
	}

	state, err := generateState()
	if err != nil {
		response.InternalServerError(c, "failed to generate OAuth state")
		return
	}

	// httpOnly cookie valid for 5 minutes — just long enough to complete the flow.
	c.SetCookie(oauthStateCookie, state, 300, "/", "", false, true)
	c.Redirect(http.StatusTemporaryRedirect, h.service.GetGoogleAuthURL(state))
}

// GoogleCallback godoc
// GET /api/v1/auth/google/callback
// Handles the redirect from Google, creates/finds the user, and redirects the
// frontend to FRONTEND_URL/auth/callback?token=<jwt>
// On error redirects to FRONTEND_URL/auth/error?message=<description>
func (h *Handler) GoogleCallback(c *gin.Context) {
	cookieState, err := c.Cookie(oauthStateCookie)
	if err != nil || cookieState != c.Query("state") {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendErrorURL("invalid OAuth state — possible CSRF"))
		return
	}

	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendErrorURL("missing authorization code"))
		return
	}

	result, err := h.service.HandleGoogleCallback(c.Request.Context(), code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, h.frontendErrorURL(err.Error()))
		return
	}

	c.Redirect(
		http.StatusTemporaryRedirect,
		fmt.Sprintf("%s/auth/callback?token=%s", h.frontendURL, result.Token),
	)
}

// ---- helpers ----

func generateState() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

func (h *Handler) frontendErrorURL(msg string) string {
	return fmt.Sprintf("%s/auth/error?message=%s", h.frontendURL, msg)
}
