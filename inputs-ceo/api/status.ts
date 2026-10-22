import { tratarStatus } from '../server/http.js'

export function GET(): Response {
  return tratarStatus()
}
