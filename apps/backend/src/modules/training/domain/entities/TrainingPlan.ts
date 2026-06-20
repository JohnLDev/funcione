import { TrainingSession } from './TrainingSession.js';
import { PlanoTreinoSchema, type PlanoTreino } from '../schemas.js';

export class TrainingPlan {
  private readonly resumo: string;
  private readonly treinos: TrainingSession[];

  constructor(props: PlanoTreino) {
    const parsedProps = PlanoTreinoSchema.parse(props);

    this.resumo = parsedProps.resumo;
    this.treinos = parsedProps.treinos.map(TrainingSession.fromDTO);
  }

  static fromDTO(dto: PlanoTreino): TrainingPlan {
    return new TrainingPlan(dto);
  }

  toDTO(): PlanoTreino {
    return {
      resumo: this.resumo,
      treinos: this.treinos.map((treino) => treino.toDTO()),
    };
  }
}
