import {
  GravidadeLesao,
  CategoriaExercicio,
  IntensidadeTreino,
  LocalTreino,
  ModalidadeEsportiva,
  NivelImpacto,
  NivelExperiencia,
  ObjetivoTreino,
  TempoDisponivel,
  TipoLesao,
} from './enums.js';

export const nivelExperienciaLabel: Record<NivelExperiencia, string> = {
  [NivelExperiencia.Iniciante]: 'Iniciante',
  [NivelExperiencia.Intermediario]: 'Intermediário',
  [NivelExperiencia.Avancado]: 'Avançado',
  [NivelExperiencia.Profissional]: 'Profissional',
};

export const tempoDisponivelLabel: Record<TempoDisponivel, string> = {
  [TempoDisponivel.DuasVezesPorSemana]: '2x por semana',
  [TempoDisponivel.TresVezesPorSemana]: '3x por semana',
  [TempoDisponivel.QuatroVezesPorSemana]: '4x por semana',
  [TempoDisponivel.CincoVezesPorSemana]: '5x por semana',
  [TempoDisponivel.SeisVezesPorSemana]: '6x por semana',
  [TempoDisponivel.SeteVezesPorSemana]: '7x por semana',
};

export const modalidadeLabel: Record<ModalidadeEsportiva, string> = {
  [ModalidadeEsportiva.Volei]: 'vôlei',
  [ModalidadeEsportiva.Basquete]: 'basquete',
  [ModalidadeEsportiva.FutebolFutsal]: 'futebol/futsal',
  [ModalidadeEsportiva.BeachTenis]: 'beach tennis',
};

export const localTreinoLabel: Record<LocalTreino, string> = {
  [LocalTreino.Academia]: 'academia',
  [LocalTreino.Casa]: 'casa',
  [LocalTreino.ArLivre]: 'ao ar livre',
};

export const tipoLesaoLabel: Record<TipoLesao, string> = {
  [TipoLesao.Joelho]: 'joelho',
  [TipoLesao.Tornozelo]: 'tornozelo',
  [TipoLesao.Ombro]: 'ombro',
  [TipoLesao.Lombar]: 'lombar',
  [TipoLesao.Quadril]: 'quadril',
  [TipoLesao.Punho]: 'punho',
  [TipoLesao.Customizada]: 'customizada',
};

export const gravidadeLesaoLabel: Record<GravidadeLesao, string> = {
  [GravidadeLesao.Leve]: 'leve',
  [GravidadeLesao.Moderada]: 'moderada',
  [GravidadeLesao.Alta]: 'alta',
};

export const objetivoTreinoLabel: Record<ObjetivoTreino, string> = {
  [ObjetivoTreino.Performance]: 'performance esportiva',
  [ObjetivoTreino.Condicionamento]: 'condicionamento físico',
  [ObjetivoTreino.PrevencaoLesao]: 'prevenção de lesões',
  [ObjetivoTreino.PerdaPeso]: 'perda de peso',
  [ObjetivoTreino.GanhoMassa]: 'ganho de massa muscular',
};

export const categoriaExercicioLabel: Record<CategoriaExercicio, string> = {
  [CategoriaExercicio.Forca]: 'força',
  [CategoriaExercicio.Funcional]: 'funcional',
  [CategoriaExercicio.Cardio]: 'cardio',
  [CategoriaExercicio.Pliometria]: 'pliometria',
  [CategoriaExercicio.Mobilidade]: 'mobilidade',
};

export const intensidadeTreinoLabel: Record<IntensidadeTreino, string> = {
  [IntensidadeTreino.Leve]: 'leve',
  [IntensidadeTreino.Moderada]: 'moderada',
  [IntensidadeTreino.Intensa]: 'intensa',
};

export const nivelImpactoLabel: Record<NivelImpacto, string> = {
  [NivelImpacto.Normal]: 'normal',
  [NivelImpacto.Reduzido]: 'reduzido',
  [NivelImpacto.Baixo]: 'baixo',
};

export const focosPorModalidade: Record<ModalidadeEsportiva, string> = {
  [ModalidadeEsportiva.Volei]:
    'salto, agilidade, força de membros superiores, core, aterrissagem e prevenção',
  [ModalidadeEsportiva.Basquete]:
    'mudança de direção, aceleração, desaceleração, salto, core, estabilidade de joelho e tornozelo',
  [ModalidadeEsportiva.FutebolFutsal]:
    'aceleração, agilidade, resistência específica, potência de membros inferiores, core e prevenção de lesões',
  [ModalidadeEsportiva.BeachTenis]:
    'deslocamento na areia, rotação de tronco, potência de membros superiores, core, ombro e prevenção',
};
