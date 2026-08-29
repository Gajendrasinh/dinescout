import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { nanoid } from 'nanoid';

interface RequestWithId extends Request {
  requestId?: string;
}

/** Attaches a correlation id to every request, propagated back as a header
 *  and used to tie together log lines for one request across services. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const requestId = incoming && incoming.length <= 128 ? incoming : nanoid();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
