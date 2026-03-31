import { Controller, Post, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(createUserDto);

    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true, // Cross-site/Same-site across subdomains
      sameSite: 'none', // Required for cross-origin (mapp -> mapp-api)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    
    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true, // Cross-site cookies MUST be secure
      sameSite: 'none', // Required for cross-site (jes.com.co -> jes.com)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return result;
  }
}
