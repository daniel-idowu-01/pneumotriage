import { ShieldAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

/**
 * Shown wherever a model result is visible. This is core UX, not a
 * disclaimer — see docs/intended-use.md for why every prediction requires
 * clinician confirmation before it is final.
 */
export function DecisionSupportNotice() {
  return (
    <Alert variant="warning">
      <ShieldAlert />
      <AlertTitle>Decision support only — clinician confirmation required</AlertTitle>
      <AlertDescription>
        This result is a screening suggestion, not a diagnosis. It must be
        reviewed against the actual image and clinical context before it
        informs patient care.
      </AlertDescription>
    </Alert>
  )
}
