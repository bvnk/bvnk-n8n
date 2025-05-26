import { IDataObject, INodeType, INodeTypeDescription, IWebhookFunctions, IWebhookResponseData, NodeConnectionType } from 'n8n-workflow';
import * as crypto from 'crypto';

export class BvnkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Payment Status Changed Trigger',
		name: 'bvnkTrigger',
		icon: 'file:bvnk.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers a workflow when a BVNK webhook is received with specific payment status.',
		defaults: {
			name: 'Payment Status Changed',
		},
		inputs: [],
		outputs: ['main' as NodeConnectionType],
		credentials: [
			{
				name: 'bvnkApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				isFullPath: true,
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'bvnk/webhook',
			},
		],
		properties: [],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = req.body as IDataObject; // Parsed body
		const headers = req.headers;

		const credentials = await this.getCredentials('bvnkApi');
		const secretKey = credentials.webhookSecret as string;

		const bvnkSignature = headers['x-signature'] as string; 

		if (!bvnkSignature) {
			console.log('BVNK Trigger: Missing signature header (expected x-signature)');
			return { workflowData: [] }; 
		}

		const webhookUrl = this.getNodeWebhookUrl('default') as string;
		if (!webhookUrl) {
			console.error('BVNK Trigger: Could not determine webhook URL.');
			return { workflowData: [] };
		}

		console.log(req.rawBody);

		const requestURL = new URL(webhookUrl);
		const contentType = headers['content-type'] as string || 'application/json';

		const rawBody = String.fromCharCode(...req.rawBody);

		const bodyToHash = `${requestURL.pathname}${contentType}${rawBody}`;

		const hasher = crypto.createHmac('sha256', secretKey);
		hasher.update(bodyToHash);
		const calculatedSignature = hasher.digest('hex');

		if (calculatedSignature !== bvnkSignature) {
			console.warn('BVNK Trigger: Invalid signature.');
			console.log(`  Received Signature: ${bvnkSignature}`);
			console.log(`  Calculated Signature: ${calculatedSignature}`);
			console.log(`  Webhook Pathname used: ${requestURL.pathname}`);
			console.log(`  Content-Type used: ${contentType}`);
			return { workflowData: [] };
		}

		// Ensure body.source and body.event exist before accessing them
		if (body && body.source === 'payment' && body.event === 'statusChanged') {
			return {
				workflowData: [
					this.helpers.returnJsonArray([body]),
				],
			};
		} else {
			console.log(`BVNK Trigger: Received event source: ${body?.source}, event: ${body?.event}. Expected 'payment' and 'statusChanged'. Ignoring.`);
			return { workflowData: [] };
		}
	}
} 