import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';

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
      relations: ['user'],
      order: { datetime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Event | null> {
    return this.eventsRepository.findOne({
      where: { id, deleted: false },
      relations: ['user'],
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.eventsRepository.update(id, { deleted: true });
  }
}
