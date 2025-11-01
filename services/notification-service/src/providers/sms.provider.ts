import { Twilio } from 'twilio';
import { config } from '../config';
import { NotificationTemplate } from '../models/interfaces';

export class SMSProvider {
  private client: Twilio;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = config.sms.twilio.enabled && 
                    config.sms.twilio.accountSid && 
                    config.sms.twilio.authToken;
    
    if (this.isEnabled) {
      this.client = new Twilio(config.sms.twilio.accountSid, config.sms.twilio.authToken);
    }
  }

  async sendSMS(options: {
    to: string;
    body: string;
    from?: string;
    mediaUrls?: string[];
    priority?: 'high' | 'normal' | 'low';
  }): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'SMS provider is not configured or enabled'
      };
    }

    try {
      const message = await this.client.messages.create({
        body: options.body,
        from: options.from || config.sms.twilio.from,
        to: options.to,
        mediaUrl: options.mediaUrls,
        priority: options.priority || 'normal'
      });

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async sendTemplatedSMS(options: {
    to: string;
    template: NotificationTemplate;
    data: Record<string, any>;
    from?: string;
    priority?: 'high' | 'normal' | 'low';
  }): Promise<any> {
    const body = this.renderTemplate(options.template.content, options.data);
    
    return await this.sendSMS({
      to: options.to,
      body,
      from: options.from,
      priority: options.priority
    });
  }

  async verifyPhoneNumber(phoneNumber: string): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'SMS provider is not configured or enabled'
      };
    }

    try {
      const lookup = await this.client.lookups.v2.phoneNumbers(phoneNumber).fetch();
      
      return {
        success: true,
        phoneNumber: lookup.phoneNumber,
        nationalFormat: lookup.nationalFormat,
        countryCode: lookup.countryCode,
        carrier: lookup.carrier,
        type: lookup.type
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async getMessageStatus(messageId: string): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'SMS provider is not configured or enabled'
      };
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      
      return {
        success: true,
        messageId: message.sid,
        status: message.status,
        to: message.to,
        from: message.from,
        body: message.body,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        dateUpdated: message.dateUpdated,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async getAccountInfo(): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'SMS provider is not configured or enabled'
      };
    }

    try {
      const account = await this.client.api.accounts(this.client.accountSid).fetch();
      
      return {
        success: true,
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async getUsage(startDate: Date, endDate: Date): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'SMS provider is not configured or enabled'
      };
    }

    try {
      const records = await this.client.api.v1.accounts(this.client.accountSid)
        .usage.records.list({
          category: 'sms',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });

      const usage = records.map(record => ({
        category: record.category,
        count: record.count,
        usage: record.usage,
        usageUnits: record.usageUnits,
        price: record.price,
        priceUnit: record.priceUnit,
        countUnit: record.countUnit,
        startDate: record.startDate,
        endDate: record.endDate
      }));

      return {
        success: true,
        usage
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    const handlebars = require('handlebars');
    const compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
  }

  async testSMS(to: string): Promise<any> {
    return await this.sendSMS({
      to,
      body: 'Test SMS from HMS Notification Service'
    });
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }
}