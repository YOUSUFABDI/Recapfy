import { IsEnum } from 'class-validator';
import { Role } from 'src/generated/prisma/enums';

export class ChangeRoleDto {
  @IsEnum(Role, {
    message: 'role must be a valid enum value: USER or ADMIN',
  })
  role: Role;
}
