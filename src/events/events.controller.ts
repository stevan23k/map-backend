import { Controller, Post, Param, UseGuards, Req, Get } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) { }

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Post(':id/attend')
  @UseGuards(JwtAuthGuard)
  toggleAttendance(@Param('id') id: string, @Req() req) {
    return this.eventsService.toggleAttendance(id, req.user.id);
  }
}
