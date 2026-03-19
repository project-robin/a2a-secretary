## 2025-05-15 - Responsive Layout for Multi-Column Chat Interfaces
**Learning:** Three-column layouts common in agentic desktop UIs (sidebar/chat/context) completely break on mobile without explicit breakpoints. Prioritizing the core chat interaction by hiding non-essential sidebars on small screens is a robust starting point for mobile-friendliness.
**Action:** Always use Tailwind's `lg:flex` and `xl:flex` for multi-column sidebar patterns to ensure the main interaction area is preserved on smaller viewports.
