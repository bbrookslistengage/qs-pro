import { Test, TestingModule } from '@nestjs/testing';
import { SfmcBridgeService } from './sfmc-bridge.service';
import { AuthService } from '../auth/auth.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { UnauthorizedException } from '@nestjs/common';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      request: vi.fn(),
      isAxiosError: (payload: any) => payload?.isAxiosError === true,
    },
    isAxiosError: (payload: any) => payload?.isAxiosError === true,
  };
});

describe('SfmcBridgeService', () => {
  let service: SfmcBridgeService;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SfmcBridgeService,
        {
          provide: AuthService,
          useValue: {
            refreshToken: vi.fn().mockResolvedValue({ accessToken: 'valid-token', tssd: 'test-tssd' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SfmcBridgeService>(SfmcBridgeService);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('buildSoapEnvelope', () => {
    it('should construct a valid SOAP envelope with token', () => {
      const body = '<RetrieveRequest>...</RetrieveRequest>';
      const token = 'my-access-token';
      const envelope = service.buildSoapEnvelope(token, body, 'test-tssd');
      
      expect(envelope).toContain('<soap:Envelope');
      expect(envelope).toContain(token);
      expect(envelope).toContain(body);
      expect(envelope).toContain('http://schemas.xmlsoap.org/soap/envelope/');
    });
  });

  describe('request', () => {
    it('should make a request with refreshed token and correct base URL', async () => {
      (axios.request as any).mockResolvedValue({ data: { success: true } });

      const response = await service.request('tenant-1', 'user-1', {
        method: 'GET',
        url: '/asset/v1/content/assets', // Relative URL
      });

      expect(authService.refreshToken).toHaveBeenCalledWith('tenant-1', 'user-1');
      expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://test-tssd.rest.marketingcloudapis.com',
        url: '/asset/v1/content/assets',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-token',
        }),
      }));
      expect(response).toEqual({ success: true });
    });

    it('should handle SOAP requests using POST and specific content type', async () => {
      (axios.request as any).mockResolvedValue({ data: '<soap>response</soap>' });
      
      const soapBody = '<RetrieveRequestMsg>...</RetrieveRequestMsg>';
      
      await service.soapRequest('tenant-1', 'user-1', soapBody, 'Retrieve');

      expect(axios.request).toHaveBeenCalledWith(expect.objectContaining({
        baseURL: 'https://test-tssd.soap.marketingcloudapis.com',
        url: '/Service.asmx',
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'text/xml',
          SOAPAction: 'Retrieve',
        }),
        data: expect.stringContaining('soap:Envelope'),
      }));
    });

    it('should normalize axios 401 error to ProblemDetails', async () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { message: 'Token expired' },
        },
      };
      (axios.request as any).mockRejectedValue(error);

      try {
        await service.request('tenant-1', 'user-1', { url: '/test' });
        // Should fail
        expect(true).toBe(false);
      } catch (e: any) {
        expect(e.getStatus()).toBe(401);
        const response = e.getResponse();
        expect(response.title).toBe('Unauthorized');
        expect(response.type).toBe('https://httpstatuses.com/401');
      }
    });
    
    it('should normalize axios 500 error to ProblemDetails', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 500,
            statusText: 'Internal Server Error',
            data: { message: 'Something went wrong' },
          },
        };
        (axios.request as any).mockRejectedValue(error);
  
        try {
          await service.request('tenant-1', 'user-1', { url: '/test' });
          expect(true).toBe(false);
        } catch (e: any) {
          expect(e.getStatus()).toBe(500);
          const response = e.getResponse();
          expect(response.title).toBe('Internal Server Error');
        }
      });
  });
});
