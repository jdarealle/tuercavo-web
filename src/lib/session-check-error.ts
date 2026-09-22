export class SessionCheckError extends Error {
  constructor(cause: unknown) {
    super('No se pudo consultar la sesión.', { cause })
    this.name = 'SessionCheckError'
  }
}
