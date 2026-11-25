import type { Challenge as Definition } from '../content/pack'
import { MatchPairs } from './MatchPairs'
import { MathChoice } from './MathChoice'
import { TraceChallenge } from './TraceChallenge'

export function Challenge({ definition, busy, onComplete }: {
  definition: Definition
  busy: boolean
  onComplete: () => void
}) {
  const props = { busy, onComplete }
  switch (definition.type) {
    case 'TRACE_PATH': return <TraceChallenge challenge={definition} {...props} />
    case 'MATH_CHOICE': return <MathChoice challenge={definition} {...props} />
    case 'MATCH_PAIRS': return <MatchPairs challenge={definition} {...props} />
  }
}
