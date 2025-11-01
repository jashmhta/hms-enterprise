import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { NotificationTemplate, NotificationAttachment } from '../models/interfaces';

export class EmailProvider {
  private transporter: nodemailer.Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass,
      },
    });
  }

  async sendEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    template?: string;
    data?: Record<string, any>;
    html?: string;
    text?: string;
    attachments?: NotificationAttachment[];
    priority?: 'high' | 'normal' | 'low';
  }): Promise<any> {
    try {
      let html = options.html;
      let text = options.text;

      if (options.template && !html) {
        html = await this.renderTemplate(options.template, options.data || {});
        text = await this.renderTemplate(`${options.template}.text`, options.data || {});
      }

      const mailOptions = {
        from: config.email.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: options.subject,
        html,
        text,
        priority: options.priority || 'normal',
        attachments: options.attachments?.map(attachment => ({
          filename: attachment.name,
          path: attachment.url,
          contentType: attachment.contentType
        }))
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
        envelope: result.envelope
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async loadTemplate(templateName: string): Promise<void> {
    try {
      const templatePath = path.join(config.email.templates, `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = handlebars.compile(templateContent);
      this.templates.set(templateName, template);
    } catch (error) {
      console.error(`Failed to load template ${templateName}:`, error);
      throw error;
    }
  }

  async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    let template = this.templates.get(templateName);
    
    if (!template) {
      await this.loadTemplate(templateName);
      template = this.templates.get(templateName);
    }

    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    return template(data);
  }

  async loadAllTemplates(): Promise<void> {
    try {
      const templatesDir = config.email.templates;
      const files = await fs.readdir(templatesDir);
      
      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const templateName = path.basename(file, '.hbs');
          await this.loadTemplate(templateName);
        }
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection verification failed:', error);
      return false;
    }
  }

  async testEmail(to: string): Promise<any> {
    return await this.sendEmail({
      to,
      subject: 'Test Email from HMS Notification Service',
      html: '<h1>Test Email</h1><p>This is a test email from HMS Notification Service.</p>',
      text: 'Test Email - This is a test email from HMS Notification Service.'
    });
  }

  private async generateEmailFromTemplate(template: NotificationTemplate, data: Record<string, any>): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    const compiledData = await this.validateTemplateData(template, data);
    
    const subject = handlebars.compile(template.subject || '')(compiledData);
    const html = handlebars.compile(template.content)(compiledData);
    const textTemplate = await this.renderTemplate(`${template.name}.text`, compiledData);
    
    return {
      subject,
      html,
      text: textTemplate
    };
  }

  private async validateTemplateData(template: NotificationTemplate, data: Record<string, any>): Promise<Record<string, any>> {
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

  async sendTemplatedEmail(options: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    template: NotificationTemplate;
    data: Record<string, any>;
    attachments?: NotificationAttachment[];
    priority?: 'high' | 'normal' | 'low';
  }): Promise<any> {
    const { subject, html, text } = await this.generateEmailFromTemplate(options.template, options.data);

    return await this.sendEmail({
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject,
      html,
      text,
      attachments: options.attachments,
      priority: options.priority
    });
  }
}