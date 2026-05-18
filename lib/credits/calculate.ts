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
// Uses the place_credit_hold RPC so the balance check + hold insert happen
// atomically inside a single Postgres transaction (with an advisory lock per
// user), preventing concurrent requests from overdrawing the account.
export async function holdCredits(
  userId: string,
  estimatedCredits: number,
  agentRunId: string,
  projectId: string
): Promise<string> {
  const supabase = getServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('place_credit_hold', {
    p_user_id: userId,
    p_amount: estimatedCredits,
    p_agent_run_id: agentRunId,
    p_project_id: projectId,
  }) as { data: string | null; error: { message: string } | null }
  if (error) {
    if (error.message.includes('INSUFFICIENT_CREDITS')) {
      throw new Error('INSUFFICIENT_CREDITS')
    }
    throw new Error(`Credit hold failed: ${error.message}`)
  }
  return data as string
}

// Calculates actual credits used from real token counts, then:
// 1. Inserts a refund transaction that cancels the ENTIRE original hold
//    (+estimatedCredits), and
// 2. Inserts a deduct transaction for the actual usage (-actualCredits).
// Net balance impact = -estimated (hold) + estimated (refund) - actual = -actual.
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

  // The refund cancels the FULL original hold (-estimatedCredits), and the
  // deduct charges the actual usage. The refund is unconditional — it must
  // always be inserted to reverse the hold, regardless of actual usage.
  const holdCancellationAmount = estimatedCredits
  const supabase = getServiceClient()

  // Insert refund (full hold cancellation) + deduct (actual usage) in one batch
  const rows: CreditTransactionInsert[] = [
    {
      user_id: userId,
      agent_run_id: agentRunId,
      project_id: projectId,
      type: 'refund',
      amount: holdCancellationAmount,
      model_id: modelId,
      tokens_input: 0,
      tokens_output: 0,
    },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('credit_transactions')
    .insert(rows) as { error: { message: string } | null }
  if (error) throw new Error(`Credit finalize failed: ${error.message}`)

  return actualCredits
}

// Cancels an orphaned hold when a run never reaches finalizeCredits (stream
// error/abort, or finalize itself threw before inserting anything). Inserts a
// single refund of +estimatedCredits to fully reverse the original hold.
//
// Safe against double-refund: finalizeCredits inserts its refund+deduct as ONE
// atomic .insert([...]) — if it threw, neither row landed, so this standalone
// cancellation is the only reversal. Must use the service client because after
// migration 011 RLS denies all authenticated-role writes to credit_transactions.
export async function cancelHold(
  userId: string,
  estimatedCredits: number,
  agentRunId: string,
  projectId: string
): Promise<void> {
  const supabase = getServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('credit_transactions')
    .insert({
      user_id: userId,
      agent_run_id: agentRunId,
      project_id: projectId,
      type: 'refund',
      amount: estimatedCredits,
      model_id: null,
      tokens_input: 0,
      tokens_output: 0,
    }) as { error: { message: string } | null }
  if (error) throw new Error(`Credit hold cancellation failed: ${error.message}`)
}
