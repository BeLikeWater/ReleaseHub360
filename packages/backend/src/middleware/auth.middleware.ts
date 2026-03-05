import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
      accessibleProductIds?: string[];
      customerId?: string;
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

/**
 * B1-01: requireCustomerRole — JWT'deki userType === 'CUSTOMER' kontrolü + customerRole kontrolü.
 * Belirtilen rollerden birine sahip müşteri kullanıcısı değilse 403 döndürür.
 */
export function requireCustomerRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
      return;
    }
    if (req.user.userType !== 'CUSTOMER') {
      res.status(403).json({ error: 'Bu endpoint sadece müşteri kullanıcıları içindir' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
      return;
    }
    next();
  };
}

/**
 * B1-02: filterByUserProducts — ADMIN bypass. Diğer roller için UserProductAccess
 * tablosundan erişilebilir ürün ID'lerini çeker ve req.accessibleProductIds'e set eder.
 */
export async function filterByUserProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    return;
  }

  // ADMIN tüm ürünlere erişebilir
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  // Staf rolleri (RELEASE_MANAGER, PRODUCT_OWNER, DEVELOPER, QA) tüm ürünlere erişebilir.
  // Bu roller için ürün kısıtlaması productId query param ile halihazırda yapılır.
  const ORG_STAFF_ROLES = ['RELEASE_MANAGER', 'PRODUCT_OWNER', 'DEVELOPER', 'QA'];
  if (req.user.userType === 'ORG' && ORG_STAFF_ROLES.includes(req.user.role)) {
    next();
    return;
  }

  // CUSTOMER userType — erişim customer-product-mappings üzerinden kontrol edilir,
  // userProductAccess tablosu müşteriler için kullanılmaz.
  if (req.user.userType === 'CUSTOMER') {
    next();
    return;
  }

  try {
    const accesses = await prisma.userProductAccess.findMany({
      where: { userId: req.user.userId },
      select: { productId: true },
    });

    const productIds = accesses.map((a) => a.productId);
    if (productIds.length === 0) {
      res.status(403).json({ error: 'Erişebileceğiniz ürün bulunmuyor.' });
      return;
    }

    req.accessibleProductIds = productIds;
    next();
  } catch (err) {
    console.error('filterByUserProducts error:', err);
    res.status(500).json({ error: 'Ürün erişimi kontrol edilemedi' });
  }
}

/**
 * B1-03: resolveCustomerId — Müşteri kullanıcının JWT'sindeki customerId'yi
 * req.customerId'ye set eder. Tüm müşteri sorgularında filtre olarak kullanılır.
 */
export function resolveCustomerId(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    return;
  }

  if (req.user.userType !== 'CUSTOMER' || !req.user.customerId) {
    res.status(403).json({ error: 'Müşteri kimliği bulunamadı' });
    return;
  }

  req.customerId = req.user.customerId;
  next();
}
