import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
  userType: 'ORG' | 'CUSTOMER';
  customerId?: string; // only for CUSTOMER users
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token gerekli' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      return;
    }
    next();
  };
}

export function requireOrgUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.userType !== 'ORG') {
    res.status(403).json({ error: 'Bu endpoint sadece kurum kullanıcıları içindir' });
    return;
  }
  next();
}
