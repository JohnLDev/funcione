import { AlongamentoSchema, type AlongamentoDTO } from '../schemas.js';

export class Stretching {
  private readonly props: AlongamentoDTO;

  constructor(props: AlongamentoDTO) {
    this.props = AlongamentoSchema.parse(props);

    if (this.props.duracaoSegundos <= 0) {
      throw new Error('Stretching duracaoSegundos deve ser maior que zero.');
    }
  }

  static fromDTO(dto: AlongamentoDTO): Stretching {
    return new Stretching(dto);
  }

  toDTO(): AlongamentoDTO {
    return { ...this.props };
  }
}
