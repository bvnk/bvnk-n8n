import { HawkAuthApi } from './HawkAuthApi.credentials';

// BVNK API Credentials
export class BvnkApi extends HawkAuthApi {
	name = 'bvnkApi';
	displayName = 'BVNK API';
	documentationUrl = 'https://docs.bvnk.com/reference/authentication';

	constructor() {
		super(); // Call the parent constructor
		this.properties = [
			// Inherit properties from HawkAuthApi
			...super.getProperties(),
			// Add BVNK-specific baseUrl
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: 'https://api.bvnk.com',
				description: 'The base URL for the BVNK API. Defaults to https://api.bvnk.com',
			},
			{
				displayName: 'Webhook Secret',
				name: 'webhookSecret',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				placeholder: 'Enter your BVNK webhook secret',
				description: 'The secret key used to verify webhook signatures. Found in your BVNK merchant account settings.',
			}
		];
	}
} 