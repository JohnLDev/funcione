import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EquipamentoTreino,
  GravidadeLesao,
  LocalTreino,
  ModalidadeEsportiva,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  TipoLesao,
} from './enums.js';
import { CreateMonthlyTrainingPlanRequestSchema } from './schemas.js';

const validRequest = {
  alturaCm: 180,
  duracaoTreinoMinutos: 60,
  equipamentos: [{ tipo: EquipamentoTreino.Halteres }],
  lesoes: [
    {
      gravidade: GravidadeLesao.Moderada,
      observacoes: 'Evitar impacto repetido.',
      tipo: TipoLesao.Joelho,
    },
  ],
  localTreino: LocalTreino.Casa,
  modalidade: ModalidadeEsportiva.Volei,
  nivelExperiencia: NivelExperiencia.Intermediario,
  objetivos: [ObjetivoTreino.Performance],
  pesoKg: 82,
  tempoDisponivel: TempoDisponivel.TresVezesPorSemana,
};

describe('monthly training plan request schema', () => {
  it('accepts only the five supported training durations', () => {
    for (const duration of [30, 45, 60, 75, 90]) {
      assert.equal(
        CreateMonthlyTrainingPlanRequestSchema.safeParse({
          ...validRequest,
          duracaoTreinoMinutos: duration,
        }).success,
        true,
      );
    }

    assert.equal(
      CreateMonthlyTrainingPlanRequestSchema.safeParse({
        ...validRequest,
        duracaoTreinoMinutos: 50,
      }).success,
      false,
    );
  });

  it('requires a severity for every predefined and custom injury', () => {
    for (const injury of [
      { tipo: TipoLesao.Joelho },
      { descricao: 'Panturrilha', tipo: TipoLesao.Customizada },
    ]) {
      assert.equal(
        CreateMonthlyTrainingPlanRequestSchema.safeParse({
          ...validRequest,
          lesoes: [injury],
        }).success,
        false,
      );
    }
  });

  it('rejects duplicate goals, equipment types, and injury types', () => {
    const duplicateCollections = [
      {
        objetivos: [ObjetivoTreino.Performance, ObjetivoTreino.Performance],
      },
      {
        equipamentos: [
          { tipo: EquipamentoTreino.Halteres },
          { tipo: EquipamentoTreino.Halteres },
        ],
      },
      {
        lesoes: [
          { gravidade: GravidadeLesao.Leve, tipo: TipoLesao.Joelho },
          { gravidade: GravidadeLesao.Alta, tipo: TipoLesao.Joelho },
        ],
      },
    ];

    for (const collection of duplicateCollections) {
      assert.equal(
        CreateMonthlyTrainingPlanRequestSchema.safeParse({
          ...validRequest,
          ...collection,
        }).success,
        false,
      );
    }
  });

  it('caps goals, equipment, and injuries at their supported option counts', () => {
    assert.equal(
      CreateMonthlyTrainingPlanRequestSchema.safeParse({
        ...validRequest,
        objetivos: Array.from(
          { length: Object.values(ObjetivoTreino).length + 1 },
          () => ObjetivoTreino.Performance,
        ),
      }).success,
      false,
    );
    assert.equal(
      CreateMonthlyTrainingPlanRequestSchema.safeParse({
        ...validRequest,
        equipamentos: Array.from(
          { length: Object.values(EquipamentoTreino).length + 1 },
          () => ({ tipo: EquipamentoTreino.Halteres }),
        ),
      }).success,
      false,
    );
    assert.equal(
      CreateMonthlyTrainingPlanRequestSchema.safeParse({
        ...validRequest,
        lesoes: Array.from(
          { length: Object.values(TipoLesao).length + 1 },
          () => ({ gravidade: GravidadeLesao.Leve, tipo: TipoLesao.Joelho }),
        ),
      }).success,
      false,
    );
  });
});
