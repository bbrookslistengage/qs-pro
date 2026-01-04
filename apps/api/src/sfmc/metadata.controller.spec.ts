import { Test, TestingModule } from '@nestjs/testing';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';
import { AuthGuard } from '@nestjs/passport'; // Assumed guard based on typical NestJS
import { CanActivate } from '@nestjs/common';

describe('MetadataController', () => {
  let controller: MetadataController;
  let service: MetadataService;

  const mockService = {
    getFolders: vi.fn(),
    getDataExtensions: vi.fn(),
    getFields: vi.fn(),
  };

  const mockGuard: CanActivate = { canActivate: vi.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetadataController],
      providers: [
        {
          provide: MetadataService,
          useValue: mockService,
        },
      ],
    })
    .overrideGuard(AuthGuard('jwt')) // Assuming JWT strategy
    .useValue(mockGuard)
    .compile();

    controller = module.get<MetadataController>(MetadataController);
    service = module.get<MetadataService>(MetadataService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getFolders', () => {
    it('should return folders', async () => {
      const mockResult = [{ id: '1', Name: 'Folder' }];
      mockService.getFolders.mockResolvedValue(mockResult);

      // Mocking request user (usually handled by AuthGuard/Decorator)
      const result = await controller.getFolders('t1', 'u1');
      
      expect(result).toBe(mockResult);
      expect(mockService.getFolders).toHaveBeenCalledWith('t1', 'u1');
    });
  });

  describe('getDataExtensions', () => {
    it('should return data extensions', async () => {
      const mockResult = [{ CustomerKey: 'DE1' }];
      mockService.getDataExtensions.mockResolvedValue(mockResult);

      const result = await controller.getDataExtensions('t1', 'u1', 'eid1');
      
      expect(result).toBe(mockResult);
      expect(mockService.getDataExtensions).toHaveBeenCalledWith('t1', 'u1', 'eid1');
    });
  });

  describe('getFields', () => {
    it('should return fields for a DE', async () => {
      const mockResult = [{ Name: 'Field1' }];
      mockService.getFields.mockResolvedValue(mockResult);

      const result = await controller.getFields('t1', 'u1', 'DE_KEY');
      
      expect(result).toBe(mockResult);
      expect(mockService.getFields).toHaveBeenCalledWith('t1', 'u1', 'DE_KEY');
    });
  });
});
