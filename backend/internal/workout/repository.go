package workout

import (
	"github.com/funcione/backend/internal/models"
	"gorm.io/gorm"
)

type Repository interface {
	Create(workout *models.Workout) error
	FindByUserID(userID uint) ([]models.Workout, error)
	FindLatestByUserID(userID uint) (*models.Workout, error)
	FindByIDAndUserID(id, userID uint) (*models.Workout, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(workout *models.Workout) error {
	return r.db.Create(workout).Error
}

func (r *repository) FindByUserID(userID uint) ([]models.Workout, error) {
	var workouts []models.Workout
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&workouts).Error
	return workouts, err
}

func (r *repository) FindLatestByUserID(userID uint) (*models.Workout, error) {
	var workout models.Workout
	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&workout).Error
	if err != nil {
		return nil, err
	}
	return &workout, nil
}

func (r *repository) FindByIDAndUserID(id, userID uint) (*models.Workout, error) {
	var workout models.Workout
	err := r.db.
		Where("id = ? AND user_id = ?", id, userID).
		First(&workout).Error
	if err != nil {
		return nil, err
	}
	return &workout, nil
}
