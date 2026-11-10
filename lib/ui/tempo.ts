// Cronômetro do gravador: 0 → "0:00", 75 → "1:15", 3725 → "1:02:05".
export function formatarCronometro(segundos: number): string {
  const total = Math.max(
    0,
    Math.floor(Number.isFinite(segundos) ? segundos : 0),
  );
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

// Duração falada para leitores de tela e legendas: 75 → "1 min 15 s".
export function falarDuracao(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}
