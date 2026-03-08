import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import * as dotenv from 'dotenv';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import * as bodyParser from 'body-parser';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Apply JSON/body parsers for normal routes and capture raw body into req.rawBody
  app.use(
    bodyParser.json({
      verify: (req: any, _res, buf) => {
        // Store rawBody string for Nest controllers that expect it (controller webhook).
        // Note: the raw express route registered in BillingController uses bodyParser.raw itself.
        req.rawBody = buf && buf.length ? buf.toString() : '';
      },
    }),
  );

  app.use(
    bodyParser.urlencoded({
      extended: true,
      verify: (req: any, _res, buf) => {
        req.rawBody = buf && buf.length ? buf.toString() : '';
      },
    }),
  );

  const allowedOrigins = [
    'https://recapfy.com',
    'https://www.recapfy.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      // or if the origin is in our allowed list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Keep the API global prefix
  app.setGlobalPrefix('api');

  app.use(cookieParser(process.env.COOKIE_SECRET || 'supersecret'));

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformResponseInterceptor(reflector));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`Server started on port ${port}`);
}
bootstrap();
