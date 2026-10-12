import { INestApplication, VersioningType } from '@nestjs/common';

export function configureApp(app: INestApplication) {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
}
