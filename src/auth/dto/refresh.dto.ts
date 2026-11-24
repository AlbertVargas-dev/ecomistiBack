import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshDto {
  @ApiPropertyOptional({
    example: 'eyJhbGciOi...',
    description:
      'Refresh token (7 días, tipo "refresh"). Puede enviarse en el body o por cookie HttpOnly refresh_token.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048, { message: 'El refresh token excede el tamaño máximo' })
  refreshToken?: string;
}
