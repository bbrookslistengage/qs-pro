import { Injectable, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';
import { AuthService } from '../auth/auth.service';
import * as crypto from 'crypto';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: any;
}

@Injectable()
export class SfmcBridgeService {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * Constructs a SOAP Envelope for SFMC
   */
  buildSoapEnvelope(token: string, body: string, tssd: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
   <soap:Header>
      <wsa:Action>Retrieve</wsa:Action>
      <wsa:MessageID>urn:uuid:${crypto.randomUUID()}</wsa:MessageID>
      <wsa:ReplyTo>
         <wsa:Address>http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</wsa:Address>
      </wsa:ReplyTo>
      <wsa:To>https://${tssd}.soap.marketingcloudapis.com/Service.asmx</wsa:To>
      <wsse:Security soap:mustUnderstand="1">
         <wsse:UsernameToken wsu:Id="UsernameToken-24440876">
            <wsse:Username>*</wsse:Username>
            <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">*</wsse:Password>
         </wsse:UsernameToken>
         <foo>
          <oauth>
            <oauthtoken>${token}</oauthtoken>
          </oauth>
         </foo>
      </wsse:Security>
   </soap:Header>
   <soap:Body>
      ${body}
   </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Generic request wrapper handling token injection and error normalization
   */
  async request<T = any>(
    tenantId: string, 
    userId: string, 
    config: AxiosRequestConfig
  ): Promise<T> {
    try {
      const { accessToken, tssd } = await this.authService.refreshToken(tenantId, userId);

      // Determine Base URL (REST by default)
      const baseUrl = `https://${tssd}.rest.marketingcloudapis.com`;
      
      const response = await axios.request<T>({
        ...config,
        baseURL: config.baseURL || baseUrl,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error; // handleRequest throws HttpException, but TypeScript needs this
    }
  }

  /**
   * Helper for SOAP requests
   */
  async soapRequest(
    tenantId: string, 
    userId: string, 
    soapBody: string, 
    soapAction: string
  ): Promise<any> {
    try {
      const { accessToken, tssd } = await this.authService.refreshToken(tenantId, userId);
      const envelope = this.buildSoapEnvelope(accessToken, soapBody, tssd);

      const baseUrl = `https://${tssd}.soap.marketingcloudapis.com`;
      
      const response = await axios.request({
        method: 'POST',
        baseURL: baseUrl,
        url: '/Service.asmx',
        headers: {
          'Content-Type': 'text/xml',
          SOAPAction: soapAction,
        },
        data: envelope,
      });

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error; 
    }
  }

  private handleError(error: any): void {
    if (axios.isAxiosError(error) && error.response) {
      const { status, statusText, data } = error.response;
      
      const problem: ProblemDetails = {
        type: `https://httpstatuses.com/${status}`,
        title: statusText || 'An error occurred',
        status: status,
        detail: typeof data === 'string' ? data : (data as any)?.message || JSON.stringify(data),
      };

      throw new HttpException(problem, status);
    }
    
    // Non-Axios error or no response
    const problem: ProblemDetails = {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: error instanceof Error ? error.message : 'Unknown error',
    };
    
    throw new HttpException(problem, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
