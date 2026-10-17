import { relayLanRequest } from '../../../../server/lan-relay'

export const runtime = 'nodejs'
type Context = { params: Promise<{ target: string[] }> }
export async function GET(request: Request, context: Context): Promise<Response> {
  return relayLanRequest(request, (await context.params).target)
}
export async function POST(request: Request, context: Context): Promise<Response> {
  return relayLanRequest(request, (await context.params).target)
}
