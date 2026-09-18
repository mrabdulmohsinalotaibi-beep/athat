import { createLazyFileRoute } from "@tanstack/react-router";

import MessagesDashboard from "../../components/MessagesDashboard";

export const Route = createLazyFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <MessagesDashboard />
    </div>
  );
}
