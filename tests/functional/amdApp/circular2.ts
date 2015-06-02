import * as circular1 from './circular1';

export default function (): string {
	return 'circular2';
}

export function circular1Message(): string {
	return circular1.getMessage();
}
