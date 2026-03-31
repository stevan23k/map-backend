import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventsRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto, userId: string): Promise<Event> {
    const event = this.eventsRepository.create({
      ...createEventDto,
      userId,
    });
    return this.eventsRepository.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventsRepository.find({
      where: { deleted: false },
      relations: ['user', 'attendees'],
      order: { datetime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Event | null> {
    return this.eventsRepository.findOne({
      where: { id, deleted: false },
      relations: ['user', 'attendees'],
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.eventsRepository.update(id, { deleted: true });
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    await this.eventsRepository.update(id, updateEventDto);
    const updated = await this.findOne(id);
    if (!updated) throw new NotFoundException('Event not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.eventsRepository.delete(id);
  }

  async toggleAttendance(eventId: string, userId: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id: eventId },
      relations: ['attendees'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isAttending = event.attendees.some((u) => u.id === userId);

    if (isAttending) {
      event.attendees = event.attendees.filter((u) => u.id !== userId);
    } else {
      if (!event.attendees) event.attendees = [];
      event.attendees.push({ id: userId } as any);
    }

    await this.eventsRepository.save(event);
    
    const updatedEvent = await this.findOne(eventId);
    if (!updatedEvent) {
      throw new NotFoundException('Event lost after update');
    }
    return updatedEvent;
  }
}
