export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
export type FitnessGoal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'endurance'
  | 'flexibility'
  | 'general_fitness';
export type Equipment =
  | 'none'
  | 'dumbbells'
  | 'barbell'
  | 'resistance_bands'
  | 'pull_up_bar'
  | 'full_gym';

export interface QuestionnaireAnswers {
  level: FitnessLevel;
  goal: FitnessGoal;
  daysPerWeek: number;
  equipment: Equipment;
  age: number;
  weightKg: number;
  heightCm: number;
  restrictions: string;
  additionalInfo: string;
}

export interface Exercise {
  name: string;
  sets: string | null;
  reps: string | null;
  duration: string | null;
  rest: string | null;
  notes: string | null;
}

export interface WorkoutDay {
  label: string;
  focus: string;
  color: string;
  warmUp: string | null;
  coolDown: string | null;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  title: string;
  overview: string;
  days: WorkoutDay[];
  generalTips: string[];
  nutritionNotes: string | null;
  createdAt: string;
  profile: QuestionnaireAnswers;
}

export interface User {
  id: number;
  name: string;
  email: string;
  provider: string;
}

export type AppPage = 'login' | 'questionnaire' | 'dashboard';
