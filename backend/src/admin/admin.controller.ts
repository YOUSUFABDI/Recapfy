import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ChangeRoleDto } from './dto/change-role.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllUsers(page, limit, search);
  }

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('give-it-for-free/:id')
  async giveItForFree(@Param('id') id: string) {
    this.adminService.giveItForFree(id);
  }

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Patch('/change-role/:id')
  async changeRole(@Param('id') id: string, @Body() role: ChangeRoleDto) {
    return this.adminService.changeRole(id, role);
  }
}
