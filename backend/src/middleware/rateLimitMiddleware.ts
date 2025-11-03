import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface SpamEntry {
  query: string;
  timestamp: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly ipLimits = new Map<string, RateLimitEntry>();
  private readonly userLimits = new Map<string, RateLimitEntry>();
  private readonly spamDetection = new Map<string, SpamEntry[]>();

  private readonly IP_LIMIT = 10;
  private readonly IP_WINDOW_MS = 60 * 1000; // 1 minute
  private readonly USER_LIMIT = 50;
  private readonly USER_WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly SPAM_WINDOW_MS = 5 * 1000; // 5 seconds

  constructor() {
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  async use(req: Request, res: Response, next: NextFunction) {
    if (!req.path.includes('/search')) {
      return next();
    }

    const ip = req.ip || 'unknown';
    const userId = (req as any).user?.id;
    const query = req.query?.q as string;

    try {
      this.checkSpam(ip, query);
      
      if (userId) {
        this.checkUserLimit(userId);
      } else {
        this.checkIpLimit(ip);
      }

      this.logger.log(`Rate limit OK: IP=${ip}, User=${userId || 'anonymous'}, Query=${query}`);
      next();
    } catch (error) {
      throw error;
    }
  }

  private checkSpam(ip: string, query: string) {
    if (!query) return;

    const now = Date.now();
    const entries = this.spamDetection.get(ip) || [];
    
    const recentEntries = entries.filter(e => now - e.timestamp < this.SPAM_WINDOW_MS);
    
    const duplicates = recentEntries.filter(e => e.query === query);
    if (duplicates.length >= 2) {
      this.logger.warn(`Spam detected: IP=${ip}, Query=${query}`);
      throw new HttpException(
        'Query duplicada detectada. Aguarde 5 segundos.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    recentEntries.push({ query, timestamp: now });
    this.spamDetection.set(ip, recentEntries);
  }

  private checkIpLimit(ip: string) {
    const now = Date.now();
    const entry = this.ipLimits.get(ip);

    if (!entry || now > entry.resetAt) {
      this.ipLimits.set(ip, {
        count: 1,
        resetAt: now + this.IP_WINDOW_MS,
      });
      return;
    }

    if (entry.count >= this.IP_LIMIT) {
      this.logger.warn(`IP rate limit exceeded: ${ip}`);
      throw new HttpException(
        'Muitas requisições. Tente novamente em 1 minuto.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    entry.count++;
  }

  private checkUserLimit(userId: string) {
    const now = Date.now();
    const entry = this.userLimits.get(userId);

    if (!entry || now > entry.resetAt) {
      this.userLimits.set(userId, {
        count: 1,
        resetAt: now + this.USER_WINDOW_MS,
      });
      return;
    }

    if (entry.count >= this.USER_LIMIT) {
      this.logger.warn(`User rate limit exceeded: ${userId}`);
      throw new HttpException(
        'Limite de buscas por hora excedido. Tente novamente em 1 hora.',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    entry.count++;
  }

  private cleanup() {
    const now = Date.now();

    for (const [ip, entry] of this.ipLimits.entries()) {
      if (now > entry.resetAt) {
        this.ipLimits.delete(ip);
      }
    }

    for (const [userId, entry] of this.userLimits.entries()) {
      if (now > entry.resetAt) {
        this.userLimits.delete(userId);
      }
    }

    for (const [ip, entries] of this.spamDetection.entries()) {
      const recent = entries.filter(e => now - e.timestamp < this.SPAM_WINDOW_MS);
      if (recent.length === 0) {
        this.spamDetection.delete(ip);
      } else {
        this.spamDetection.set(ip, recent);
      }
    }

    this.logger.debug(`Cleanup: ${this.ipLimits.size} IPs, ${this.userLimits.size} users`);
  }
}
