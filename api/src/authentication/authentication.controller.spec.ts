import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from './dto/user/create-user.dto';
import { ConfigService } from '@nestjs/config';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;

  // A fake service: only the methods the controller calls, as Jest mocks.
  const authenticationService = {
    registerUser: jest.fn(),
  };

  const configService = {
    registerUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        // Mock services
        { provide: AuthenticationService, useValue: authenticationService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get(AuthenticationController);
    jest.clearAllMocks(); // reset call counts and return values between tests
  });

  describe('register', () => {
    const dto: CreateUserDto = {
      email: 'test@porch.local',
      password: 'a-long-password-123',
      displayName: 'Tester1',
      inviteCode: 'FNDR1234',
    };

    it('passes the DTO to the service', async () => {
      authenticationService.registerUser.mockResolvedValue({ id: 1 });

      await controller.register(dto);

      expect(authenticationService.registerUser).toHaveBeenCalledTimes(1);
      expect(authenticationService.registerUser).toHaveBeenCalledWith(dto);
    });

    it('returns what the service returns', async () => {
      const created = { id: 1, email: dto.email, displayName: dto.displayName };
      authenticationService.registerUser.mockResolvedValue(created);

      await expect(controller.register(dto)).resolves.toEqual(created);
    });

    it('lets service errors propagate', async () => {
      authenticationService.registerUser.mockRejectedValue(
        new ConflictException('An account with this email already exists'),
      );

      await expect(controller.register(dto)).rejects.toThrow(ConflictException);
    });

    it('lets service errors propagate', async () => {
      authenticationService.registerUser.mockRejectedValue(
        new BadRequestException('Invalid invite code'),
      );

      await expect(controller.register(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
