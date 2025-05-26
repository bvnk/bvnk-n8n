import {
	ICredentialType,
	INodeProperties,
	IHttpRequestOptions,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import crypto from 'crypto';
import { URL } from 'url';
import { Buffer } from 'buffer';

// Generic Hawk Authentication Credentials
export class HawkAuthApi implements ICredentialType {
	name = 'hawkAuthApi';
	displayName = 'Hawk Authentication API';
	properties: INodeProperties[] = [
		{
			displayName: 'Hawk ID',
			name: 'hawkId',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Hawk Secret',
			name: 'hawkSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Enable Payload Hashing',
			name: 'enablePayloadHashing',
			type: 'boolean',
			default: false,
		},
	];

	public getProperties(): INodeProperties[] {
		return this.properties;
	}

	async authenticate(
		credentials: ICredentialDataDecryptedObject,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const hawkId = credentials.hawkId as string;
		const hawkSecret = credentials.hawkSecret as string;
		const enablePayloadHashing = credentials.enablePayloadHashing as boolean;

		const timestamp = Math.floor(Date.now() / 1000);
		const nonce = crypto.randomBytes(6).toString('hex');

		const method = (requestOptions.method || 'GET').toUpperCase();
		const fullUrl = new URL(requestOptions.url);

		let pathWithQuery = fullUrl.pathname;
		if (fullUrl.search) {
			pathWithQuery += fullUrl.search;
		}

		const host = fullUrl.hostname;
		let port = fullUrl.port;
		if (!port) {
			port = fullUrl.protocol === 'https:' ? '443' : '80';
		}

		let bodyMacHash = '';
		let bodyForNormalizedString = '';

		if (enablePayloadHashing) {
			const hashInstance = crypto.createHash('sha256');
			if (requestOptions.body !== undefined && requestOptions.body !== null) {
				if (typeof requestOptions.body === 'object' && requestOptions.json === true) {
					hashInstance.update(JSON.stringify(requestOptions.body));
				} else if (typeof requestOptions.body === 'string') {
					hashInstance.update(requestOptions.body);
				} else if (Buffer.isBuffer(requestOptions.body)) {
					hashInstance.update(requestOptions.body);
				} else {
					hashInstance.update('');
				}
			} else {
				hashInstance.update('');
			}
			bodyMacHash = hashInstance.digest('base64');
			bodyForNormalizedString = bodyMacHash;
		}

		const normalizedString = `hawk.1.header
${timestamp}
${nonce}
${method}
${pathWithQuery}
${host}
${port}
${bodyForNormalizedString}

`;

		const mac = crypto
			.createHmac('sha256', hawkSecret)
			.update(normalizedString)
			.digest('base64');

		let authorizationHeader = `Hawk id="${hawkId}", ts="${timestamp}", nonce="${nonce}", mac="${mac}"`;

		if (enablePayloadHashing && bodyMacHash) {
			authorizationHeader += `, hash="${bodyMacHash}"`;
		}

		if (!requestOptions.headers) {
			requestOptions.headers = {};
		}
		requestOptions.headers.Authorization = authorizationHeader;

		return requestOptions;
	}
} 