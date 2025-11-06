import { AuraPlugin } from './plugin';
import * as google from 'googleapis';

export class GoogleWorkspacePlugin implements AuraPlugin {
  name = 'google-workspace';

  private auth: any;

  async init() {
    // Initialize Google Workspace connection
    this.auth = new (google as any).auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/admin.directory.user']
    });
  }

  async execute(params: any) {
    // Execute Google Workspace action
    const { action, data } = params;
    switch (action) {
      case 'createUser':
        const { email, password, name } = data;
        const admin = (google as any).admin('directory_v1');
        const user = {
          primaryEmail: email,
          name: {
            givenName: name,
            familyName: ''
          },
          password: password
        };
        const response = await admin.users.insert({
          auth: this.auth,
          requestBody: user
        });
        return response.data;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
}
