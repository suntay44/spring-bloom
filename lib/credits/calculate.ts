// SERVER ONLY — never import this in client components or (auth)/(marketing) routes
import { createClient } from '@supabase/supabase-js'

// Singleton service-role client — created once per server process, not per request.
let _serviceClient: ReturnType<typeof createClient> | null = null

function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _serviceClient
}

export interface CreditUsage {
  tokensInput: number
  tokensOutput: number
  creditsPerMInput: number
  creditsPerMOutput: number
}

interface CreditTransactionInsert {
  user_id: string
  agent_run_id: string
  project_id: string
  type: 'deduct' | 'refund'
  amount: number
  model_id: string
  tokens_input: number
  tokens_output: number
}

// Returns current balance for a user (reads from user_credit_balance view)
export async function getBalance(userId: string): Promise<number> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('user_credit_balance')
    .select('balance')
    .eq('user_id', userId)
    .single() as { data: { balance: number } | null; error: unknown }
  return Number(data?.balance ?? 0)
}

// Places a credit hold before a run starts. Returns the hold transaction id.
export async function holdCredits(
  userId: string,
  estimatedCredits: number,
  agentRunId: string,
  projectId: string
): Promise<string> {
  const supabase = getServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('credit_transactions')
    .insert({
      user_id: userId,
      agent_run_id: agentRunId,
      project_id: projectId,
      type: 'hold',
      amount: -estimatedCredits, // negative = reservation
    })
    .select('id')
    .single() as { data: { id: string } | null; error: { message: string } | null }
  if (error) throw new Error(`Credit hold failed: ${error.message}`)
  return (data as { id: string }).id
}

// Calculates actual credits used from real token counts, then:
// 1. Inserts a deduct transaction for actual usage
// 2. Inserts a refund transaction for unused hold
export async function finalizeCredits(
  userId: string,
  agentRunId: string,
  projectId: string,
  modelId: string,
  usage: CreditUsage,
  estimatedCredits: number
): Promise<number> {
  const actualCredits =
    (usage.tokensInput / 1_000_000) * usage.creditsPerMInput +
    (usage.tokensOutput / 1_000_000) * usage.creditsPerMOutput

  const refundAmount = Math.max(0, estimatedCredits - actualCredits)
  const supabase = getServiceClient()

  // Insert deduct + optional refund in one batch
  const rows: CreditTransactionInsert[] = [
    {
      user_id: userId,
      agent_run_id: agentRunId,
      project_id: projectId,
      type: 'deduct',
      amount: -actualCredits,
      model_id: modelId,
      tokens_input: usage.tokensInput,
      tokens_output: usage.tokensOutput,
    },
  ]

  if (refundAmount > 0.001) {
    rows.push({
      user_id: userId,
      agent_run_id: agentRunId,
      project_id: projectId,
      type: 'refund',
      amount: refundAmount,
      model_id: modelId,
      tokens_input: 0,
      tokens_output: 0,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('credit_transactions')
    .insert(rows) as { error: { message: string } | null }
  if (error) throw new Error(`Credit finalize failed: ${error.message}`)

  return actualCredits
}
