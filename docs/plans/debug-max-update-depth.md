# Systematic Debugging Log: Max Update Depth Exceeded

## Phase 1: Root Cause Investigation
**Error:** `Maximum update depth exceeded. This can happen when a component calls setState inside useEffect...`
**Stack Trace:**
- `onUserChange` at `src/app/page.tsx:140`
- `useEffect` at `src/components/UserSwitcher.tsx:42`

**Data Flow:**
1. In `src/app/page.tsx`, `<UserSwitcher onUserChange={(user) => { setCurrentUser(user); setMessages([]); }} />` is rendered.
2. The prop `onUserChange` is an anonymous arrow function. A new function instance is created on *every* render of the `Home` component.
3. In `src/components/UserSwitcher.tsx`, there's a `useEffect`:
   ```javascript
   useEffect(() => {
     if (convexUser) {
       onUserChange(convexUser as any);
     }
   }, [convexUser, onUserChange]);
   ```
4. Because `onUserChange` is a new function instance on every render of `Home`, the dependency array `[convexUser, onUserChange]` changes on every render.
5. The `useEffect` runs, calling `onUserChange(convexUser)`.
6. This calls `setCurrentUser(user)` and `setMessages([])` in `Home`.
7. `setCurrentUser` and `setMessages` trigger a re-render of `Home`.
8. `Home` re-renders, creating a NEW `onUserChange` function instance.
9. `UserSwitcher` receives the new `onUserChange` prop.
10. The `useEffect` in `UserSwitcher` sees `onUserChange` has changed, and runs again.
11. Infinite loop: state update -> re-render -> new function instance -> useEffect trigger -> state update -> ...

**Root Cause:**
An anonymous inline function is passed as a prop (`onUserChange`) to a child component (`UserSwitcher`), and that child component includes the prop in a `useEffect` dependency array that triggers state updates in the parent. The parent re-renders, creates a new inline function, and triggers the child's `useEffect` endlessly.

## Phase 2: Pattern Analysis
**Standard React Pattern:**
When passing callbacks down to children that use them in `useEffect` dependencies, the callback must have a stable identity.

**Working Implementations:**
Wrap the callback in `useCallback` in the parent component, and decouple unrelated state updates (like clearing messages) from the callback itself if it requires access to the latest state.

## Phase 3: Hypothesis and Testing
**Hypothesis:**
Wrapping the `onUserChange` function in `useCallback` in `src/app/page.tsx` will provide a stable function identity across renders, breaking the infinite loop. We can update `setCurrentUser` strictly by comparing IDs to avoid unnecessary updates. We can decouple `setMessages([])` into its own `useEffect` that listens for changes to `currentUser`.

## Phase 4: Implementation
I have implemented the fix in `src/app/page.tsx`:
1. Imported `useCallback`.
2. Created a stable `handleUserChange` reference:
```tsx
  const handleUserChange = useCallback((user: User) => {
    setCurrentUser((prev) => prev?._id === user._id ? prev : user);
  }, []);
```
3. Passed it to `UserSwitcher`:
```tsx
<UserSwitcher onUserChange={handleUserChange} />
```
4. Handled `setMessages` in a separate `useEffect`:
```tsx
  useEffect(() => {
    if (currentUser) {
      setMessages([]);
    }
  }, [currentUser]);
```

The lint checks pass (with regards to this hook dependency) and the infinite update loop is resolved.