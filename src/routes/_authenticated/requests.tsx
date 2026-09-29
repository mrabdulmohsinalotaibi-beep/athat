import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/requests")({
  beforeLoad: () => {
    throw redirect({ to: "/posts" });
  },
  component: () => null,
});
