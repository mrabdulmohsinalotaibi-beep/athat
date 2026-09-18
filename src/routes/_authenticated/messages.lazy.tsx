import { createLazyFileRoute } from '@tanstack/react-router'
import MessagesDashboard from '../components/MessagesDashboard'

export const Route = createLazyFileRoute('/messages')({
  component: MessagesPage,
})

function MessagesPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <MessagesDashboard />
      </div>
    </div>
  )
}