export interface Tournament {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm or HH:mm:ss
  name?: string; // e.g. "Utdrikningslag Daniel Hansen"
  createdAt?: string; // ISO string
}
