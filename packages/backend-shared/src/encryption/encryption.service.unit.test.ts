import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ErrorCode } from "../common/errors";
import { EncryptionService } from "./encryption.service";

// Valid 64-char hex key (256 bits for AES-256)
const VALID_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const VALID_KEY_2 =
  "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

describe("EncryptionService", () => {
  let service: EncryptionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe("encrypt", () => {
    it("returns base64 string for non-empty input", () => {
      vi.mocked(configService.get).mockReturnValue(VALID_KEY);

      const result = service.encrypt("hello world");

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      // AES-256-GCM output is base64 encoded
      expect(() => Buffer.from(result as string, "base64")).not.toThrow();
    });

    it("returns null when given null", () => {
      const result = service.encrypt(null);

      expect(result).toBeNull();
      expect(configService.get).not.toHaveBeenCalled();
    });

    it("returns undefined when given undefined", () => {
      const result = service.encrypt(undefined);

      expect(result).toBeUndefined();
      expect(configService.get).not.toHaveBeenCalled();
    });

    it("returns empty string when given empty string", () => {
      const result = service.encrypt("");

      expect(result).toBe("");
      expect(configService.get).not.toHaveBeenCalled();
    });

    it("throws AppError when ENCRYPTION_KEY is missing", () => {
      vi.mocked(configService.get).mockReturnValue(undefined);

      expect(() => service.encrypt("test")).toThrow(AppError);
      try {
        service.encrypt("test");
      } catch (error) {
        // eslint-disable-next-line vitest/no-conditional-expect -- verifying error properties after catching
        expect(error).toBeInstanceOf(AppError);
        // eslint-disable-next-line vitest/no-conditional-expect -- verifying error properties after catching
        expect((error as AppError).code).toBe(ErrorCode.CONFIG_ERROR);
        // eslint-disable-next-line vitest/no-conditional-expect -- verifying error properties after catching
        expect((error as AppError).context).toEqual({
          reason: "ENCRYPTION_KEY not configured",
        });
      }
    });

    it("uses the first key in ENCRYPTION_KEYS for encryption", () => {
      // Arrange: configure rotated keys (new first, old second)
      vi.mocked(configService.get).mockImplementation((key: string) => {
        if (key === "ENCRYPTION_KEYS") {
          return `${VALID_KEY_2},${VALID_KEY}`;
        }
        if (key === "ENCRYPTION_KEY") {
          return undefined;
        }
        return undefined;
      });

      const plaintext = "primary-key-encryption";
      const ciphertext = service.encrypt(plaintext) as string;

      // Assert: ciphertext is NOT decryptable with only the old key
      vi.mocked(configService.get).mockImplementation((key: string) => {
        if (key === "ENCRYPTION_KEYS") {
          return VALID_KEY;
        }
        if (key === "ENCRYPTION_KEY") {
          return undefined;
        }
        return undefined;
      });

      expect(() => service.decrypt(ciphertext)).toThrow();

      // Assert: ciphertext IS decryptable with the primary (new) key
      vi.mocked(configService.get).mockImplementation((key: string) => {
        if (key === "ENCRYPTION_KEYS") {
          return VALID_KEY_2;
        }
        if (key === "ENCRYPTION_KEY") {
          return undefined;
        }
        return undefined;
      });

      expect(service.decrypt(ciphertext)).toBe(plaintext);
    });
  });

  describe("decrypt", () => {
    it("returns original plaintext after encrypt/decrypt cycle", () => {
      vi.mocked(configService.get).mockReturnValue(VALID_KEY);
      const plaintext = "sensitive data here";

      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("returns null when given null", () => {
      const result = service.decrypt(null);

      expect(result).toBeNull();
      expect(configService.get).not.toHaveBeenCalled();
    });

    it("returns undefined when given undefined", () => {
      const result = service.decrypt(undefined);

      expect(result).toBeUndefined();
      expect(configService.get).not.toHaveBeenCalled();
    });

    it("returns empty string when given empty string", () => {
      const result = service.decrypt("");

      expect(result).toBe("");
      expect(configService.get).not.toHaveBeenCalled();
    });

    it("throws on corrupted ciphertext", () => {
      vi.mocked(configService.get).mockReturnValue(VALID_KEY);

      expect(() => service.decrypt("not-valid-base64-ciphertext!")).toThrow();
    });

    it("throws AppError when ENCRYPTION_KEY is missing", () => {
      vi.mocked(configService.get).mockReturnValue(undefined);

      expect(() => service.decrypt("encrypted")).toThrow(AppError);
      try {
        service.decrypt("encrypted");
      } catch (error) {
        // eslint-disable-next-line vitest/no-conditional-expect -- verifying error properties after catching
        expect(error).toBeInstanceOf(AppError);
        // eslint-disable-next-line vitest/no-conditional-expect -- verifying error properties after catching
        expect((error as AppError).code).toBe(ErrorCode.CONFIG_ERROR);
      }
    });

    it("supports key rotation by trying multiple keys on decrypt", () => {
      // Arrange: encrypt using the old key
      vi.mocked(configService.get).mockImplementation((key: string) => {
        if (key === "ENCRYPTION_KEYS") {
          return undefined;
        }
        if (key === "ENCRYPTION_KEY") {
          return VALID_KEY;
        }
        return undefined;
      });

      const plaintext = "rotate-me";
      const ciphertext = service.encrypt(plaintext) as string;

      // Act: decrypt with rotated keys, primary first (new,old)
      vi.mocked(configService.get).mockImplementation((key: string) => {
        if (key === "ENCRYPTION_KEYS") {
          return `${VALID_KEY_2},${VALID_KEY}`;
        }
        if (key === "ENCRYPTION_KEY") {
          return undefined;
        }
        return undefined;
      });

      const decrypted = service.decrypt(ciphertext);

      // Assert
      expect(decrypted).toBe(plaintext);
    });
  });
});
