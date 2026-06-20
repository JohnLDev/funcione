import {
  CategoriaExercicio,
  GravidadeLesao,
  IntensidadeTreino,
  NivelExperiencia,
  NivelImpacto,
  ObjetivoTreino,
  TempoDisponivel,
  TipoLesao,
} from './enums.js';
import type { LesaoUsuario } from './schemas.js';

type PoliticaImpactoInput = {
  idade: number;
  pesoKg: number;
  alturaCm: number;
  lesoes: LesaoUsuario[];
};

export type PoliticaImpacto = {
  nivel: NivelImpacto;
  motivos: string[];
  recomendacoes: string[];
};

const quantidadeTreinosPorDisponibilidade: Record<TempoDisponivel, number> = {
  [TempoDisponivel.DuasVezesPorSemana]: 2,
  [TempoDisponivel.TresVezesPorSemana]: 3,
  [TempoDisponivel.QuatroVezesPorSemana]: 4,
  [TempoDisponivel.CincoVezesPorSemana]: 5,
  [TempoDisponivel.SeisVezesPorSemana]: 6,
  [TempoDisponivel.SeteVezesPorSemana]: 7,
};

const categoriasPorObjetivo: Record<ObjetivoTreino, CategoriaExercicio[]> = {
  [ObjetivoTreino.Performance]: [
    CategoriaExercicio.Forca,
    CategoriaExercicio.Pliometria,
    CategoriaExercicio.Funcional,
  ],
  [ObjetivoTreino.Condicionamento]: [
    CategoriaExercicio.Funcional,
    CategoriaExercicio.Cardio,
    CategoriaExercicio.Mobilidade,
  ],
  [ObjetivoTreino.PrevencaoLesao]: [
    CategoriaExercicio.Funcional,
    CategoriaExercicio.Mobilidade,
    CategoriaExercicio.Forca,
  ],
  [ObjetivoTreino.PerdaPeso]: [
    CategoriaExercicio.Cardio,
    CategoriaExercicio.Funcional,
    CategoriaExercicio.Pliometria,
  ],
  [ObjetivoTreino.GanhoMassa]: [
    CategoriaExercicio.Forca,
    CategoriaExercicio.Funcional,
    CategoriaExercicio.Mobilidade,
  ],
};

export function getQuantidadeTreinos(tempoDisponivel: TempoDisponivel): number {
  return quantidadeTreinosPorDisponibilidade[tempoDisponivel];
}

export function getCategoriasPorObjetivo(
  objetivos: ObjetivoTreino[],
): CategoriaExercicio[] {
  return objetivos.reduce<CategoriaExercicio[]>((categorias, objetivo) => {
    for (const categoria of categoriasPorObjetivo[objetivo]) {
      if (!categorias.includes(categoria)) {
        categorias.push(categoria);
      }
    }

    return categorias;
  }, []);
}

export function getIntensidadesSemana(
  tempoDisponivel: TempoDisponivel,
  nivelExperiencia: NivelExperiencia,
): IntensidadeTreino[] {
  const quantidadeTreinos = getQuantidadeTreinos(tempoDisponivel);
  const ciclo =
    nivelExperiencia === NivelExperiencia.Iniciante
      ? [IntensidadeTreino.Leve, IntensidadeTreino.Moderada]
      : [
          IntensidadeTreino.Moderada,
          IntensidadeTreino.Intensa,
          IntensidadeTreino.Leve,
          IntensidadeTreino.Moderada,
          IntensidadeTreino.Intensa,
          IntensidadeTreino.Leve,
          IntensidadeTreino.Moderada,
        ];

  return Array.from(
    { length: quantidadeTreinos },
    (_, index) => ciclo[index % ciclo.length],
  );
}

export function getPoliticaImpacto({
  idade,
  pesoKg,
  alturaCm,
  lesoes,
}: PoliticaImpactoInput): PoliticaImpacto {
  const motivos: string[] = [];
  const recomendacoes: string[] = [];
  const alturaMetros = alturaCm / 100;
  const imc = pesoKg / (alturaMetros * alturaMetros);

  if (idade >= 50) {
    motivos.push('idade igual ou superior a 50 anos');
    recomendacoes.push('reduzir saltos repetidos e priorizar aterrissagens controladas');
  } else if (idade >= 45) {
    motivos.push('idade igual ou superior a 45 anos');
    recomendacoes.push('aumentar preparação articular e controlar volume total');
  }

  if (pesoKg >= 100) {
    motivos.push('peso corporal acima de 100 kg');
    recomendacoes.push('evitar excesso de impacto articular e progressões pliométricas agressivas');
  }

  if (imc >= 30) {
    motivos.push('IMC estimado acima de 30');
    recomendacoes.push('preferir condicionamento de baixo impacto quando houver alternativa equivalente');
  }

  const lesoesImpacto = lesoes.filter(
    (lesao) =>
      lesao.tipo === TipoLesao.Joelho ||
      lesao.tipo === TipoLesao.Tornozelo ||
      lesao.tipo === TipoLesao.Quadril ||
      lesao.tipo === TipoLesao.Lombar ||
      lesao.gravidade === GravidadeLesao.Alta,
  );

  if (lesoesImpacto.length > 0) {
    motivos.push('lesões ou restrições com influência direta no impacto');
    recomendacoes.push('substituir exercícios que agravem a região lesionada por variações seguras');
  }

  const nivel =
    motivos.length >= 2 || lesoesImpacto.some((lesao) => lesao.gravidade === GravidadeLesao.Alta)
      ? NivelImpacto.Baixo
      : motivos.length === 1
        ? NivelImpacto.Reduzido
        : NivelImpacto.Normal;

  return {
    nivel,
    motivos,
    recomendacoes,
  };
}
