import type { TreinoAnterior } from '../schemas.js';

export class TrainingHistory {
  private readonly props: TreinoAnterior;

  constructor(props: TreinoAnterior) {
    if (!props.userId.trim()) {
      throw new Error('TrainingHistory userId é obrigatório.');
    }

    if (!props.feedback.trim()) {
      throw new Error('TrainingHistory feedback é obrigatório.');
    }

    this.props = props;
  }

  get userId(): string {
    return this.props.userId;
  }

  toDTO(): TreinoAnterior {
    return { ...this.props };
  }
}
