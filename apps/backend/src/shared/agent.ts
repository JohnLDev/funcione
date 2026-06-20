import { ReactAgent } from 'langchain';

export abstract class Agent<TAgent extends ReactAgent = ReactAgent> {
  protected agent: TAgent;

  constructor(agent: TAgent) {
    this.agent = agent;
  }
}
