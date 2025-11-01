import axios from 'axios';
import { config } from '../config';
import { NotificationTemplate } from '../models/interfaces';

export class WhatsAppProvider {
  private isEnabled: boolean;
  private apiUrl: string;
  private token: string;
  private phoneId: string;
  private version: string;

  constructor() {
    this.isEnabled = config.whatsapp.enabled &&
                    config.whatsapp.apiUrl &&
                    config.whatsapp.token &&
                    config.whatsapp.phoneId;

    this.apiUrl = config.whatsapp.apiUrl;
    this.token = config.whatsapp.token;
    this.phoneId = config.whatsapp.phoneId;
    this.version = config.whatsapp.version;
  }

  async sendMessage(options: {
    to: string;
    templateName?: string;
    templateData?: Record<string, any>;
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'document' | 'audio' | 'video';
    interactive?: {
      type: 'button' | 'list';
      header?: string;
      body: string;
      footer?: string;
      buttons?: Array<{ id: string; title: string }>;
      list?: {
        buttonText: string;
        sections: Array<{
          title: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
      };
    };
  }): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'WhatsApp provider is not configured or enabled'
      };
    }

    try {
      let messageData: any = {
        messaging_product: 'whatsapp',
        to: options.to
      };

      if (options.templateName) {
        messageData.template = {
          name: options.templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: Object.entries(options.templateData || {}).map(([key, value]) => ({
                type: 'text',
                text: String(value)
              }))
            }
          ]
        };
      } else if (options.text) {
        messageData.text = { body: options.text };
      } else if (options.mediaUrl) {
        messageData[options.mediaType || 'image'] = {
          link: options.mediaUrl
        };
      } else if (options.interactive) {
        messageData.interactive = {
          type: options.interactive.type
        };

        if (options.interactive.header) {
          messageData.interactive.header = {
            type: 'text',
            text: options.interactive.header
          };
        }

        messageData.interactive.body = {
          text: options.interactive.body
        };

        if (options.interactive.footer) {
          messageData.interactive.footer = {
            text: options.interactive.footer
          };
        }

        if (options.interactive.type === 'button' && options.interactive.buttons) {
          messageData.interactive.action = {
            buttons: options.interactive.buttons.map(btn => ({
              type: 'reply',
              reply: { id: btn.id, title: btn.title }
            }))
          };
        } else if (options.interactive.type === 'list' && options.interactive.list) {
          messageData.interactive.action = {
            button: options.interactive.list.buttonText,
            sections: options.interactive.list.sections
          };
        }
      }

      const response = await axios.post(
        `${this.apiUrl}/${this.version}/${this.phoneId}/messages`,
        messageData,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        messageId: response.data.messages[0].id,
        status: response.data.messages[0].message_status,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  async sendTemplatedMessage(options: {
    to: string;
    template: NotificationTemplate;
    data: Record<string, any>;
  }): Promise<any> {
    const templateData = this.renderTemplateData(options.template, options.data);
    
    return await this.sendMessage({
      to: options.to,
      templateName: options.template.name,
      templateData
    });
  }

  async sendTextMessage(to: string, text: string): Promise<any> {
    return await this.sendMessage({
      to,
      text
    });
  }

  async sendMediaMessage(options: {
    to: string;
    mediaUrl: string;
    mediaType: 'image' | 'document' | 'audio' | 'video';
    caption?: string;
  }): Promise<any> {
    const result = await this.sendMessage({
      to: options.to,
      mediaUrl: options.mediaUrl,
      mediaType: options.mediaType
    });

    return result;
  }

  async sendInteractiveMessage(options: {
    to: string;
    interactive: {
      type: 'button' | 'list';
      header?: string;
      body: string;
      footer?: string;
      buttons?: Array<{ id: string; title: string }>;
      list?: {
        buttonText: string;
        sections: Array<{
          title: string;
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
      };
    };
  }): Promise<any> {
    return await this.sendMessage({
      to: options.to,
      interactive: options.interactive
    });
  }

  async getMessageStatus(messageId: string): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'WhatsApp provider is not configured or enabled'
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.version}/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      return {
        success: true,
        status: response.data.conversations[0].status,
        timestamp: response.data.conversations[0].updated_at,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  async verifyPhoneNumber(phoneNumber: string): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'WhatsApp provider is not configured or enabled'
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.version}/phone_numbers`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      const phoneExists = response.data.data.some((phone: any) => 
        phone.display_phone_number === phoneNumber || 
        phone.phone_number === phoneNumber
      );

      return {
        success: true,
        exists: phoneExists,
        phoneNumbers: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  async getWebhookUrl(): Promise<any> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: 'WhatsApp provider is not configured or enabled'
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/${this.version}/${this.phoneId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        }
      );

      return {
        success: true,
        webhookUrl: response.data.data.webhooks?.url,
        verifiedName: response.data.data.verified_name,
        response: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  private renderTemplateData(template: NotificationTemplate, data: Record<string, any>): Record<string, any> {
    const handlebars = require('handlebars');
    const validatedData: Record<string, any> = { ...data };

    for (const variable of template.variables) {
      if (variable.required && !validatedData[variable.name]) {
        if (variable.defaultValue !== undefined) {
          validatedData[variable.name] = variable.defaultValue;
        } else {
          throw new Error(`Required template variable '${variable.name}' is missing`);
        }
      }

      if (validatedData[variable.name] !== undefined) {
        validatedData[variable.name] = this.castVariableType(
          validatedData[variable.name],
          variable.type
        );
      }
    }

    return validatedData;
  }

  private castVariableType(value: any, type: string): any {
    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'object':
        return typeof value === 'object' ? value : {};
      default:
        return value;
    }
  }

  async testMessage(to: string): Promise<any> {
    return await this.sendTextMessage(
      to,
      'Test message from HMS Notification Service'
    );
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }
}