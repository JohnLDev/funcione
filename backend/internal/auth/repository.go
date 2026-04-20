package auth

import (
	"github.com/funcione/backend/internal/models"
	"gorm.io/gorm"
)

type Repository interface {
	CreateUser(user *models.User) error
	FindUserByEmail(email string) (*models.User, error)
	FindUserByID(id uint) (*models.User, error)
	FindUserByGoogleID(googleID string) (*models.User, error)
	LinkGoogleAccount(userID uint, googleID string) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateUser(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *repository) FindUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) FindUserByID(id uint) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *repository) FindUserByGoogleID(googleID string) (*models.User, error) {
	var user models.User
	err := r.db.Where("google_id = ?", googleID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// LinkGoogleAccount attaches a Google ID to an existing user without changing
// their provider, so they can continue using their password too.
func (r *repository) LinkGoogleAccount(userID uint, googleID string) error {
	return r.db.Model(&models.User{}).
		Where("id = ?", userID).
		Update("google_id", googleID).Error
}
