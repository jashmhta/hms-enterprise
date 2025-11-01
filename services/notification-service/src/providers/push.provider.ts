import admin from 'firebase-admin';
import AWS from 'aws-sdk';
import { config } from '../config';
import { NotificationTemplate } from '../models/interfaces';

export class PushProvider {
  private firebaseApp: admin.app.App | null = null;
  private sns: AWS.SNS | null = null;
  private firebaseEnabled: boolean;
  private snsEnabled: boolean;

  constructor() {
    this.firebaseEnabled = config.push.firebase.enabled &&
                         config.push.firebase.projectId &&
                         config.push.firebase.clientEmail &&
                         config.push.firebase.privateKey;

    this.snsEnabled = config.push.aws.enabled &&
                     config.push.aws.accessKeyId &&
                     config.push.aws.secretAccessKey &&
                     config.push.aws.platformApplicationArn;

    if (this.firebaseEnabled) {
      try {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: config.push.firebase.projectId,
            clientEmail: config.push.firebase.clientEmail,
            privateKey: config.push.firebase.privateKey
          })
        }, 'hms-notifications');
      } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        this.firebaseEnabled = false;
      }
    }

    if (this.snsEnabled) {
      try {
        AWS.config.update({
          region: config.push.aws.region,
          accessKeyId: config.push.aws.accessKeyId,
          secretAccessKey: config.push.aws.secretAccessKey
        });
        this.sns = new AWS.SNS();
      } catch (error) {
        console.error('Failed to initialize AWS SNS:', error);
        this.snsEnabled = false;
      }
    }
  }

  async sendPushNotification(options: {
    token: string | string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    image?: string;
    badge?: number;
    sound?: string;
    priority?: 'high' | 'normal';
    ttl?: number;
    provider?: 'firebase' | 'aws';
  }): Promise<any> {
    const provider = options.provider || (this.firebaseEnabled ? 'firebase' : 'aws');

    switch (provider) {
      case 'firebase':
        return await this.sendFirebaseNotification(options);
      case 'aws':
        return await this.sendAWSNotification(options);
      default:
        throw new Error(`Unsupported push provider: ${provider}`);
    }
  }

  private async sendFirebaseNotification(options: any): Promise<any> {
    if (!this.firebaseEnabled || !this.firebaseApp) {
      return {
        success: false,
        error: 'Firebase push provider is not configured or enabled'
      };
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: options.title,
          body: options.body,
          imageUrl: options.image
        },
        data: options.data || {},
        android: {
          priority: options.priority || 'normal',
          ttl: options.ttl ? `${options.ttl}ms` : undefined,
          notification: {
            sound: options.sound || 'default',
            badge: options.badge
          }
        },
        apns: {
          payload: {
            aps: {
              sound: options.sound || 'default',
              badge: options.badge
            }
          }
        }
      };

      const tokens = Array.isArray(options.token) ? options.token : [options.token];
      const results = [];

      for (const token of tokens) {
        message.token = token;
        
        try {
          const result = await admin.messaging(this.firebaseApp).send(message);
          results.push({
            token,
            success: true,
            messageId: result
          });
        } catch (error) {
          results.push({
            token,
            success: false,
            error: error.message,
            code: error.code
          });
        }
      }

      return {
        success: true,
        results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async sendAWSNotification(options: any): Promise<any> {
    if (!this.snsEnabled || !this.sns) {
      return {
        success: false,
        error: 'AWS SNS push provider is not configured or enabled'
      };
    }

    try {
      const tokens = Array.isArray(options.token) ? options.token : [options.token];
      const results = [];

      for (const token of tokens) {
        const message = {
          GCM: JSON.stringify({
            notification: {
              title: options.title,
              body: options.body,
              image: options.image
            },
            data: options.data || {},
            priority: options.priority || 'normal',
            ttl: options.ttl
          })
        };

        const params = {
          MessageStructure: 'json',
          Message: JSON.stringify(message),
          TargetArn: token
        };

        try {
          const result = await this.sns.publish(params).promise();
          results.push({
            token,
            success: true,
            messageId: result.MessageId
          });
        } catch (error) {
          results.push({
            token,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTemplatedPushNotification(options: {
    token: string | string[];
    template: NotificationTemplate;
    data: Record<string, any>;
    provider?: 'firebase' | 'aws';
  }): Promise<any> {
    const { title, body, data } = this.renderTemplate(options.template, options.data);
    
    return await this.sendPushNotification({
      token: options.token,
      title,
      body,
      data,
      provider: options.provider
    });
  }

  async subscribeToTopic(options: {
    tokens: string[];
    topic: string;
    provider?: 'firebase' | 'aws';
  }): Promise<any> {
    const provider = options.provider || (this.firebaseEnabled ? 'firebase' : 'aws');

    switch (provider) {
      case 'firebase':
        return await this.subscribeFirebaseTopic(options);
      case 'aws':
        return await this.subscribeAWSTopic(options);
      default:
        throw new Error(`Unsupported push provider: ${provider}`);
    }
  }

  private async subscribeFirebaseTopic(options: any): Promise<any> {
    if (!this.firebaseEnabled || !this.firebaseApp) {
      return {
        success: false,
        error: 'Firebase push provider is not configured or enabled'
      };
    }

    try {
      const results = await admin.messaging(this.firebaseApp).subscribeToTopic(
        options.tokens,
        options.topic
      );

      return {
        success: true,
        topic: options.topic,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async subscribeAWSTopic(options: any): Promise<any> {
    if (!this.snsEnabled || !this.sns) {
      return {
        success: false,
        error: 'AWS SNS push provider is not configured or enabled'
      };
    }

    try {
      const results = [];
      
      for (const token of options.tokens) {
        const params = {
          Protocol: 'application',
          TopicArn: options.topic,
          Endpoint: token
        };

        try {
          const result = await this.sns.subscribe(params).promise();
          results.push({
            token,
            success: true,
            subscriptionArn: result.SubscriptionArn
          });
        } catch (error) {
          results.push({
            token,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: true,
        topic: options.topic,
        results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendToTopic(options: {
    topic: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    image?: string;
    provider?: 'firebase' | 'aws';
  }): Promise<any> {
    const provider = options.provider || (this.firebaseEnabled ? 'firebase' : 'aws');

    switch (provider) {
      case 'firebase':
        return await this.sendFirebaseTopicMessage(options);
      case 'aws':
        return await this.sendAWSTopicMessage(options);
      default:
        throw new Error(`Unsupported push provider: ${provider}`);
    }
  }

  private async sendFirebaseTopicMessage(options: any): Promise<any> {
    if (!this.firebaseEnabled || !this.firebaseApp) {
      return {
        success: false,
        error: 'Firebase push provider is not configured or enabled'
      };
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title: options.title,
          body: options.body,
          imageUrl: options.image
        },
        data: options.data || {},
        topic: options.topic
      };

      const result = await admin.messaging(this.firebaseApp).send(message);
      
      return {
        success: true,
        messageId: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async sendAWSTopicMessage(options: any): Promise<any> {
    if (!this.snsEnabled || !this.sns) {
      return {
        success: false,
        error: 'AWS SNS push provider is not configured or enabled'
      };
    }

    try {
      const message = {
        GCM: JSON.stringify({
          notification: {
            title: options.title,
            body: options.body,
            image: options.image
          },
          data: options.data || {}
        })
      };

      const params = {
        MessageStructure: 'json',
        Message: JSON.stringify(message),
        TopicArn: options.topic
      };

      const result = await this.sns.publish(params).promise();
      
      return {
        success: true,
        messageId: result.MessageId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): {
    title: string;
    body: string;
    data: Record<string, any>;
  } {
    const handlebars = require('handlebars');
    
    const compiledData = this.validateTemplateData(template, data);
    
    const title = handlebars.compile(template.name)(compiledData);
    const body = handlebars.compile(template.content)(compiledData);
    
    return {
      title,
      body,
      data: compiledData
    };
  }

  private validateTemplateData(template: NotificationTemplate, data: Record<string, any>): Record<string, any> {
    const validatedData: Record<string, any> = { ...data };

    for (const variable of template.variables) {
      if (variable.required && !validatedData[variable.name]) {
        if (variable.defaultValue !== undefined) {
          validatedData[variable.name] = variable.defaultValue;
        } else {
          throw new Error(`Required template variable '${variable.name}' is missing`);
        }
      }
    }

    return validatedData;
  }

  async testPushNotification(token: string): Promise<any> {
    return await this.sendPushNotification({
      token,
      title: 'Test Push Notification',
      body: 'This is a test push notification from HMS Notification Service.',
      provider: this.firebaseEnabled ? 'firebase' : 'aws'
    });
  }

  isFirebaseConfigured(): boolean {
    return this.firebaseEnabled;
  }

  isAWSConfigured(): boolean {
    return this.snsEnabled;
  }

  isConfigured(): boolean {
    return this.firebaseEnabled || this.snsEnabled;
  }
}