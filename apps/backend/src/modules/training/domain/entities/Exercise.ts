import { ExercicioSchema, type ExercicioDTO } from '../schemas.js';

export class Exercise {
  private readonly props: ExercicioDTO;

  constructor(props: ExercicioDTO) {
    this.props = ExercicioSchema.parse(props);

    if (this.props.series <= 0) {
      throw new Error('Exercise series deve ser maior que zero.');
    }

    if (this.props.repeticoes.trim().length === 0) {
      throw new Error('Exercise repeticoes é obrigatório.');
    }
  }

  static fromDTO(dto: ExercicioDTO): Exercise {
    return new Exercise(dto);
  }

  toDTO(): ExercicioDTO {
    return { ...this.props };
  }
}
