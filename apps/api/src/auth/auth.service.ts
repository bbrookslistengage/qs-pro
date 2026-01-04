import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jose from 'jose';
import { encrypt, decrypt } from '@qs-pro/database';
import type { 
  ITenantRepository, 
  IUserRepository, 
  ICredentialsRepository 
} from '@qs-pro/database';

export interface SfmcTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  rest_instance_url: string;
  soap_instance_url: string;
  scope: string;
  token_type: string;
}

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    @Inject('TENANT_REPOSITORY') private tenantRepo: ITenantRepository,
    @Inject('USER_REPOSITORY') private userRepo: IUserRepository,
    @Inject('CREDENTIALS_REPOSITORY') private credRepo: ICredentialsRepository,
  ) {}

  async verifySfmcJwt(jwt: string) {
    const secret = this.configService.get<string>('SFMC_JWT_SIGNING_SECRET');
    if (!secret) {
      throw new UnauthorizedException('SFMC_JWT_SIGNING_SECRET not configured');
    }

    try {
      const encodedSecret = new TextEncoder().encode(secret);
      const { payload } = await jose.jwtVerify(jwt, encodedSecret);

      let tssd = payload.stack as string;
      if (!tssd && payload.application_context) {
        const baseUrl = (payload.application_context as any).base_url;
        const match = baseUrl?.match(/https:\/\/([^.]+)\.rest\.marketingcloudapis\.com/);
        if (match) {
          tssd = match[1];
        }
      }

      if (!tssd) {
        throw new Error('Could not determine TSSD from JWT');
      }

      return {
        sfUserId: payload.user_id as string,
        eid: payload.enterprise_id as string,
        mid: payload.member_id as string,
        tssd,
      };
    } catch (error) {
      console.error('[Auth] JWT Verification failed:', error);
      throw new UnauthorizedException('Invalid SFMC JWT');
    }
  }

  async getTokensViaClientCredentials(tssd: string, accountId?: string): Promise<SfmcTokenResponse> {
    const clientId = this.configService.get<string>('SFMC_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SFMC_CLIENT_SECRET');
    const tokenUrl = `https://${tssd}.auth.marketingcloudapis.com/v2/token`;
    
    const response = await axios.post<SfmcTokenResponse>(tokenUrl, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      ...(accountId ? { account_id: accountId } : {}),
    });

    return response.data;
  }

  async handleJwtLogin(jwt: string) {
    const { sfUserId, eid, mid, tssd } = await this.verifySfmcJwt(jwt);

    // Exchange for tokens using MID (member_id) context
    const tokenData = await this.getTokensViaClientCredentials(tssd, mid);

    // JIT Provisioning
    const tenant = await this.tenantRepo.upsert({ eid, tssd });
    
    // SFMC JWT doesn't always have email/name. We can fetch it if needed or leave it.
    // For now, we'll try to use what's in handleCallback if we had a code,
    // but here we just have a JWT.
    const user = await this.userRepo.upsert({ 
      sfUserId, 
      tenantId: tenant.id,
    });

    await this.saveTokens(tenant.id, user.id, tokenData);

    return { user, tenant };
  }

  async findUserById(id: string) {
    return this.userRepo.findById(id);
  }

  async findTenantById(id: string) {
    return this.tenantRepo.findById(id);
  }

  getAuthUrl(tssd: string): string {
    const clientId = this.configService.get<string>('SFMC_CLIENT_ID');
    const redirectUri = this.configService.get<string>('SFMC_REDIRECT_URI') || '';
    // We pass the tssd in the 'state' parameter so Salesforce returns it to our callback
    return `https://${tssd}.auth.marketingcloudapis.com/v2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tssd}`;
  }

  async exchangeCodeForToken(tssd: string, code: string): Promise<SfmcTokenResponse> {
    const clientId = this.configService.get<string>('SFMC_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SFMC_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('SFMC_REDIRECT_URI');

    const tokenUrl = `https://${tssd}.auth.marketingcloudapis.com/v2/token`;
    
    const response = await axios.post<SfmcTokenResponse>(tokenUrl, {
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    return response.data;
  }

  async refreshToken(tenantId: string, userId: string): Promise<{ accessToken: string; tssd: string }> {
    const creds = await this.credRepo.findByUserAndTenant(userId, tenantId);
    if (!creds) throw new UnauthorizedException('No credentials found');

    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new UnauthorizedException('Tenant not found');

    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const decryptedRefreshToken = decrypt(creds.refreshToken, encryptionKey!);

    const clientId = this.configService.get<string>('SFMC_CLIENT_ID');
    const clientSecret = this.configService.get<string>('SFMC_CLIENT_SECRET');
    const tokenUrl = `https://${tenant.tssd}.auth.marketingcloudapis.com/v2/token`;

    try {
      const response = await axios.post<SfmcTokenResponse>(tokenUrl, {
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const tokenData = response.data;
      await this.saveTokens(tenant.id, userId, tokenData);
      return { accessToken: tokenData.access_token, tssd: tenant.tssd };
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async saveTokens(tenantId: string, userId: string, tokenData: SfmcTokenResponse) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    const encryptedRefreshToken = encrypt(tokenData.refresh_token, encryptionKey!);

    await this.credRepo.upsert({
      tenantId,
      userId,
      accessToken: tokenData.access_token,
      refreshToken: encryptedRefreshToken,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      updatedAt: new Date(),
    });
  }

  async getUserInfo(tssd: string, accessToken: string) {
    const url = `https://${tssd}.auth.marketingcloudapis.com/v2/userinfo`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data; // contains enterprise_id, sub (user_id), email, name
  }

  async handleCallback(tssd: string, code: string, sfUserId?: string, eid?: string, email?: string, name?: string) {
    // 1. Exchange code
    const tokenData = await this.exchangeCodeForToken(tssd, code);

    // 2. Discover missing info if necessary
    let effectiveSfUserId = sfUserId;
    let effectiveEid = eid;
    let effectiveEmail = email;
    let effectiveName = name;

    if (!effectiveSfUserId || !effectiveEid) {
      const info = await this.getUserInfo(tssd, tokenData.access_token);
      effectiveSfUserId = effectiveSfUserId || info.sub || info.user_id;
      effectiveEid = effectiveEid || info.enterprise_id || info.organization?.enterprise_id;
      effectiveEmail = effectiveEmail || info.email;
      effectiveName = effectiveName || info.name;
    }

    if (!effectiveSfUserId || !effectiveEid) {
      throw new UnauthorizedException('Could not determine SFMC User ID or Enterprise ID');
    }

    // 3. Ensure tenant exists
    const tenant = await this.tenantRepo.upsert({ eid: effectiveEid, tssd });

    // 4. Ensure user exists
    const user = await this.userRepo.upsert({ 
      sfUserId: effectiveSfUserId, 
      tenantId: tenant.id,
      email: effectiveEmail,
      name: effectiveName
    });

    // 5. Save tokens
    await this.saveTokens(tenant.id, user.id, tokenData);

    return { user, tenant };
  }
}