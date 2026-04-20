package main

import (
	"fmt"
	"log"
	"os"

	"github.com/funcione/backend/internal/auth"
	"github.com/funcione/backend/internal/database"
	"github.com/funcione/backend/internal/middleware"
	"github.com/funcione/backend/internal/models"
	"github.com/funcione/backend/internal/workout"
	"github.com/funcione/backend/pkg/config"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Println("no .env file found, reading environment variables")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.Connect(&cfg.Database)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err := db.AutoMigrate(&models.User{}, &models.Workout{}); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	authRepo := auth.NewRepository(db)
	authSvc := auth.NewService(authRepo, cfg.JWT, cfg.Google)
	authHandler := auth.NewHandler(authSvc, cfg.Server.FrontendURL)

	workoutRepo := workout.NewRepository(db)
	workoutSvc := workout.NewService(workoutRepo, cfg.AI)
	workoutHandler := workout.NewHandler(workoutSvc)

	router := gin.Default()
	router.Use(corsMiddleware())

	v1 := router.Group("/api/v1")
	{
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.GET("/google", authHandler.GoogleLogin)
			authRoutes.GET("/google/callback", authHandler.GoogleCallback)
		}

		protected := v1.Group("/")
		protected.Use(middleware.AuthRequired(authSvc))
		{
			protected.GET("/profile", authHandler.Profile)

			workoutRoutes := protected.Group("workouts")
			{
				workoutRoutes.POST("/generate", workoutHandler.Generate)
				workoutRoutes.GET("", workoutHandler.List)
				workoutRoutes.GET("/latest", workoutHandler.GetLatest)
				workoutRoutes.GET("/:id", workoutHandler.GetByID)
			}
		}
	}

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	addr := fmt.Sprintf(":%s", cfg.Server.Port)
	log.Printf("server running on %s", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
