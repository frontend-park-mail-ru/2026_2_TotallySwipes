import ticketHbs from './ticket.hbs';

export interface TicketData {
    id: number;
    title: string;
    photoUrl: string;
    time: string;
    date: string;
    city: string;
    address: string | null;
    url: string;
}

export function ticketTemplate(mix: string, ticket: TicketData): string {
    return ticketHbs({ ...ticket, mix });
}
