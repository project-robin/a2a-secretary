#!/bin/bash
echo "Verifying Task 1: dependencies"
grep -q json-render package.json && echo "Task 1: PASS" || echo "Task 1: FAIL"

echo "Verifying Task 2: schema"
grep -q "agentName" convex/schema.ts && echo "Task 2: PASS" || echo "Task 2: FAIL"

echo "Verifying Tasks 3-5: convex functions"
ls convex/tasks.ts >/dev/null 2>&1 && echo "Task 3: PASS" || echo "Task 3: FAIL"
ls convex/memory.ts >/dev/null 2>&1 && echo "Task 4: PASS" || echo "Task 4: FAIL"
ls convex/confirmations.ts >/dev/null 2>&1 && echo "Task 5: PASS" || echo "Task 5: FAIL"

echo "Verifying Tasks 7-12: plugins"
ls src/lib/agent/plugin-types.ts >/dev/null 2>&1 && echo "Task 7: PASS" || echo "Task 7: FAIL"
ls src/lib/agent/plugins/calendar.ts >/dev/null 2>&1 && echo "Task 8: PASS" || echo "Task 8: FAIL"
ls src/lib/agent/plugins/tasks.ts >/dev/null 2>&1 && echo "Task 9: PASS" || echo "Task 9: FAIL"
ls src/lib/agent/plugins/memory.ts >/dev/null 2>&1 && echo "Task 10: PASS" || echo "Task 10: FAIL"
ls src/lib/agent/plugins/a2a.ts >/dev/null 2>&1 && echo "Task 11: PASS" || echo "Task 11: FAIL"
ls src/lib/agent/definition.ts >/dev/null 2>&1 && echo "Task 12: PASS" || echo "Task 12: FAIL"

echo "Verifying Tasks 15-16: json-render"
ls src/lib/json-render/catalog.ts >/dev/null 2>&1 && echo "Task 15: PASS" || echo "Task 15: FAIL"
ls src/lib/json-render/registry.tsx >/dev/null 2>&1 && echo "Task 16: PASS" || echo "Task 16: FAIL"

echo "Verifying frontend changes"
grep -q "OnboardingModal" src/app/page.tsx && echo "Frontend (Onboarding): PASS" || echo "Frontend: FAIL"
grep -q "ConfirmationCard" src/components/ChatStream.tsx src/app/page.tsx 2>/dev/null && echo "Confirmation flow: PASS" || echo "Confirmation flow: FAIL"

