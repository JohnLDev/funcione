package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/funcione/backend/internal/models"
	"github.com/funcione/backend/pkg/config"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
)

var (
	ErrEmailAlreadyExists = errors.New("email already in use")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrGoogleNotEnabled   = errors.New("Google OAuth is not configured on this server")
	ErrPasswordAuth       = errors.New("this account uses email/password — please log in with your password")
)

type RegisterInput struct {
	Name     string `json:"name"     binding:"required,min=2"`
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginInput struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// googleUserInfo maps the fields returned by Google's userinfo endpoint.
type googleUserInfo struct {
	Sub           string `json:"sub"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}

type Service interface {
	Register(input RegisterInput) (*AuthResponse, error)
	Login(input LoginInput) (*AuthResponse, error)
	ValidateToken(tokenString string) (*Claims, error)
	GetProfile(userID uint) (*models.User, error)
	// Google OAuth
	GoogleEnabled() bool
	GetGoogleAuthURL(state string) string
	HandleGoogleCallback(ctx context.Context, code string) (*AuthResponse, error)
}

type service struct {
	repo        Repository
	jwtCfg      config.JWTConfig
	googleOAuth *oauth2.Config
	httpClient  *http.Client
}

func NewService(repo Repository, jwtCfg config.JWTConfig, googleCfg config.GoogleConfig) Service {
	var oauthCfg *oauth2.Config
	if googleCfg.ClientID != "" && googleCfg.ClientSecret != "" {
		oauthCfg = &oauth2.Config{
			ClientID:     googleCfg.ClientID,
			ClientSecret: googleCfg.ClientSecret,
			RedirectURL:  googleCfg.RedirectURL,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		}
	}

	return &service{
		repo:        repo,
		jwtCfg:      jwtCfg,
		googleOAuth: oauthCfg,
		httpClient:  &http.Client{Timeout: 15 * time.Second},
	}
}

// ---- Local auth ----

func (s *service) Register(input RegisterInput) (*AuthResponse, error) {
	_, err := s.repo.FindUserByEmail(input.Email)
	if err == nil {
		return nil, ErrEmailAlreadyExists
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	hashed, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	hashedStr := string(hashed)
	user := &models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: &hashedStr,
		Provider: models.ProviderLocal,
	}

	if err := s.repo.CreateUser(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: *user}, nil
}

func (s *service) Login(input LoginInput) (*AuthResponse, error) {
	user, err := s.repo.FindUserByEmail(input.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	// Block login for users that registered exclusively via Google (no password set).
	if user.Provider == models.ProviderGoogle && user.Password == nil {
		return nil, ErrPasswordAuth
	}

	if user.Password == nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.Password), []byte(input.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: token, User: *user}, nil
}

func (s *service) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.jwtCfg.Secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

func (s *service) GetProfile(userID uint) (*models.User, error) {
	user, err := s.repo.FindUserByID(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return user, nil
}

// ---- Google OAuth ----

func (s *service) GoogleEnabled() bool {
	return s.googleOAuth != nil
}

func (s *service) GetGoogleAuthURL(state string) string {
	return s.googleOAuth.AuthCodeURL(state, oauth2.AccessTypeOnline)
}

func (s *service) HandleGoogleCallback(ctx context.Context, code string) (*AuthResponse, error) {
	if !s.GoogleEnabled() {
		return nil, ErrGoogleNotEnabled
	}

	token, err := s.googleOAuth.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange auth code: %w", err)
	}

	info, err := s.fetchGoogleUserInfo(ctx, token)
	if err != nil {
		return nil, err
	}

	user, err := s.findOrCreateGoogleUser(info)
	if err != nil {
		return nil, err
	}

	jwtToken, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{Token: jwtToken, User: *user}, nil
}

func (s *service) fetchGoogleUserInfo(ctx context.Context, token *oauth2.Token) (*googleUserInfo, error) {
	client := s.googleOAuth.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to fetch Google user info: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read Google user info: %w", err)
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("failed to parse Google user info: %w", err)
	}

	return &info, nil
}

// findOrCreateGoogleUser looks up the user by Google ID first, then by email.
// If an existing local account shares the same email, the Google ID is linked
// to it so the user can sign in with either method.
func (s *service) findOrCreateGoogleUser(info *googleUserInfo) (*models.User, error) {
	// 1. Already linked to this Google account.
	user, err := s.repo.FindUserByGoogleID(info.Sub)
	if err == nil {
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 2. Existing account with same email — link the Google ID.
	user, err = s.repo.FindUserByEmail(info.Email)
	if err == nil {
		if linkErr := s.repo.LinkGoogleAccount(user.ID, info.Sub); linkErr != nil {
			return nil, fmt.Errorf("failed to link Google account: %w", linkErr)
		}
		googleID := info.Sub
		user.GoogleID = &googleID
		return user, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// 3. Brand-new user — create with provider=google.
	googleID := info.Sub
	user = &models.User{
		Name:     info.Name,
		Email:    info.Email,
		Provider: models.ProviderGoogle,
		GoogleID: &googleID,
	}
	if err := s.repo.CreateUser(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// ---- shared helpers ----

func (s *service) generateToken(user *models.User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.jwtCfg.ExpirationHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   fmt.Sprintf("%d", user.ID),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtCfg.Secret))
}
