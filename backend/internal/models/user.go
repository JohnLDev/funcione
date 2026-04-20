package models

import (
	"time"
)

// AuthProvider identifies how the user created their account.
type AuthProvider string

const (
	ProviderLocal  AuthProvider = "local"
	ProviderGoogle AuthProvider = "google"
)

// User represents a registered account. Password is nullable to support
// social-only registrations (Google OAuth). GoogleID is nullable for
// users who registered with email/password.
type User struct {
	ID        uint         `gorm:"primaryKey;autoIncrement"          json:"id"`
	Name      string       `gorm:"not null"                          json:"name"`
	Email     string       `gorm:"uniqueIndex;not null"              json:"email"`
	Password  *string      `gorm:"default:null"                      json:"-"`
	Provider  AuthProvider `gorm:"not null;default:'local'"          json:"provider"`
	GoogleID  *string      `gorm:"uniqueIndex;default:null"          json:"-"`
	CreatedAt time.Time    `                                         json:"created_at"`
	UpdatedAt time.Time    `                                         json:"updated_at"`
}
