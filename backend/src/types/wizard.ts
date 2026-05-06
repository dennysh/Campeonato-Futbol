export type Genero = 'masculino' | 'femenino';

export interface CategoriaSeleccionada {
  sub: number;
  genero: Genero;
  num_equipos: number;
}

export interface ConfigCancha {
  num_canchas: number;
  hora_inicio: string;
  hora_fin: string;
}
