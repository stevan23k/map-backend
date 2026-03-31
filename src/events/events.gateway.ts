import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { Logger, UnauthorizedException } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [process.env.FRONTEND_URL || 'https://mapp.jes.com.co', (process.env.FRONTEND_URL || 'https://mapp.jes.com.co').replace('https://', 'http://'), "http://localhost:3000"],
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');
  private activeUsers = new Map<string, { userId: string; username: string; lat: number; lng: number }>();

  constructor(
    private readonly eventsService: EventsService,
    private readonly jwtService: JwtService,
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
  ) { }

  async handleConnection(client: Socket) {
    try {
      let token = client.handshake.auth.token || client.handshake.headers.authorization;

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (Client: ${client.id})`);
        client.disconnect();
        return;
      }

      // Handle "Bearer <token>" format
      if (token.startsWith('Bearer ')) {
        token = token.split(' ')[1];
      }

      const payload = this.jwtService.verify(token);
      client.data.user = { id: payload.sub, username: payload.username };

      this.logger.log(`Client connected: ${client.id} (User: ${client.data.user.username})`);

      // Send current events to the new client
      const events = await this.eventsService.findAll();
      client.emit('all_events', events);

      // Send all active users to the new client
      client.emit('active_users', Array.from(this.activeUsers.values()));
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      this.activeUsers.delete(client.id);
      this.server.emit('user_disconnected', { socketId: client.id, userId: client.data.user.id });
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('create_event')
  async handleCreateEvent(
    @MessageBody() createEventDto: CreateEventDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.user.id;
    const newEvent = await this.eventsService.create(createEventDto, userId);

    // Broadcast to all clients including sender
    this.server.emit('event_created', newEvent);
    return newEvent;
  }

  @SubscribeMessage('update_event')
  async handleUpdateEvent(
    @MessageBody() data: { id: string; updateEventDto: UpdateEventDto },
    @ConnectedSocket() client: Socket,
  ) {
    const event = await this.eventsService.findOne(data.id);
    if (!event || event.userId !== client.data.user.id) {
      return { success: false, message: 'Not authorized' };
    }

    const updatedEvent = await this.eventsService.update(data.id, data.updateEventDto);
    this.server.emit('event_updated', updatedEvent);
    return updatedEvent;
  }

  @SubscribeMessage('delete_event')
  async handleDeleteEvent(
    @MessageBody() id: string,
    @ConnectedSocket() client: Socket,
  ) {
    const event = await this.eventsService.findOne(id);
    if (!event || event.userId !== client.data.user.id) {
      return { success: false, message: 'Not authorized' };
    }

    await this.eventsService.softDelete(id);
    this.server.emit('events_deleted', [id]);
    return { success: true };
  }

  @SubscribeMessage('update_location')
  handleUpdateLocation(
    @MessageBody() location: { lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.user) return;

    const userData = {
      socketId: client.id,
      userId: client.data.user.id,
      username: client.data.user.username,
      ...location,
    };

    this.activeUsers.set(client.id, userData);

    // Broadcast location to everyone else
    client.broadcast.emit('user_location_updated', userData);
  }

  /**
   * Every minute: soft-delete events that started more than 1 day ago
   * and notify all connected clients.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredEvents(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const expired = await this.eventsRepository.find({
      where: {
        deleted: false,
        datetime: LessThan(oneDayAgo),
      },
      select: ['id'],
    });

    if (expired.length === 0) return;

    const ids = expired.map((e) => e.id);

    await this.eventsRepository.update(
      { deleted: false, datetime: LessThan(oneDayAgo) },
      { deleted: true },
    );

    this.logger.log(`Auto-deleted ${ids.length} expired event(s): ${ids.join(', ')}`);

    // Notify all connected clients so they remove the markers
    this.server.emit('events_deleted', ids);
  }
}
