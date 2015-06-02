import * as circular2 from './circular2';

export default function (): string {
	return circular2.default();
}

export function getMessage(): string {
	return 'circular1.getMessage';
}
