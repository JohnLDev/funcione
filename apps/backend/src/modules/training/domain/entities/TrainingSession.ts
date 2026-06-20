import { Exercise } from './Exercise.js';
import { Stretching } from './Stretching.js';
import { TreinoSchema, type TreinoDTO } from '../schemas.js';

export class TrainingSession {
  private readonly dia: string;
  private readonly foco: string;
  private readonly duracaoMinutos: number;
  private readonly alongamentos: Stretching[];
  private readonly exercicios: Exercise[];

  constructor(props: TreinoDTO) {
    const parsedProps = TreinoSchema.parse(props);

    if (parsedProps.duracaoMinutos <= 0) {
      throw new Error('TrainingSession duracaoMinutos deve ser maior que zero.');
    }

    this.dia = parsedProps.dia;
    this.foco = parsedProps.foco;
    this.duracaoMinutos = parsedProps.duracaoMinutos;
    this.alongamentos = parsedProps.alongamentos.map(Stretching.fromDTO);
    this.exercicios = parsedProps.exercicios.map(Exercise.fromDTO);
  }

  static fromDTO(dto: TreinoDTO): TrainingSession {
    return new TrainingSession(dto);
  }

  toDTO(): TreinoDTO {
    return {
      dia: this.dia,
      foco: this.foco,
      duracaoMinutos: this.duracaoMinutos,
      alongamentos: this.alongamentos.map((alongamento) => alongamento.toDTO()),
      exercicios: this.exercicios.map((exercicio) => exercicio.toDTO()),
    };
  }
}
