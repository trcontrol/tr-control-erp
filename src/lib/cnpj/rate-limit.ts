/** Limite da API pública CNPJ.ws: 3 consultas por minuto por IP. */
const CNPJ_WS_WINDOW_MS = 60_000;
const CNPJ_WS_MAX_PER_WINDOW = 3;

const cnpjWsCallTimestamps: number[] = [];

function pruneCnpjWsCalls(now: number) {
  while (
    cnpjWsCallTimestamps.length > 0 &&
    cnpjWsCallTimestamps[0]! <= now - CNPJ_WS_WINDOW_MS
  ) {
    cnpjWsCallTimestamps.shift();
  }
}

export function canCallCnpjWs(): boolean {
  const now = Date.now();
  pruneCnpjWsCalls(now);
  return cnpjWsCallTimestamps.length < CNPJ_WS_MAX_PER_WINDOW;
}

/** Registra uma chamada efetiva à CNPJ.ws (chamar só antes do fetch). */
export function recordCnpjWsCall() {
  const now = Date.now();
  pruneCnpjWsCalls(now);
  cnpjWsCallTimestamps.push(now);
}
