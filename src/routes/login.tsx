import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Compatibility route for previously shared /login links.
 * The canonical sign-in route is /auth.
 */
export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", search: { next: "" } });
  },
  component: () => null,
});
