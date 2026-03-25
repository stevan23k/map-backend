import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Either username or email

  @IsString()
  @IsNotEmpty()
  password: string;
}
