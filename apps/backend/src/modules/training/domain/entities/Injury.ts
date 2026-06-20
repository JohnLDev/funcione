import { LesaoUsuarioSchema, type LesaoUsuario } from '../schemas.js';

export class Injury {
  private readonly props: LesaoUsuario;

  constructor(props: LesaoUsuario) {
    this.props = LesaoUsuarioSchema.parse(props);
  }

  static fromDTO(dto: LesaoUsuario): Injury {
    return new Injury(dto);
  }

  toDTO(): LesaoUsuario {
    return { ...this.props };
  }
}
