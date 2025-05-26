import { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, NodeOperationError, NodeConnectionType, IHttpRequestMethods, IDataObject, IRequestOptions } from 'n8n-workflow';

export class Bvnk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'BVNK',
		name: 'bvnk',
		group: ['transform'],
		version: 1,
		description: 'Interact with BVNK API',
		defaults: {
			name: 'List Wallets',
		},
        icon: 'file:bvnk.svg',
		inputs: ['main'] as NodeConnectionType[],
		outputs: ['main'] as NodeConnectionType[],
		credentials: [
			{
				name: 'bvnkApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'List Wallets',
						value: 'listWallets',
						description: 'List all wallets',
						action: 'List wallets',
					},
					{
						name: 'Custom API Call',
						value: 'customApiCall',
						description: 'Perform a custom API call',
						action: 'Perform a custom API call',
					},
				],
				default: 'listWallets',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'GET',
				displayOptions: {
					show: {
						operation: ['customApiCall'],
					},
				},
				description: 'The HTTP method to use for the API call',
			},
			{
				displayName: 'API Path',
				name: 'apiPath',
				type: 'string',
				default: '/api/wallet',
				required: true,
				displayOptions: {
					show: {
						operation: ['customApiCall'],
					},
				},
				description: 'The path for the API endpoint (e.g., /api/wallet)',
				placeholder: '/api/wallet',
			},
			{
				displayName: 'Request Body (JSON)',
				name: 'requestBody',
				type: 'json',
				default: '',
				displayOptions: {
					show: {
						operation: ['customApiCall'],
					},
				},
				description: 'Optional JSON request body',
				placeholder: '{\\"key\\": \\"value\\"}',
			}
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let returnItems: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0, '') as string;
		const credentials = await this.getCredentials('bvnkApi');
		const baseUrl = credentials.baseUrl as string || 'https://api.bvnk.com';

		if (operation === 'listWallets') {
			const options: IRequestOptions = {
				method: 'GET' as IHttpRequestMethods,
				url: `${baseUrl}/api/wallet`,
				headers: {
					'Content-Type': 'application/json',
				},
        // Hawk authentication will be added here later
				json: true,
			};

			try {
				const responseData = await this.helpers.requestWithAuthentication.call(this, 'bvnkApi', options);
				returnItems = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: 0 } },
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray([{ error: (error as Error).message }]),
						{ itemData: { item: 0 } },
					);
					return [returnItems];
				} else {
					throw new NodeOperationError(this.getNode(), error as Error);
				}
			}
		} else if (operation === 'customApiCall') {
			const httpMethod = this.getNodeParameter('httpMethod', 0, 'GET') as IHttpRequestMethods;
			const apiPath = this.getNodeParameter('apiPath', 0, '') as string;
			const requestBodyString = this.getNodeParameter('requestBody', 0, '') as string;

			if (!apiPath || !apiPath.startsWith('/')) {
				throw new NodeOperationError(this.getNode(), new Error("API Path must be specified and start with a '/'"));
			}

			const options: IRequestOptions = {
				method: httpMethod,
				url: `${baseUrl}${apiPath}`,
				headers: {},
				json: true, // Assume JSON response by default, adjust if necessary
			};

			if (requestBodyString) {
				try {
					options.body = JSON.parse(requestBodyString);
					options.headers!['Content-Type'] = 'application/json';
				} catch (error) {
					throw new NodeOperationError(this.getNode(), new Error(`Invalid JSON in Request Body: ${(error as Error).message}`));
				}
			}
			
			// Remove Content-Type if method is GET or DELETE and no body is explicitly set (even if body was empty string)
			if ((httpMethod === 'GET' || httpMethod === 'DELETE') && !options.body) {
				delete options.headers!['Content-Type'];
			}


			try {
				const responseData = await this.helpers.requestWithAuthentication.call(this, 'bvnkApi', options);
				returnItems = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[] | IDataObject), // Response could be an object or array
					{ itemData: { item: 0 } },
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnItems = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray([{ error: (error as Error).message }]),
						{ itemData: { item: 0 } },
					);
					return [returnItems];
				} else {
					throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: 0 });
				}
			}
		}


		return [returnItems];
	}
} 