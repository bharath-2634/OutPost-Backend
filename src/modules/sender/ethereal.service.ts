import nodemailer from 'nodemailer';

export interface EtherealAccountResult {
  user: string;
  pass: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
}

/**
 * Service to interact with external Ethereal Email provider.
 */
class EtherealService {
  /**
   * Creates a new Ethereal test account asynchronously.
   */
  public async createAccount(): Promise<EtherealAccountResult> {
    try {
      const testAccount = await nodemailer.createTestAccount();
      return {
        user: testAccount.user,
        pass: testAccount.pass,
        smtp: {
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
        },
      };
    } catch (error: any) {
      console.error('[EtherealService] Account creation failed:', error.message || error);
      throw new Error(`Failed to create Ethereal account: ${error.message || 'Unknown provider error'}`);
    }
  }
}

export const etherealService = new EtherealService();
