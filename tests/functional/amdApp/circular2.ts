import { getMessage as circular1Message } from './circular1';

export default function (): string {
	return 'circular2';
}

export function getMessage(): string {
	return circular1Message();
}
