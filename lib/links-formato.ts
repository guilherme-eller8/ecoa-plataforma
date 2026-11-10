// Formato do token dos links sem login (família e autor): "v{versao}_" + 22 caracteres.
// Puro: serve ao servidor e aos testes. A validade de verdade é o banco que decide.
import { z } from "zod";

export const tokenValido = z.string().regex(/^v[0-9]{1,2}_[A-Za-z0-9_-]{22}$/);
