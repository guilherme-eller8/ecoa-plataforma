import { criarLimitador } from "./erros-servidor";

export { digestSeguro, rotaSegura, tipoDoErro } from "./erros-servidor";
/** Um limitador por instância do servidor. */
export const limitador = criarLimitador();
