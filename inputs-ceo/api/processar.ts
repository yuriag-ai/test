import { tratarProcessar } from '../server/http.js'

export function POST(request: Request): Promise<Response> {
  return tratarProcessar(request)
}
