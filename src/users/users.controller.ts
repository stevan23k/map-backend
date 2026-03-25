import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserProfile } from '../types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req): Promise<UserProfile> {
    const user = await this.usersService.findById(req.user.id);
    const { passwordHash, ...result } = user;
    return result as UserProfile;
  }

  @Put('me')
  async updateProfile(@Request() req, @Body() updateUserDto: UpdateUserDto): Promise<UserProfile> {
    const updatedUser = await this.usersService.update(req.user.id, updateUserDto);
    const { passwordHash, ...result } = updatedUser;
    return result as UserProfile;
  }
}
