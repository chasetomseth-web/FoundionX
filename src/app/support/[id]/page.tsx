import SupportTicketView from './ticket-view';

export default function SupportTicketRoute({ params }: { params: { id: string } }) {
  return <SupportTicketView ticketId={params.id} />;
}


