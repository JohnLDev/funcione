import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CategoriaExercicio,
  IntensidadeTreino,
  NivelExperiencia,
  NivelImpacto,
  ObjetivoTreino,
  TempoDisponivel,
} from './enums.js';
import {
  getCategoriasPorObjetivo,
  getIntensidadesSemana,
  getPoliticaImpacto,
  getQuantidadeTreinos,
} from './policies.js';

describe('training domain policies', () => {
  it('maps exact weekly availability to workout count', () => {
    assert.equal(getQuantidadeTreinos(TempoDisponivel.DuasVezesPorSemana), 2);
    assert.equal(getQuantidadeTreinos(TempoDisponivel.SeteVezesPorSemana), 7);
  });

  it('prioritizes categories from structured goals', () => {
    const categorias = getCategoriasPorObjetivo([
      ObjetivoTreino.Performance,
      ObjetivoTreino.PrevencaoLesao,
    ]);

    assert.equal(categorias[0], CategoriaExercicio.Forca);
    assert.ok(categorias.includes(CategoriaExercicio.Pliometria));
    assert.ok(categorias.includes(CategoriaExercicio.Mobilidade));
  });

  it('does not assign intense workouts to beginners', () => {
    const intensidades = getIntensidadesSemana(
      TempoDisponivel.CincoVezesPorSemana,
      NivelExperiencia.Iniciante,
    );

    assert.equal(intensidades.length, 5);
    assert.ok(!intensidades.includes(IntensidadeTreino.Intensa));
  });

  it('reduces impact for older or heavier athletes', () => {
    const politica = getPoliticaImpacto({
      idade: 52,
      pesoKg: 105,
      alturaCm: 169,
      lesoes: [],
    });

    assert.equal(politica.nivel, NivelImpacto.Baixo);
    assert.ok(politica.motivos.length >= 2);
  });
});
