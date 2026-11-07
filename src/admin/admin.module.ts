import { Module } from '@nestjs/common';
import { CacheService } from '../common/cache/cache.service.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, CacheService],
})
export class AdminModule {}
