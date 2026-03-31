import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { EventsGateway } from './events.gateway';
import { EventsController } from './events.controller';
import { Event } from './entities/event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event]),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRATION', '1d') as any },
      }),
    }),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventsGateway],
  exports: [EventsService],
})
export class EventsModule {}
