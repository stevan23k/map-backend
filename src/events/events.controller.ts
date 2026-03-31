import { Controller, Post, Param, UseGuards, Req, Get, Patch, Delete, Body, UnauthorizedException } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateEventDto } from './dto/update-event.dto';

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

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto, @Req() req) {
    const event = await this.eventsService.findOne(id);
    if (event?.userId !== req.user.id) throw new UnauthorizedException('Not the owner');
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req) {
    const event = await this.eventsService.findOne(id);
    if (event?.userId !== req.user.id) throw new UnauthorizedException('Not the owner');
    return this.eventsService.softDelete(id);
  }
}
