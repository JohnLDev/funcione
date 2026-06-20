import {
  DadosUsuarioSchema,
  type DadosUsuario,
  type LesaoUsuario,
} from '../schemas.js';
import {
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  TempoDisponivel,
} from '../enums.js';

export class Athlete {
  private readonly props: DadosUsuario;

  constructor(props: DadosUsuario) {
    this.props = DadosUsuarioSchema.parse(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get modalidade(): ModalidadeEsportiva {
    return this.props.modalidade;
  }

  get nivelExperiencia(): NivelExperiencia {
    return this.props.nivelExperiencia;
  }

  get tempoDisponivel(): TempoDisponivel {
    return this.props.tempoDisponivel;
  }

  get localTreino(): LocalTreino {
    return this.props.localTreino;
  }

  get lesoes(): LesaoUsuario[] {
    return [...this.props.lesoes];
  }

  toDTO(): DadosUsuario {
    return {
      ...this.props,
      lesoes: [...this.props.lesoes],
    };
  }
}
