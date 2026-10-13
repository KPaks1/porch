import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class Token {}

export function generateTokenHash() {
  const token = randomBytes(32).toString('base64url');
  return createHash('sha256').update(token).digest('hex');
}

export function hashToken() {}
