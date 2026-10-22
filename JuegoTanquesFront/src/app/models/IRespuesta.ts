export interface IRespuesta<T> {
  error?: string | null;
  data?: T | null;
  mensaje?: string;
}
