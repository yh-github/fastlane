---
description: Rule for UI button disabling behavior across the codebase
---

# Soft Disabling Rule

Unless explicitly requested otherwise, all action buttons in the user interface MUST be **softly disabled** rather than hard disabled (\`disabled={true}\`):

1. **Visual State**:
   - The button visually communicates unreachability or lack of requirements (e.g. \`opacity: 0.55\`, muted/grayed-out colors, subtle border, but maintaining \`cursor: 'pointer'\`).
   - The HTML \`disabled\` attribute is NOT set on the \`<button>\` element.

2. **Interaction Behavior**:
   - Clicking a softly disabled button does not silently fail or execute an invalid action.
   - It intercepts the click and provides an in-world explanation explaining WHY the player cannot perform that action (e.g. via the \`SpeechBubble\` next to the building clerk's face, or an explanation modal).

3. **In-World Reasons**:
   - Distinct, clear in-world feedback should be given for:
     - Insufficient time / hours remaining
     - Physical exhaustion / insufficient Physical Condition
     - Mental burnout / insufficient Mental Condition
     - Insufficient cash / savings
     - Missing requirements (clothes, uniform, degrees, experience, dependability)
